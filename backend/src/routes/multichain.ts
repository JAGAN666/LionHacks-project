import express from 'express';
import { prisma } from '../server';
import { authenticateToken, requireEmailVerification } from '../middleware/auth';
import { multiChainService } from '../services/multiChain';

const router = express.Router();

// Get supported chains
router.get('/chains', authenticateToken, async (req: any, res) => {
  try {
    const chains = multiChainService.getSupportedChains();
    const healthStatus = await multiChainService.getChainHealthStatus();

    const chainsWithHealth = chains.map(chain => ({
      ...chain,
      health: healthStatus[chain.name.toLowerCase().replace(' ', '_')] || { status: 'unknown' }
    }));

    res.json({
      chains: chainsWithHealth,
      totalChains: chains.length,
      healthyChains: Object.values(healthStatus).filter(h => h.status === 'healthy').length
    });
  } catch (error) {
    console.error('Get chains error:', error);
    res.status(500).json({ error: 'Failed to get chain information' });
  }
});

// Get chain health status
router.get('/health', authenticateToken, async (req: any, res) => {
  try {
    const healthStatus = await multiChainService.getChainHealthStatus();
    res.json(healthStatus);
  } catch (error) {
    console.error('Get chain health error:', error);
    res.status(500).json({ error: 'Failed to get chain health status' });
  }
});

// Get optimal chain recommendation
router.get('/recommend', authenticateToken, async (req: any, res) => {
  try {
    const { considerGasCost = 'true', features } = req.query;
    
    const preferredFeatures = features ? 
      (features as string).split(',').map(f => f.trim()) : 
      [];

    const recommendation = await multiChainService.getOptimalChainRecommendation(
      considerGasCost === 'true',
      preferredFeatures
    );

    res.json(recommendation);
  } catch (error: any) {
    console.error('Get chain recommendation error:', error);
    res.status(500).json({ error: error.message || 'Failed to get chain recommendation' });
  }
});

// Mint NFT on specific chain
router.post('/mint', authenticateToken, requireEmailVerification, async (req: any, res) => {
  try {
    const { nftId, chain, walletAddress } = req.body;

    if (!nftId || !chain || !walletAddress) {
      return res.status(400).json({ error: 'Missing required parameters: nftId, chain, walletAddress' });
    }

    // Verify NFT ownership
    const nft = await prisma.nFTToken.findFirst({
      where: { id: nftId, userId: req.userId }
    });

    if (!nft) {
      return res.status(404).json({ error: 'NFT not found or not owned by user' });
    }

    if (nft.minted) {
      return res.status(400).json({ error: 'NFT already minted' });
    }

    const result = await multiChainService.mintNFTOnChain(nftId, chain, walletAddress);

    res.json({
      message: `NFT successfully minted on ${chain}!`,
      ...result,
      explorerUrl: `${multiChainService.getChainConfig(chain)?.blockExplorer}/tx/${result.txHash}`
    });
  } catch (error: any) {
    console.error('Mint NFT on chain error:', error);
    res.status(400).json({ error: error.message || 'Failed to mint NFT' });
  }
});

// Bridge NFT between chains
router.post('/bridge', authenticateToken, requireEmailVerification, async (req: any, res) => {
  try {
    const { nftId, fromChain, toChain, walletAddress } = req.body;

    if (!nftId || !fromChain || !toChain || !walletAddress) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (fromChain === toChain) {
      return res.status(400).json({ error: 'Cannot bridge to the same chain' });
    }

    // Verify NFT ownership
    const nft = await prisma.nFTToken.findFirst({
      where: { id: nftId, userId: req.userId }
    });

    if (!nft) {
      return res.status(404).json({ error: 'NFT not found or not owned by user' });
    }

    const bridgeTransaction = await multiChainService.bridgeNFT(
      nftId,
      fromChain,
      toChain,
      walletAddress
    );

    res.json({
      message: `Bridge initiated from ${fromChain} to ${toChain}`,
      bridgeTransaction,
      estimatedTime: '5-10 minutes',
      status: 'pending'
    });
  } catch (error: any) {
    console.error('Bridge NFT error:', error);
    res.status(400).json({ error: error.message || 'Failed to bridge NFT' });
  }
});

// Get bridge cost estimation
router.post('/bridge/estimate', authenticateToken, async (req: any, res) => {
  try {
    const { fromChain, toChain } = req.body;

    if (!fromChain || !toChain) {
      return res.status(400).json({ error: 'Missing required parameters: fromChain, toChain' });
    }

    const estimate = await multiChainService.estimateBridgeCost(fromChain, toChain);

    res.json(estimate);
  } catch (error: any) {
    console.error('Estimate bridge cost error:', error);
    res.status(400).json({ error: error.message || 'Failed to estimate bridge cost' });
  }
});

// Get user's cross-chain portfolio
router.get('/portfolio', authenticateToken, async (req: any, res) => {
  try {
    const portfolio = await multiChainService.getCrossChainPortfolio(req.userId);

    res.json(portfolio);
  } catch (error) {
    console.error('Get cross-chain portfolio error:', error);
    res.status(500).json({ error: 'Failed to get portfolio' });
  }
});

// Batch mint across multiple chains
router.post('/batch-mint', authenticateToken, requireEmailVerification, async (req: any, res) => {
  try {
    const { nftId, chains, walletAddress } = req.body;

    if (!nftId || !chains || !walletAddress || !Array.isArray(chains)) {
      return res.status(400).json({ error: 'Missing or invalid parameters' });
    }

    // Verify NFT ownership
    const nft = await prisma.nFTToken.findFirst({
      where: { id: nftId, userId: req.userId }
    });

    if (!nft) {
      return res.status(404).json({ error: 'NFT not found or not owned by user' });
    }

    const { results, errors } = await multiChainService.batchMintAcrossChains(
      nftId,
      chains,
      walletAddress
    );

    res.json({
      message: `Batch mint completed across ${results.length} chains`,
      results,
      errors,
      totalChains: chains.length,
      successfulChains: results.length,
      failedChains: errors.length
    });
  } catch (error: any) {
    console.error('Batch mint error:', error);
    res.status(400).json({ error: error.message || 'Failed to batch mint' });
  }
});

// Get gas prices for all chains
router.get('/gas-prices', authenticateToken, async (req: any, res) => {
  try {
    const chains = multiChainService.getSupportedChains();
    const gasPrices: Record<string, any> = {};

    for (const chain of chains) {
      try {
        const chainName = chain.name.toLowerCase().replace(' ', '_');
        const gasData = await multiChainService.getGasPrice(chainName);
        gasPrices[chainName] = {
          ...gasData,
          nativeToken: chain.nativeToken,
          chainName: chain.name
        };
      } catch (error) {
        gasPrices[chain.name.toLowerCase().replace(' ', '_')] = {
          error: 'Unable to fetch gas price',
          nativeToken: chain.nativeToken,
          chainName: chain.name
        };
      }
    }

    res.json(gasPrices);
  } catch (error) {
    console.error('Get gas prices error:', error);
    res.status(500).json({ error: 'Failed to get gas prices' });
  }
});

// Get chain analytics
router.get('/analytics', authenticateToken, async (req: any, res) => {
  try {
    // Get NFT distribution across chains
    const nftDistribution = await prisma.nFTToken.groupBy({
      by: ['blockchain'],
      where: { minted: true },
      _count: { id: true },
      _avg: { evolutionPoints: true }
    });

    // Get user distribution across chains
    const userChainPreferences = await prisma.nFTToken.groupBy({
      by: ['blockchain', 'userId'],
      where: { minted: true },
      _count: { id: true }
    });

    const uniqueUsersPerChain = userChainPreferences.reduce((acc, item) => {
      acc[item.blockchain] = (acc[item.blockchain] || new Set()).add(item.userId);
      return acc;
    }, {} as Record<string, Set<string>>);

    const userStats = Object.entries(uniqueUsersPerChain).map(([chain, users]) => ({
      blockchain: chain,
      uniqueUsers: users.size
    }));

    // Get bridging activity (simulated since we don't have real bridge data)
    const bridgeActivity = {
      totalBridges: 0, // Would come from bridge transaction logs
      popularRoutes: [
        { from: 'ethereum', to: 'polygon', count: 12 },
        { from: 'polygon', to: 'base', count: 8 },
        { from: 'base', to: 'arbitrum', count: 5 }
      ]
    };

    res.json({
      nftDistribution,
      userStats,
      bridgeActivity,
      totalChainsUsed: nftDistribution.length,
      totalNFTsMinted: nftDistribution.reduce((sum, item) => sum + item._count.id, 0)
    });
  } catch (error) {
    console.error('Get chain analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Simulate cross-chain transaction for demo
router.post('/demo/simulate-bridge', authenticateToken, async (req: any, res) => {
  try {
    const { fromChain, toChain, amount = 1 } = req.body;

    if (!fromChain || !toChain) {
      return res.status(400).json({ error: 'Missing chain parameters' });
    }

    // Simulate bridge progress
    const simulationSteps = [
      { step: 1, status: 'Initiating bridge transaction', progress: 20 },
      { step: 2, status: 'Locking tokens on source chain', progress: 40 },
      { step: 3, status: 'Generating merkle proof', progress: 60 },
      { step: 4, status: 'Submitting proof to destination chain', progress: 80 },
      { step: 5, status: 'Minting tokens on destination chain', progress: 100 }
    ];

    const bridgeDetails = {
      bridgeId: `bridge_${Date.now()}`,
      fromChain,
      toChain,
      amount,
      estimatedTime: '5-10 minutes',
      steps: simulationSteps,
      txHash: `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`
    };

    res.json({
      message: 'Bridge simulation initiated',
      bridgeDetails,
      note: 'This is a demo simulation. In production, this would interact with real bridge contracts.'
    });
  } catch (error) {
    console.error('Simulate bridge error:', error);
    res.status(500).json({ error: 'Failed to simulate bridge' });
  }
});

export default router;