import { onchainTable } from "ponder";

// Simple schema - just track contracts and their current status
export const escrow = onchainTable("escrow", (t) => ({
  id: t.text().primaryKey(), // escrowId (bytes32)
  buyer: t.text().notNull(),
  seller: t.text().notNull(),
  amount: t.numeric().notNull(),
  status: t.text().notNull(), // CREATED, FUNDED, DOCUMENTS_PENDING, SETTLED, CANCELLED, DISPUTED
  createdAt: t.integer().notNull(),
  fundedAt: t.integer(),
  updatedAt: t.integer().notNull(),
}));