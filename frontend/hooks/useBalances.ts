"use client";

import { useState, useEffect, useCallback } from 'react';
import { createPublicClient, http, parseAbi, formatEther } from 'viem';

// Lisk Sepolia chain configuration
const liskSepolia = {
  id: 4202,
  name: 'Lisk Sepolia',
  network: 'lisk-sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Sepolia Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://rpc.sepolia-api.lisk.com'] },
  },
};

const IDRX_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
]);

export interface Balances {
  eth: string;
  idrx: string;
}

export function useBalances(address: string | undefined) {
  const [balances, setBalances] = useState<Balances>({ eth: '0', idrx: '0' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const publicClient = createPublicClient({
    chain: liskSepolia,
    transport: http(),
  });

  const fetchBalances = useCallback(async (force = false) => {
    if (!address) {
      setBalances({ eth: '0', idrx: '0' });
      return;
    }

    // Throttle requests - only allow once every 10 seconds unless forced
    const now = Date.now();
    if (!force && now - lastFetch < 10000) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setLastFetch(now);

      // Get ETH balance
      const ethBalance = await publicClient.getBalance({
        address: address as `0x${string}`,
      });

      // Get IDRX balance
      const idrxBalance = await publicClient.readContract({
        address: process.env.NEXT_PUBLIC_IDRX_CONTRACT as `0x${string}`,
        abi: IDRX_ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      }) as bigint;

      setBalances({
        eth: parseFloat(formatEther(ethBalance)).toFixed(4),
        idrx: (Number(idrxBalance) / 10**2).toFixed(2), // IDRX has 2 decimals
      });
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching balances:', err);
    } finally {
      setLoading(false);
    }
  }, [address, publicClient]);

  useEffect(() => {
    fetchBalances();
    // Removed automatic polling to prevent spam
  }, [fetchBalances]);

  return {
    balances,
    loading,
    error,
    refetch: () => fetchBalances(true), // Force refresh when manually called
  };
}