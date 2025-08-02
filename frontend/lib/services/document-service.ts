import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Debug log
console.log('Supabase config:', {
  url: supabaseUrl ? 'Set' : 'Missing',
  key: supabaseAnonKey ? 'Set' : 'Missing'
});

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface DocumentRecord {
  id: string;
  escrow_id: string;
  contract_id: string;
  type: string;
  file_name: string;
  file_url: string;
  file_hash: string;
  uploaded_by: string;
  uploaded_at: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  metadata?: {
    size: number;
    mimeType: string;
  };
}

export class DocumentService {
  async uploadDocument(
    file: File,
    escrowId: string,
    contractId: string,
    type: string,
    uploaderAddress: string
  ): Promise<DocumentRecord> {
    try {
      // 1. Upload file to Supabase Storage
      const fileName = `${escrowId}/${Date.now()}-${file.name}`;
      const { data: fileData, error: uploadError } = await supabase.storage
        .from('contract-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('contract-documents')
        .getPublicUrl(fileName);

      // 3. Calculate file hash
      const fileHash = await this.calculateFileHash(file);

      // 4. Save metadata to database
      const { data, error } = await supabase
        .from('documents')
        .insert({
          escrow_id: escrowId,
          contract_id: contractId,
          type,
          file_name: file.name,
          file_url: publicUrl,
          file_hash: fileHash,
          uploaded_by: uploaderAddress,
          metadata: {
            size: file.size,
            mimeType: file.type
          }
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error: any) {
      console.error('Error uploading document:', error);
      console.error('Error details:', {
        message: error?.message,
        statusCode: error?.statusCode,
        details: error?.details,
        error: error
      });
      throw error;
    }
  }

  async calculateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `0x${hashHex}`;
  }

  async getDocumentsByContract(contractId: string): Promise<DocumentRecord[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('contract_id', contractId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getDocumentsByEscrow(escrowId: string): Promise<DocumentRecord[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('escrow_id', escrowId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async updateDocumentStatus(
    documentId: string,
    status: 'approved' | 'rejected',
    rejectionReason?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .update({
        status,
        rejection_reason: rejectionReason,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    if (error) throw error;
  }

  async downloadDocument(fileUrl: string): Promise<void> {
    // Open file in new tab for download
    window.open(fileUrl, '_blank');
  }

  async deleteDocument(documentId: string, filePath: string): Promise<void> {
    // 1. Delete from storage
    const { error: storageError } = await supabase.storage
      .from('contract-documents')
      .remove([filePath]);

    if (storageError) throw storageError;

    // 2. Delete from database
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (dbError) throw dbError;
  }
}

export const documentService = new DocumentService();