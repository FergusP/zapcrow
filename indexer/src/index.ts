import { ponder } from "ponder:registry";
import { escrow } from "ponder:schema";

// Handle contract creation
ponder.on("LiskEscrowSimple:EscrowCreated", async ({ event, context }) => {
  await context.db
    .insert(escrow)
    .values({
      id: event.args.escrowId,
      buyer: event.args.buyer.toLowerCase(),
      seller: event.args.seller.toLowerCase(),
      amount: event.args.amount.toString(),
      status: "CREATED",
      createdAt: Number(event.block.timestamp),
      updatedAt: Number(event.block.timestamp),
    });
});

// Handle funding
ponder.on("LiskEscrowSimple:EscrowFunded", async ({ event, context }) => {
  await context.db
    .update(escrow, { id: event.args.escrowId })
    .set({
      status: "FUNDED",
      fundedAt: Number(event.args.timestamp),
      updatedAt: Number(event.block.timestamp),
    });
});

// Handle document upload
ponder.on("LiskEscrowSimple:DocumentsUploaded", async ({ event, context }) => {
  await context.db
    .update(escrow, { id: event.args.escrowId })
    .set({
      status: "DOCUMENTS_PENDING",
      updatedAt: Number(event.block.timestamp),
    });
});

// Handle delivery confirmation
ponder.on("LiskEscrowSimple:DeliveryConfirmed", async ({ event, context }) => {
  await context.db
    .update(escrow, { id: event.args.escrowId })
    .set({
      status: "SETTLED",
      updatedAt: Number(event.block.timestamp),
    });
});

// Handle cancellation
ponder.on("LiskEscrowSimple:EscrowCancelled", async ({ event, context }) => {
  await context.db
    .update(escrow, { id: event.args.escrowId })
    .set({
      status: "CANCELLED",
      updatedAt: Number(event.block.timestamp),
    });
});

// Handle disputes
ponder.on("LiskEscrowSimple:DisputeInitiated", async ({ event, context }) => {
  await context.db
    .update(escrow, { id: event.args.escrowId })
    .set({
      status: "DISPUTED",
      updatedAt: Number(event.block.timestamp),
    });
});