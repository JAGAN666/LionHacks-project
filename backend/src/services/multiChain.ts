import { ethers } from 'ethers';
import { prisma } from '../server';

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  nativeToken: string;
  blockExplorer: string;
  contractAddress?: string;
  gasMultiplier: number;
  bridgeFee: number; // in USD cents
}

export interface BridgeTransaction {
  fromChain: string;
  toChain: string;
  tokenId: string;
  txHash: string;
  status: 'pending' | 'completed' | 'failed';
  bridgeFee: number;
}

export class MultiChainService {
  private static readonly SUPPORTED_CHAINS: Record<string, ChainConfig> = {
    ethereum: {
      chainId: 11155111, // Sepolia testnet
      name: 'Ethereum Sepolia',
      rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://sepolia.infura.io/v3/demo',
      nativeToken: 'ETH',
      blockExplorer: 'https://sepolia.etherscan.io',
      contractAddress: process.env.ETHEREUM_CONTRACT_ADDRESS,
      gasMultiplier: 1.2,
      bridgeFee: 500 // $5.00
    },
    polygon: {
      chainId: 80001, // Mumbai testnet
      name: 'Polygon Mumbai',
      rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-mumbai.g.alchemy.com/v2/demo',
      nativeToken: 'MATIC',
      blockExplorer: 'https://mumbai.polygonscan.com',
      contractAddress: process.env.POLYGON_CONTRACT_ADDRESS,
      gasMultiplier: 1.1,
      bridgeFee: 100 // $1.00
    },
    base: {
      chainId: 84531, // Base Goerli testnet
      name: 'Base Goerli',
      rpcUrl: process.env.BASE_RPC_URL || 'https://goerli.base.org',
      nativeToken: 'ETH',
      blockExplorer: 'https://goerli.basescan.org',
      contractAddress: process.env.BASE_CONTRACT_ADDRESS,
      gasMultiplier: 1.0,
      bridgeFee: 200 // $2.00
    },
    arbitrum: {
      chainId: 421613, // Arbitrum Goerli
      name: 'Arbitrum Goerli',
      rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://goerli-rollup.arbitrum.io/rpc',
      nativeToken: 'ETH',
      blockExplorer: 'https://goerli.arbiscan.io',
      contractAddress: process.env.ARBITRUM_CONTRACT_ADDRESS,
      gasMultiplier: 1.0,
      bridgeFee: 150 // $1.50
    }
  };

  // Get all supported chains
  public static getSupportedChains(): ChainConfig[] {
    return Object.values(this.SUPPORTED_CHAINS);
  }

  // Get chain config by name
  public static getChainConfig(chainName: string): ChainConfig | null {
    return this.SUPPORTED_CHAINS[chainName] || null;
  }

  // Create provider for specific chain
  private static getProvider(chainName: string): ethers.JsonRpcProvider | null {
    const config = this.getChainConfig(chainName);
    if (!config) return null;

    return new ethers.JsonRpcProvider(config.rpcUrl);
  }

  // Mint NFT on specific chain
  public static async mintNFTOnChain(
    nftId: string,
    chainName: string,
    userAddress: string
  ): Promise<{ txHash: string; tokenId: string }> {
    const nft = await prisma.nFTToken.findUnique({
      where: { id: nftId },
      include: { achievement: true, user: true }
    });

    if (!nft) {
      throw new Error('NFT not found');
    }

    const chainConfig = this.getChainConfig(chainName);
    if (!chainConfig || !chainConfig.contractAddress) {
      throw new Error(`Chain ${chainName} not supported or contract not deployed`);
    }

    const provider = this.getProvider(chainName);
    if (!provider) {
      throw new Error(`Failed to create provider for ${chainName}`);
    }

    // For demo purposes, we'll simulate the minting process
    // In production, you'd interact with actual smart contracts
    const simulatedTxHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
    const simulatedTokenId = `${chainConfig.chainId}_${Date.now()}`;

    // Update NFT record
    await prisma.nFTToken.update({
      where: { id: nftId },
      data: {
        blockchain: chainName,
        contractAddress: chainConfig.contractAddress,
        tokenId: simulatedTokenId,
        metadataUri: `${process.env.API_URL}/api/nfts/metadata/${nft.achievementId}?chain=${chainName}`,
        minted: true,
        mintedAt: new Date()
      }
    });

    console.log(`🔗 Minted NFT ${nftId} on ${chainName} - TX: ${simulatedTxHash}`);

    return {
      txHash: simulatedTxHash,
      tokenId: simulatedTokenId
    };
  }

  // Bridge NFT between chains
  public static async bridgeNFT(
    nftId: string,
    fromChain: string,
    toChain: string,
    userAddress: string
  ): Promise<BridgeTransaction> {
    const nft = await prisma.nFTToken.findUnique({
      where: { id: nftId },
      include: { user: true }
    });

    if (!nft) {
      throw new Error('NFT not found');
    }

    if (nft.blockchain !== fromChain) {
      throw new Error(`NFT is not on ${fromChain} chain`);
    }

    const fromConfig = this.getChainConfig(fromChain);
    const toConfig = this.getChainConfig(toChain);

    if (!fromConfig || !toConfig) {
      throw new Error('Invalid chain configuration');
    }

    // Calculate bridge fee
    const bridgeFee = fromConfig.bridgeFee + toConfig.bridgeFee;

    // Simulate bridge transaction
    const bridgeTxHash = `bridge_0x${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;

    // Create bridge record
    const bridgeTransaction: BridgeTransaction = {
      fromChain,
      toChain,
      tokenId: nft.tokenId,
      txHash: bridgeTxHash,
      status: 'pending',
      bridgeFee
    };

    // In a real implementation, you would:
    // 1. Lock NFT on source chain
    // 2. Generate proof of lock
    // 3. Submit proof to destination chain
    // 4. Mint equivalent NFT on destination chain

    // For demo, we'll simulate instant bridging
    setTimeout(async () => {
      await this.completeBridge(nftId, toChain, toConfig.contractAddress!);
    }, 3000); // 3 second delay for demo

    console.log(`🌉 Bridging NFT ${nftId} from ${fromChain} to ${toChain}`);

    return bridgeTransaction;
  }

  private static async completeBridge(nftId: string, toChain: string, contractAddress: string): Promise<void> {
    const newTokenId = `${this.getChainConfig(toChain)?.chainId}_${Date.now()}`;

    await prisma.nFTToken.update({
      where: { id: nftId },
      data: {
        blockchain: toChain,
        contractAddress,
        tokenId: newTokenId,
        metadataUri: `${process.env.API_URL}/api/nfts/metadata/${nftId}?chain=${toChain}`
      }
    });

    console.log(`✅ Bridge completed - NFT ${nftId} now on ${toChain}`);
  }

  // Get gas price for chain
  public static async getGasPrice(chainName: string): Promise<{ gasPrice: string; gasPriceGwei: string }> {
    const provider = this.getProvider(chainName);
    if (!provider) {
      throw new Error(`Provider not available for ${chainName}`);
    }

    try {
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');
      
      return {
        gasPrice: gasPrice.toString(),
        gasPriceGwei: ethers.formatUnits(gasPrice, 'gwei')
      };
    } catch (error) {
      console.error(`Failed to get gas price for ${chainName}:`, error);
      // Return default values
      return {
        gasPrice: ethers.parseUnits('20', 'gwei').toString(),
        gasPriceGwei: '20'
      };
    }
  }

  // Estimate bridge cost
  public static async estimateBridgeCost(
    fromChain: string,
    toChain: string
  ): Promise<{
    bridgeFee: number;
    estimatedGasCost: string;
    totalCostUSD: number;
    estimatedTime: string;
  }> {
    const fromConfig = this.getChainConfig(fromChain);
    const toConfig = this.getChainConfig(toChain);

    if (!fromConfig || !toConfig) {
      throw new Error('Invalid chain configuration');
    }

    const bridgeFee = fromConfig.bridgeFee + toConfig.bridgeFee;
    
    // Get gas prices for both chains
    const fromGas = await this.getGasPrice(fromChain);
    const toGas = await this.getGasPrice(toChain);

    // Estimate gas costs (simplified)
    const estimatedFromGasCost = ethers.formatEther(
      BigInt(fromGas.gasPrice) * BigInt(150000) // Estimated gas limit
    );
    const estimatedToGasCost = ethers.formatEther(
      BigInt(toGas.gasPrice) * BigInt(100000)
    );

    // Simplified USD conversion (in reality, you'd use an oracle)
    const ethPriceUSD = 2000; // Simplified
    const maticPriceUSD = 1; // Simplified

    const gasCostUSD = (
      parseFloat(estimatedFromGasCost) * 
      (fromConfig.nativeToken === 'ETH' ? ethPriceUSD : maticPriceUSD)
    ) + (
      parseFloat(estimatedToGasCost) * 
      (toConfig.nativeToken === 'ETH' ? ethPriceUSD : maticPriceUSD)
    );

    const totalCostUSD = (bridgeFee / 100) + gasCostUSD;

    // Estimate time based on chains
    let estimatedTime = '5-10 minutes';
    if (fromChain === 'ethereum' || toChain === 'ethereum') {
      estimatedTime = '10-20 minutes';
    }

    return {
      bridgeFee,
      estimatedGasCost: `${estimatedFromGasCost} ${fromConfig.nativeToken} + ${estimatedToGasCost} ${toConfig.nativeToken}`,
      totalCostUSD: Math.round(totalCostUSD * 100) / 100,
      estimatedTime
    };
  }

  // Get cross-chain NFT portfolio
  public static async getCrossChainPortfolio(userId: string): Promise<any> {
    const nfts = await prisma.nFTToken.findMany({
      where: { userId, minted: true },
      include: { achievement: true }
    });

    const portfolioByChain = nfts.reduce((acc, nft) => {
      if (!acc[nft.blockchain]) {
        acc[nft.blockchain] = {
          chain: this.getChainConfig(nft.blockchain),
          nfts: [],
          totalValue: 0,
          count: 0
        };
      }
      
      acc[nft.blockchain].nfts.push(nft);
      acc[nft.blockchain].count++;
      acc[nft.blockchain].totalValue += nft.evolutionPoints * 10; // Simplified valuation
      
      return acc;
    }, {} as any);

    const totalPortfolioValue = Object.values(portfolioByChain).reduce(
      (sum: number, chain: any) => sum + chain.totalValue, 0
    );

    return {
      portfolioByChain,
      totalNFTs: nfts.length,
      totalChains: Object.keys(portfolioByChain).length,
      totalPortfolioValue,
      supportedChains: this.getSupportedChains()
    };
  }

  // Batch mint NFTs across multiple chains
  public static async batchMintAcrossChains(
    nftId: string,
    chains: string[],
    userAddress: string
  ): Promise<{ results: any[]; errors: any[] }> {
    const results = [];
    const errors = [];

    for (const chain of chains) {
      try {
        const result = await this.mintNFTOnChain(nftId, chain, userAddress);
        results.push({ chain, ...result });
      } catch (error) {
        errors.push({ chain, error: (error as Error).message });
      }
    }

    return { results, errors };
  }

  // Get chain health status
  public static async getChainHealthStatus(): Promise<Record<string, any>> {
    const healthStatus: Record<string, any> = {};

    for (const [chainName, config] of Object.entries(this.SUPPORTED_CHAINS)) {
      try {
        const provider = this.getProvider(chainName);
        if (!provider) {
          healthStatus[chainName] = { status: 'unavailable', error: 'Provider not configured' };
          continue;
        }

        const blockNumber = await provider.getBlockNumber();
        const gasPrice = await this.getGasPrice(chainName);
        
        healthStatus[chainName] = {
          status: 'healthy',
          blockNumber,
          gasPrice: gasPrice.gasPriceGwei,
          rpcUrl: config.rpcUrl,
          lastChecked: new Date().toISOString()
        };
      } catch (error) {
        healthStatus[chainName] = {
          status: 'unhealthy',
          error: (error as Error).message,
          lastChecked: new Date().toISOString()
        };
      }
    }

    return healthStatus;
  }

  // Get optimal chain recommendation for minting
  public static async getOptimalChainRecommendation(
    considerGasCost: boolean = true,
    preferredFeatures: string[] = []
  ): Promise<{
    recommendedChain: string;
    reason: string;
    alternatives: Array<{ chain: string; pros: string[]; cons: string[] }>;
  }> {
    const chainHealth = await this.getChainHealthStatus();
    const healthyChains = Object.entries(chainHealth)
      .filter(([_, health]) => health.status === 'healthy')
      .map(([chain, _]) => chain);

    if (healthyChains.length === 0) {
      throw new Error('No healthy chains available');
    }

    // Simple recommendation algorithm
    let recommendedChain = 'polygon'; // Default to Polygon for low cost
    let reason = 'Lowest transaction costs and fast confirmations';

    if (considerGasCost) {
      // Polygon typically has lowest costs
      if (healthyChains.includes('polygon')) {
        recommendedChain = 'polygon';
        reason = 'Lowest gas fees and fastest confirmations (~2 seconds)';
      } else if (healthyChains.includes('base')) {
        recommendedChain = 'base';
        reason = 'Low gas fees and good ecosystem support';
      }
    }

    // Check for specific feature preferences
    if (preferredFeatures.includes('security') && healthyChains.includes('ethereum')) {
      recommendedChain = 'ethereum';
      reason = 'Highest security and decentralization';
    }

    const alternatives = healthyChains
      .filter(chain => chain !== recommendedChain)
      .map(chain => {
        const config = this.getChainConfig(chain)!;
        const pros = [];
        const cons = [];

        switch (chain) {
          case 'ethereum':
            pros.push('Highest security', 'Largest ecosystem', 'Most liquidity');
            cons.push('Higher gas fees', 'Slower confirmations');
            break;
          case 'polygon':
            pros.push('Very low fees', 'Fast confirmations', 'Ethereum compatible');
            cons.push('Less decentralized', 'Newer ecosystem');
            break;
          case 'base':
            pros.push('Low fees', 'Coinbase backed', 'Growing ecosystem');
            cons.push('Newer network', 'Smaller ecosystem');
            break;
          case 'arbitrum':
            pros.push('Lower fees than Ethereum', 'High security', 'Ethereum compatible');
            cons.push('More complex architecture', 'Withdrawal delays');
            break;
        }

        return { chain, pros, cons };
      });

    return {
      recommendedChain,
      reason,
      alternatives
    };
  }
}

export const multiChainService = MultiChainService;