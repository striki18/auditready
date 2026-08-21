/**
 * Phase 8 — End-to-End Pipeline Orchestration
 * 
 * Orchestrates the complete audit package generation workflow by reusing
 * existing verified components from Phases 1-7.
 */

import { getTransactions, getAttachables, normalizeTransactionList, normalizeAttachables, downloadAllAttachments } from './quickbooks';
import { buildEvidenceRegister } from './evidence';
import { generateAndSaveCsvs, splitEvidenceRegister } from './output';
import { generateZip, sanitizeForFilename } from './zip';

export interface PipelineResult {
  success: boolean;
  zipPath?: string;
  error?: {
    stage: string;
    reason: string;
    details?: any;
  };
  stats: {
    transactionCount: number;
    attachableCount: number;
    matchedCount: number;
    missingCount: number;
    successfulDownloadCount: number;
    failedDownloadCount: number;
    zipSizeBytes: number;
    elapsedTimeMs: number;
  };
}

export interface PipelineProgress {
  stage: string;
  status: 'started' | 'in_progress' | 'completed' | 'failed';
  message: string;
  timestamp: string;
  counts?: Record<string, number>;
}

/**
 * Main end-to-end pipeline function.
 * Executes the complete audit package generation workflow.
 * 
 * @param companyId - Company identifier (realm ID)
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns PipelineResult with success status, ZIP path, and statistics
 */
export async function generatePackage(
  companyId: string,
  startDate: string,
  endDate: string
): Promise<PipelineResult> {
  const startTime = Date.now();
  const progressLog: PipelineProgress[] = [];
  
  // Initialize stats
  const stats = {
    transactionCount: 0,
    attachableCount: 0,
    matchedCount: 0,
    missingCount: 0,
    successfulDownloadCount: 0,
    failedDownloadCount: 0,
    zipSizeBytes: 0,
    elapsedTimeMs: 0,
  };

  // Helper to log progress
  const logProgress = (stage: string, status: 'started' | 'in_progress' | 'completed' | 'failed', message: string, counts?: Record<string, number>) => {
    const entry: PipelineProgress = {
      stage,
      status,
      message,
      timestamp: new Date().toISOString(),
      counts,
    };
    progressLog.push(entry);
    
    // Also log to console for real-time visibility
    const prefix = status === 'started' ? '▶' : status === 'completed' ? '✓' : '✗';
    console.log(`${prefix} [${entry.timestamp}] ${stage}: ${message}${counts ? ` (${JSON.stringify(counts)})` : ''}`);
  };

  // Helper to handle stage failures
  const handleFailure = (stage: string, reason: string, details?: any): PipelineResult => {
    logProgress(stage, 'failed', reason, details);
    return {
      success: false,
      error: { stage, reason, details },
      stats: { ...stats, elapsedTimeMs: Date.now() - startTime },
    };
  };

  try {
    // ========================================================================
    // STAGE 1: Transaction Retrieval
    // ========================================================================
    logProgress('Transaction Retrieval', 'started', 'Fetching transactions from QuickBooks');
    
    let rawTransactions: any;
    try {
      rawTransactions = await getTransactions(startDate, endDate);
    } catch (e: any) {
      return handleFailure('Transaction Retrieval', `Failed to retrieve transactions: ${e.message}`, { error: e.message });
    }

    const transactions = normalizeTransactionList(rawTransactions);
    stats.transactionCount = transactions.length;
    logProgress('Transaction Retrieval', 'completed', `Retrieved ${stats.transactionCount} transactions`, {
      transactionCount: stats.transactionCount,
    });

    // ========================================================================
    // STAGE 2: Attachable Retrieval
    // ========================================================================
    logProgress('Attachable Retrieval', 'started', 'Fetching attachables from QuickBooks');
    
    let rawAttachables: any;
    try {
      rawAttachables = await getAttachables();
    } catch (e: any) {
      return handleFailure('Attachable Retrieval', `Failed to retrieve attachables: ${e.message}`, { error: e.message });
    }

    const attachables = normalizeAttachables(rawAttachables);
    stats.attachableCount = attachables.length;
    logProgress('Attachable Retrieval', 'completed', `Retrieved ${stats.attachableCount} attachables`, {
      attachableCount: stats.attachableCount,
    });

    // ========================================================================
    // STAGE 3: Evidence Register Matching
    // ========================================================================
    logProgress('Evidence Register Matching', 'started', 'Building evidence register');
    
    let register: any[];
    try {
      register = buildEvidenceRegister(transactions, attachables);
    } catch (e: any) {
      return handleFailure('Evidence Register Matching', `Failed to build evidence register: ${e.message}`, { error: e.message });
    }

    // Split into matched and missing
    const { matched, missing } = splitEvidenceRegister(register);
    stats.matchedCount = matched.length;
    stats.missingCount = missing.length;
    logProgress('Evidence Register Matching', 'completed', `Matched: ${stats.matchedCount}, Missing: ${stats.missingCount}`, {
      matchedCount: stats.matchedCount,
      missingCount: stats.missingCount,
    });

    // ========================================================================
    // STAGE 4: Attachment Download
    // ========================================================================
    logProgress('Attachment Download', 'started', `Downloading ${stats.matchedCount} attachments`);
    
    let downloadResult: any;
    try {
      downloadResult = await downloadAllAttachments(matched, startDate, endDate, (progress) => {
        // Phase 10C: Log progress updates
        logProgress('Attachment Download', 'in_progress', 
          `Progress: ${progress.completed}/${progress.totalAttachments} (Successful: ${progress.successful}, Failed: ${progress.failed}) - Current: ${progress.currentFile}`);
      });
    } catch (e: any) {
      return handleFailure('Attachment Download', `Failed to download attachments: ${e.message}`, { error: e.message });
    }

    stats.successfulDownloadCount = downloadResult.successfulCount;
    stats.failedDownloadCount = downloadResult.failedCount;
    logProgress('Attachment Download', 'completed', `Downloaded ${stats.successfulDownloadCount} successful, ${stats.failedDownloadCount} failed`, {
      successfulCount: stats.successfulDownloadCount,
      failedCount: stats.failedDownloadCount,
    });

    // ========================================================================
    // STAGE 5: Evidence CSV Generation
    // ========================================================================
    logProgress('Evidence CSV Generation', 'started', 'Generating evidence_register.csv');
    
    let csvResult: any;
    try {
      csvResult = await generateAndSaveCsvs(register, companyId, startDate, endDate);
    } catch (e: any) {
      return handleFailure('Evidence CSV Generation', `Failed to generate CSVs: ${e.message}`, { error: e.message });
    }

    logProgress('Evidence CSV Generation', 'completed', 'CSVs generated and saved', {
      evidenceRegisterPath: csvResult.evidenceRegisterPath,
      missingDocumentsPath: csvResult.missingDocumentsPath,
      matchedCount: csvResult.matchedCount,
      missingCount: csvResult.missingCount,
    });

    // ========================================================================
    // STAGE 6: ZIP Generation
    // ========================================================================
    logProgress('ZIP Generation', 'started', 'Creating audit package ZIP');
    
    let zipPath: string;
    try {
      zipPath = await generateZip(companyId, startDate, endDate);
    } catch (e: any) {
      return handleFailure('ZIP Generation', `Failed to generate ZIP: ${e.message}`, { error: e.message });
    }

    // Get ZIP file size
    const fs = await import('fs');
    const zipStat = fs.statSync(zipPath);
    stats.zipSizeBytes = zipStat.size;
    
    logProgress('ZIP Generation', 'completed', `ZIP created: ${zipPath} (${stats.zipSizeBytes} bytes)`, {
      zipSizeBytes: stats.zipSizeBytes,
    });

    // ========================================================================
    // STAGE 7: Final Package Completion
    // ========================================================================
    stats.elapsedTimeMs = Date.now() - startTime;
    logProgress('Pipeline Complete', 'completed', `End-to-end pipeline completed in ${stats.elapsedTimeMs}ms`, {
      elapsedTimeMs: stats.elapsedTimeMs,
      transactionCount: stats.transactionCount,
      attachableCount: stats.attachableCount,
      matchedCount: stats.matchedCount,
      missingCount: stats.missingCount,
      successfulDownloadCount: stats.successfulDownloadCount,
      failedDownloadCount: stats.failedDownloadCount,
      zipSizeBytes: stats.zipSizeBytes,
    });

    // Final summary
    console.log('\n=== PIPELINE SUMMARY ===');
    console.log(`Transactions Retrieved: ${stats.transactionCount}`);
    console.log(`Attachables Retrieved: ${stats.attachableCount}`);
    console.log(`Matched Records: ${stats.matchedCount}`);
    console.log(`Missing Records: ${stats.missingCount}`);
    console.log(`Successful Downloads: ${stats.successfulDownloadCount}`);
    console.log(`Failed Downloads: ${stats.failedDownloadCount}`);
    console.log(`ZIP Size: ${stats.zipSizeBytes} bytes`);
    console.log(`Total Runtime: ${stats.elapsedTimeMs}ms`);
    console.log(`ZIP Path: ${zipPath}`);
    console.log('========================\n');

    return {
      success: true,
      zipPath,
      stats,
    };

  } catch (e: any) {
    // Catch any unexpected errors
    stats.elapsedTimeMs = Date.now() - startTime;
    logProgress('Pipeline', 'failed', `Unexpected error: ${e.message}`, { error: e.message });
    return {
      success: false,
      error: {
        stage: 'Pipeline',
        reason: `Unexpected error: ${e.message}`,
        details: e,
      },
      stats,
    };
  }
}

/**
 * Run the pipeline with a specific date range that works with the sandbox data.
 * This is a convenience function for testing.
 */
export async function runSandboxPipeline(): Promise<PipelineResult> {
  // Get the company ID from environment or use a default
  const companyId = process.env.INTUIT_REALM_ID || 'sandbox_company';
  
  // Use the date range that contains the sandbox transactions (2023-01-01 to 2023-12-31)
  // Based on Phase 2 verification: getTransactions('2023-01-01', '2023-12-31') returned 107 transactions
  const startDate = '2023-01-01';
  const endDate = '2023-12-31';
  
  console.log(`\n=== Starting Sandbox Pipeline Run ===`);
  console.log(`Company: ${companyId}`);
  console.log(`Date Range: ${startDate} to ${endDate}\n`);
  
  return generatePackage(companyId, startDate, endDate);
}