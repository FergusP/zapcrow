const PONDER_URL = process.env.NEXT_PUBLIC_PONDER_URL || 'http://localhost:42069';

export interface PonderEscrow {
  id: string; // User-friendly ID (ESC-20240201-0001)
  blockchainId: string; // Original blockchain ID
  buyer: string;
  seller: string;
  amount: string;
  status: string;
  deliveryDeadline: string;
  createdAt: string;
  fundedAt?: string;
  documentsUploadedAt?: string;
  settledAt?: string;
  token: string;
}

export interface PonderDocument {
  id: string;
  escrowId: string;
  hash: string;
  uploadedAt: string;
}

export interface PonderEvent {
  id: string;
  escrowId: string;
  eventType: string;
  actor: string;
  timestamp: string;
  txHash: string;
  data?: string;
}

export interface PonderDispute {
  id: string;
  escrowId: string;
  initiator: string;
  reason: string;
  initiatedAt: string;
  resolved: boolean;
}

export class PonderService {
  private useMockData = true; // Enable mock data for now

  private async query<T>(query: string, variables?: Record<string, any>): Promise<T> {
    // Use mock data if enabled or if Ponder is not running
    if (this.useMockData) {
      return this.getMockDataForQuery(query, variables) as T;
    }

    // console.log('PonderService query:', { 
    //   url: `${PONDER_URL}/graphql`,
    //   variables 
    // });
    
    try {
      const response = await fetch(`${PONDER_URL}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('GraphQL request failed:', response.status, errorText);
        // Fall back to mock data
        return this.getMockDataForQuery(query, variables) as T;
      }

      const result = await response.json();
      
      if (result.errors) {
        console.error('GraphQL errors:', result.errors);
        // Fall back to mock data
        return this.getMockDataForQuery(query, variables) as T;
      }

      return result.data;
    } catch (error) {
      // console.log('Ponder not available, using mock data');
      return this.getMockDataForQuery(query, variables) as T;
    }
  }

  private getMockDataForQuery(query: string, variables?: Record<string, any>): any {
    const mockEscrows: PonderEscrow[] = [
      {
        id: "ESC-20241201-0001",
        blockchainId: "0x1234567890123456789012345678901234567890123456789012345678901234",
        buyer: variables?.address || "0x9c5b79f27548676afe8F0fC3b06E34fe47AE59bE",
        seller: "0xA82384B9eF9A4a7399f385a14a51BB692c9D9d96",
        amount: "10000000", // 100 IDRX
        status: "FUNDED",
        deliveryDeadline: "1735689600", // 2025-01-01
        createdAt: "1701369600", // 2023-12-01
        fundedAt: "1701456000", // 2023-12-02
        token: "0xD63029C1a3dA68b51c67c6D1DeC3DEe50D681661"
      },
      {
        id: "ESC-20241202-0002",
        blockchainId: "0x2345678901234567890123456789012345678901234567890123456789012345",
        buyer: "0x1234567890123456789012345678901234567890",
        seller: variables?.address || "0x9c5b79f27548676afe8F0fC3b06E34fe47AE59bE",
        amount: "25000000", // 250 IDRX
        status: "DOCUMENTS_PENDING",
        deliveryDeadline: "1735776000", // 2025-01-02
        createdAt: "1701456000", // 2023-12-02
        fundedAt: "1701542400", // 2023-12-03
        documentsUploadedAt: "1701628800", // 2023-12-04
        token: "0xD63029C1a3dA68b51c67c6D1DeC3DEe50D681661"
      },
      {
        id: "ESC-20241203-0003",
        blockchainId: "0x3456789012345678901234567890123456789012345678901234567890123456",
        buyer: variables?.address || "0x9c5b79f27548676afe8F0fC3b06E34fe47AE59bE",
        seller: "0x2345678901234567890123456789012345678901",
        amount: "50000000", // 500 IDRX
        status: "SETTLED",
        deliveryDeadline: "1704067200", // 2024-01-01
        createdAt: "1701542400", // 2023-12-03
        fundedAt: "1701628800", // 2023-12-04
        documentsUploadedAt: "1701715200", // 2023-12-05
        settledAt: "1701801600", // 2023-12-06
        token: "0xD63029C1a3dA68b51c67c6D1DeC3DEe50D681661"
      }
    ];

    const mockEvents: PonderEvent[] = [
      {
        id: "EVT-20231201-000001",
        escrowId: "ESC-20241201-0001",
        eventType: "CREATED",
        actor: variables?.address || "0x9c5b79f27548676afe8F0fC3b06E34fe47AE59bE",
        timestamp: "1701369600",
        txHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
        data: JSON.stringify({ amount: "10000000", deliveryDeadline: "1735689600" })
      },
      {
        id: "EVT-20231202-000002",
        escrowId: "ESC-20241201-0001",
        eventType: "FUNDED",
        actor: variables?.address || "0x9c5b79f27548676afe8F0fC3b06E34fe47AE59bE",
        timestamp: "1701456000",
        txHash: "0x2345678901234567890123456789012345678901234567890123456789012345",
        data: undefined
      }
    ];

    const mockDocuments: PonderDocument[] = [
      {
        id: "DOC-20231204-000001",
        escrowId: "ESC-20241202-0002",
        hash: "0x1234567890123456789012345678901234567890123456789012345678901234",
        uploadedAt: "1701628800"
      }
    ];

    // Return different mock data based on the query
    if (query.includes('GetUserEscrows')) {
      return {
        escrows: {
          items: mockEscrows.filter(e => 
            e.buyer.toLowerCase() === variables?.address?.toLowerCase() ||
            e.seller.toLowerCase() === variables?.address?.toLowerCase()
          )
        }
      };
    }

    if (query.includes('GetEscrowDetails')) {
      const escrow = mockEscrows.find(e => e.id === variables?.escrowId);
      return {
        escrow: escrow || mockEscrows[0],
        escrowEvents: { items: mockEvents },
        documents: { items: mockDocuments },
        dispute: null
      };
    }

    if (query.includes('GetUserStats')) {
      const buyerEscrows = mockEscrows.filter(e => e.buyer.toLowerCase() === variables?.address?.toLowerCase());
      const sellerEscrows = mockEscrows.filter(e => e.seller.toLowerCase() === variables?.address?.toLowerCase());

      return {
        buyerEscrows: { items: buyerEscrows },
        sellerEscrows: { items: sellerEscrows }
      };
    }

    if (query.includes('GetSellerPendingDocuments')) {
      return {
        escrows: { 
          items: mockEscrows.filter(e => 
            e.seller.toLowerCase() === variables?.address?.toLowerCase() && 
            e.status === 'FUNDED'
          )
        }
      };
    }

    if (query.includes('GetRecentTransactions')) {
      return {
        escrowEvents: { items: mockEvents }
      };
    }

    // Default empty response
    return {};
  }

  // Get all escrows for a user (as buyer or seller)
  async getUserEscrows(address: string): Promise<PonderEscrow[]> {
    const query = `
      query GetUserEscrows($address: String!) {
        escrows(
          where: {
            OR: [
              { buyer: $address },
              { seller: $address }
            ]
          }
          orderBy: "createdAt"
          orderDirection: "desc"
        ) {
          items {
            id
            blockchainId
            buyer
            seller
            amount
            status
            deliveryDeadline
            createdAt
            fundedAt
            documentsUploadedAt
            settledAt
            token
          }
        }
      }
    `;

    const data = await this.query<{ escrows: { items: PonderEscrow[] } }>(query, {
      address: address.toLowerCase(),
    });

    // console.log(`getUserEscrows for ${address}: found ${data.escrows.items.length} escrows`);
    return data.escrows.items;
  }

  // Get single escrow with all details
  async getEscrowDetails(escrowId: string): Promise<{
    escrow: PonderEscrow;
    events: PonderEvent[];
    documents: PonderDocument[];
    dispute?: PonderDispute;
  }> {
    const query = `
      query GetEscrowDetails($escrowId: String!) {
        escrow(id: $escrowId) {
          id
          blockchainId
          buyer
          seller
          amount
          status
          deliveryDeadline
          createdAt
          fundedAt
          documentsUploadedAt
          settledAt
          token
        }
        
        escrowEvents(
          where: { escrowId: $escrowId }
          orderBy: "timestamp"
          orderDirection: "asc"
        ) {
          items {
            id
            escrowId
            eventType
            actor
            timestamp
            txHash
            data
          }
        }
        
        documents(
          where: { escrowId: $escrowId }
          orderBy: "uploadedAt"
          orderDirection: "desc"
        ) {
          items {
            id
            escrowId
            hash
            uploadedAt
          }
        }
        
        dispute(id: $escrowId) {
          id
          escrowId
          initiator
          reason
          initiatedAt
          resolved
        }
      }
    `;

    const data = await this.query<{
      escrow: PonderEscrow;
      escrowEvents: { items: PonderEvent[] };
      documents: { items: PonderDocument[] };
      dispute: PonderDispute | null;
    }>(query, { escrowId });

    return {
      escrow: data.escrow,
      events: data.escrowEvents.items,
      documents: data.documents.items,
      dispute: data.dispute || undefined,
    };
  }

  // Get dashboard statistics
  async getUserStats(address: string): Promise<{
    asBuyer: {
      total: number;
      active: number;
      completed: number;
      totalValue: string;
    };
    asSeller: {
      total: number;
      active: number;
      completed: number;
      totalEarnings: string;
    };
  }> {
    const query = `
      query GetUserStats($address: String!) {
        buyerEscrows: escrows(
          where: { buyer: $address }
        ) {
          items {
            id
            status
            amount
          }
        }
        
        sellerEscrows: escrows(
          where: { seller: $address }
        ) {
          items {
            id
            status
            amount
          }
        }
      }
    `;

    const data = await this.query<{
      buyerEscrows: { items: Array<{ id: string; status: string; amount: string }> };
      sellerEscrows: { items: Array<{ id: string; status: string; amount: string }> };
    }>(query, { address: address.toLowerCase() });

    const activeStatuses = ['CREATED', 'FUNDED', 'DOCUMENTS_PENDING'];

    return {
      asBuyer: {
        total: data.buyerEscrows.items.length,
        active: data.buyerEscrows.items.filter(e => activeStatuses.includes(e.status)).length,
        completed: data.buyerEscrows.items.filter(e => e.status === 'SETTLED').length,
        totalValue: data.buyerEscrows.items.reduce((sum, e) => sum + BigInt(e.amount), BigInt(0)).toString(),
      },
      asSeller: {
        total: data.sellerEscrows.items.length,
        active: data.sellerEscrows.items.filter(e => activeStatuses.includes(e.status)).length,
        completed: data.sellerEscrows.items.filter(e => e.status === 'SETTLED').length,
        totalEarnings: data.sellerEscrows.items
          .filter(e => e.status === 'SETTLED')
          .reduce((sum, e) => sum + BigInt(e.amount), BigInt(0))
          .toString(),
      },
    };
  }

  // Get pending documents for seller (compliance page)
  async getSellerPendingDocuments(sellerAddress: string): Promise<PonderEscrow[]> {
    const query = `
      query GetSellerPendingDocuments($address: String!) {
        escrows(
          where: {
            AND: [
              { seller: $address },
              { status: "FUNDED" }
            ]
          }
          orderBy: "fundedAt"
          orderDirection: "desc"
        ) {
          items {
            id
            blockchainId
            buyer
            seller
            amount
            status
            deliveryDeadline
            createdAt
            fundedAt
            token
          }
        }
      }
    `;

    const data = await this.query<{ escrows: { items: PonderEscrow[] } }>(query, {
      address: sellerAddress.toLowerCase(),
    });

    return data.escrows.items;
  }

  // Get recent transactions for a user
  async getRecentTransactions(address: string, limit: number = 10): Promise<PonderEvent[]> {
    const query = `
      query GetRecentTransactions($address: String!) {
        escrowEvents(
          where: { actor: $address }
          orderBy: "timestamp"
          orderDirection: "desc"
          limit: ${limit}
        ) {
          items {
            id
            escrowId
            eventType
            actor
            timestamp
            txHash
            data
          }
        }
      }
    `;

    const data = await this.query<{ escrowEvents: { items: PonderEvent[] } }>(query, {
      address: address.toLowerCase(),
    });

    return data.escrowEvents.items;
  }
}