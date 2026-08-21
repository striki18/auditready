import { NextResponse, NextRequest } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { getCompanyOutputDir } from '@/lib/output';
import { sanitizeForFilename } from '@/lib/zip';

/**
 * GET /api/download
 * 
 * Downloads a generated audit package ZIP file.
 * Query parameters:
 *   companyId - Company identifier (realm ID)
 *   startDate - Start date in YYYY-MM-DD format
 *   endDate - End date in YYYY-MM-DD format
 * 
 * Returns the ZIP file as a download response.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const companyId = searchParams.get('companyId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  // Validate required parameters
  if (!companyId || typeof companyId !== 'string' || companyId.trim() === '') {
    return NextResponse.json(
      { error: 'companyId is required and must be a non-empty string' },
      { status: 400 }
    );
  }

  if (!startDate || typeof startDate !== 'string') {
    return NextResponse.json(
      { error: 'startDate is required and must be a string in YYYY-MM-DD format' },
      { status: 400 }
    );
  }

  if (!endDate || typeof endDate !== 'string') {
    return NextResponse.json(
      { error: 'endDate is required and must be a string in YYYY-MM-DD format' },
      { status: 400 }
    );
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    return NextResponse.json(
      { error: 'Dates must be in YYYY-MM-DD format' },
      { status: 400 }
    );
  }

  try {
    // Generate the expected ZIP filename using the same logic as Phase 7/9B
    const safeCompanyId = sanitizeForFilename(companyId.trim());
    const safeStartDate = sanitizeForFilename(startDate);
    const safeEndDate = sanitizeForFilename(endDate);
    const zipFilename = `AuditPackage_${safeCompanyId}_${safeStartDate}_${safeEndDate}.zip`;
    
    // Get the company output directory
    const outputDir = getCompanyOutputDir(companyId.trim());
    const zipPath = path.join(outputDir, zipFilename);

    // Security check: Ensure the resolved path is within the output directory
    const resolvedZipPath = path.resolve(zipPath);
    const resolvedOutputDir = path.resolve(outputDir);
    
    if (!resolvedZipPath.startsWith(resolvedOutputDir)) {
      console.error(`Path traversal attempt detected: ${zipPath}`);
      return NextResponse.json(
        { error: 'Invalid package identifier' },
        { status: 400 }
      );
    }

    // Check if the ZIP file exists
    if (!fs.existsSync(resolvedZipPath)) {
      return NextResponse.json(
        { error: 'Package not found. Generate the package first.' },
        { status: 404 }
      );
    }

    // Read the ZIP file
    const fileBuffer = fs.readFileSync(resolvedZipPath);
    
    // Return the ZIP file as a download
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });

  } catch (e: any) {
    console.error('Download error:', e);
    return NextResponse.json(
      { error: 'Internal server error during download' },
      { status: 500 }
    );
  }
}

// Explicitly disable other HTTP methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET.' },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET.' },
    { status: 405 }
  );
}