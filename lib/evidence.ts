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
  // ---------------------------------------------------------------------
  // Phase 4B – Matching logic
  // ---------------------------------------------------------------------
  // 1️⃣ Index non‑orphaned attachables by their entity reference so we can
  //    efficiently join them to transactions (entityType + entityId).
  // 2️⃣ Preserve all required transaction fields.
  // 3️⃣ Preserve all attachment fields produced by Phase 3C.
  // 4️⃣ Include a deterministic `hasAttachment` flag (true for matched rows).
  // 5️⃣ Ensure orphaned attachments are not lost – they are added after the
  //    transaction loop with null transaction fields.
  // 6️⃣ Support multiple attachments per transaction by emitting a row for each.
  // 7️⃣ Track attachables that reference non-transaction entities (Vendor,
  //    Customer, etc.) and surface them as "unmatched" rows so they are not
  //    silently dropped from the register.
  // ---------------------------------------------------------------------

  const attachMap: Record<string, any[]> = {};
  const orphaned: any[] = [];

  for (const a of attachables) {
    if (a.orphaned) {
      // Collect orphaned records to be added later.
      orphaned.push(a);
      continue;
    }
    const key = `${a.entityType ?? ''}:${a.entityId ?? ''}`;
    if (!attachMap[key]) attachMap[key] = [];
    attachMap[key].push(a);
  }

  const register: any[] = [];

  // Track which attachables were successfully matched to a transaction.
  // Use a Set of attachableId strings for O(1) lookup.
  const consumedAttachableIds = new Set<string>();

  for (const txn of transactions) {
    const key = `${txn.txnType ?? ''}:${txn.txnId ?? ''}`;
    const related = attachMap[key] ?? [];
    if (related.length === 0) {
      // Phase 4C – transaction with no attachment. Emit a row with null attachment fields.
      register.push({
        txnId: txn.txnId,
        txnType: txn.txnType,
        date: txn.date,
        vendor: txn.vendor,
        amount: txn.amount,
        docNumber: txn.docNumber,
        attachableId: null,
        fileName: null,
        fileSize: null,
        downloadUrl: null,
        entityType: null,
        entityId: null,
        orphaned: false,
        hasAttachment: false,
      });
      continue;
    }
    for (const att of related) {
      // Mark this attachable as consumed by a transaction match.
      if (att.attachableId) {
        consumedAttachableIds.add(att.attachableId);
      }
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
        hasAttachment: true,
      });
    }
  }

  // Append orphaned attachments (no matching transaction). Transaction fields
  // are left null/undefined to indicate the lack of a parent transaction.
  for (const att of orphaned) {
    register.push({
      txnId: null,
      txnType: null,
      date: null,
      vendor: null,
      amount: null,
      docNumber: null,
      attachableId: att.attachableId,
      fileName: att.fileName,
      fileSize: att.fileSize,
      downloadUrl: att.downloadUrl,
      entityType: att.entityType,
      entityId: att.entityId,
      orphaned: true,
      hasAttachment: true,
    });
  }

  // BUG 2 FIX: Add unmatched attachables - those with a valid AttachableRef
  // that points to a non-transaction entity (Vendor, Customer, etc.).
  // These have entityType/entityId but were not consumed by any transaction match.
  for (const a of attachables) {
    if (a.orphaned) continue; // Already handled above
    if (!a.attachableId) continue; // Safety check
    if (consumedAttachableIds.has(a.attachableId)) continue; // Already matched

    // This attachable has a valid reference but was not matched to any transaction.
    // It points to a non-transaction entity (Vendor, Customer, etc.).
    register.push({
      txnId: null,
      txnType: a.entityType, // The entity type (e.g., "Vendor", "Customer")
      date: null,
      vendor: null,
      amount: null,
      docNumber: null,
      attachableId: a.attachableId,
      fileName: a.fileName,
      fileSize: a.fileSize,
      downloadUrl: a.downloadUrl,
      entityType: a.entityType,
      entityId: a.entityId,
      orphaned: false,
      hasAttachment: true,
      unmatched: true,
    });
  }

  // Ensure deterministic ordering: first by transaction date, then by txnId,
  // and finally by attachableId. Orphaned rows (no txnId) will appear after
  // all matched rows.
  register.sort((a, b) => {
    // Compare dates (null dates are treated as greater).
    if (a.date && b.date) {
      const diff = a.date.localeCompare(b.date);
      if (diff !== 0) return diff;
    } else if (a.date) return -1;
    else if (b.date) return 1;

    // Compare txnId (nulls last).
    if (a.txnId && b.txnId) {
      const diff = a.txnId.localeCompare(b.txnId);
      if (diff !== 0) return diff;
    } else if (a.txnId) return -1;
    else if (b.txnId) return 1;

    // Finally compare attachableId to guarantee stable order.
    if (a.attachableId && b.attachableId) {
      return a.attachableId.localeCompare(b.attachableId);
    }
    return 0;
  });

  return register;
}
