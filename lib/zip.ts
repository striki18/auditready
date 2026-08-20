/**
 * ZIP Package Generation for Phase 7.
 * Creates audit package ZIP files containing attachments and CSV reports.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as archiver from 'archiver';
import { getCompanyOutputDir } from './output';
import { listZipContents, extractZipFile, ZipEntry } from './zip-utils';

/**
 * Sanitize a string for use in filesystem paths.
 * Replaces unsafe characters with underscores.
 */
export function sanitizeForFilename(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Generate the ZIP filename following the required convention:
 * AuditPackage_{companyName}_{startDate}_{endDate}.zip
 */
export function generateZipFilename(companyName: string, startDate: string, endDate: string): string {
  const safeCompanyName = sanitizeForFilename(companyName);
  const safeStartDate = sanitizeForFilename(startDate);
  const safeEndDate = sanitizeForFilename(endDate);
  return `AuditPackage_${safeCompanyName}_${safeStartDate}_${safeEndDate}.zip`;
}

/**
 * Generate a ZIP package containing:
 * - /attachments/ (all attachment files from the attachments folder)
 * - evidence_register.csv
 * - missing_documents.csv
 * 
 * @param companyName - Company name for naming convention
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Path to the generated ZIP file
 */
export async function generateZip(
  companyName: string,
  startDate: string,
  endDate: string
): Promise<string> {
  const zipFilename = generateZipFilename(companyName, startDate, endDate);
  const outputDir = getCompanyOutputDir(companyName);
  const zipPath = path.join(outputDir, zipFilename);
  
  const attachmentsDir = path.join(process.cwd(), 'attachments');
  
  // Create the output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Create a write stream for the ZIP file
  const output = fs.createWriteStream(zipPath);
  const archive = new archiver.ZipArchive({
    zlib: { level: 9 } // Maximum compression
  });
  
  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(`ZIP created: ${zipPath} (${archive.pointer()} bytes)`);
      resolve(zipPath);
    });
    
    archive.on('error', (err: Error) => {
      reject(err);
    });
    
    archive.pipe(output);
    
    // Add evidence_register.csv
    const evidenceRegisterPath = path.join(outputDir, 'evidence_register.csv');
    if (fs.existsSync(evidenceRegisterPath)) {
      archive.file(evidenceRegisterPath, { name: 'evidence_register.csv' });
    }
    
    // Add missing_documents.csv
    const missingDocumentsPath = path.join(outputDir, 'missing_documents.csv');
    if (fs.existsSync(missingDocumentsPath)) {
      archive.file(missingDocumentsPath, { name: 'missing_documents.csv' });
    }
    
    // Add all files from attachments directory
    if (fs.existsSync(attachmentsDir)) {
      const attachmentFiles = fs.readdirSync(attachmentsDir);
      for (const file of attachmentFiles) {
        const filePath = path.join(attachmentsDir, file);
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          archive.file(filePath, { name: `attachments/${file}` });
        }
      }
    }
    
    archive.finalize();
  });
}

/**
 * Verify a generated ZIP package.
 * Checks all required verification criteria.
 */
export interface ZipVerificationResult {
  zipCreated: boolean;
  filenameValid: boolean;
  validArchive: boolean;
  attachmentsPresent: boolean;
  evidenceRegisterPresent: boolean;
  missingDocumentsPresent: boolean;
  attachmentsNonEmpty: boolean;
  csvReadable: boolean;
  noExpectedFilesMissing: boolean;
  noUnexpectedFiles: boolean;
  contentsMatchSource: boolean;
  errors: string[];
}

export async function verifyZip(
  zipPath: string,
  companyName: string,
  startDate: string,
  endDate: string
): Promise<ZipVerificationResult> {
  const result: ZipVerificationResult = {
    zipCreated: false,
    filenameValid: false,
    validArchive: false,
    attachmentsPresent: false,
    evidenceRegisterPresent: false,
    missingDocumentsPresent: false,
    attachmentsNonEmpty: true,
    csvReadable: true,
    noExpectedFilesMissing: false,
    noUnexpectedFiles: true,
    contentsMatchSource: false,
    errors: []
  };
  
  const expectedZipFilename = generateZipFilename(companyName, startDate, endDate);
  const actualFilename = path.basename(zipPath);
  
  const outputDir = getCompanyOutputDir(companyName);
  
  // 1. ZIP file is actually created
  if (fs.existsSync(zipPath)) {
    result.zipCreated = true;
  } else {
    result.errors.push('ZIP file does not exist');
    return result;
  }
  
  // 2. ZIP filename follows the required naming convention
  if (actualFilename === expectedZipFilename) {
    result.filenameValid = true;
  } else {
    result.errors.push(`Filename mismatch: expected ${expectedZipFilename}, got ${actualFilename}`);
  }
  
  // 3. ZIP can be opened as a valid archive - we'll verify by reading contents
  // Use archiver to list contents (we'll re-read the zip)
  const { listZipContents } = await import('./zip-utils');
  const contents = await listZipContents(zipPath);
  
  if (contents.length > 0) {
    result.validArchive = true;
  } else {
    result.errors.push('ZIP appears to be empty or invalid');
    return result;
  }
  
  // Check for required files
  const evidenceRegisterFound = contents.some(c => c.name === 'evidence_register.csv');
  const missingDocumentsFound = contents.some(c => c.name === 'missing_documents.csv');
  const attachmentFiles = contents.filter(c => c.name.startsWith('attachments/') && !c.name.endsWith('/'));
  
  result.evidenceRegisterPresent = evidenceRegisterFound;
  result.missingDocumentsPresent = missingDocumentsFound;
  result.attachmentsPresent = attachmentFiles.length > 0;
  
  if (!evidenceRegisterFound) result.errors.push('evidence_register.csv not found in ZIP');
  if (!missingDocumentsFound) result.errors.push('missing_documents.csv not found in ZIP');
  if (attachmentFiles.length === 0) result.errors.push('No attachment files found in ZIP');
  
  // 7. Attachment files inside the ZIP are non-empty
  for (const file of attachmentFiles) {
    if (file.size === 0) {
      result.attachmentsNonEmpty = false;
      result.errors.push(`Empty attachment file: ${file.name}`);
    }
  }
  
  // 8. CSV files inside the ZIP are readable
  // We'll extract and check them
  const { extractZipFile } = await import('./zip-utils');
  
  if (evidenceRegisterFound) {
    try {
      const csvContent = await extractZipFile(zipPath, 'evidence_register.csv');
      const lines = csvContent.trim().split('\n');
      if (lines.length < 1) {
        result.csvReadable = false;
        result.errors.push('evidence_register.csv is empty or unreadable');
      }
    } catch (e) {
      result.csvReadable = false;
      result.errors.push(`Failed to read evidence_register.csv: ${e}`);
    }
  }
  
  if (missingDocumentsFound) {
    try {
      const csvContent = await extractZipFile(zipPath, 'missing_documents.csv');
      const lines = csvContent.trim().split('\n');
      if (lines.length < 1) {
        result.csvReadable = false;
        result.errors.push('missing_documents.csv is empty or unreadable');
      }
    } catch (e) {
      result.csvReadable = false;
      result.errors.push(`Failed to read missing_documents.csv: ${e}`);
    }
  }
  
  // 9. No expected files are silently omitted
  // Expected: evidence_register.csv, missing_documents.csv, all attachment files
  const expectedFiles = new Set([
    'evidence_register.csv',
    'missing_documents.csv'
  ]);
  
  // Add all source attachment files as expected
  const attachmentsDir = path.join(process.cwd(), 'attachments');
  if (fs.existsSync(attachmentsDir)) {
    const sourceAttachments = fs.readdirSync(attachmentsDir);
    for (const file of sourceAttachments) {
      const filePath = path.join(attachmentsDir, file);
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        expectedFiles.add(`attachments/${file}`);
      }
    }
  }
  
  const foundFiles = new Set(contents.map(c => c.name));
  const missingExpected = [...expectedFiles].filter(f => !foundFiles.has(f));
  
  if (missingExpected.length === 0) {
    result.noExpectedFilesMissing = true;
  } else {
    result.noExpectedFilesMissing = false;
    result.errors.push(`Missing expected files: ${missingExpected.join(', ')}`);
  }
  
  // 10. No unexpected files are added
  const unexpectedFiles = [...foundFiles].filter(f => !expectedFiles.has(f));
  if (unexpectedFiles.length === 0) {
    result.noUnexpectedFiles = true;
  } else {
    result.noUnexpectedFiles = false;
    result.errors.push(`Unexpected files found: ${unexpectedFiles.join(', ')}`);
  }
  
  // 11. ZIP contents match the source output
  // Compare attachment file sizes
  let contentsMatch = true;
  for (const file of attachmentFiles) {
    const sourcePath = path.join(attachmentsDir, file.name.replace('attachments/', ''));
    if (fs.existsSync(sourcePath)) {
      const sourceStat = fs.statSync(sourcePath);
      if (sourceStat.size !== file.size) {
        contentsMatch = false;
        result.errors.push(`Size mismatch for ${file.name}: source=${sourceStat.size}, zip=${file.size}`);
      }
    }
  }
  
  // Compare CSV content
  if (evidenceRegisterFound) {
    const zipContent = await extractZipFile(zipPath, 'evidence_register.csv');
    const sourceContent = fs.readFileSync(path.join(outputDir, 'evidence_register.csv'), 'utf-8');
    if (zipContent !== sourceContent) {
      contentsMatch = false;
      result.errors.push('evidence_register.csv content does not match source');
    }
  }
  
  if (missingDocumentsFound) {
    const zipContent = await extractZipFile(zipPath, 'missing_documents.csv');
    const sourceContent = fs.readFileSync(path.join(outputDir, 'missing_documents.csv'), 'utf-8');
    if (zipContent !== sourceContent) {
      contentsMatch = false;
      result.errors.push('missing_documents.csv content does not match source');
    }
  }
  
  result.contentsMatchSource = contentsMatch;
  
  return result;
}