/**
 * QBO Evidence Register State Engine
 *
 * Classifies every QBO transaction and its attachment(s) into 4 states:
 * - MATCHED: Correct attachment for this transaction (deterministic match)
 * - WRONG_MATCHED: Proven incorrect pre-existing QBO attachment (matches a different transaction)
 * - MISSING: No supporting document exists for a transaction
 * - REVIEW_REQUIRED: Possible transaction match exists but cannot be deterministically resolved
 *
 * Rules:
 * - A document currently attached to a transaction must still be analysed against
 *   other QBO transactions before being classified as MATCHED.
 * - Automatic matching produces only MATCHED (deterministic), REVIEW_REQUIRED (ambiguous),
 *   or leaves transaction as MISSING.
 * - WRONG_MATCHED only represents a proven incorrect pre-existing QBO attachment.
 *   The automatic matcher must never create WRONG_MATCHED.
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
  | 'REVIEW_REQUIRED';

export interface RegisterEntry {
  id?: string; // Database ID after persistence
  realmId: string;
  collectionRequestId: string | null;

  // QBO Transaction
  qboTxnId: string | null;
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

  // For REVIEW_REQUIRED
  reviewCandidateTxnIds: string[];
}

/**
 * Analyze QBO side: transactions and their attachments
 */
function analyzeQboSide(
  transactions: QBOTransaction[],
  attachables: any[],
  inboxDocuments: any[],
  documentFields: Map<string, ExtractedDocumentFields>,
  allMatchResults: Map<string, MatchResult>,
  collectionRequestId: string | undefined
): RegisterEntry[] {
  const entries: RegisterEntry[] = [];

  // Track which transactions have attachments in QBO
  const txnAttachables = new Map<string, any[]>();
  for (const att of attachables) {
    if (att.entityRef) {
      const key = `${att.entityRef.type}:${att.entityRef.value}`;
      const arr = txnAttachables.get(key) || [];
      arr.push(att);
      txnAttachables.set(key, arr);
    }
  }

  // Build a map of transaction -> matched document (from document side analysis)
  const transactionMatchedDoc = new Map<string, string>();
  for (const [docId, matchResult] of allMatchResults) {
    if (matchResult.status === 'matched' && matchResult.transactionId) {
      transactionMatchedDoc.set(matchResult.transactionId, docId);
    }
  }

  for (const txn of transactions) {
    const key = `${txn.txnType}:${txn.txnId}`;
    const attachedAttachables = txnAttachables.get(key) || [];

    if (attachedAttachables.length === 0) {
      // Transaction has NO attachments in QBO -> MISSING
      const matchedDocId = transactionMatchedDoc.get(txn.txnId);
      const matchResult = matchedDocId ? allMatchResults.get(matchedDocId) : null;

      entries.push(createRegisterEntry({
        realmId: '',
        collectionRequestId: collectionRequestId ?? null,
        qboTxnId: txn.txnId,
        qboTxnType: txn.txnType,
        qboTxnDate: txn.date,
        qboTxnVendor: txn.vendor,
        qboTxnAmount: txn.amount,
        qboTxnDocNumber: txn.docNumber,
        attachableId: null,
        attachmentFilename: null,
        attachmentFileSize: null,
        attachmentDownloadUrl: null,
        registerState: 'MISSING',
        matchedDocumentId: matchedDocId ?? null,
        matchConfidence: matchResult?.confidence ?? null,
        matchFieldDetails: matchResult?.candidateDetails ?? null,
        correctQboTxnId: null,
        reviewCandidateTxnIds: [],
      }));
    } else {
      // Transaction HAS attachment(s) in QBO
      for (const att of attachedAttachables) {
        const matchingDoc = findInboxDocumentForAttachable(att, inboxDocuments);
        const matchResult = matchingDoc?.id ? allMatchResults.get(matchingDoc.id) : null;

        if (matchResult && matchResult.status === 'matched' && matchResult.transactionId === txn.txnId) {
          // Document matches THIS transaction -> MATCHED
          entries.push(createRegisterEntry({
            realmId: '',
            collectionRequestId: collectionRequestId ?? null,
            qboTxnId: txn.txnId,
            qboTxnType: txn.txnType,
            qboTxnDate: txn.date,
            qboTxnVendor: txn.vendor,
            qboTxnAmount: txn.amount,
            qboTxnDocNumber: txn.docNumber,
            attachableId: att.attachableId ?? null,
            attachmentFilename: att.fileName ?? null,
            attachmentFileSize: att.fileSize ?? null,
            attachmentDownloadUrl: att.downloadUrl ?? null,
            registerState: 'MATCHED',
            matchedDocumentId: matchingDoc?.id ?? null,
            matchConfidence: matchResult.confidence,
            matchFieldDetails: matchResult.candidateDetails ?? null,
            correctQboTxnId: null,
            reviewCandidateTxnIds: [],
          }));
        } else if (matchResult && matchResult.status === 'matched' && matchResult.transactionId !== txn.txnId) {
          // Document matches a DIFFERENT transaction -> WRONG_MATCHED
          // This represents a proven incorrect pre-existing QBO attachment
          entries.push(createRegisterEntry({
            realmId: '',
            collectionRequestId: collectionRequestId ?? null,
            qboTxnId: txn.txnId,
            qboTxnType: txn.txnType,
            qboTxnDate: txn.date,
            qboTxnVendor: txn.vendor,
            qboTxnAmount: txn.amount,
            qboTxnDocNumber: txn.docNumber,
            attachableId: att.attachableId ?? null,
            attachmentFilename: att.fileName ?? null,
            attachmentFileSize: att.fileSize ?? null,
            attachmentDownloadUrl: att.downloadUrl ?? null,
            registerState: 'WRONG_MATCHED',
            matchedDocumentId: matchingDoc?.id ?? null,
            matchConfidence: matchResult.confidence,
            matchFieldDetails: matchResult.candidateDetails ?? null,
            correctQboTxnId: matchResult.transactionId ?? null,
            reviewCandidateTxnIds: [],
          }));
        } else if (matchResult && matchResult.status === 'multiple_candidates') {
          // Ambiguous match -> REVIEW_REQUIRED
          const candidateTxnIds = matchResult.allCandidates?.map(c => c.txnId) ?? [];
          entries.push(createRegisterEntry({
            realmId: '',
            collectionRequestId: collectionRequestId ?? null,
            qboTxnId: txn.txnId,
            qboTxnType: txn.txnType,
            qboTxnDate: txn.date,
            qboTxnVendor: txn.vendor,
            qboTxnAmount: txn.amount,
            qboTxnDocNumber: txn.docNumber,
            attachableId: att.attachableId ?? null,
            attachmentFilename: att.fileName ?? null,
            attachmentFileSize: att.fileSize ?? null,
            attachmentDownloadUrl: att.downloadUrl ?? null,
            registerState: 'REVIEW_REQUIRED',
            matchedDocumentId: matchingDoc?.id ?? null,
            matchConfidence: matchResult.confidence,
            matchFieldDetails: matchResult.candidateDetails ?? null,
            correctQboTxnId: null,
            reviewCandidateTxnIds: candidateTxnIds,
          }));
        } else {
          // Attachment exists but cannot be matched to any document -> MISSING
          // (no deterministic match, so transaction remains MISSING per 4-state model)
          entries.push(createRegisterEntry({
            realmId: '',
            collectionRequestId: collectionRequestId ?? null,
            qboTxnId: txn.txnId,
            qboTxnType: txn.txnType,
            qboTxnDate: txn.date,
            qboTxnVendor: txn.vendor,
            qboTxnAmount: txn.amount,
            qboTxnDocNumber: txn.docNumber,
            attachableId: att.attachableId ?? null,
            attachmentFilename: att.fileName ?? null,
            attachmentFileSize: att.fileSize ?? null,
            attachmentDownloadUrl: att.downloadUrl ?? null,
            registerState: 'MISSING',
            matchedDocumentId: matchingDoc?.id ?? null,
            matchConfidence: matchResult?.confidence ?? null,
            matchFieldDetails: matchResult?.candidateDetails ?? null,
            correctQboTxnId: null,
            reviewCandidateTxnIds: [],
          }));
        }
      }
    }
  }

  // Handle orphaned attachables (attachables in QBO not linked to any transaction)
  // These don't create register entries in the 4-state model
  // They remain as-is in QBO without register representation

  return entries;
}

/**
 * Find inbox document that corresponds to a QBO attachable
 * Match by filename or other metadata
 */
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
        review_candidate_txn_ids: entry.reviewCandidateTxnIds,
        computed_at: new Date().toISOString(),
      }, {
        onConflict: 'realm_id,qbo_txn_id',
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
    reviewCandidateTxnIds: row.review_candidate_txn_ids || [],
  }));
}

/**
 * Update the QBO evidence register for a single document after it's been processed.
 * This reuses the existing matching logic and updates the register state accordingly.
 * 
 * @param documentId - The inbox document ID that was processed
 * @param realmId - The realm ID
 * @param collectionRequestId - The collection request ID
 * @param matchResult - The match result from processInboxDocument
 * @param docFields - The extracted document fields
 * @param isDuplicate - Legacy parameter (unused in 4-state model)
 * @param duplicateOfDocumentId - Legacy parameter (unused in 4-state model)
 * @returns The updated register entry for this document, or null if no change
 */
export async function updateRegisterForDocument(
  documentId: string,
  realmId: string,
  collectionRequestId: string | undefined,
  matchResult: MatchResult,
  docFields: ExtractedDocumentFields,
  isDuplicate?: boolean | null, // Legacy - DUPLICATE state removed in 4-state model
  duplicateOfDocumentId?: string | null // Legacy - DUPLICATE state removed in 4-state model
): Promise<RegisterEntry | null> {
  // Fetch existing register entries for this realm to check current state
  const existingEntries = await getRegisterEntries(realmId, collectionRequestId);
  
  // Check if this document is already in the register
  const existingEntry = existingEntries.find(e => 
    e.matchedDocumentId === documentId
  );
  
  // Determine the new register state based on match result
  // Automatic matcher produces only MATCHED, REVIEW_REQUIRED, or leaves as MISSING
  let newState: QboRegisterState = 'MISSING';
  let qboTxnId: string | null = null;
  let matchedTransaction: QBOTransaction | undefined;
  let reviewCandidateTxnIds: string[] = [];
  
  if (matchResult.status === 'matched') {
    newState = 'MATCHED';
    qboTxnId = matchResult.transactionId!;
    matchedTransaction = matchResult.matchedTransaction;
  } else if (matchResult.status === 'multiple_candidates') {
    newState = 'REVIEW_REQUIRED';
    qboTxnId = matchResult.allCandidates?.[0]?.txnId ?? null;
    matchedTransaction = matchResult.allCandidates?.[0];
    reviewCandidateTxnIds = matchResult.allCandidates?.map(c => c.txnId) ?? [];
  } else {
    // No match - transaction remains MISSING
    newState = 'MISSING';
    qboTxnId = null;
    matchedTransaction = undefined;
  }
  
  // Check for existing MISSING entry for this transaction to upgrade to MATCHED or REVIEW_REQUIRED
  // MISSING entries can have collection_request_id = NULL, so we must query without that filter
  // This check runs FIRST when matchResult.status === 'matched' or 'multiple_candidates' to prefer upgrading MISSING over creating new rows
  if ((matchResult.status === 'matched' || matchResult.status === 'multiple_candidates') && qboTxnId) {
    const { data: missingData, error: missingError } = await supabaseAdmin
      .from('qbo_evidence_register')
      .select('*')
      .eq('realm_id', realmId)
      .eq('qbo_txn_id', qboTxnId)
      .eq('register_state', 'MISSING')
      .maybeSingle();

    if (!missingError && missingData) {
      // Found a MISSING entry - upgrade it instead of creating/updating a document entry
      const newRegisterState = matchResult.status === 'matched' ? 'MATCHED' : 'REVIEW_REQUIRED';
      const { error } = await supabaseAdmin
        .from('qbo_evidence_register')
        .update({
          register_state: newRegisterState,
          match_confidence: matchResult.confidence,
          match_field_details: matchResult.candidateDetails || null,
          matched_document_id: documentId,
          review_candidate_txn_ids: newRegisterState === 'REVIEW_REQUIRED' ? reviewCandidateTxnIds : [],
          computed_at: new Date().toISOString(),
        })
        .eq('id', missingData.id);

      if (error) {
        console.error(`Failed to update MISSING entry to ${newRegisterState} for document ${documentId}:`, error.message);
        return null;
      }

      // If there was an existing entry for this document, delete it to avoid duplicate
      if (existingEntry) {
        await supabaseAdmin
          .from('qbo_evidence_register')
          .delete()
          .eq('id', existingEntry.id);
      }

      return {
        id: missingData.id,
        realmId: missingData.realm_id,
        collectionRequestId: missingData.collection_request_id,
        qboTxnId: missingData.qbo_txn_id,
        qboTxnType: missingData.qbo_txn_type,
        qboTxnDate: missingData.qbo_txn_date,
        qboTxnVendor: missingData.qbo_txn_vendor,
        qboTxnAmount: missingData.qbo_txn_amount,
        qboTxnDocNumber: missingData.qbo_txn_doc_number,
        attachableId: missingData.attachable_id,
        attachmentFilename: missingData.attachment_filename,
        attachmentFileSize: missingData.attachment_file_size,
        attachmentDownloadUrl: missingData.attachment_download_url,
        registerState: newRegisterState,
        matchConfidence: matchResult.confidence,
        matchFieldDetails: matchResult.candidateDetails || null,
        matchedDocumentId: documentId,
        correctQboTxnId: missingData.correct_qbo_txn_id,
        reviewCandidateTxnIds: newRegisterState === 'REVIEW_REQUIRED' ? reviewCandidateTxnIds : [],
      } as RegisterEntry;
    }
  }

  // If there's an existing entry for this document, check if we should update
  if (existingEntry) {
    // Preserve MATCHED state if already resolved
    if (existingEntry.registerState === 'MATCHED' && newState !== 'MATCHED') {
      // Don't downgrade a MATCHED document
      return null;
    }
    
    // Preserve WRONG_MATCHED (proven incorrect pre-existing attachment)
    if (existingEntry.registerState === 'WRONG_MATCHED') {
      return null;
    }

    // Update the existing entry
    // Note: newState here can only be MATCHED, MISSING, or REVIEW_REQUIRED
    // WRONG_MATCHED is only assigned later for new entries
    const { error } = await supabaseAdmin
      .from('qbo_evidence_register')
      .update({
        register_state: newState,
        match_confidence: matchResult.confidence,
        match_field_details: matchResult.candidateDetails || null,
        matched_document_id: newState === 'MATCHED' || newState === 'REVIEW_REQUIRED' ? documentId : null,
        qbo_txn_id: qboTxnId,
        qbo_txn_type: matchedTransaction?.txnType ?? null,
        qbo_txn_date: matchedTransaction?.date ?? null,
        qbo_txn_vendor: matchedTransaction?.vendor ?? null,
        qbo_txn_amount: matchedTransaction?.amount ?? null,
        qbo_txn_doc_number: matchedTransaction?.docNumber ?? null,
        correct_qbo_txn_id: null,
        review_candidate_txn_ids: newState === 'REVIEW_REQUIRED' ? reviewCandidateTxnIds : [],
        computed_at: new Date().toISOString(),
      })
      .eq('id', existingEntry.id);

    if (error) {
      console.error(`Failed to update register entry for document ${documentId}:`, error.message);
      return null;
    }

    return { ...existingEntry, registerState: newState, reviewCandidateTxnIds };
  }
  
  // Check if the matched transaction already has a MATCHED entry with a different document
  // This would make this document WRONG_MATCHED (proven incorrect pre-existing attachment)
  if (matchResult.status === 'matched' && matchResult.transactionId) {
    const conflictingEntry = existingEntries.find(e => 
      e.qboTxnId === matchResult.transactionId && 
      e.registerState === 'MATCHED' && 
      e.matchedDocumentId !== documentId
    );
    
    if (conflictingEntry) {
      // This transaction is already MATCHED with a different document
      // Mark this document as WRONG_MATCHED - proven incorrect pre-existing attachment
      newState = 'WRONG_MATCHED';
      qboTxnId = conflictingEntry.qboTxnId ?? null;
      matchedTransaction = conflictingEntry as any;
    }
  }
  
  // Create new register entry
  const newEntry: RegisterEntry = {
    realmId,
    collectionRequestId: collectionRequestId ?? null,
    qboTxnId,
    qboTxnType: matchedTransaction?.txnType ?? null,
    qboTxnDate: matchedTransaction?.date ?? null,
    qboTxnVendor: matchedTransaction?.vendor ?? null,
    qboTxnAmount: matchedTransaction?.amount ?? null,
    qboTxnDocNumber: matchedTransaction?.docNumber ?? null,
    attachableId: null, // Client documents don't have QBO attachable IDs
    attachmentFilename: null, // Will be filled from document
    attachmentFileSize: null,
    attachmentDownloadUrl: null,
    registerState: newState,
    matchedDocumentId: newState === 'MATCHED' || newState === 'REVIEW_REQUIRED' || newState === 'WRONG_MATCHED' ? documentId : null,
    matchConfidence: matchResult.confidence,
    matchFieldDetails: matchResult.candidateDetails ?? null,
    correctQboTxnId: newState === 'WRONG_MATCHED' ? matchResult.transactionId ?? null : null,
    reviewCandidateTxnIds: newState === 'REVIEW_REQUIRED' ? reviewCandidateTxnIds : [],
  };
  
  // Persist the new entry
  const { error } = await supabaseAdmin
    .from('qbo_evidence_register')
    .upsert({
      realm_id: realmId,
      collection_request_id: newEntry.collectionRequestId,
      qbo_txn_id: newEntry.qboTxnId,
      qbo_txn_type: newEntry.qboTxnType,
      qbo_txn_date: newEntry.qboTxnDate,
      qbo_txn_vendor: newEntry.qboTxnVendor,
      qbo_txn_amount: newEntry.qboTxnAmount,
      qbo_txn_doc_number: newEntry.qboTxnDocNumber,
      attachable_id: newEntry.attachableId,
      attachment_filename: newEntry.attachmentFilename,
      attachment_file_size: newEntry.attachmentFileSize,
      attachment_download_url: newEntry.attachmentDownloadUrl,
      register_state: newEntry.registerState,
      matched_document_id: newEntry.matchedDocumentId,
      match_confidence: newEntry.matchConfidence,
      match_field_details: newEntry.matchFieldDetails,
      correct_qbo_txn_id: newEntry.correctQboTxnId,
      review_candidate_txn_ids: newEntry.reviewCandidateTxnIds,
      computed_at: new Date().toISOString(),
    }, {
      onConflict: 'realm_id,qbo_txn_id',
    });
  
  if (error) {
    console.error(`Failed to insert register entry for document ${documentId}:`, error.message);
    return null;
  }
  
  return newEntry;
}
