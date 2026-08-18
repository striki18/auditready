/**
 * Evidence Register utilities.
 *
 * The evidence register combines transaction data with any related
 * attachable (document) records. It is used in Phase 4A to provide a
 * joined view of the audit data.
 */

/**
 * Build an evidence register from normalized transactions and attachables.
 *
 * Each entry represents a transaction together with a single attachment
 * (if any). Transactions without attachments are omitted – handling of
 * missing‑attachment rows is performed in Phase 4C.
 *
 * @param transactions Array of normalized transaction objects (as returned
 *                     by `normalizeTransactionList`).
 * @param attachables  Array of normalized attachable objects (as returned
 *                     by `normalizeAttachables`).
 * @returns Array of joined records.
 */
export function buildEvidenceRegister(
  transactions: any[],
  attachables: any[]
): any[] {
  // Index attachables by entity type + entity id for quick lookup.
  const attachMap: Record<string, any[]> = {};
  for (const a of attachables) {
    if (a.orphaned) continue; // ignore orphaned records for the register
    const key = `${a.entityType ?? ''}:${a.entityId ?? ''}`;
    if (!attachMap[key]) attachMap[key] = [];
    attachMap[key].push(a);
  }

  const register: any[] = [];
  for (const txn of transactions) {
    const key = `${txn.txnType ?? ''}:${txn.txnId ?? ''}`;
    const related = attachMap[key] ?? [];
    if (related.length === 0) {
      // No attachment – Phase 4C will handle missing entries.
      continue;
    }
    for (const att of related) {
      register.push({
        txnId: txn.txnId,
        txnType: txn.txnType,
        date: txn.date,
        vendor: txn.vendor,
        amount: txn.amount,
        docNumber: txn.docNumber,
        attachableId: att.attachableId,
        fileName: att.fileName,
        fileSize: att.fileSize,
        downloadUrl: att.downloadUrl,
        entityType: att.entityType,
        entityId: att.entityId,
        orphaned: att.orphaned,
      });
    }
  }
  return register;
}
