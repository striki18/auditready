/**
 * Output storage utilities for Phase 6.
 * Generates and saves CSV files to the company output directory.
 */

import { generateEvidenceRegisterCsv, generateMissingReportCsv } from './csv';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Get the company output directory path.
 * Uses a dedicated output folder in the project root.
 */
export function getCompanyOutputDir(companyName?: string): string {
  const baseDir = process.cwd();
  const safeCompanyName = (companyName || 'company').replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(baseDir, 'output', safeCompanyName);
}

/**
 * Ensure the output directory exists.
 */
export function ensureOutputDir(companyName?: string): string {
  const outputDir = getCompanyOutputDir(companyName);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  return outputDir;
}

/**
 * Split evidence register into matched and missing arrays.
 * - matched: records with hasAttachment=true and not orphaned (linked to transaction)
 * - missing: records with hasAttachment=false (transactions without attachments)
 * Note: Orphaned attachments (hasAttachment=true, orphaned=true) are excluded from both
 * as they don't belong to a specific transaction for CSV reporting.
 */
export function splitEvidenceRegister(register: any[]): { matched: any[]; missing: any[] } {
  const matched: any[] = [];
  const missing: any[] = [];

  for (const record of register) {
    if (record.hasAttachment && !record.orphaned) {
      // Matched transaction with attachment
      matched.push(record);
    } else if (!record.hasAttachment && record.txnId) {
      // Transaction without attachment
      missing.push(record);
    }
    // Orphaned attachments are excluded from both CSVs per requirements
  }

  return { matched, missing };
}

/**
 * Generate and save both CSV files.
 * Returns the file paths of the generated CSVs.
 */
export async function generateAndSaveCsvs(
  register: any[],
  companyName?: string,
  startDate?: string,
  endDate?: string
): Promise<{
  evidenceRegisterPath: string;
  missingDocumentsPath: string;
  matchedCount: number;
  missingCount: number;
}> {
  // Split register into matched and missing
  const { matched, missing } = splitEvidenceRegister(register);

  // Generate CSV content
  const evidenceCsv = generateEvidenceRegisterCsv(matched);
  const missingCsv = generateMissingReportCsv(missing);

  // Ensure output directory exists
  const outputDir = ensureOutputDir(companyName);

  // Define file paths
  const evidenceRegisterPath = path.join(outputDir, 'evidence_register.csv');
  const missingDocumentsPath = path.join(outputDir, 'missing_documents.csv');

  // Write files
  fs.writeFileSync(evidenceRegisterPath, evidenceCsv, 'utf-8');
  fs.writeFileSync(missingDocumentsPath, missingCsv, 'utf-8');

  return {
    evidenceRegisterPath,
    missingDocumentsPath,
    matchedCount: matched.length,
    missingCount: missing.length,
  };
}

/**
 * Read and parse a CSV file for verification.
 */
export function readCsv(filePath: string): any[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    // Simple CSV parsing - handles quoted fields
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    
    const obj: any = {};
    headers.forEach((header, idx) => {
      obj[header] = values[idx] ?? '';
    });
    return obj;
  });
}