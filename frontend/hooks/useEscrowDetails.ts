import { PonderService } from '@/lib/ponder-service';

const ponderService = new PonderService();

export function useEscrowDetails() {
  const getEscrowDetails = async (escrowId: string) => {
    return await ponderService.getEscrowDetails(escrowId);
  };

  const getSellerPendingDocuments = async (sellerAddress: string) => {
    return await ponderService.getSellerPendingDocuments(sellerAddress);
  };

  return {
    getEscrowDetails,
    getSellerPendingDocuments,
  };
}