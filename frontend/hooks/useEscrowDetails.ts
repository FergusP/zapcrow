import { PonderService } from '@/lib/ponder-service';

const ponderService = new PonderService();

export function useEscrowDetails() {
  const getEscrowDetails = async (escrowId: string) => {
    return await ponderService.getEscrowDetails(escrowId);
  };

  const getPendingDocuments = async () => {
    return await ponderService.getPendingDocuments();
  };

  return {
    getEscrowDetails,
    getPendingDocuments,
  };
}