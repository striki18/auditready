/**
 * ZIP utility functions for reading and extracting ZIP files.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yauzl from 'yauzl';

export interface ZipEntry {
  name: string;
  size: number;
  compressedSize: number;
  isDirectory: boolean;
}

/**
 * List all entries in a ZIP file.
 */
export async function listZipContents(zipPath: string): Promise<ZipEntry[]> {
  return new Promise((resolve, reject) => {
    const entries: ZipEntry[] = [];
    
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(err);
        return;
      }
      
      zipfile.readEntry();
      
      zipfile.on('entry', (entry) => {
        entries.push({
          name: entry.fileName,
          size: entry.uncompressedSize,
          compressedSize: entry.compressedSize,
          isDirectory: /\/$/.test(entry.fileName)
        });
        zipfile.readEntry();
      });
      
      zipfile.on('end', () => {
        resolve(entries);
      });
      
      zipfile.on('error', (err) => {
        reject(err);
      });
    });
  });
}

/**
 * Extract a specific file from a ZIP archive.
 */
export async function extractZipFile(zipPath: string, fileName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(err);
        return;
      }
      
      zipfile.readEntry();
      
      zipfile.on('entry', (entry) => {
        if (entry.fileName === fileName) {
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              reject(err);
              return;
            }
            
            const chunks: Buffer[] = [];
            readStream.on('data', (chunk) => chunks.push(chunk));
            readStream.on('end', () => {
              resolve(Buffer.concat(chunks).toString('utf-8'));
            });
            readStream.on('error', (err) => {
              reject(err);
            });
          });
        } else {
          zipfile.readEntry();
        }
      });
      
      zipfile.on('end', () => {
        reject(new Error(`File not found in ZIP: ${fileName}`));
      });
      
      zipfile.on('error', (err) => {
        reject(err);
      });
    });
  });
}