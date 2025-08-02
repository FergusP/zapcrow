import { gql } from 'graphql-request';

// Escrow fields fragment
export const ESCROW_FRAGMENT = gql`
  fragment EscrowFields on escrow {
    id
    buyer
    seller
    amount
    status
    createdAt
    updatedAt
    fundedAt
  }
`;

// Get all escrows
export const GET_ALL_ESCROWS = gql`
  query GetAllEscrows {
    escrows {
      items {
        ...EscrowFields
      }
    }
  }
  ${ESCROW_FRAGMENT}
`;

// Get escrows for a specific buyer
export const GET_BUYER_ESCROWS = gql`
  query GetBuyerEscrows($buyer: String!) {
    escrows(where: { buyer: $buyer }) {
      items {
        ...EscrowFields
      }
    }
  }
  ${ESCROW_FRAGMENT}
`;

// Get escrows for a specific seller
export const GET_SELLER_ESCROWS = gql`
  query GetSellerEscrows($seller: String!) {
    escrows(where: { seller: $seller }) {
      items {
        ...EscrowFields
      }
    }
  }
  ${ESCROW_FRAGMENT}
`;

// Get single escrow by ID
export const GET_ESCROW_BY_ID = gql`
  query GetEscrowById($id: String!) {
    escrow(id: $id) {
      ...EscrowFields
    }
  }
  ${ESCROW_FRAGMENT}
`;

// Get escrows by status
export const GET_ESCROWS_BY_STATUS = gql`
  query GetEscrowsByStatus($status: String!) {
    escrows(where: { status: $status }) {
      items {
        ...EscrowFields
      }
    }
  }
  ${ESCROW_FRAGMENT}
`;

// Get escrows with pagination
export const GET_ESCROWS_PAGINATED = gql`
  query GetEscrowsPaginated($first: Int!, $after: String) {
    escrows(first: $first, after: $after) {
      items {
        ...EscrowFields
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
  ${ESCROW_FRAGMENT}
`;