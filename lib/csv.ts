/**
 * CSV generation utilities for Phase 6.
 * Minimal implementation without external dependencies.
 */

/**
 * Escape a value for CSV output.
 * Wraps in double quotes if value contains comma, double quote, or newline.
 * Escapes existing double quotes by doubling them.
 */
export function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  // Check if escaping is needed
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    // Escape double quotes by doubling them
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  return str;
}

/**
 * Generate CSV string from array of objects with specified column order.
 */
export function generateCsv(
  records: any[],
  columns: { key: string; header: string }[]
): string {
  // Build header row
  const headerRow = columns.map((c) => escapeCsvValue(c.header)).join(',');
  
  // Build data rows
  const dataRows = records.map((record) => {
    return columns.map((c) => escapeCsvValue(record[c.key])).join(',');
  });
  
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Generate Evidence Register CSV from matched[] records.
 * Required columns: Date, Transaction Type, Doc Number, Vendor/Customer, Amount, Attachment Filename, Attachable ID, Status
 */
export function generateEvidenceRegisterCsv(matched: any[]): string {
  const columns = [
    { key: 'date', header: 'Date' },
    { key: 'txnType', header: 'Transaction Type' },
    { key: 'docNumber', header: 'Doc Number' },
    { key: 'vendor', header: 'Vendor/Customer' },
    { key: 'amount', header: 'Amount' },
    { key: 'fileName', header: 'Attachment Filename' },
    { key: 'attachableId', header: 'Attachable ID' },
    { key: 'status', header: 'Status' },
  ];
  
  // Map matched records to CSV row format
  const csvRecords = matched.map((m) => ({
    date: m.date ?? '',
    txnType: m.txnType ?? '',
    docNumber: m.docNumber ?? '',
    vendor: m.vendor ?? '',
    amount: m.amount ?? '',
    fileName: m.fileName ?? '',
    attachableId: m.attachableId ?? '',
    status: m.hasAttachment ? 'Matched' : 'Missing',
  }));
  
  return generateCsv(csvRecords, columns);
}

/**
 * Generate Missing Documents CSV from missing[] records.
 * Required columns: Date, Transaction Type, Doc Number, Vendor/Customer, Amount, Missing Since
 */
export function generateMissingReportCsv(missing: any[]): string {
  const columns = [
    { key: 'date', header: 'Date' },
    { key: 'txnType', header: 'Transaction Type' },
    { key: 'docNumber', header: 'Doc Number' },
    { key: 'vendor', header: 'Vendor/Customer' },
    { key: 'amount', header: 'Amount' },
    { key: 'missingSince', header: 'Missing Since' },
  ];
  
  // Map missing records to CSV row format
  const csvRecords = missing.map((m) => ({
    date: m.date ?? '',
    txnType: m.txnType ?? '',
    docNumber: m.docNumber ?? '',
    vendor: m.vendor ?? '',
    amount: m.amount ?? '',
    // Missing Since: use the transaction date as the "missing since" date
    missingSince: m.date ?? '',
  }));
  
  return generateCsv(csvRecords, columns);
}