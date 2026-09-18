/**
 * QBO Evidence Register State Engine
 * 
 * Classifies every QBO transaction and its attachment(s) into 6 states:
 * - MATCHED: Correct attachment for this transaction
 * - WRONG_MATCHED: Attachment confidently matches a different QBO transaction
 * - MISSING: No supporting document exists for a transaction
 * - DUPLICATE: Same document/evidence appears more than once
 * - FLAGGED: Possible transaction match exists but cannot be deterministically resolved
 * - UNMATCHED: A document exists but cannot be matched to any transaction
 * 
 * Rules:
 * - A document currently attached to a transaction must still be analysed against
 *   other QBO transactions before being classified as MATCHED.
 * - Apply states consistently so one document cannot simultaneously be treated as
 *   a normal MATCHED document and a WRONG_MATCHED or DUPLICATE document.
 * - Preserve the original QBO attachment relationship and all existing evidence.
 * - Reuse the current extraction, scoring and confidence thresholds.
 */

import { supabaseAdmin } from './supabase-admin';
import {
  processInboxDocument,
  matchDocumentToTransactions,
  ExtractedDocumentFields,
  QBOTransaction,
  MatchResult,
  CandidateMatchDetail,
  getCollectionRequestWithTransactions,
  extractFieldsFromText,
  downloadDocument,
  getClaimedTransactionIds,
} from './document-extraction';
import { getAttachables, normalizeAttachables } from './quickbooks';

// Local copy of extractTextFromDocument since it's not exported
async function extractTextFromDocument(buffer: Buffer, contentType: string): Promise<string> {
  if (contentType === 'application/pdf') {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return result.text;
  }
  
  if (contentType.startsWith('image/')) {
    return '[IMAGE CONTENT - OCR NOT IMPLEMENTED]';
  }
  
  if (contentType === 'text/plain') {
    return buffer.toString('utf-8');
  }
  
  try {
    return buffer.toString('utf-8');
  } catch {
    return '[UNSUPPORTED DOCUMENT TYPE]';
  }
}

export type QboRegisterState = 
  | 'MATCHED'
  | 'WRONG_MATCHED'
  | 'MISSING'
  | 'DUPLICATE'
  | 'FLAGGED'
  | 'UNMATCHED';

export interface RegisterEntry {
  id?: string; // Database ID after persistence
  realmId: string;
  collectionRequestId: string | null;
  
  // QBO Transaction
  qboTxnId: string;
  qboTxnType: string | null;
  qboTxnDate: string | null;
  qboTxnVendor: string | null;
  qboTxnAmount: number | null;
  qboTxnDocNumber: string | null;
  
  // Attachment (if any)
  attachableId: string | null;
  attachmentFilename: string | null;
  attachmentFileSize: number | null;
  attachmentDownloadUrl: string | null;
  
  // Register state
  registerState: QboRegisterState;
  
  // Matching details
  matchedDocumentId: string | null;
  matchConfidence: number | null;
  matchFieldDetails: CandidateMatchDetail[] | null;
  
  // For WRONG_MATCHED
  correctQboTxnId: string | null;
  
  // For DUPLICATE
  duplicateOfRegisterId: string | null;
  
  // For FLAGGED
  flaggedCandidateTxnIds: string[];
  
  // For UNMATCHED
  unmatchedDocumentId: string | null;
}

export interface BuildRegisterOptions {
  realmId: string;
  collectionRequestId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Build the complete QBO evidence register for a realm.
 * This is the main entry point that computes all 6 register states.
 */
export async function buildQboEvidenceRegister(
  options: BuildRegisterOptions
): Promise<RegisterEntry[]> {
  const { realmId, collectionRequestId, startDate, endDate } = options;

  // 1. Fetch all QBO transactions (from collection request or date range)
  const allTransactions = await fetchQboTransactions(realmId, collectionRequestId, startDate, endDate);
  
  // 2. Fetch all QBO attachments (Attachables) for this realm
  const attachables = await fetchQboAttachables(realmId);
  
  // 3. Fetch all inbox documents for this realm
  const inboxDocuments = await fetchInboxDocuments(realmId);
  
  // 4. Extract fields from all inbox documents (if not already done)
  const documentFields = await extractFieldsFromAllDocuments(inboxDocuments);
  
  // 5. Pre-filter claimed transactions ONCE to avoid duplicate getClaimedTransactionIds calls
  const claimedIds = await getClaimedTransactionIds(realmId);
  const transactions = allTransactions.filter(txn => !claimedIds.has(txn.txnId));
  
  // 6. Match each document against ALL transactions (not just the one it's attached to)
  const allMatchResults = await matchAllDocumentsToAllTransactions(
    inboxDocuments,
    documentFields,
    transactions,
    collectionRequestId,
    realmId
  );
  
  // 6. DETECT DUPLICATES FIRST: Identify which documents are duplicate occurrences
  //    This must happen BEFORE classification so duplicates are DUPLICATE from the start
  const duplicateDocumentIds = detectDuplicateDocumentIds(documentFields);
  
  // 7. Analyze QBO-side: for each transaction, check its existing attachment(s)
  //    and classify into register states (with duplicate awareness)
  const qboSideEntries = await analyzeQboSide(
    transactions,
    attachables,
    inboxDocuments,
    documentFields,
    allMatchResults,
    duplicateDocumentIds,
    collectionRequestId
  );
  
  // 8. Analyze document-side: find documents that don't match any transaction
  const documentSideEntries = analyzeDocumentSide(
    inboxDocuments,
    documentFields,
    allMatchResults,
    transactions,
    qboSideEntries,
    duplicateDocumentIds,
    collectionRequestId
  );
  
  // 9. Resolve conflicts (ensure consistent states)
  const finalEntries = resolveStateConflicts([...qboSideEntries, ...documentSideEntries]);
  
  return finalEntries;
}

/**
 * Fetch QBO transactions from collection request or date range
 */
async function fetchQboTransactions(
  realmId: string,
  collectionRequestId: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined
): Promise<QBOTransaction[]> {
  if (collectionRequestId) {
    const request = await getCollectionRequestWithTransactions(collectionRequestId);
    if (request) return request.transactions;
  }
  
  // Fallback: fetch from QBO API using date range
  if (startDate && endDate) {
    const { getTransactions } = await import('./quickbooks');
    const raw = await getTransactions(startDate, endDate);
    const { normalizeTransactionList } = await import('./quickbooks');
    return normalizeTransactionList(raw);
  }
  
  return [];
}

/**
 * Fetch all QBO attachables for a realm
 */
async function fetchQboAttachables(realmId: string) {
  const raw = await getAttachables();
  return normalizeAttachables(raw);
}

/**
 * Fetch all inbox documents for a realm
 */
async function fetchInboxDocuments(realmId: string) {
  const { data, error } = await supabaseAdmin
    .from('inbox_documents')
    .select('*')
    .eq('realm_id', realmId);
  
  if (error) throw new Error(`Failed to fetch inbox documents: ${error.message}`);
  return data || [];
}

/**
 * Extract fields from all documents
 */
async function extractFieldsFromAllDocuments(documents: any[]): Promise<Map<string, ExtractedDocumentFields>> {
  const fieldsMap = new Map<string, ExtractedDocumentFields>();
  
  for (const doc of documents) {
    if (doc.extracted_vendor && doc.extracted_amount !== null) {
      // Already extracted, use stored values
      fieldsMap.set(doc.id, {
        vendorName: doc.extracted_vendor,
        documentDate: doc.extracted_date,
        totalAmount: doc.extracted_amount,
        documentNumber: doc.extracted_document_number,
        documentType: doc.extracted_type,
        rawText: '', // Not stored
      });
    } else {
      // Need to extract
      try {
        const buffer = await downloadDocument(doc.storage_path);
        const text = await extractTextFromDocument(buffer, doc.content_type);
        const fields = extractFieldsFromText(text);
        fieldsMap.set(doc.id, fields);
      } catch (e) {
        console.error(`Failed to extract fields from document ${doc.id}:`, e);
        fieldsMap.set(doc.id, {
          vendorName: null,
          documentDate: null,
          totalAmount: null,
          documentNumber: null,
          documentType: null,
          rawText: '',
        });
      }
    }
  }
  
  return fieldsMap;
}

/**
 * Detect duplicate document IDs by fingerprint (vendor + amount + date + doc number)
 * Returns a Set of document IDs that are duplicate occurrences (not the primary)
 */
function detectDuplicateDocumentIds(documentFields: Map<string, ExtractedDocumentFields>): Set<string> {
  // Group by document content fingerprint
  const documentGroups = new Map<string, string[]>();
  
  for (const [docId, fields] of documentFields) {
    if (!fields.vendorName && !fields.totalAmount && !fields.documentDate && !fields.documentNumber) {
      continue; // Skip documents with no extractable fields
    }
    
    const fingerprint = `${fields.vendorName || ''}_${fields.totalAmount || ''}_${fields.documentDate || ''}_${fields.documentNumber || ''}`;
    
    const group = documentGroups.get(fingerprint) || [];
    group.push(docId);
    documentGroups.set(fingerprint, group);
  }
  
  // Collect all duplicate document IDs (all except the first in each group)
  const duplicateIds = new Set<string>();
  
  for (const [fingerprint, group] of documentGroups) {
    if (group.length <= 1) continue;
    
    // Keep first as primary, mark rest as duplicates
    for (let i = 1; i < group.length; i++) {
      duplicateIds.add(group[i]);
    }
  }
  
  return duplicateIds;
}

/**
 * Match each document against ALL transactions using pre-extracted fields and pre-fetched transactions.
 * This avoids duplicate downloading/extraction/matching work.
 */
async function matchAllDocumentsToAllTransactions(
  documents: any[],
  documentFields: Map<string, ExtractedDocumentFields>,
  transactions: QBOTransaction[],
  collectionRequestId: string | undefined,
  realmId: string
): Promise<Map<string, MatchResult>> {
  const results = new Map<string, MatchResult>();
  
  for (const doc of documents) {
    const fields = documentFields.get(doc.id);
    if (!fields) continue;
    
    // Use pre-extracted fields and pre-fetched transactions to avoid duplicate work
    if (collectionRequestId) {
      const matchResult = await matchDocumentToTransactions(
        doc.id, 
        fields, 
        collectionRequestId, 
        transactions,  // Pass pre-fetched transactions
        realmId        // Pass realmId for claimed transaction filtering
      );
      results.set(doc.id, matchResult);
    }
  }
  
  return results;
}

/**
 * Analyze QBO side: for each transaction + its attachment(s), classify the register state
 */
async function analyzeQboSide(
  transactions: QBOTransaction[],
  attachables: any[],
  inboxDocuments: any[],
  documentFields: Map<string, ExtractedDocumentFields>,
  allMatchResults: Map<string, MatchResult>,
  duplicateDocumentIds: Set<string>,
  collectionRequestId: string | undefined
): Promise<RegisterEntry[]> {
  const entries: RegisterEntry[] = [];
  
  // Group attachables by entityId (transaction they're attached to)
  const attachablesByTxn = new Map<string, any[]>();
  for (const att of attachables) {
    if (att.entityId) {
      const existing = attachablesByTxn.get(att.entityId) || [];
      existing.push(att);
      attachablesByTxn.set(att.entityId, existing);
    }
  }
  
  // Also track orphaned attachables (no entityId)
  const orphanedAttachables = attachables.filter(a => !a.entityId);
  
  for (const txn of transactions) {
    const txnAttachables = attachablesByTxn.get(txn.txnId) || [];
    
    if (txnAttachables.length === 0) {
      // Transaction has no attachment -> MISSING
      entries.push(createRegisterEntry({
        realmId: '', // Will be filled by caller
        collectionRequestId: collectionRequestId ?? null,
        qboTxnId: txn.txnId,
        qboTxnType: txn.txnType ?? null,
        qboTxnDate: txn.date ?? null,
        qboTxnVendor: txn.vendor ?? null,
        qboTxnAmount: txn.amount ?? null,
        qboTxnDocNumber: txn.docNumber ?? null,
        attachableId: null,
        attachmentFilename: null,
        attachmentFileSize: null,
        attachmentDownloadUrl: null,
        registerState: 'MISSING',
        matchedDocumentId: null,
        matchConfidence: null,
        matchFieldDetails: null,
        correctQboTxnId: null,
        duplicateOfRegisterId: null,
        flaggedCandidateTxnIds: [],
        unmatchedDocumentId: null,
      }));
      continue;
    }
    
    // Transaction has attachment(s) - analyze each one
    for (const att of txnAttachables) {
      // Find which inbox document corresponds to this attachable
      const matchingDoc = findInboxDocumentForAttachable(att, inboxDocuments);
      
      if (matchingDoc) {
        // This attachable corresponds to an inbox document
        const matchResult = allMatchResults.get(matchingDoc.id);
        
        // CHECK FOR DUPLICATE FIRST - duplicate detection must happen BEFORE classification
        if (matchingDoc.id && duplicateDocumentIds.has(matchingDoc.id)) {
          // This document is a duplicate occurrence -> DUPLICATE
          entries.push(createRegisterEntry({
            realmId: '',
            collectionRequestId: collectionRequestId ?? null,
            qboTxnId: txn.txnId,
            qboTxnType: txn.txnType ?? null,
            qboTxnDate: txn.date ?? null,
            qboTxnVendor: txn.vendor ?? null,
            qboTxnAmount: txn.amount ?? null,
            qboTxnDocNumber: txn.docNumber ?? null,
            attachableId: att.attachableId ?? null,
            attachmentFilename: att.fileName ?? null,
            attachmentFileSize: att.fileSize ?? null,
            attachmentDownloadUrl: att.downloadUrl ?? null,
            registerState: 'DUPLICATE',
            matchedDocumentId: matchingDoc.id,
            matchConfidence: matchResult?.confidence ?? null,
            matchFieldDetails: matchResult?.candidateDetails ?? null,
            correctQboTxnId: null,
            duplicateOfRegisterId: null, // Will be resolved in conflict resolution
            flaggedCandidateTxnIds: [],
            unmatchedDocumentId: null,
          }));
          continue;
        }
        
        if (matchResult && matchResult.status === 'matched' && matchResult.transactionId === txn.txnId) {
          // Document is matched to THIS transaction -> MATCHED
          entries.push(createRegisterEntry({
            realmId: '',
            collectionRequestId: collectionRequestId ?? null,
            qboTxnId: txn.txnId,
            qboTxnType: txn.txnType ?? null,
            qboTxnDate: txn.date ?? null,
            qboTxnVendor: txn.vendor ?? null,
            qboTxnAmount: txn.amount ?? null,
            qboTxnDocNumber: txn.docNumber ?? null,
            attachableId: att.attachableId ?? null,
            attachmentFilename: att.fileName ?? null,
            attachmentFileSize: att.fileSize ?? null,
            attachmentDownloadUrl: att.downloadUrl ?? null,
            registerState: 'MATCHED',
            matchedDocumentId: matchingDoc.id,
            matchConfidence: matchResult.confidence,
            matchFieldDetails: matchResult.candidateDetails ?? null,
            correctQboTxnId: null,
            duplicateOfRegisterId: null,
            flaggedCandidateTxnIds: [],
            unmatchedDocumentId: null,
          }));
        } else if (matchResult && matchResult.status === 'matched' && matchResult.transactionId !== txn.txnId) {
          // Document is matched to a DIFFERENT transaction -> WRONG_MATCHED
          entries.push(createRegisterEntry({
            realmId: '',
            collectionRequestId: collectionRequestId ?? null,
            qboTxnId: txn.txnId,
            qboTxnType: txn.txnType ?? null,
            qboTxnDate: txn.date ?? null,
            qboTxnVendor: txn.vendor ?? null,
            qboTxnAmount: txn.amount ?? null,
            qboTxnDocNumber: txn.docNumber ?? null,
            attachableId: att.attachableId ?? null,
            attachmentFilename: att.fileName ?? null,
            attachmentFileSize: att.fileSize ?? null,
            attachmentDownloadUrl: att.downloadUrl ?? null,
            registerState: 'WRONG_MATCHED',
            matchedDocumentId: matchingDoc.id,
            matchConfidence: matchResult.confidence,
            matchFieldDetails: matchResult.candidateDetails ?? null,
            correctQboTxnId: matchResult.transactionId ?? null,
            duplicateOfRegisterId: null,
            flaggedCandidateTxnIds: [],
            unmatchedDocumentId: null,
          }));
        } else if (matchResult && matchResult.status === 'multiple_candidates') {
          // Ambiguous match -> FLAGGED
          const candidateTxnIds = matchResult.allCandidates?.map(c => c.txnId) ?? [];
          entries.push(createRegisterEntry({
            realmId: '',
            collectionRequestId: collectionRequestId ?? null,
            qboTxnId: txn.txnId,
            qboTxnType: txn.txnType ?? null,
            qboTxnDate: txn.date ?? null,
            qboTxnVendor: txn.vendor ?? null,
            qboTxnAmount: txn.amount ?? null,
            qboTxnDocNumber: txn.docNumber ?? null,
            attachableId: att.attachableId ?? null,
            attachmentFilename: att.fileName ?? null,
            attachmentFileSize: att.fileSize ?? null,
            attachmentDownloadUrl: att.downloadUrl ?? null,
            registerState: 'FLAGGED',
            matchedDocumentId: matchingDoc.id,
            matchConfidence: matchResult.confidence,
            matchFieldDetails: matchResult.candidateDetails ?? null,
            correctQboTxnId: null,
            duplicateOfRegisterId: null,
            flaggedCandidateTxnIds: candidateTxnIds,
            unmatchedDocumentId: null,
          }));
        } else {
          // Document exists but no match found -> UNMATCHED (for this transaction)
          // But the document might be UNMATCHED overall if it matches no transaction
          entries.push(createRegisterEntry({
            realmId: '',
            collectionRequestId: collectionRequestId ?? null,
            qboTxnId: txn.txnId,
            qboTxnType: txn.txnType ?? null,
            qboTxnDate: txn.date ?? null,
            qboTxnVendor: txn.vendor ?? null,
            qboTxnAmount: txn.amount ?? null,
            qboTxnDocNumber: txn.docNumber ?? null,
            attachableId: att.attachableId ?? null,
            attachmentFilename: att.fileName ?? null,
            attachmentFileSize: att.fileSize ?? null,
            attachmentDownloadUrl: att.downloadUrl ?? null,
            registerState: 'UNMATCHED',
            matchedDocumentId: null,
            matchConfidence: matchResult?.confidence ?? null,
            matchFieldDetails: matchResult?.candidateDetails ?? null,
            correctQboTxnId: null,
            duplicateOfRegisterId: null,
            flaggedCandidateTxnIds: [],
            unmatchedDocumentId: matchingDoc.id,
          }));
        }
      } else {
        // Attachment exists in QBO but no corresponding inbox document
        // This is an "orphaned" attachment in QBO
        entries.push(createRegisterEntry({
          realmId: '',
          collectionRequestId: collectionRequestId ?? null,
          qboTxnId: txn.txnId,
          qboTxnType: txn.txnType ?? null,
          qboTxnDate: txn.date ?? null,
          qboTxnVendor: txn.vendor ?? null,
          qboTxnAmount: txn.amount ?? null,
          qboTxnDocNumber: txn.docNumber ?? null,
          attachableId: att.attachableId ?? null,
          attachmentFilename: att.fileName ?? null,
          attachmentFileSize: att.fileSize ?? null,
          attachmentDownloadUrl: att.downloadUrl ?? null,
          registerState: 'UNMATCHED',
          matchedDocumentId: null,
          matchConfidence: null,
          matchFieldDetails: null,
          correctQboTxnId: null,
          duplicateOfRegisterId: null,
          flaggedCandidateTxnIds: [],
          unmatchedDocumentId: null,
        }));
      }
    }
  }
  
  // Handle orphaned attachables (attachments in QBO not linked to any transaction)
  for (const att of orphanedAttachables) {
    const matchingDoc = findInboxDocumentForAttachable(att, inboxDocuments);
    
    // Check if this orphaned document is a duplicate
    if (matchingDoc?.id && duplicateDocumentIds.has(matchingDoc.id)) {
      entries.push(createRegisterEntry({
        realmId: '',
        collectionRequestId: collectionRequestId ?? null,
        qboTxnId: 'ORPHANED',
        qboTxnType: null,
        qboTxnDate: null,
        qboTxnVendor: null,
        qboTxnAmount: null,
        qboTxnDocNumber: null,
        attachableId: att.attachableId ?? null,
        attachmentFilename: att.fileName ?? null,
        attachmentFileSize: att.fileSize ?? null,
        attachmentDownloadUrl: att.downloadUrl ?? null,
        registerState: 'DUPLICATE',
        matchedDocumentId: matchingDoc.id,
        matchConfidence: null,
        matchFieldDetails: null,
        correctQboTxnId: null,
        duplicateOfRegisterId: null,
        flaggedCandidateTxnIds: [],
        unmatchedDocumentId: null,
      }));
    } else {
      entries.push(createRegisterEntry({
        realmId: '',
        collectionRequestId: collectionRequestId ?? null,
        qboTxnId: 'ORPHANED',
        qboTxnType: null,
        qboTxnDate: null,
        qboTxnVendor: null,
        qboTxnAmount: null,
        qboTxnDocNumber: null,
        attachableId: att.attachableId ?? null,
        attachmentFilename: att.fileName ?? null,
        attachmentFileSize: att.fileSize ?? null,
        attachmentDownloadUrl: att.downloadUrl ?? null,
        registerState: 'UNMATCHED',
        matchedDocumentId: matchingDoc?.id ?? null,
        matchConfidence: null,
        matchFieldDetails: null,
        correctQboTxnId: null,
        duplicateOfRegisterId: null,
        flaggedCandidateTxnIds: [],
        unmatchedDocumentId: matchingDoc?.id ?? null,
      }));
    }
  }
  
  return entries;
}

/**
 * Analyze document side: find documents that don't match any transaction
 */
function analyzeDocumentSide(
  inboxDocuments: any[],
  documentFields: Map<string, ExtractedDocumentFields>,
  allMatchResults: Map<string, MatchResult>,
  transactions: QBOTransaction[],
  qboSideEntries: RegisterEntry[],
  duplicateDocumentIds: Set<string>,
  collectionRequestId: string | undefined
): RegisterEntry[] {
  const entries: RegisterEntry[] = [];
  
  // Track which documents are already accounted for in QBO-side entries
  const accountedDocumentIds = new Set(
    qboSideEntries
      .filter(e => e.matchedDocumentId || e.unmatchedDocumentId)
      .map(e => e.matchedDocumentId || e.unmatchedDocumentId)
      .filter(Boolean)
  );
  
  for (const doc of inboxDocuments) {
    if (accountedDocumentIds.has(doc.id)) continue;
    
    const matchResult = allMatchResults.get(doc.id);
    
    // CHECK FOR DUPLICATE FIRST - duplicate detection must happen BEFORE classification
    if (doc.id && duplicateDocumentIds.has(doc.id)) {
      // This document is a duplicate occurrence -> DUPLICATE
      entries.push(createRegisterEntry({
        realmId: '',
        collectionRequestId: collectionRequestId ?? null,
        qboTxnId: 'NO_MATCH',
        qboTxnType: null,
        qboTxnDate: null,
        qboTxnVendor: null,
        qboTxnAmount: null,
        qboTxnDocNumber: null,
        attachableId: null,
        attachmentFilename: doc.filename ?? null,
        attachmentFileSize: doc.file_size ?? null,
        attachmentDownloadUrl: null,
        registerState: 'DUPLICATE',
        matchedDocumentId: doc.id,
        matchConfidence: matchResult?.confidence ?? null,
        matchFieldDetails: matchResult?.candidateDetails ?? null,
        correctQboTxnId: null,
        duplicateOfRegisterId: null, // Will be resolved in conflict resolution
        flaggedCandidateTxnIds: [],
        unmatchedDocumentId: null,
      }));
      continue;
    }
    
    if (matchResult && matchResult.status === 'matched') {
      // Document matched to a transaction but that transaction doesn't have this attachment in QBO
      // This is a WRONG_MATCHED from the transaction's perspective, but from document side
      // it's MATCHED to some transaction
      entries.push(createRegisterEntry({
        realmId: '',
        collectionRequestId: collectionRequestId ?? null,
        qboTxnId: matchResult.transactionId ?? 'UNKNOWN',
        qboTxnType: matchResult.matchedTransaction?.txnType ?? null,
        qboTxnDate: matchResult.matchedTransaction?.date ?? null,
        qboTxnVendor: matchResult.matchedTransaction?.vendor ?? null,
        qboTxnAmount: matchResult.matchedTransaction?.amount ?? null,
        qboTxnDocNumber: matchResult.matchedTransaction?.docNumber ?? null,
        attachableId: null,
        attachmentFilename: doc.filename ?? null,
        attachmentFileSize: doc.file_size ?? null,
        attachmentDownloadUrl: null,
        registerState: 'MATCHED',
        matchedDocumentId: doc.id,
        matchConfidence: matchResult.confidence,
        matchFieldDetails: matchResult.candidateDetails ?? null,
        correctQboTxnId: null,
        duplicateOfRegisterId: null,
        flaggedCandidateTxnIds: [],
        unmatchedDocumentId: null,
      }));
    } else if (matchResult && matchResult.status === 'multiple_candidates') {
      // Ambiguous match
      const candidateTxnIds = matchResult.allCandidates?.map(c => c.txnId) ?? [];
      entries.push(createRegisterEntry({
        realmId: '',
        collectionRequestId: collectionRequestId ?? null,
        qboTxnId: matchResult.allCandidates?.[0]?.txnId ?? 'UNKNOWN',
        qboTxnType: matchResult.allCandidates?.[0]?.txnType ?? null,
        qboTxnDate: matchResult.allCandidates?.[0]?.date ?? null,
        qboTxnVendor: matchResult.allCandidates?.[0]?.vendor ?? null,
        qboTxnAmount: matchResult.allCandidates?.[0]?.amount ?? null,
        qboTxnDocNumber: matchResult.allCandidates?.[0]?.docNumber ?? null,
        attachableId: null,
        attachmentFilename: doc.filename ?? null,
        attachmentFileSize: doc.file_size ?? null,
        attachmentDownloadUrl: null,
        registerState: 'FLAGGED',
        matchedDocumentId: doc.id,
        matchConfidence: matchResult.confidence,
        matchFieldDetails: matchResult.candidateDetails ?? null,
        correctQboTxnId: null,
        duplicateOfRegisterId: null,
        flaggedCandidateTxnIds: candidateTxnIds,
        unmatchedDocumentId: null,
      }));
    } else {
      // No match found at all -> UNMATCHED
      entries.push(createRegisterEntry({
        realmId: '',
        collectionRequestId: collectionRequestId ?? null,
        qboTxnId: 'NO_MATCH',
        qboTxnType: null,
        qboTxnDate: null,
        qboTxnVendor: null,
        qboTxnAmount: null,
        qboTxnDocNumber: null,
        attachableId: null,
        attachmentFilename: doc.filename ?? null,
        attachmentFileSize: doc.file_size ?? null,
        attachmentDownloadUrl: null,
        registerState: 'UNMATCHED',
        matchedDocumentId: null,
        matchConfidence: matchResult?.confidence ?? null,
        matchFieldDetails: matchResult?.candidateDetails ?? null,
        correctQboTxnId: null,
        duplicateOfRegisterId: null,
        flaggedCandidateTxnIds: [],
        unmatchedDocumentId: doc.id,
      }));
    }
  }
  
  return entries;
}

/**
 * Detect duplicate documents (same evidence appearing more than once)
 */
function detectDuplicates(entries: RegisterEntry[], documentFieldsMap: Map<string, ExtractedDocumentFields>): RegisterEntry[] {
  // Group by document content fingerprint (vendor + amount + date + doc number)
  const documentGroups = new Map<string, RegisterEntry[]>();
  
  for (const entry of entries) {
    if (!entry.matchedDocumentId && !entry.unmatchedDocumentId) continue;
    
    const docId = entry.matchedDocumentId || entry.unmatchedDocumentId;
    if (!docId) continue; // TypeScript guard
    const fields = documentFieldsMap?.get(docId);
    
    // For now, use a simpler fingerprint based on extracted fields
    // In production, use content hash or more sophisticated fingerprinting
    const fingerprint = `${fields?.vendorName || ''}_${fields?.totalAmount || ''}_${fields?.documentDate || ''}_${fields?.documentNumber || ''}`;
    
    const group = documentGroups.get(fingerprint) || [];
    group.push(entry);
    documentGroups.set(fingerprint, group);
  }
  
  // Mark duplicates: keep first as primary, mark rest as DUPLICATE
  const result: RegisterEntry[] = [];
  
  for (const [fingerprint, group] of documentGroups) {
    if (group.length <= 1) {
      result.push(...group);
      continue;
    }
    
    // Sort by match confidence descending (highest confidence is primary)
    group.sort((a, b) => (b.matchConfidence || 0) - (a.matchConfidence || 0));
    
    const primary = group[0];
    result.push(primary);
    
    for (let i = 1; i < group.length; i++) {
      const dup = { ...group[i] };
      dup.registerState = 'DUPLICATE';
      dup.duplicateOfRegisterId = primary.id || null; // Will be set after insert
      result.push(dup);
    }
  }
  
  // Add entries that weren't grouped (no document ID)
  for (const entry of entries) {
    if (!entry.matchedDocumentId && !entry.unmatchedDocumentId) {
      result.push(entry);
    }
  }
  
  return result;
}

/**
 * Resolve state conflicts to ensure consistency
 * - A document cannot be both MATCHED and WRONG_MATCHED
 * - A document cannot be both MATCHED and DUPLICATE
 */
function resolveStateConflicts(entries: RegisterEntry[]): RegisterEntry[] {
  // Track document -> assigned state
  const documentStates = new Map<string, { state: QboRegisterState; entry: RegisterEntry }>();
  
  // First pass: identify conflicts
  for (const entry of entries) {
    const docId = entry.matchedDocumentId || entry.unmatchedDocumentId;
    if (!docId) continue;
    
    const existing = documentStates.get(docId);
    if (!existing) {
      documentStates.set(docId, { state: entry.registerState, entry });
    } else {
      // Conflict resolution rules:
      // Priority: MATCHED > WRONG_MATCHED > FLAGGED > UNMATCHED > MISSING > DUPLICATE
      const priority = getStatePriority(entry.registerState);
      const existingPriority = getStatePriority(existing.state);
      
      if (priority > existingPriority) {
        // Current entry has higher priority, demote existing
        existing.entry.registerState = 'DUPLICATE';
        existing.entry.duplicateOfRegisterId = entry.id || null;
        documentStates.set(docId, { state: entry.registerState, entry });
      } else {
        // Existing has higher or equal priority, demote current
        entry.registerState = 'DUPLICATE';
        entry.duplicateOfRegisterId = existing.entry.id || null;
      }
    }
  }
  
  return entries;
}

function getStatePriority(state: QboRegisterState): number {
  const priorities: Record<QboRegisterState, number> = {
    'MATCHED': 6,
    'WRONG_MATCHED': 5,
    'FLAGGED': 4,
    'UNMATCHED': 3,
    'MISSING': 2,
    'DUPLICATE': 1,
  };
  return priorities[state] || 0;
}

function createRegisterEntry(entry: RegisterEntry): RegisterEntry {
  return entry;
}

/**
 * Find inbox document that corresponds to a QBO attachable
 * Match by filename or other metadata
 */
function findInboxDocumentForAttachable(attachable: any, inboxDocuments: any[]): any | null {
  // Try to match by filename
  for (const doc of inboxDocuments) {
    if (doc.filename === attachable.fileName) {
      return doc;
    }
  }
  return null;
}

/**
 * Persist register entries to database
 */
export async function persistRegisterEntries(
  entries: RegisterEntry[],
  realmId: string
): Promise<void> {
  for (const entry of entries) {
    const { error } = await supabaseAdmin
      .from('qbo_evidence_register')
      .upsert({
        realm_id: realmId,
        collection_request_id: entry.collectionRequestId,
        qbo_txn_id: entry.qboTxnId,
        qbo_txn_type: entry.qboTxnType,
        qbo_txn_date: entry.qboTxnDate,
        qbo_txn_vendor: entry.qboTxnVendor,
        qbo_txn_amount: entry.qboTxnAmount,
        qbo_txn_doc_number: entry.qboTxnDocNumber,
        attachable_id: entry.attachableId,
        attachment_filename: entry.attachmentFilename,
        attachment_file_size: entry.attachmentFileSize,
        attachment_download_url: entry.attachmentDownloadUrl,
        register_state: entry.registerState,
        matched_document_id: entry.matchedDocumentId,
        match_confidence: entry.matchConfidence,
        match_field_details: entry.matchFieldDetails,
        correct_qbo_txn_id: entry.correctQboTxnId,
        duplicate_of_register_id: entry.duplicateOfRegisterId,
        flagged_candidate_txn_ids: entry.flaggedCandidateTxnIds,
        unmatched_document_id: entry.unmatchedDocumentId,
        computed_at: new Date().toISOString(),
      }, {
        onConflict: 'realm_id,qbo_txn_id,attachable_id',
      });
    
    if (error) {
      console.error(`Failed to persist register entry for ${entry.qboTxnId}:`, error.message);
    }
  }
}

/**
 * Get register entries from database
 */
export async function getRegisterEntries(
  realmId: string,
  collectionRequestId?: string
): Promise<RegisterEntry[]> {
  let query = supabaseAdmin
    .from('qbo_evidence_register')
    .select('*')
    .eq('realm_id', realmId)
    .order('qbo_txn_id', { ascending: true });
  
  if (collectionRequestId) {
    query = query.eq('collection_request_id', collectionRequestId);
  }
  
  const { data, error } = await query;
  
  if (error) throw new Error(`Failed to fetch register entries: ${error.message}`);
  
  return (data || []).map(row => ({
    realmId: row.realm_id,
    collectionRequestId: row.collection_request_id,
    qboTxnId: row.qbo_txn_id,
    qboTxnType: row.qbo_txn_type,
    qboTxnDate: row.qbo_txn_date,
    qboTxnVendor: row.qbo_txn_vendor,
    qboTxnAmount: row.qbo_txn_amount,
    qboTxnDocNumber: row.qbo_txn_doc_number,
    attachableId: row.attachable_id,
    attachmentFilename: row.attachment_filename,
    attachmentFileSize: row.attachment_file_size,
    attachmentDownloadUrl: row.attachment_download_url,
    registerState: row.register_state as QboRegisterState,
    matchedDocumentId: row.matched_document_id,
    matchConfidence: row.match_confidence,
    matchFieldDetails: row.match_field_details,
    correctQboTxnId: row.correct_qbo_txn_id,
    duplicateOfRegisterId: row.duplicate_of_register_id,
    flaggedCandidateTxnIds: row.flagged_candidate_txn_ids || [],
    unmatchedDocumentId: row.unmatched_document_id,
  }));
}
