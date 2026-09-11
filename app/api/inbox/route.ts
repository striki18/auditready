import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body: { realm_id: string; transaction_ids: string[] } = await request.json();
    const { realm_id, transaction_ids } = body;

    if (!realm_id || !transaction_ids || !Array.isArray(transaction_ids) || transaction_ids.length === 0) {
      return NextResponse.json(
        { error: 'realm_id and transaction_ids array are required' },
        { status: 400 }
      );
    }

    // Get or create company inbox
    let { data: inbox, error: inboxError } = await supabaseAdmin
      .from('company_inboxes')
      .select('*')
      .eq('realm_id', realm_id)
      .single();

    if (inboxError && inboxError.code !== 'PGRST116') {
      console.error('Error fetching inbox:', inboxError);
      return NextResponse.json({ error: 'Failed to fetch inbox' }, { status: 500 });
    }

    if (!inbox) {
      // Create new inbox with a secure token
      const token = crypto.randomUUID();
      const { data: newInbox, error: createError } = await supabaseAdmin
        .from('company_inboxes')
        .insert({ realm_id, token })
        .select()
        .single();

      if (createError) {
        console.error('Error creating inbox:', createError);
        return NextResponse.json({ error: 'Failed to create inbox' }, { status: 500 });
      }
      inbox = newInbox;
    }

    // Create collection request
    const { data: newRequest, error: requestError } = await supabaseAdmin
      .from('collection_requests')
      .insert({
        realm_id,
        transaction_ids,
        status: 'requested',
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error creating collection request:', requestError);
      return NextResponse.json({ error: 'Failed to create collection request' }, { status: 500 });
    }

    const inboxLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/inbox/${inbox.token}`;

    return NextResponse.json({
      inbox: {
        id: inbox.id,
        realm_id: inbox.realm_id,
        token: inbox.token,
        link: inboxLink,
      },
      request: {
        id: newRequest.id,
        realm_id: newRequest.realm_id,
        transaction_ids: newRequest.transaction_ids,
        status: newRequest.status,
        created_at: newRequest.created_at,
      },
    });
  } catch (error) {
    console.error('Inbox API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const realm_id = searchParams.get('realm_id');

    if (!realm_id) {
      return NextResponse.json({ error: 'realm_id is required' }, { status: 400 });
    }

    const { data: inbox, error } = await supabaseAdmin
      .from('company_inboxes')
      .select('*')
      .eq('realm_id', realm_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching inbox:', error);
      return NextResponse.json({ error: 'Failed to fetch inbox' }, { status: 500 });
    }

    if (!inbox) {
      return NextResponse.json({ inbox: null });
    }

    const inboxLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/inbox/${inbox.token}`;

    return NextResponse.json({
      inbox: {
        id: inbox.id,
        realm_id: inbox.realm_id,
        token: inbox.token,
        link: inboxLink,
        created_at: inbox.created_at,
      },
    });
  } catch (error) {
    console.error('Inbox GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}