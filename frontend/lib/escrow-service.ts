import { 
  createPublicClient, 
  http, 
  parseUnits,
  encodeFunctionData,
  parseAbiItem,
  type WalletClient,
  type PublicClient
} from 'viem';
import { liskSepolia } from 'viem/chains';
import { escrowABI } from './contracts/escrow-abi';
import { tokenABI } from './contracts/token-abi';
import { relayerABI } from './contracts/relayer-abi';

const ESCROW_CONTRACT = process.env.NEXT_PUBLIC_ESCROW_CONTRACT as `0x${string}`;
const IDRX_CONTRACT = process.env.NEXT_PUBLIC_IDRX_CONTRACT as `0x${string}`;
const RELAYER_CONTRACT = process.env.NEXT_PUBLIC_RELAYER_CONTRACT as `0x${string}`;
const RELAYER_API_URL = process.env.NEXT_PUBLIC_RELAYER_API_URL || 'http://localhost:3001';

// EIP-712 Domain for gasless transactions (Escrow contract)
const ESCROW_DOMAIN = {
  name: 'LiskEscrow',
  version: '1',
  chainId: liskSepolia.id,
  verifyingContract: ESCROW_CONTRACT
};

// EIP-712 Domain for relayer contract
const RELAYER_DOMAIN = {
  name: 'Lisk Escrow Relayer',
  version: '1',
  chainId: liskSepolia.id,
  verifyingContract: RELAYER_CONTRACT
};

export interface EscrowContract {
  id: string;
  buyer: string;
  seller: string;
  amount: number;
  deadline: Date;
  status: 'created' | 'funded' | 'documents_pending' | 'completed' | 'disputed' | 'refunded';
  createdAt: Date;
  fundedAt?: Date;
  completedAt?: Date;
}

export class EscrowService {
  private walletClient: WalletClient | null = null;
  private publicClient: PublicClient;

  constructor(walletClient: WalletClient | null = null) {
    this.walletClient = walletClient;
    this.publicClient = createPublicClient({
      chain: liskSepolia,
      transport: http()
    });
  }

  setWalletClient(walletClient: WalletClient) {
    this.walletClient = walletClient;
  }

  async createEscrow(
    seller: `0x${string}`,
    amount: number,
    deliveryDays: number
  ) {
    if (!this.walletClient || !this.walletClient.account) {
      throw new Error('Wallet not connected');
    }

    const buyer = this.walletClient.account.address;
    const amountInWei = parseUnits(amount.toString(), 2); // IDRX has 2 decimals
    const deadline = Math.floor(Date.now() / 1000) + (deliveryDays * 24 * 60 * 60);

    // Get nonce from relayer contract for meta-transaction
    const nonce = await this.publicClient.readContract({
      address: RELAYER_CONTRACT,
      abi: relayerABI,
      functionName: 'getNonce',
      args: [buyer]
    });

    // Create calldata for createEscrow
    const createEscrowCalldata = encodeFunctionData({
      abi: escrowABI,
      functionName: 'createEscrow',
      args: [seller, amountInWei, IDRX_CONTRACT, BigInt(deadline)]
    });

    // Create MetaTransaction message
    const metaTxMessage = {
      from: buyer,
      to: ESCROW_CONTRACT,
      value: BigInt(0),
      data: createEscrowCalldata as `0x${string}`,
      nonce
    };

    console.log('Creating CreateEscrow MetaTransaction:', {
      from: buyer,
      to: ESCROW_CONTRACT,
      value: '0',
      data: createEscrowCalldata,
      nonce: nonce.toString(),
      domain: RELAYER_DOMAIN
    });

    // Sign as MetaTransaction
    const signature = await this.walletClient.signTypedData({
      account: this.walletClient.account,
      domain: RELAYER_DOMAIN,
      types: {
        MetaTransaction: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'data', type: 'bytes' },
          { name: 'nonce', type: 'uint256' }
        ]
      },
      primaryType: 'MetaTransaction',
      message: metaTxMessage
    });

    // Send to relayer API
    const response = await fetch(`${RELAYER_API_URL}/relay/create-escrow`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': process.env.NEXT_PUBLIC_RELAYER_API_KEY || ''
      },
      body: JSON.stringify({
        seller,
        amount: amountInWei.toString(),
        token: IDRX_CONTRACT,
        deliveryDeadline: deadline.toString(),
        buyer,
        calldata: createEscrowCalldata,
        signature
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to relay transaction');
    }

    const result = await response.json();
    return {
      hash: result.transactionHash,
      escrowId: result.escrowId
    };
  }

  async fundEscrow(escrowId: string, amount: number) {
    if (!this.walletClient || !this.walletClient.account) {
      throw new Error('Wallet not connected');
    }

    const buyer = this.walletClient.account.address;
    // Amount is already in correct units (raw blockchain value), so use BigInt directly
    const amountInWei = BigInt(amount);

    // Get nonce from relayer contract
    const nonce = await this.publicClient.readContract({
      address: RELAYER_CONTRACT,
      abi: relayerABI,
      functionName: 'getNonce',
      args: [buyer]
    });

    // Create approve calldata
    const approveCalldata = encodeFunctionData({
      abi: tokenABI,
      functionName: 'approve',
      args: [ESCROW_CONTRACT, amountInWei]
    });

    // Create fund calldata
    const fundCalldata = encodeFunctionData({
      abi: escrowABI,
      functionName: 'fundEscrow',
      args: [escrowId as `0x${string}`]
    });

    // Create MetaTransaction signature for approve
    const approveMessage = {
      from: buyer,
      to: IDRX_CONTRACT,
      value: BigInt(0),
      data: approveCalldata as `0x${string}`,
      nonce
    };

    console.log('Creating Approve MetaTransaction:', approveMessage);

    const approveSignature = await this.walletClient.signTypedData({
      account: this.walletClient.account,
      domain: RELAYER_DOMAIN,
      types: {
        MetaTransaction: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'data', type: 'bytes' },
          { name: 'nonce', type: 'uint256' }
        ]
      },
      primaryType: 'MetaTransaction',
      message: approveMessage
    });

    // Skip the pre-signing of fund since we'll do it after approve succeeds

    // Send to relayer API
    const payload = {
      escrowId,
      buyer,
      tokenAddress: IDRX_CONTRACT,
      amount: amountInWei.toString(),
      approveCalldata,
      fundCalldata,
      approveSignature
    };
    
    console.log('Sending to relayer:', payload);
    
    // Step 1: Send approve transaction
    console.log('Sending approve transaction...');
    const approveResponse = await fetch(`${RELAYER_API_URL}/relay/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NEXT_PUBLIC_RELAYER_API_KEY || ''
      },
      body: JSON.stringify({
        buyer,
        tokenAddress: IDRX_CONTRACT,
        calldata: approveCalldata,
        signature: approveSignature
      })
    });

    if (!approveResponse.ok) {
      const error = await approveResponse.json();
      throw new Error(error.error || 'Failed to relay approve transaction');
    }

    const approveResult = await approveResponse.json();
    console.log('Approve transaction successful:', approveResult.transactionHash);

    // Wait for transaction to be mined
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get updated nonce for fund transaction
    const updatedNonce = await this.publicClient.readContract({
      address: RELAYER_CONTRACT,
      abi: relayerABI,
      functionName: 'getNonce',
      args: [buyer]
    });

    // Update fund message with new nonce
    const fundMessage = {
      from: buyer,
      to: ESCROW_CONTRACT,
      value: BigInt(0),
      data: fundCalldata as `0x${string}`,
      nonce: updatedNonce
    };

    console.log('Creating Fund MetaTransaction with updated nonce:', fundMessage);

    const fundSignatureNew = await this.walletClient.signTypedData({
      account: this.walletClient.account,
      domain: RELAYER_DOMAIN,
      types: {
        MetaTransaction: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'data', type: 'bytes' },
          { name: 'nonce', type: 'uint256' }
        ]
      },
      primaryType: 'MetaTransaction',
      message: fundMessage
    });

    // Step 2: Send fund transaction
    console.log('Sending fund transaction...');
    const fundResponse = await fetch(`${RELAYER_API_URL}/relay/fund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NEXT_PUBLIC_RELAYER_API_KEY || ''
      },
      body: JSON.stringify({
        buyer,
        calldata: fundCalldata,
        signature: fundSignatureNew
      })
    });

    if (!fundResponse.ok) {
      const error = await fundResponse.json();
      throw new Error(error.error || 'Failed to relay fund transaction');
    }

    const fundResult = await fundResponse.json();
    console.log('Fund transaction successful:', fundResult.transactionHash);
    
    return fundResult;
  }

  async storeDocument(escrowId: string, documentHash: string) {
    if (!this.walletClient || !this.walletClient.account) {
      throw new Error('Wallet not connected');
    }

    const seller = this.walletClient.account.address;

    // Get nonce from relayer contract for meta-transaction
    const nonce = await this.publicClient.readContract({
      address: RELAYER_CONTRACT,
      abi: relayerABI,
      functionName: 'getNonce',
      args: [seller]
    });

    // Create calldata for storeDocumentHash
    const storeDocumentCalldata = encodeFunctionData({
      abi: escrowABI,
      functionName: 'storeDocumentHash',
      args: [escrowId as `0x${string}`, documentHash as `0x${string}`]
    });

    // Create MetaTransaction message
    const metaTxMessage = {
      from: seller,
      to: ESCROW_CONTRACT,
      value: BigInt(0),
      data: storeDocumentCalldata as `0x${string}`,
      nonce
    };

    console.log('Creating StoreDocument MetaTransaction:', metaTxMessage);

    // Sign as MetaTransaction
    const signature = await this.walletClient.signTypedData({
      account: this.walletClient.account,
      domain: RELAYER_DOMAIN,
      types: {
        MetaTransaction: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'data', type: 'bytes' },
          { name: 'nonce', type: 'uint256' }
        ]
      },
      primaryType: 'MetaTransaction',
      message: metaTxMessage
    });

    // Send to relayer API
    const response = await fetch(`${RELAYER_API_URL}/relay/store-document`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': process.env.NEXT_PUBLIC_RELAYER_API_KEY || ''
      },
      body: JSON.stringify({
        seller,
        calldata: storeDocumentCalldata,
        signature
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to relay transaction');
    }

    return response.json();
  }

  async confirmDelivery(escrowId: string) {
    if (!this.walletClient || !this.walletClient.account) {
      throw new Error('Wallet not connected');
    }

    const buyer = this.walletClient.account.address;

    // Get nonce from relayer contract for meta-transaction
    const nonce = await this.publicClient.readContract({
      address: RELAYER_CONTRACT,
      abi: relayerABI,
      functionName: 'getNonce',
      args: [buyer]
    });

    // Create calldata for confirmDelivery
    const confirmDeliveryCalldata = encodeFunctionData({
      abi: escrowABI,
      functionName: 'confirmDelivery',
      args: [escrowId as `0x${string}`]
    });

    // Create MetaTransaction message
    const metaTxMessage = {
      from: buyer,
      to: ESCROW_CONTRACT,
      value: BigInt(0),
      data: confirmDeliveryCalldata as `0x${string}`,
      nonce
    };

    console.log('Creating ConfirmDelivery MetaTransaction:', metaTxMessage);

    // Sign as MetaTransaction
    const signature = await this.walletClient.signTypedData({
      account: this.walletClient.account,
      domain: RELAYER_DOMAIN,
      types: {
        MetaTransaction: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'data', type: 'bytes' },
          { name: 'nonce', type: 'uint256' }
        ]
      },
      primaryType: 'MetaTransaction',
      message: metaTxMessage
    });

    // Send to relayer API
    const response = await fetch(`${RELAYER_API_URL}/relay/confirm-delivery`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': process.env.NEXT_PUBLIC_RELAYER_API_KEY || ''
      },
      body: JSON.stringify({
        buyer,
        calldata: confirmDeliveryCalldata,
        signature
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to relay transaction');
    }

    return response.json();
  }


  // Read functions
  async getEscrowDetails(escrowId: string) {
    const details = await this.publicClient.readContract({
      address: ESCROW_CONTRACT,
      abi: escrowABI,
      functionName: 'escrows',
      args: [escrowId as `0x${string}`]
    });

    return details;
  }

  async getUserEscrows(address: `0x${string}`) {
    try {
      console.log('Fetching escrows for address:', address);
      
      // Get all EscrowCreated events where user is buyer or seller
      const event = parseAbiItem('event EscrowCreated(bytes32 indexed escrowId, address indexed buyer, address indexed seller, uint256 amount, uint256 deliveryDeadline)');
      
      const createdLogs = await this.publicClient.getLogs({
        address: ESCROW_CONTRACT,
        event,
        fromBlock: BigInt(24300000), // Recent block on Lisk Sepolia
        toBlock: 'latest'
      });
      
      console.log('Found logs:', createdLogs.length);

      const userEscrows: EscrowContract[] = [];

      for (const log of createdLogs) {
        const { escrowId, buyer, seller, amount, deliveryDeadline } = log.args as any;
        
        // Only include escrows where user is buyer or seller
        if (buyer.toLowerCase() === address.toLowerCase() || 
            seller.toLowerCase() === address.toLowerCase()) {
          
          // Get current escrow details
          const details = await this.publicClient.readContract({
            address: ESCROW_CONTRACT,
            abi: escrowABI,
            functionName: 'escrows',
            args: [escrowId]
          }) as any;

          const statusMap = ['created', 'funded', 'documents_pending', 'completed', 'disputed', 'refunded'];
          
          userEscrows.push({
            id: escrowId,
            buyer: details[0],
            seller: details[1],
            amount: Number(details[2]) / 10**2, // IDRX has 2 decimals
            deadline: new Date(Number(details[3]) * 1000),
            status: statusMap[details[4]] as any,
            createdAt: new Date(), // Using current date as approximation
          });
        }
      }

      return userEscrows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error fetching escrows:', error);
      return [];
    }
  }

  async getIDRXBalance(address: `0x${string}`) {
    const balance = await this.publicClient.readContract({
      address: IDRX_CONTRACT,
      abi: tokenABI,
      functionName: 'balanceOf',
      args: [address]
    }) as bigint;

    return Number(balance) / 10**2; // IDRX has 2 decimals
  }

  async getIDRXAllowance(owner: `0x${string}`, spender: `0x${string}`) {
    const allowance = await this.publicClient.readContract({
      address: IDRX_CONTRACT,
      abi: tokenABI,
      functionName: 'allowance',
      args: [owner, spender]
    }) as bigint;

    return Number(allowance) / 10**2; // IDRX has 2 decimals
  }
}