import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import SavedWallet from '../models/SavedWallet.js';

const router = express.Router();

// Get all saved wallets for a user
router.get('/wallets', verifyToken, async (req, res) => {
  try {
    const wallets = await SavedWallet.find({ userId: req.user.id });
    res.json(wallets);
  } catch (error) {
    console.error('Error fetching wallets:', error);
    res.status(500).json({ message: 'Failed to fetch wallets' });
  }
});

// Save a new wallet
router.post('/wallets', verifyToken, async (req, res) => {
  try {
    console.log('Received wallet data:', JSON.stringify(req.body, null, 2)); // Pretty print the full data
    const { address, name, sourceTokens } = req.body;
    
    // Check if wallet already exists for this user
    const existingWallet = await SavedWallet.findOne({
      userId: req.user.id,
      address: address
    });

    if (existingWallet) {
      return res.status(400).json({ message: 'Wallet already saved' });
    }

    // Ensure sourceTokens is properly formatted with full trading data
    const formattedSourceTokens = sourceTokens.map(token => {
      // Ensure tradingData is properly structured
      const formattedTradingData = (token.tradingData || []).map(data => ({
        timePeriod: data.timePeriod || '30d',
        bought: data.bought || '$0',
        sold: data.sold || '$0',
        pnl: data.pnl || '$0',
        tokens_bought: data.tokens_bought || '0',
        tokens_sold: data.tokens_sold || '0',
        lastUpdated: data.lastUpdated || new Date()
      }));

      return {
        address: token.address,
        name: token.name || '',
        tradingData: formattedTradingData
      };
    });

    const newWallet = new SavedWallet({
      userId: req.user.id,
      address,
      name,
      sourceTokens: formattedSourceTokens
    });

    console.log('Saving wallet:', JSON.stringify(newWallet.toObject(), null, 2)); // Pretty print the full wallet data

    await newWallet.save();
    
    // Fetch the saved wallet to ensure it was saved correctly
    const savedWallet = await SavedWallet.findById(newWallet._id);
    console.log('Saved wallet:', JSON.stringify(savedWallet.toObject(), null, 2)); // Pretty print the saved wallet
    
    res.status(201).json(savedWallet);
  } catch (error) {
    console.error('Error saving wallet:', error);
    res.status(500).json({ message: 'Failed to save wallet' });
  }
});

// Delete a saved wallet
router.delete('/wallets/:address', verifyToken, async (req, res) => {
  try {
    const { address } = req.params;
    
    const result = await SavedWallet.findOneAndDelete({
      userId: req.user.id,
      address: address
    });

    if (!result) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    res.json({ message: 'Wallet deleted successfully' });
  } catch (error) {
    console.error('Error deleting wallet:', error);
    res.status(500).json({ message: 'Failed to delete wallet' });
  }
});

export default router; 