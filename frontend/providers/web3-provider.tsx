'use client';

import React from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { defaultConfig, XellarKitProvider, darkTheme } from '@xellar/kit';
import { liskSepolia } from 'viem/chains';

// Create config with XellarKit defaultConfig
const config = defaultConfig({
  appName: 'Zapow Escrow',
  appDescription: 'Secure escrow platform for international trade',
  appUrl:
    typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:3000',
  appIcon: 'https://zapow.escrow/icon.png',

  chains: [liskSepolia],

  // Use real WalletConnect project ID for mobile wallets
  walletConnectProjectId: 'fd72198296f17b917980c76f888bf1c5',

  // We need to provide these but they won't be used since we disable the features
  xellarAppId: process.env.NEXT_PUBLIC_XELLAR_APP_ID || 'dummy-id',
  xellarEnv: 'sandbox',

  // Next.js App Router
  ssr: true,
});

const queryClient = new QueryClient();

export const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <XellarKitProvider>{children}</XellarKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
