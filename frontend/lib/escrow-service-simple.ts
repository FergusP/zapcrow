import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseUnits,
  encodeFunctionData,
  parseAbiItem,
  WalletClient,
  PublicClient
} from 'viem';
import { liskSepolia } from 'viem/chains';
import { escrowABI } from '@/lib/contracts/escrow-abi';
import { tokenABI } from '@/lib/contracts/token-abi';

// Contract addresses
const ESCROW_CONTRACT = process.env.NEXT_PUBLIC_ESCROW_CONTRACT as `0x${string}`;
const IDRX_CONTRACT = process.env.NEXT_PUBLIC_IDRX_CONTRACT as `0x${string}`;

export class EscrowService {
  private walletClient: WalletClient | null = null;
  private publicClient: PublicClient;

  constructor() {
    this.publicClient = createPublicClient({
      chain: liskSepolia,
      transport: http()
    }) as PublicClient;
  }

  async connect() {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      this.walletClient = createWalletClient({
        chain: liskSepolia,
        transport: custom((window as any).ethereum)
      });

      const [address] = await this.walletClient.requestAddresses();
      return address;
    }
    throw new Error('No wallet found');
  }

  setWalletClient(walletClient: WalletClient) {
    this.walletClient = walletClient;
  }

  async approveTokens(amount: number) {
    if (!this.walletClient || !this.walletClient.account) {
      throw new Error('Wallet not connected');
    }

    const amountInWei = BigInt(amount);
    const userAddress = this.walletClient.account.address;

    // Check user balance first
    const balance = await this.publicClient.readContract({
      address: IDRX_CONTRACT,
      abi: tokenABI,
      functionName: 'balanceOf',
      args: [userAddress]
    });

    if (balance < amountInWei) {
      throw new Error(`Insufficient IDRX balance. You have ${Number(balance) / 100} IDRX but need ${amount / 100} IDRX`);
    }

    // Approve tokens
    const { request: approveRequest } = await this.publicClient.simulateContract({
      address: IDRX_CONTRACT,
      abi: tokenABI,
      functionName: 'approve',
      args: [ESCROW_CONTRACT, amountInWei],
      account: this.walletClient.account
    });

    console.log('Approving tokens...');
    const approveHash = await this.walletClient.writeContract(approveRequest);
    await this.publicClient.waitForTransactionReceipt({ hash: approveHash });
    console.log('Approve successful:', approveHash);

    return { hash: approveHash };
  }

  async checkAllowance(amount: number) {
    if (!this.walletClient || !this.walletClient.account) {
      throw new Error('Wallet not connected');
    }

    const amountInWei = BigInt(amount);
    const userAddress = this.walletClient.account.address;

    const currentAllowance = await this.publicClient.readContract({
      address: IDRX_CONTRACT,
      abi: tokenABI,
      functionName: 'allowance',
      args: [userAddress, ESCROW_CONTRACT]
    });

    return {
      current: Number(currentAllowance),
      required: amount,
      sufficient: currentAllowance >= amountInWei
    };
  }

  async fundEscrowOnly(escrowId: string) {
    if (!this.walletClient || !this.walletClient.account) {
      throw new Error('Wallet not connected');
    }

    // Fund the escrow (assumes allowance is already set)
    const { request: fundRequest } = await this.publicClient.simulateContract({
      address: ESCROW_CONTRACT,
      abi: escrowABI,
      functionName: 'fundEscrow',
      args: [escrowId as `0x${string}`],
      account: this.walletClient.account
    });

    console.log('Funding escrow...');
    const fundHash = await this.walletClient.writeContract(fundRequest);
    await this.publicClient.waitForTransactionReceipt({ hash: fundHash });
    console.log('Fund successful:', fundHash);

    return { hash: fundHash };
  }

  async createEscrow(seller: string, amount: number, deliveryDays: number) {
    if (!this.walletClient || !this.walletClient.account) {
      throw new Error('Wallet not connected');
    }

    const amountInWei = parseUnits(amount.toString(), 2); // IDRX has 2 decimals
    const deadline = Math.floor(Date.now() / 1000) + (deliveryDays * 24 * 60 * 60);

    // Direct contract call (user pays gas)
    const { request } = await this.publicClient.simulateContract({
      address: ESCROW_CONTRACT,
      abi: escrowABI,
      functionName: 'createEscrow',
      args: [seller as `0x${string}`, amountInWei, IDRX_CONTRACT, BigInt(deadline)],
      account: this.walletClient.account
    });

    const hash = await this.walletClient.writeContract(request);

    // Wait for transaction to be mined to get the escrow ID
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    
    // Extract escrow ID from logs
    const escrowCreatedLog = receipt.logs.find(log => 
      log.address.toLowerCase() === ESCROW_CONTRACT.toLowerCase() &&
      log.topics[0] === '0x8233ac661360194ba2d16fa02d354d092808769225032c46dc5787f33af21cbe' // EscrowCreated event hash
    );
    
    const escrowId = escrowCreatedLog?.topics[1] || '0x';

    return {
      hash,
      escrowId
    };
  }

  async fundEscrow(escrowId: string, amount: number, onProgress?: (step: string) => void) {
    if (!this.walletClient || !this.walletClient.account) {
      throw new Error('Wallet not connected');
    }

    // Amount is already in correct units (raw blockchain value)
    const amountInWei = BigInt(amount);
    const userAddress = this.walletClient.account.address;

    // Check user balance first
    onProgress?.('Checking token balance...');
    const balance = await this.publicClient.readContract({
      address: IDRX_CONTRACT,
      abi: tokenABI,
      functionName: 'balanceOf',
      args: [userAddress]
    });

    if (balance < amountInWei) {
      throw new Error(`Insufficient IDRX balance. You have ${Number(balance) / 100} IDRX but need ${amount / 100} IDRX`);
    }

    // Check current allowance
    onProgress?.('Checking current allowance...');
    const currentAllowance = await this.publicClient.readContract({
      address: IDRX_CONTRACT,
      abi: tokenABI,
      functionName: 'allowance',
      args: [userAddress, ESCROW_CONTRACT]
    });

    console.log('Current allowance:', currentAllowance.toString(), 'Required:', amountInWei.toString());

    // Only approve if current allowance is insufficient
    if (currentAllowance < amountInWei) {
      onProgress?.('Step 1/2: Preparing token approval...');
      const { request: approveRequest } = await this.publicClient.simulateContract({
        address: IDRX_CONTRACT,
        abi: tokenABI,
        functionName: 'approve',
        args: [ESCROW_CONTRACT, amountInWei],
        account: this.walletClient.account
      });

      onProgress?.('Step 1/2: Approving token spend - Please confirm in wallet...');
      console.log('Approving tokens...');
      const approveHash = await this.walletClient.writeContract(approveRequest);
      
      onProgress?.('Step 1/2: Waiting for approval confirmation...');
      await this.publicClient.waitForTransactionReceipt({ hash: approveHash });
      console.log('Approve successful:', approveHash);
    } else {
      console.log('Sufficient allowance already exists, skipping approval');
      onProgress?.('Sufficient allowance found, skipping approval...');
    }

    // Then fund the escrow
    onProgress?.('Step 2/2: Preparing escrow funding...');
    const { request: fundRequest } = await this.publicClient.simulateContract({
      address: ESCROW_CONTRACT,
      abi: escrowABI,
      functionName: 'fundEscrow',
      args: [escrowId as `0x${string}`],
      account: this.walletClient.account
    });

    onProgress?.('Step 2/2: Funding escrow - Please confirm in wallet...');
    console.log('Funding escrow...');
    const fundHash = await this.walletClient.writeContract(fundRequest);
    
    onProgress?.('Step 2/2: Waiting for funding confirmation...');
    await this.publicClient.waitForTransactionReceipt({ hash: fundHash });
    console.log('Fund successful:', fundHash);
    
    return { hash: fundHash };
  }

  async storeDocument(escrowId: string, documentHash: string) {
    if (!this.walletClient || !this.walletClient.account) {
      throw new Error('Wallet not connected');
    }

    // Direct contract call (user pays gas)
    const { request } = await this.publicClient.simulateContract({
      address: ESCROW_CONTRACT,
      abi: escrowABI,
      functionName: 'storeDocumentHash',
      args: [escrowId as `0x${string}`, documentHash as `0x${string}`],
      account: this.walletClient.account
    });

    const hash = await this.walletClient.writeContract(request);
    await this.publicClient.waitForTransactionReceipt({ hash });

    return { hash };
  }

  async confirmDelivery(escrowId: string) {
    if (!this.walletClient || !this.walletClient.account) {
      throw new Error('Wallet not connected');
    }

    // Direct contract call (user pays gas)
    const { request } = await this.publicClient.simulateContract({
      address: ESCROW_CONTRACT,
      abi: escrowABI,
      functionName: 'confirmDelivery',
      args: [escrowId as `0x${string}`],
      account: this.walletClient.account
    });

    const hash = await this.walletClient.writeContract(request);
    await this.publicClient.waitForTransactionReceipt({ hash });

    return { hash };
  }

  async initiateDispute(escrowId: string, reason: string) {
    if (!this.walletClient || !this.walletClient.account) {
      throw new Error('Wallet not connected');
    }

    // Direct contract call (user pays gas)
    const { request } = await this.publicClient.simulateContract({
      address: ESCROW_CONTRACT,
      abi: escrowABI,
      functionName: 'initiateDispute',
      args: [escrowId as `0x${string}`, reason],
      account: this.walletClient.account
    });

    const hash = await this.walletClient.writeContract(request);
    await this.publicClient.waitForTransactionReceipt({ hash });

    return { hash };
  }

  async getEscrowDetails(escrowId: string) {
    const result = await this.publicClient.readContract({
      address: ESCROW_CONTRACT,
      abi: escrowABI,
      functionName: 'getEscrowDetails',
      args: [escrowId as `0x${string}`]
    });

    return {
      buyer: result[0],
      seller: result[1],
      amount: result[2],
      deliveryDeadline: result[3],
      status: result[4],
      token: result[5],
      createdAt: result[6],
      fundedAt: result[7],
      documentsUploaded: result[8]
    };
  }

  disconnect() {
    this.walletClient = null;
  }

  getAccount() {
    return this.walletClient?.account?.address || null;
  }

  async getUserEscrows(userAddress: string) {
    // This would typically query Ponder or use contract events
    // For now, return empty array as this is handled by Ponder
    return [];
  }

  async getIDRXBalance(userAddress: string) {
    const balance = await this.publicClient.readContract({
      address: IDRX_CONTRACT,
      abi: tokenABI,
      functionName: 'balanceOf',
      args: [userAddress as `0x${string}`]
    });

    return Number(balance);
  }
}