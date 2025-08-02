import { useEffect, useMemo } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { EscrowService } from '@/lib/escrow-service-simple';

export function useEscrow() {
  const { address: account, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  
  // Create escrow service instance
  const escrowService = useMemo(() => {
    return new EscrowService();
  }, []);

  // Set wallet client when available (avoid calling connect() which triggers popup)
  useEffect(() => {
    if (walletClient && account) {
      // Directly set the wallet client instead of calling connect()
      escrowService.setWalletClient(walletClient);
    }
  }, [walletClient, account, escrowService]);

  // Create escrow wrapper function
  const createEscrow = async (
    seller: string,
    amount: number,
    deliveryDays: number
  ) => {
    if (!account) {
      throw new Error('Wallet not connected');
    }
    
    return escrowService.createEscrow(seller as `0x${string}`, amount, deliveryDays);
  };

  // Fund escrow wrapper function  
  const fundEscrow = async (escrowId: string, amount: number, onProgress?: (step: string) => void) => {
    if (!account) {
      throw new Error('Wallet not connected');
    }
    
    return escrowService.fundEscrow(escrowId, amount, onProgress);
  };

  // Confirm delivery wrapper function
  const confirmDelivery = async (escrowId: string) => {
    if (!account) {
      throw new Error('Wallet not connected');
    }
    
    return escrowService.confirmDelivery(escrowId);
  };

  // Get escrow details
  const getEscrowDetails = async (escrowId: string) => {
    return escrowService.getEscrowDetails(escrowId);
  };

  // Get user contracts
  const getUserEscrows = async () => {
    if (!account) return [];
    return escrowService.getUserEscrows(account);
  };

  // Get IDRX balance
  const getIDRXBalance = async () => {
    if (!account) return 0;
    return escrowService.getIDRXBalance(account);
  };

  // Approve tokens wrapper function
  const approveTokens = async (amount: number) => {
    if (!account) {
      throw new Error('Wallet not connected');
    }
    
    return escrowService.approveTokens(amount);
  };

  // Check allowance wrapper function
  const checkAllowance = async (amount: number) => {
    if (!account) {
      throw new Error('Wallet not connected');
    }
    
    return escrowService.checkAllowance(amount);
  };

  // Fund escrow only wrapper function
  const fundEscrowOnly = async (escrowId: string) => {
    if (!account) {
      throw new Error('Wallet not connected');
    }
    
    return escrowService.fundEscrowOnly(escrowId);
  };

  return {
    account,
    isConnected,
    createEscrow,
    fundEscrow,
    approveTokens,
    checkAllowance,
    fundEscrowOnly,
    confirmDelivery,
    getEscrowDetails,
    getUserEscrows,
    getIDRXBalance,
    loading: false // For compatibility
  };
}