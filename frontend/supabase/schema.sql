-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Documents table
CREATE TABLE documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  escrow_id VARCHAR(66) NOT NULL, -- blockchain escrow ID (0x...)
  contract_id VARCHAR(255) NOT NULL, -- can be blockchain ID or UUID
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'purchase_order',
    'bill_of_lading',
    'commercial_invoice',
    'packing_list',
    'certificate_of_origin',
    'insurance',
    'other'
  )),
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_hash VARCHAR(66), -- SHA256 hash prefixed with 0x
  uploaded_by VARCHAR(42) NOT NULL, -- ethereum address
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contracts table (to store additional data not on blockchain)
CREATE TABLE contracts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  escrow_id VARCHAR(66) UNIQUE NOT NULL,
  contract_number VARCHAR(50),
  description TEXT,
  purchase_order_url TEXT,
  additional_terms TEXT,
  buyer_address VARCHAR(42) NOT NULL,
  seller_address VARCHAR(42) NOT NULL,
  amount DECIMAL(20, 2),
  currency VARCHAR(10) DEFAULT 'IDRX',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_documents_escrow_id ON documents(escrow_id);
CREATE INDEX idx_documents_contract_id ON documents(contract_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_contracts_escrow_id ON contracts(escrow_id);
CREATE INDEX idx_contracts_buyer ON contracts(buyer_address);
CREATE INDEX idx_contracts_seller ON contracts(seller_address);

-- Function to get current user's wallet address (you'll need to implement this based on your auth setup)
CREATE OR REPLACE FUNCTION current_user_id() RETURNS TEXT AS $$
BEGIN
  -- This should return the authenticated user's wallet address
  -- You'll need to implement this based on your Supabase auth setup
  -- For now, return null to allow unrestricted access
  -- In production, implement proper authentication
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security (RLS)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Policies for documents table
-- For development: Allow all operations
-- In production, replace with proper authentication checks
CREATE POLICY "Allow all document operations" ON documents
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policies for contracts table  
CREATE POLICY "Allow all contract operations" ON contracts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Production policies (commented out for development)
-- Uncomment and modify these when you have proper authentication set up
/*
-- Anyone can view documents for contracts they're involved in
CREATE POLICY "Users can view documents for their contracts" ON documents
  FOR SELECT
  USING (
    uploaded_by = current_user_id() OR
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.escrow_id = documents.escrow_id 
      AND (contracts.buyer_address = current_user_id() OR contracts.seller_address = current_user_id())
    )
  );

-- Only uploader can insert documents
CREATE POLICY "Users can upload their own documents" ON documents
  FOR INSERT
  WITH CHECK (uploaded_by = current_user_id());

-- Only uploader can update their documents
CREATE POLICY "Users can update their own documents" ON documents
  FOR UPDATE
  USING (uploaded_by = current_user_id());

-- Users can view contracts they're involved in
CREATE POLICY "Users can view their contracts" ON contracts
  FOR SELECT
  USING (buyer_address = current_user_id() OR seller_address = current_user_id());

-- Users can create contracts where they're the buyer
CREATE POLICY "Buyers can create contracts" ON contracts
  FOR INSERT
  WITH CHECK (buyer_address = current_user_id());
*/

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();