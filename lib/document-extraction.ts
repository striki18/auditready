/**
 * Document Extraction and Transaction Matching Pipeline
 * 
 * Extracts key fields from uploaded documents and matches them against
 * QuickBooks transactions from collection requests.
 */

import { supabaseAdmin } from './supabase-admin';
import { PDFParse } from 'pdf-parse';

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return result.text;
}

export interface ExtractedDocumentFields {
  vendorName: string | null;
  documentDate: string | null;
  totalAmount: number | null;
  documentNumber: string | null;
  documentType: string | null;
  rawText: string;
}

export interface QBOTransaction {
  txnId: string;
  txnType: string | null;
  date: string | null;
  vendor: string | null;
  amount: number | null;
  docNumber: string | null;
}

export interface FieldComparisonDetail {
  fieldName: string;
  documentValue: string | number | null;
  transactionValue: string | number | null;
  match: boolean;
  similarity?: number; // For vendor name (Jaccard similarity)
  difference?: number; // For amount/date (absolute difference)
}

export interface CandidateMatchDetail {
  transactionId: string;
  confidence: number; // 0-100
  fieldComparisons: FieldComparisonDetail[];
  signals: {
    vendorMatch: boolean;
    amountMatch: boolean;
    dateMatch: boolean;
    documentNumberMatch: boolean;
  };
}

export interface MatchResult {
  documentId: string;
  transactionId: string | null;
  confidence: number; // 0-100
  matchSignals: {
    vendorMatch: boolean;
    amountMatch: boolean;
    dateMatch: boolean;
    documentNumberMatch: boolean;
  };
  status: 'matched' | 'no_match' | 'multiple_candidates';
  matchedTransaction?: QBOTransaction;
  allCandidates?: QBOTransaction[];
  candidateDetails?: CandidateMatchDetail[];
}

export interface CollectionRequestWithTransactions {
  id: string;
  realmId: string;
  transactionIds: string[];
  transactions: QBOTransaction[];
}

/**
 * Simple string similarity (Jaccard index on bigrams)
 * Avoids Set iteration for ES2017 target compatibility
 */
function stringSimilarity(a: string, b: string): number {
  const bigramsA: string[] = [];
  const bigramsB: string[] = [];

  for (let i = 0; i < a.length - 1; i++) {
    bigramsA.push(a.slice(i, i + 2));
  }
  for (let i = 0; i < b.length - 1; i++) {
    bigramsB.push(b.slice(i, i + 2));
  }

  // Deduplicate arrays manually
  const uniqueA: string[] = [];
  for (const bg of bigramsA) {
    if (!uniqueA.includes(bg)) uniqueA.push(bg);
  }
  const uniqueB: string[] = [];
  for (const bg of bigramsB) {
    if (!uniqueB.includes(bg)) uniqueB.push(bg);
  }

  // Calculate intersection
  let intersection = 0;
  for (const bg of uniqueA) {
    if (uniqueB.includes(bg)) intersection++;
  }

  // Calculate union
  const unionSet: string[] = [...uniqueA];
  for (const bg of uniqueB) {
    if (!unionSet.includes(bg)) unionSet.push(bg);
  }

  return intersection / unionSet.length;
}

/**
 * Extract text from document buffer based on content type
 */
async function extractTextFromDocument(buffer: Buffer, contentType: string): Promise<string> {
  if (contentType === 'application/pdf') {
    return extractPdfText(buffer);
  }
  
  if (contentType.startsWith('image/')) {
    // For images, we'd need OCR - returning placeholder for now
    // In production, integrate with OCR service (Tesseract, AWS Textract, etc.)
    return '[IMAGE CONTENT - OCR NOT IMPLEMENTED]';
  }
  
  if (contentType === 'text/plain') {
    return buffer.toString('utf-8');
  }
  
  // Default: try to decode as text
  try {
    return buffer.toString('utf-8');
  } catch {
    return '[UNSUPPORTED DOCUMENT TYPE]';
  }
}

/**
 * Extract key fields from document text using regex patterns
 */
export function extractFieldsFromText(text: string): ExtractedDocumentFields {
  const result: ExtractedDocumentFields = {
    vendorName: null,
    documentDate: null,
    totalAmount: null,
    documentNumber: null,
    documentType: null,
    rawText: text,
  };

  // Common vendor/supplier patterns
  const vendorPatterns = [
    /(?:vendor|supplier|from|bill to|pay to):\s*([^\n\r]+)/i,
    /(?:company|business)\s*[:\-]\s*([^\n\r]+)/i,
    /^([A-Z][A-Za-z\s&.,'-]{2,})\s*(?:\n|$)/m, // First line that looks like a company name
  ];

  for (const pattern of vendorPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      result.vendorName = match[1].trim();
      break;
    }
  }

  // Date patterns (various formats)
  const datePatterns = [
    /(?:date|invoice date|bill date|document date):\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(?:date|invoice date|bill date|document date):\s*(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/i,
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/, // Generic date
    /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/, // ISO-like date
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      result.documentDate = normalizeDate(match[1]);
      break;
    }
  }

  // Amount patterns - prioritize explicit total labels in order of specificity
  const explicitTotalPatterns = [
    { label: 'grand total', pattern: /grand total:\s*\$?([\d,]+\.?\d*)/gi },
    { label: 'total amount', pattern: /total amount:\s*\$?([\d,]+\.?\d*)/gi },
    { label: 'total', pattern: /total:\s*\$?([\d,]+\.?\d*)/gi },
    { label: 'amount due', pattern: /amount due:\s*\$?([\d,]+\.?\d*)/gi },
    { label: 'balance due', pattern: /balance due:\s*\$?([\d,]+\.?\d*)/gi },
  ];

  // Try explicit patterns first, in priority order
  for (const { pattern } of explicitTotalPatterns) {
    const matches = Array.from(text.matchAll(pattern));
    if (matches.length > 0) {
      // Take the LAST match (typically the final total at bottom of document)
      const lastMatch = matches[matches.length - 1];
      const amount = parseFloat(lastMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) {
        result.totalAmount = amount;
        break;
      }
    }
  }

  // Fallback: generic dollar amounts (only if no explicit total found)
  if (result.totalAmount === null) {
    const genericPatterns = [
      /\$([\d,]+\.\d{2})/g, // Dollar amounts
      /([\d,]+\.\d{2})\s*(?:USD|$)/gi,
    ];

    for (const pattern of genericPatterns) {
      const matches = Array.from(text.matchAll(pattern));
      if (matches.length > 0) {
        // Take the largest amount as fallback
        const amounts = matches.map(m => parseFloat(m[1].replace(/,/g, ''))).filter(n => !isNaN(n));
        if (amounts.length > 0) {
          result.totalAmount = Math.max(...amounts);
          break;
        }
      }
    }
  }

  // Document/Invoice number patterns
  const docNumberPatterns = [
    /(?:invoice\s*(?:#|no|number)|bill\s*(?:#|no|number)|document\s*(?:#|no|number)|ref|reference):\s*([A-Za-z0-9\-\/]+)/i,
    /(?:inv|bill|doc)\b[\s\-]?#?\s*:?\s*([A-Za-z0-9\-\/]{3,})/i,
    /\b(INV|BILL|DOC|INVOICE)[\-\/]?([A-Za-z0-9]{3,})\b/i,
  ];

  for (const pattern of docNumberPatterns) {
    const match = text.match(pattern);
    if (match && (match[1] || match[2])) {
      result.documentNumber = (match[1] || match[2]).trim();
      break;
    }
  }

  // Document type detection
  const typePatterns = [
    { pattern: /invoice/i, type: 'invoice' },
    { pattern: /bill/i, type: 'bill' },
    { pattern: /receipt/i, type: 'receipt' },
    { pattern: /purchase\s*order|po\b/i, type: 'purchase_order' },
    { pattern: /credit\s*memo/i, type: 'credit_memo' },
    { pattern: /statement/i, type: 'statement' },
  ];

  for (const { pattern, type } of typePatterns) {
    if (pattern.test(text)) {
      result.documentType = type;
      break;
    }
  }

  return result;
}

/**
 * Normalize date string to YYYY-MM-DD format
 */
function normalizeDate(dateStr: string): string | null {
  // Try multiple formats
  const formats = [
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/, // MM/DD/YYYY or DD/MM/YYYY
    /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/, // YYYY/MM/DD
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})/, // MM/DD/YY
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let year: number, month: number, day: number;
      
      if (match[3].length === 4) {
        // MM/DD/YYYY or DD/MM/YYYY - assume US format MM/DD/YYYY
        month = parseInt(match[1], 10);
        day = parseInt(match[2], 10);
        year = parseInt(match[3], 10);
      } else if (match[1].length === 4) {
        // YYYY/MM/DD
        year = parseInt(match[1], 10);
        month = parseInt(match[2], 10);
        day = parseInt(match[3], 10);
      } else {
        // MM/DD/YY
        month = parseInt(match[1], 10);
        day = parseInt(match[2], 10);
        year = 2000 + parseInt(match[3], 10);
      }

      // Validate
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2000 && year <= 2100) {
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      }
    }
  }

  return null;
}

/**
 * Download document from Supabase storage
 */
export async function downloadDocument(storagePath: string): Promise<Buffer> {
  const { data, error } = await supabaseAdmin.storage
    .from('evidence')
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Failed to download document: ${error?.message}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Get collection request with associated transactions
 */
export async function getCollectionRequestWithTransactions(
  collectionRequestId: string
): Promise<CollectionRequestWithTransactions | null> {
  const { data: request, error } = await supabaseAdmin
    .from('collection_requests')
    .select('*')
    .eq('id', collectionRequestId)
    .single();

  if (error || !request) {
    return null;
  }

  // For now, return the transaction IDs as-is
  // In a full implementation, you'd fetch actual QBO transaction data
  const transactionIds: string[] = request.transaction_ids || [];
  
  // Mock QBO transactions - in production, fetch from QBO API
  const transactions: QBOTransaction[] = transactionIds.map((id, index) => ({
    txnId: id,
    txnType: 'Invoice',
    date: '2024-01-15',
    vendor: `Vendor ${index + 1}`,
    amount: 100.00 + index * 50,
    docNumber: `INV-${1000 + index}`,
  }));

  return {
    id: request.id,
    realmId: request.realm_id,
    transactionIds,
    transactions,
  };
}

/**
 * Calculate match confidence between extracted document and QBO transaction
 * Also returns field-level comparison details
 */
export function calculateMatchConfidence(
  docFields: ExtractedDocumentFields,
  transaction: QBOTransaction
): { confidence: number; signals: MatchResult['matchSignals']; fieldComparisons: FieldComparisonDetail[] } {
  let score = 0;
  const signals = {
    vendorMatch: false,
    amountMatch: false,
    dateMatch: false,
    documentNumberMatch: false,
  };
  const fieldComparisons: FieldComparisonDetail[] = [];

  // Vendor name match (30 points)
  if (docFields.vendorName && transaction.vendor) {
    const similarity = stringSimilarity(docFields.vendorName.toLowerCase(), transaction.vendor.toLowerCase());
    const match = similarity > 0.8;
    if (match) {
      signals.vendorMatch = true;
      score += 30;
    } else if (similarity > 0.5) {
      score += 15; // Partial match
    }
    fieldComparisons.push({
      fieldName: 'vendorName',
      documentValue: docFields.vendorName,
      transactionValue: transaction.vendor,
      match,
      similarity,
    });
  } else {
    fieldComparisons.push({
      fieldName: 'vendorName',
      documentValue: docFields.vendorName,
      transactionValue: transaction.vendor,
      match: false,
    });
  }

  // Amount match (30 points) - exact match within 0.01
  if (docFields.totalAmount !== null && transaction.amount !== null) {
    const difference = Math.abs(docFields.totalAmount - transaction.amount);
    const match = difference < 0.01;
    if (match) {
      signals.amountMatch = true;
      score += 30;
    } else if (difference < 1.00) {
      score += 15; // Close match
    }
    fieldComparisons.push({
      fieldName: 'totalAmount',
      documentValue: docFields.totalAmount,
      transactionValue: transaction.amount,
      match,
      difference,
    });
  } else {
    fieldComparisons.push({
      fieldName: 'totalAmount',
      documentValue: docFields.totalAmount,
      transactionValue: transaction.amount,
      match: false,
    });
  }

  // Date match (20 points) - within 3 days
  if (docFields.documentDate && transaction.date) {
    const docDate = new Date(docFields.documentDate);
    const txnDate = new Date(transaction.date);
    const diffDays = Math.abs((docDate.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const match = diffDays <= 1;
    if (match) {
      signals.dateMatch = true;
      score += 20;
    } else if (diffDays <= 3) {
      score += 10;
    } else if (diffDays <= 7) {
      score += 5;
    }
    fieldComparisons.push({
      fieldName: 'documentDate',
      documentValue: docFields.documentDate,
      transactionValue: transaction.date,
      match,
      difference: diffDays,
    });
  } else {
    fieldComparisons.push({
      fieldName: 'documentDate',
      documentValue: docFields.documentDate,
      transactionValue: transaction.date,
      match: false,
    });
  }

  // Document number match (20 points)
  if (docFields.documentNumber && transaction.docNumber) {
    const docNumLower = docFields.documentNumber.toLowerCase();
    const txnNumLower = transaction.docNumber.toLowerCase();
    const match = docNumLower === txnNumLower;
    if (match) {
      signals.documentNumberMatch = true;
      score += 20;
    } else if (docNumLower.includes(txnNumLower) || txnNumLower.includes(docNumLower)) {
      score += 10;
    }
    fieldComparisons.push({
      fieldName: 'documentNumber',
      documentValue: docFields.documentNumber,
      transactionValue: transaction.docNumber,
      match,
    });
  } else {
    fieldComparisons.push({
      fieldName: 'documentNumber',
      documentValue: docFields.documentNumber,
      transactionValue: transaction.docNumber,
      match: false,
    });
  }

  return { confidence: Math.min(score, 100), signals, fieldComparisons };
}

/**
 * Match a document against all transactions in a collection request
 */
export async function matchDocumentToTransactions(
  documentId: string,
  docFields: ExtractedDocumentFields,
  collectionRequestId: string
): Promise<MatchResult> {
  const request = await getCollectionRequestWithTransactions(collectionRequestId);
  
  if (!request || request.transactions.length === 0) {
    return {
      documentId,
      transactionId: null,
      confidence: 0,
      matchSignals: {
        vendorMatch: false,
        amountMatch: false,
        dateMatch: false,
        documentNumberMatch: false,
      },
      status: 'no_match',
    };
  }

  const results = request.transactions.map(txn => {
    const { confidence, signals, fieldComparisons } = calculateMatchConfidence(docFields, txn);
    return { transaction: txn, confidence, signals, fieldComparisons };
  });

  // Sort by confidence descending
  results.sort((a, b) => b.confidence - a.confidence);

  const bestMatch = results[0];
  
  // Check for multiple high-confidence candidates
  // Auto-match requires confidence >= 90 with exactly one candidate at that level.
  // Ambiguous requires top candidate >= 60 (but not qualifying as auto-match).
  // No-match is below 60.
  const highConfidenceCount = results.filter(r => r.confidence >= 90).length;

  // Build candidate details with field-level comparisons
  const candidateDetails: CandidateMatchDetail[] = results.map(r => ({
    transactionId: r.transaction.txnId,
    confidence: r.confidence,
    fieldComparisons: r.fieldComparisons,
    signals: r.signals,
  }));

  if (bestMatch.confidence >= 90 && highConfidenceCount === 1) {
    return {
      documentId,
      transactionId: bestMatch.transaction.txnId,
      confidence: bestMatch.confidence,
      matchSignals: bestMatch.signals,
      status: 'matched',
      matchedTransaction: bestMatch.transaction,
      allCandidates: results.map(r => r.transaction),
      candidateDetails,
    };
  } else if (bestMatch.confidence >= 60) {
    return {
      documentId,
      transactionId: null,
      confidence: bestMatch.confidence,
      matchSignals: bestMatch.signals,
      status: 'multiple_candidates',
      allCandidates: results.map(r => r.transaction),
      candidateDetails,
    };
  } else {
    return {
      documentId,
      transactionId: null,
      confidence: bestMatch.confidence,
      matchSignals: bestMatch.signals,
      status: 'no_match',
      allCandidates: results.map(r => r.transaction),
      candidateDetails,
    };
  }
}

/**
 * Main pipeline function: Process an inbox document and match to transactions
 */
export async function processInboxDocument(
  documentId: string,
  collectionRequestId: string
): Promise<MatchResult> {
  // 1. Get document metadata
  const { data: document, error: docError } = await supabaseAdmin
    .from('inbox_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (docError || !document) {
    throw new Error(`Document not found: ${documentId}`);
  }

  // 2. Download document from storage
  const buffer = await downloadDocument(document.storage_path);

  // 3. Extract text
  const text = await extractTextFromDocument(buffer, document.content_type);

  // 4. Extract fields
  const fields = extractFieldsFromText(text);

  // 5. Match against collection request transactions
  const matchResult = await matchDocumentToTransactions(documentId, fields, collectionRequestId);

  // 6. Store match result in database (extend inbox_documents or create new table)
  await supabaseAdmin
    .from('inbox_documents')
    .update({
      extracted_vendor: fields.vendorName,
      extracted_date: fields.documentDate,
      extracted_amount: fields.totalAmount,
      extracted_document_number: fields.documentNumber,
      extracted_type: fields.documentType,
      match_status: matchResult.status,
      match_confidence: matchResult.confidence,
      matched_transaction_id: matchResult.transactionId,
      match_field_details: matchResult.candidateDetails || null,
      processed_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  return matchResult;
}

/**
 * Process all documents for a collection request
 */
export async function processCollectionRequestDocuments(
  collectionRequestId: string
): Promise<MatchResult[]> {
  // Get all documents for this realm that haven't been processed
  const { data: request } = await supabaseAdmin
    .from('collection_requests')
    .select('realm_id')
    .eq('id', collectionRequestId)
    .single();

  if (!request) {
    throw new Error(`Collection request not found: ${collectionRequestId}`);
  }

  const { data: documents, error } = await supabaseAdmin
    .from('inbox_documents')
    .select('*')
    .eq('realm_id', request.realm_id)
    .is('processed_at', null); // Only unprocessed documents

  if (error) {
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }

  const results: MatchResult[] = [];
  
  for (const doc of documents || []) {
    try {
      const result = await processInboxDocument(doc.id, collectionRequestId);
      results.push(result);
    } catch (e) {
      console.error(`Failed to process document ${doc.id}:`, e instanceof Error ? e.message : String(e));
      results.push({
        documentId: doc.id,
        transactionId: null,
        confidence: 0,
        matchSignals: { vendorMatch: false, amountMatch: false, dateMatch: false, documentNumberMatch: false },
        status: 'no_match',
      });
    }
  }

  return results;
}