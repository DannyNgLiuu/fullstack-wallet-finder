import mongoose from 'mongoose';

const SavedWalletSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  address: { 
    type: String, 
    required: true 
  },
  name: { 
    type: String,
    default: '' 
  },
  sourceTokens: [{
    address: String,
    name: String,
    tradingData: [{
      timePeriod: String,
      bought: String,
      sold: String,
      pnl: String,
      tokens_bought: String,
      tokens_sold: String,
      lastUpdated: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure a user can't save the same wallet twice
SavedWalletSchema.index({ userId: 1, address: 1 }, { unique: true });

export default mongoose.model('SavedWallet', SavedWalletSchema); 