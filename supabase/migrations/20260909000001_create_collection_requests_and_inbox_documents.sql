-- Create collection_requests table
CREATE TABLE collection_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    realm_id TEXT NOT NULL,
    transaction_ids JSONB NOT NULL,
    status TEXT DEFAULT 'requested',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on realm_id for fast lookups
CREATE INDEX idx_collection_requests_realm_id ON collection_requests(realm_id);

-- Create inbox_documents table
CREATE TABLE inbox_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    realm_id TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on realm_id for fast lookups
CREATE INDEX idx_inbox_documents_realm_id ON inbox_documents(realm_id);