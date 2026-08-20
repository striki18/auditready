import { NextRequest, NextResponse } from 'next/server';
import { downloadFile } from '@/lib/quickbooks';
import { getAttachables, normalizeAttachables } from '@/lib/quickbooks';

/**
 * GET /api/quickbooks/attachables/[attachableId]/download
 * Downloads a single attachment file from QuickBooks and saves it with the new naming convention:
 * {txnType}_{docNumber}_{originalFileName}
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attachableId: string }> }
) {
  try {
    const { attachableId } = await params;

    // 1. Get all attachables to find the matching one and its metadata
    const raw = await getAttachables();
    const normalized = normalizeAttachables(raw?.attachables ?? []);
    
    const attachable = normalized.find(a => a.attachableId === attachableId);
    if (!attachable) {
      return NextResponse.json({ error: 'Attachable not found' }, { status: 404 });
    }

    // 2. Get the evidence register to find txnType and docNumber for this attachable
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate query parameters are required' },
        { status: 400 }
      );
    }

    // 3. Build evidence register to get txnType and docNumber
    const { getTransactions, normalizeTransactionList } = await import('@/lib/quickbooks');
    const { buildEvidenceRegister } = await import('@/lib/evidence');
    
    const rawTransactions = await getTransactions(startDate, endDate);
    const transactions = normalizeTransactionList(rawTransactions);
    const register = buildEvidenceRegister(transactions, normalized);

    // Find the matched record for this attachable
    const matchedRecord = register.find((m: any) => m.attachableId === attachableId);
    
    let txnType = 'Unknown';
    let docNumber = 'Unknown';
    
    if (matchedRecord && matchedRecord.txnType && matchedRecord.docNumber) {
      txnType = matchedRecord.txnType;
      docNumber = matchedRecord.docNumber;
    } else if (attachable.orphaned) {
      // For orphaned attachments, use a default
      txnType = 'Orphaned';
      docNumber = 'N/A';
    }

    // 4. Determine the destination folder (project root / attachments)
    const path = await import('path');
    const destFolder = path.join(process.cwd(), 'attachments');

    // 5. Generate the new filename: {txnType}_{docNumber}_{originalFileName}
    // Sanitize filename components to remove invalid characters (e.g., / in "N/A")
    const sanitize = (s: string) => s.replace(/[\\/:*?"<>|]/g, '_');
    const originalFileName = attachable.fileName || 'unknown';
    const newFileName = `${sanitize(txnType)}_${sanitize(docNumber)}_${originalFileName}`;

    // 6. Download the file
    const result = await downloadFile(attachableId, newFileName, destFolder);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      filePath: result.filePath,
      fileName: newFileName,
      txnType,
      docNumber,
      originalFileName,
    });
  } catch (e: any) {
    console.error('Download endpoint error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}