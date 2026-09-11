import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use direct REST API calls with fetch to avoid Supabase client hanging issues
async function supabaseQuery(table: string, options: {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  select?: string;
  filter?: Record<string, string>;
  body?: unknown;
  single?: boolean;
  order?: { column: string; ascending: boolean };
  limit?: number;
}) {
  const { method = 'GET', select = '*', filter = {}, body, single = false, order, limit } = options;
  
  let url = `${supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
  
  // Add filters
  for (const [key, value] of Object.entries(filter)) {
    url += `&${key}=eq.${encodeURIComponent(value)}`;
  }
  
  // Add order
  if (order) {
    url += `&order=${order.column}.${order.ascending ? 'asc' : 'desc'}`;
  }
  
  // Add limit
  if (limit) {
    url += `&limit=${limit}`;
  }
  
  // Add single
  if (single) {
    url += '&limit=1';
  }

  const response = await fetch(url, {
    method,
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
      'Prefer': single ? 'return=representation' : 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
    // Add timeout
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  
  if (single && Array.isArray(data)) {
    if (data.length === 0) {
      return { data: null, error: { code: 'PGRST116', message: 'No rows found' } };
    }
    return { data: data[0], error: null };
  }
  
  return { data, error: null };
}

// Generate a unique token for the company inbox
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const realm_id = searchParams.get('realm_id');

    if (!realm_id) {
      return NextResponse.json({ error: 'realm_id is required' }, { status: 400 });
    }

    // Get inbox info
    const { data: inbox, error: inboxError } = await supabaseQuery('company_inboxes', {
      filter: { realm_id },
      single: true,
    });

    if (inboxError && inboxError.code !== 'PGRST116') {
      console.error('Error fetching inbox:', inboxError);
      return NextResponse.json({ error: 'Failed to fetch inbox' }, { status: 500 });
    }

    // Get collection requests
    const { data: requests, error: requestsError } = await supabaseQuery('collection_requests', {
      filter: { realm_id },
      order: { column: 'created_at', ascending: false },
    });

    if (requestsError) {
      console.error('Error fetching collection requests:', requestsError);
      return NextResponse.json({ error: 'Failed to fetch collection requests' }, { status: 500 });
    }

    // Get uploaded documents
    const { data: documents, error: docsError } = await supabaseQuery('inbox_documents', {
      filter: { realm_id },
      order: { column: 'uploaded_at', ascending: false },
    });

    if (docsError) {
      console.error('Error fetching inbox documents:', docsError);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    const inboxLink = inbox
      ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/inbox/${inbox.token}`
      : null;

    return NextResponse.json({
      inbox: inbox ? {
        id: inbox.id,
        realm_id: inbox.realm_id,
        token: inbox.token,
        link: inboxLink,
        created_at: inbox.created_at,
      } : null,
      requests: requests || [],
      documents: documents || [],
    });
  } catch (error) {
    console.error('Firm inbox GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate JSON body
    let body: { realm_id?: string; transaction_ids?: string[] };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { realm_id, transaction_ids } = body;

    // Validate realm_id
    if (!realm_id || typeof realm_id !== 'string' || realm_id.trim() === '') {
      return NextResponse.json({ error: 'realm_id is required and must be non-empty' }, { status: 400 });
    }

    // Validate transaction_ids
    if (!transaction_ids || !Array.isArray(transaction_ids) || transaction_ids.length === 0) {
      return NextResponse.json({ error: 'transaction_ids is required and must be a non-empty array' }, { status: 400 });
    }

    // Validate each transaction_id is a non-empty string
    for (const txnId of transaction_ids) {
      if (!txnId || typeof txnId !== 'string' || txnId.trim() === '') {
        return NextResponse.json({ error: 'All transaction_ids must be non-empty strings' }, { status: 400 });
      }
    }

    // Find or create company inbox
    let inbox;
    console.log('[POST /api/firm/inbox] Fetching company inbox for realm_id:', realm_id);
    const { data: existingInbox, error: inboxError } = await supabaseQuery('company_inboxes', {
      filter: { realm_id },
      single: true,
    });
    console.log('[POST /api/firm/inbox] Inbox fetch result:', { existingInbox, inboxError });

    if (inboxError && inboxError.code !== 'PGRST116') {
      console.error('Error fetching company inbox:', inboxError);
      return NextResponse.json({ error: 'Failed to fetch company inbox' }, { status: 500 });
    }

    if (existingInbox) {
      inbox = existingInbox;
    } else {
      // Create new company inbox with unique token
      const token = generateToken();
      const { data: newInbox, error: createInboxError } = await supabaseQuery('company_inboxes', {
        method: 'POST',
        body: { realm_id, token },
        single: true,
      });

      if (createInboxError) {
        console.error('Error creating company inbox:', createInboxError);
        return NextResponse.json({ error: 'Failed to create company inbox' }, { status: 500 });
      }

      inbox = newInbox;
    }

    // Create collection request
    const { data: collectionRequest, error: requestError } = await supabaseQuery('collection_requests', {
      method: 'POST',
      body: {
        realm_id,
        transaction_ids,
        status: 'requested',
      },
      single: true,
    });

    if (requestError) {
      console.error('Error creating collection request:', requestError);
      return NextResponse.json({ error: 'Failed to create collection request' }, { status: 500 });
    }

    // Build the inbox link
    const inboxLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/inbox/${inbox.token}`;

    return NextResponse.json({
      collection_request_id: collectionRequest.id,
      company_inbox_id: inbox.id,
      token: inbox.token,
      link: inboxLink,
    }, { status: 201 });
  } catch (error) {
    console.error('Firm inbox POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}