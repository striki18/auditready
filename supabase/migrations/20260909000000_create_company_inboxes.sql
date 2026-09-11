-- Create company_inboxes table
CREATE TABLE company_inboxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    realm_id TEXT UNIQUE NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on realm_id for fast lookups
CREATE INDEX idx_company_inboxes_realm_id ON company_inboxes(realm_id);

-- Create index on token for fast public link lookups
CREATE INDEX idx_company_inboxes_token ON company_inboxes(token);