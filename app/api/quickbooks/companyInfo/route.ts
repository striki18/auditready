import { NextResponse } from 'next/server';
import { getCompanyInfo } from '@/lib/quickbooks';

/** GET /api/quickbooks/companyInfo – returns the connected company's info. */
export async function GET() {
  try {
    const data = await getCompanyInfo();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
