import { createConfig } from 'ponder';

import { LiskEscrowSimpleAbi } from './abis/LiskEscrowSimpleAbi';

export default createConfig({
  chains: {
    lisk: {
      id: 4202,
      rpc: process.env.PONDER_RPC_URL || 'https://rpc.api.lisk.com',
    },
  },
  contracts: {
    LiskEscrowSimple: {
      chain: 'lisk',
      abi: LiskEscrowSimpleAbi,
      address: '0x44c796914f987c71414971d5a5e32be749664f44',
      startBlock: 24372539, // Block from deployment
    },
  },
});
