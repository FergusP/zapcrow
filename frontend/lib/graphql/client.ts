import { GraphQLClient } from 'graphql-request';

export const PONDER_ENDPOINT = process.env.NEXT_PUBLIC_PONDER_URL || "http://localhost:42069/graphql";

// Create GraphQL client instance
export const graphqlClient = new GraphQLClient(PONDER_ENDPOINT, {
  headers: {
    // Add any default headers here if needed
  },
});

// Types for escrow data
export interface Escrow {
  id: string;
  buyer: string;
  seller: string;
  amount: string;
  status: string;
  createdAt: number;
  updatedAt: number;
  fundedAt?: number;
}

export interface EscrowsResponse {
  escrows: {
    items: Escrow[];
  };
}

export interface EscrowResponse {
  escrow: Escrow;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string;
  endCursor: string;
}

export interface PaginatedEscrowsResponse {
  escrows: {
    items: Escrow[];
    pageInfo: PageInfo;
  };
}

// Helper function to handle GraphQL errors
export function handleGraphQLError(error: any): string {
  if (error.response?.errors?.[0]?.message) {
    return error.response.errors[0].message;
  }
  return error.message || 'An unknown error occurred';
}