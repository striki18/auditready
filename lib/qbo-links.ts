/**
 * QBO Deep-link utilities
 * This file contains only client-safe utilities for generating QBO URLs.
 * No server-side imports (fs, supabase, etc.) allowed.
 */

/**
 * Build a QBO deep-link URL for a transaction.
 *
 * QBO deep-link format: https://app.qbo.intuit.com/app/transaction/{transactionType}?txnId={transactionId}
 *
 * @param txnType - The transaction type as stored/mapped by AuditReady (e.g., "Invoice", "Bill", "BillPayment", "Check", etc.)
 * @param txnId - The QuickBooks transaction ID
 * @returns The full deep-link URL or null if either parameter is missing
 */
export function buildQboTransactionUrl(txnType: string | null, txnId: string | null): string | null {
  if (!txnType || !txnId) return null;
  // Use the transaction type exactly as stored/mapped by AuditReady
  return `https://app.qbo.intuit.com/app/transaction/${encodeURIComponent(txnType)}?txnId=${encodeURIComponent(txnId)}`;
}