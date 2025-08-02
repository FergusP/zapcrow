// Example endpoint for your relayer backend server using viem
// Add this to your relayer service at /relay/approve-and-fund

import { createWalletClient, createPublicClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { liskSepolia } from 'viem/chains';

interface ApproveAndFundRequest {
  escrowId: string;
  buyer: string;
  tokenAddress: string;
  amount: string;
  approveSignature: string;
  fundSignature: string;
}

const relayerV2Abi = parseAbi([
  'function relayApproveAndFund(bytes32 escrowId, address buyer, address tokenAddress, uint256 amount, bytes approveSignature, bytes fundSignature)'
]);

export async function handleApproveAndFund(req: ApproveAndFundRequest) {
  const { escrowId, buyer, tokenAddress, amount, approveSignature, fundSignature } = req;
  
  // Initialize viem clients
  const account = privateKeyToAccount(process.env.RELAYER_PRIVATE_KEY as `0x${string}`);
  
  const walletClient = createWalletClient({
    account,
    chain: liskSepolia,
    transport: http(process.env.RPC_URL),
  });
  
  const publicClient = createPublicClient({
    chain: liskSepolia,
    transport: http(process.env.RPC_URL),
  });
  
  try {
    // Simulate the transaction first
    const { request } = await publicClient.simulateContract({
      address: process.env.RELAYER_CONTRACT as `0x${string}`,
      abi: relayerV2Abi,
      functionName: 'relayApproveAndFund',
      args: [
        escrowId as `0x${string}`,
        buyer as `0x${string}`,
        tokenAddress as `0x${string}`,
        BigInt(amount),
        approveSignature as `0x${string}`,
        fundSignature as `0x${string}`
      ],
      account: account.address,
    });
    
    // Execute the transaction
    const hash = await walletClient.writeContract(request);
    
    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    return {
      success: true,
      transactionHash: receipt.transactionHash,
      blockNumber: Number(receipt.blockNumber),
    };
  } catch (error: any) {
    console.error('Relay error:', error);
    throw new Error(`Relay failed: ${error.message}`);
  }
}