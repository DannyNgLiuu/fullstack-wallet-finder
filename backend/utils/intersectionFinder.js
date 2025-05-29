function findIntersections(tokenResults) {
  console.log('🔍 Input to intersection finder:', tokenResults); // DEBUG
  
  const walletTokenMap = new Map();
  const walletTokenDataMap = new Map(); // Store per-token wallet data
  
  tokenResults.forEach(({ token, wallets }) => {
    console.log(`📝 Processing token ${token} with ${wallets?.length || 0} wallets`); // DEBUG
    
    if (wallets && Array.isArray(wallets)) {
      wallets.forEach(wallet => {
        // Extract address from wallet object or use wallet if it's already a string
        const address = typeof wallet === 'string' ? wallet : wallet.address;
        
        if (!address) {
          console.warn('⚠️ Wallet without address found:', wallet);
          return;
        }
        
        // Track which tokens this wallet appears in
        if (!walletTokenMap.has(address)) {
          walletTokenMap.set(address, []);
        }
        walletTokenMap.get(address).push(token);
        
        // Store per-token wallet data using composite key
        const tokenWalletKey = `${address}-${token}`;
        if (typeof wallet === 'object' && wallet.address) {
          console.log(`💰 Storing wallet data for ${address.substring(0, 8)}... token ${token.substring(0, 8)}...`, wallet); // DEBUG
          walletTokenDataMap.set(tokenWalletKey, wallet);
        }
      });
    }
  });
  
  console.log(`💾 Total unique wallets found: ${walletTokenMap.size}`); // DEBUG
  
  // For single token, show all wallets (count = 1)
  // For multiple tokens, only show intersections (count >= 2)
  const minIntersections = tokenResults.length > 1 ? 2 : 1;
  
  const intersectedWallets = Array.from(walletTokenMap.entries())
    .filter(([address, tokens]) => tokens.length >= minIntersections)
    .map(([address, tokens]) => {
      // Collect per-token trading data
      const tokenData = {};
      tokens.forEach(token => {
        const tokenWalletKey = `${address}-${token}`;
        const walletData = walletTokenDataMap.get(tokenWalletKey);
        if (walletData) {
          tokenData[token] = {
            bought: walletData.bought || '$0',
            sold: walletData.sold || '$0',
            pnl: walletData.pnl || '$0'
          };
        }
      });
      
      return {
        address: address,
        count: tokens.length,
        tokens: tokens,
        tokenData: tokenData // Per-token trading data
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 100);
  
  console.log(`🎯 Final intersected wallets: ${intersectedWallets.length}`); // DEBUG
  console.log('📊 First few results:', intersectedWallets.slice(0, 3)); // DEBUG
  
  return intersectedWallets;
}

export { findIntersections };