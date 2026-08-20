import { NextRequest, NextResponse } from 'next/server';
import { downloadFile, DownloadFileResult } from '@/lib/quickbooks';
import { getAttachables, normalizeAttachables } from '@/lib/quickbooks';

/**
 * GET /api/quickbooks/attachables/[attachableId]/download
 * Downloads a single attachment file from QuickBooks and saves it with the new naming convention:
 * {txnType}_{docNumber}_{originalFileName}
 * 
 * Phase 5C: Returns structured response with failed[] array instead of throwing 500
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
      // Phase 5C: Log and return structured failure with failed[] array
      console.error(`Download failed for attachableId=${attachableId}: Attachable not found`);
      const failedEntry = {
        success: false,
        error: 'Attachable not found',
        attachableId,
        fileName: 'unknown',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json({
        success: false,
        error: 'Attachable not found',
        attachableId,
        fileName: 'unknown',
        timestamp: new Date().toISOString(),
        failed: [failedEntry],
      }, { status: 200 }); // Return 200 with failure info instead of 404
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

    // 6. Download the file with failure collection
    const failed: DownloadFileResult[] = [];
    const result = await downloadFile(attachableId, newFileName, destFolder, failed);

    // Phase 5C: Return structured response with failed[] instead of 500
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
        attachableId: result.attachableId,
        fileName: result.fileName,
        timestamp: result.timestamp,
        failed: failed,
      }, { status: 200 }); // Return 200 with failure info instead of 500
    }

    return NextResponse.json({
      success: true,
      filePath: result.filePath,
      fileName: newFileName,
      txnType,
      docNumber,
      originalFileName,
      failed: failed, // Empty array for successful downloads
    });
  } catch (e: any) {
    console.error('Download endpoint error:', e);
    // Even unexpected errors should not crash - return structured failure
    return NextResponse.json({
      success: false,
      error: e.message,
      attachableId: (await params).attachableId,
      fileName: 'unknown',
      timestamp: new Date().toISOString(),
      failed: [{
        success: false,
        error: e.message,
        attachableId: (await params).attachableId,
        fileName: 'unknown',
        timestamp: new Date().toISOString(),
      }],
    }, { status: 200 });
  }
}
