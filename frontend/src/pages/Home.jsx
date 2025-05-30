import React, { useState, useEffect } from 'react';
import { Search, Download, Settings, LogOut, Wallet, Home, TrendingUp, TrendingDown, DollarSign, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const HomePage = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [tokenList, setTokenList] = useState('');
  const [results, setResults] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [savedWallets, setSavedWallets] = useState([
    { address: 'ds31T4cXgNeaEQqpUDzc55iQxvbxPXm99aUeRfyFe8s', tags: ['djt', 'wif'], name: 'Wallet 1' },
    { address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', tags: ['bonk', 'pepe'], name: 'High Value Wallet' },
    { address: 'A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2', tags: ['sol'], name: 'SOL Whale' }
  ]);
  const [walletFilter, setWalletFilter] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [walletDetails, setWalletDetails] = useState(null);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('30d');

  // JWT Protection - Check authentication on component mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }

    // Verify token with backend
    fetch('http://localhost:5000/protected', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('Token invalid');
        }
        return res.json();
      })
      .then(data => {
        setUser(data.user);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Auth error:', err);
        localStorage.removeItem('token');
        window.location.href = '/';
      });
  }, []);

  const handleScan = async () => {
    if (!tokenList.trim()) return;
    
    setIsScanning(true);
    setResults([]);
    
    const tokens = tokenList.split('\n')
      .map(t => t.trim())
      .filter(t => t.length > 0)
      .map(line => {
        const [address, name = ''] = line.split(/\s+/);
        return { token: address.trim(), name: name.trim() };
      })
      .filter(({ token }) => token.length > 0);
    
    try {
      const response = await fetch('http://localhost:5000/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          tokens: tokens.map(t => t.token),
          timePeriod: selectedTimePeriod
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start scan');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch(data.type) {
                case 'started':
                  console.log('Scan started:', data.message);
                  break;
                case 'token_complete':
                  console.log(`Completed: ${data.completed}/${data.total}`);
                  break;
                case 'complete':
                  if (data.results && Array.isArray(data.results) && data.results.length > 0) {
                    const normalizedResults = data.results.map(result => {
                      let walletData;
                      if (result.address && typeof result.address === 'object' && result.address.address) {
                        walletData = {
                          address: result.address.address,
                          bought: result.address.bought || '$0',
                          sold: result.address.sold || '$0',
                          pnl: result.address.pnl || '$0',
                          tokens_bought: result.address.tokens_bought || '0',
                          tokens_sold: result.address.tokens_sold || '0'
                        };
                      } else {
                        // Handle direct object format
                        walletData = {
                          address: result.address || result || 'Unknown',
                          bought: result.bought || '$0',
                          sold: result.sold || '$0',
                          pnl: result.pnl || '$0',
                          tokens_bought: result.tokens_bought || '0',
                          tokens_sold: result.tokens_sold || '0'
                        };
                      }

                      // Add token names to the tokens array
                      const tokensWithNames = Array.isArray(result.tokens) 
                        ? result.tokens.map(token => {
                            const matchingToken = tokens.find(t => t.token === token);
                            return {
                              address: token,
                              name: matchingToken?.name || ''
                            };
                          })
                        : [];
                      
                      return {
                        ...walletData,
                        count: result.count || 1,
                        tokens: tokensWithNames,
                        tokenData: result.tokenData || {}
                      };
                    });
                    
                    setResults(normalizedResults);
                  } else {
                    setResults([]);
                  }
                  setIsScanning(false);
                  break;
                case 'error':
                  console.error('Scan error:', data.message);
                  setIsScanning(false);
                  break;
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Scan failed:', error);
      setIsScanning(false);
      
      // Mock data for development
      setTimeout(() => {
        const mockResults = [
          { 
            address: 'ds31T4cXgNeaEQqpUDzc55iQxvbxPXm99aUeRfyFe8s', 
            count: 3, 
            tokens: [
              { address: 'AX8b9A79uD8TKDQoWTzq3NaD1FN4JEDGkR2yTQGhcwjo', name: 'bump' },
              { address: 'FEsFicbdfFpXDaSeDo4yBeGqde6bBGpZTSQmT6EnMhDC', name: 'yapper' },
              { address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', name: 'glmps' }
            ],
            bought: '$12.5K',
            sold: '$8.2K',
            pnl: '$4.3K',
            tokens_bought: '2.1M',
            tokens_sold: '1.4M'
          }
        ];
        setResults(mockResults);
        setIsScanning(false);
      }, 2000);
    }
  };

  const handleWalletClick = (walletAddress) => {
    // Handle both string addresses and wallet objects
    const address = typeof walletAddress === 'string' ? walletAddress : walletAddress.address;
    setSelectedWallet(address);
    
    // Find the wallet data for this address
    const walletData = results.find(r => r.address === address);
    if (walletData) {
      setWalletDetails(walletData);
    }
  };

  const handleCoinClick = (token) => {
    setSelectedCoin(token);
  };

  const closeWalletModal = () => {
    setSelectedWallet(null);
    setWalletDetails(null);
    setSelectedCoin(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const filteredWallets = savedWallets.filter(wallet => 
    wallet.tags.some(tag => tag.toLowerCase().includes(walletFilter.toLowerCase())) ||
    wallet.address.toLowerCase().includes(walletFilter.toLowerCase()) ||
    wallet.name.toLowerCase().includes(walletFilter.toLowerCase())
  );

  const exportToTrader = (platform, wallets) => {
    // Extract addresses from wallet objects, handling both formats
    const addresses = wallets.map(w => {
      if (typeof w === 'string') return w;
      return w.address || w;
    }).join('\n');
    const blob = new Blob([addresses], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallets_${platform.toLowerCase()}.txt`;
    a.click();
  };

  // Helper function to determine if PnL is positive or negative
  const getPnLColor = (pnl) => {
    if (!pnl) return isDarkMode ? 'text-gray-400' : 'text-gray-600';
    const isPositive = !pnl.startsWith('-');
    return isPositive 
      ? (isDarkMode ? 'text-green-400' : 'text-green-600')
      : (isDarkMode ? 'text-red-400' : 'text-red-600');
  };

  // Helper function to get token-specific trading data
  const getTokenSpecificData = (token, field) => {
    // Use the token address for looking up data
    const tokenAddress = typeof token === 'string' ? token : token.address;
    
    // Use real per-token data from the intersection results
    if (walletDetails?.tokenData && walletDetails.tokenData[tokenAddress]) {
      const tokenData = walletDetails.tokenData[tokenAddress];
      return tokenData[field] || '$0';
    }
    
    return '$0';
  };

  const themeClasses = isDarkMode ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900';
  const cardClasses = isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized message if no user
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Unauthorized access</p>
          <p className="text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeClasses}`}>
      {/* Navigation */}
      <nav className={`${cardClasses} border-b px-6 py-4`}>
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="text-2xl font-bold">Wallet Finder</h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Welcome back, {user.email}
            </p>
          </motion.div>
          <div className="flex space-x-1">
            {[
              { id: 'home', label: 'Home', icon: Home },
              { id: 'wallets', label: 'My Wallets', icon: Wallet },
              { id: 'export', label: 'Export', icon: Download },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map(({ id, label, icon: Icon }) => (
              <motion.button
                key={id}
                onClick={() => setActiveTab(id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  activeTab === id
                    ? isDarkMode ? 'bg-slate-700 text-white' : 'bg-gray-200 text-gray-900'
                    : isDarkMode ? 'text-gray-400 hover:text-white hover:bg-slate-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </motion.button>
            ))}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                isDarkMode ? 'text-red-400 hover:text-red-300 hover:bg-slate-700' : 'text-red-600 hover:text-red-700 hover:bg-gray-100'
              }`}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </motion.button>
          </div>
        </div>
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="p-6"
        >
          {/* Home Tab */}
          {activeTab === 'home' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className={`${cardClasses} border rounded-xl p-6`}
              >
                <div className="flex flex-col space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Token Scanner</h2>
                    <div className="flex">
                      {['30d', '7d', '3d', '1d'].map((period) => (
                        <button
                          key={period}
                          onClick={() => setSelectedTimePeriod(period)}
                          className={`px-4 py-2 text-sm font-medium border-r last:border-r-0 transition-colors ${
                            selectedTimePeriod === period
                              ? isDarkMode
                                ? 'bg-slate-700 text-white'
                                : 'bg-gray-100 text-gray-900'
                              : isDarkMode
                                ? 'bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700'
                                : 'bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    value={tokenList}
                    onChange={(e) => setTokenList(e.target.value)}
                    placeholder="Paste your token pairs and names here (one per line)...&#10;Example:&#10;4m1vwsxqes9gcgeeftw97agh65dbpdupj4dugsoebrj2 bump&#10;arwzsvwhpns5s2vaztv41kra4qvrizbh3as6zwbf5usa yapper&#10;auhtkq1h9oumstmoyqu9qccsssgnrxkt9pobu3ykwktk glmps"
                    className={`w-full h-64 p-4 border rounded-lg resize-none ${
                      isDarkMode 
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />

                  <button
                    onClick={handleScan}
                    disabled={isScanning || !tokenList.trim()}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                      isScanning || !tokenList.trim()
                        ? 'bg-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 transform hover:-translate-y-0.5'
                    } text-white shadow-lg`}
                  >
                    {isScanning ? 'Scanning...' : 'Scan Wallets'}
                  </button>
                </div>
              </motion.div>

              {/* Right Column - Enhanced Results */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className={`${cardClasses} border rounded-xl p-6`}
              >
                <h2 className="text-xl font-semibold mb-4">Intersected Addresses</h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  <AnimatePresence>
                    {results.length > 0 ? (
                      results.map((result, index) => {
                        console.log(`Rendering result ${index}:`, result);
                        
                        return (
                          <motion.div 
                            key={`wallet-${index}-${result.address}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2, delay: index * 0.05 }}
                            whileHover={{ scale: 1.02 }}
                            className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                              isDarkMode ? 'bg-slate-700 border-slate-600 hover:bg-slate-600' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                            }`}
                            onClick={() => handleWalletClick(result.address)}
                          >
                            {/* Header with address and match count */}
                            <div className="flex justify-between items-start mb-3">
                              <span className="font-mono text-sm break-all flex-1 mr-4">
                                {result.address}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                                isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {result.count} {result.count === 1 ? 'token' : 'tokens'}
                              </span>
                            </div>

                            {/* Token Tags */}
                            <div className="flex flex-wrap gap-1 mb-3">
                              {result.tokens.map((token, i) => (
                                <span 
                                  key={`token-${i}`} 
                                  className={`px-2 py-1 rounded-full text-xs cursor-pointer ${
                                    isDarkMode ? 'bg-slate-600 text-gray-300 hover:bg-slate-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                  onClick={() => handleCoinClick(token)}
                                >
                                  {token.name ? `${token.name} (${token.address.substring(0, 4)}...)` : `${token.address.substring(0, 8)}...`}
                                </span>
                              ))}
                            </div>

                            {/* Click indicator */}
                            <div className="flex items-center justify-center mt-2 pt-2 border-t border-gray-300 border-opacity-30">
                              <Eye className="w-4 h-4 mr-1 text-gray-400" />
                              <span className="text-xs text-gray-400">Click for details</span>
                            </div>
                          </motion.div>
                        );
                      })
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                      >
                        {isScanning ? 'Scanning wallets...' : 'No results yet. Start a scan to see intersected addresses.'}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          )}

          {/* My Wallets Tab */}
          {activeTab === 'wallets' && (
            <div className={`${cardClasses} border rounded-xl p-6`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">My Wallets</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filter by name or tag..."
                    value={walletFilter}
                    onChange={(e) => setWalletFilter(e.target.value)}
                    className={`pl-10 pr-4 py-2 border rounded-lg ${
                      isDarkMode 
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
              </div>
              <div className="space-y-3">
                {filteredWallets.map((wallet, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${
                    isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium">{wallet.name}</h3>
                      <div className="flex flex-wrap gap-1">
                        {wallet.tags.map((tag, i) => (
                          <span key={i} className={`px-2 py-1 rounded-full text-xs ${
                            isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="font-mono text-sm break-all text-gray-500">{wallet.address}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export Tab */}
          {activeTab === 'export' && (
            <div className={`${cardClasses} border rounded-xl p-6`}>
              <h2 className="text-xl font-semibold mb-6">Export to Trading Platforms</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['Photon', 'Axiom', 'BullX'].map((platform) => (
                  <button
                    key={platform}
                    onClick={() => exportToTrader(platform, results.length ? results : savedWallets)}
                    className={`p-6 rounded-lg border text-center transition-all hover:shadow-lg ${
                      isDarkMode 
                        ? 'bg-slate-700 border-slate-600 hover:bg-slate-600' 
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Download className="w-8 h-8 mx-auto mb-3 text-blue-500" />
                    <h3 className="font-medium mb-2">Export to {platform}</h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Download wallet list for {platform}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className={`${cardClasses} border rounded-xl p-6`}>
              <h2 className="text-xl font-semibold mb-6">Settings</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Dark Mode</h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Toggle between light and dark theme
                    </p>
                  </div>
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isDarkMode ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isDarkMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Enhanced Wallet Detail Modal */}
      <AnimatePresence>
        {selectedWallet && walletDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`${cardClasses} border rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto`}
            >
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold">Wallet Trading Details</h2>
                <button 
                  onClick={closeWalletModal}
                  className={`text-gray-400 hover:text-gray-600 text-2xl ${
                    isDarkMode ? 'hover:text-gray-200' : 'hover:text-gray-800'
                  }`}
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Wallet Address</h3>
                  <p className={`font-mono text-sm break-all p-2 rounded ${
                    isDarkMode ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-900'
                  }`}>
                    {selectedWallet}
                  </p>
                </div>
                
                {/* Tokens Traded */}
                <div>
                  <h3 className="font-medium mb-3">Tokens Traded ({walletDetails.tokens?.length || 0})</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {(walletDetails.tokens || []).map((token, i) => (
                      <div 
                        key={i} 
                        className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                          isDarkMode ? 'bg-slate-700 border-slate-600 hover:bg-slate-600' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        } ${selectedCoin === token ? (isDarkMode ? 'ring-2 ring-blue-500' : 'ring-2 ring-blue-400') : ''}`}
                        onClick={() => handleCoinClick(token)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <p className="font-mono text-sm">{token.name ? `${token.name} (${token.address.substring(0, 8)}...)` : `${token.address.substring(0, 12)}...`}</p>
                            <p className="text-xs text-gray-500 mt-1">Click to view trading details for this token</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {token.address.substring(0, 8)}...
                            </span>
                            <Eye className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Individual Token Trading Details */}
                <AnimatePresence>
                  {selectedCoin && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                      className={`p-4 rounded-lg border-2 ${isDarkMode ? 'border-blue-500 bg-slate-800' : 'border-blue-400 bg-blue-50'}`}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium">
                          {selectedCoin.name 
                            ? `${selectedCoin.name} (${selectedCoin.address.substring(0, 8)}...)`
                            : `${selectedCoin.address.substring(0, 12)}...`
                          }
                        </h4>
                        <button 
                          onClick={() => setSelectedCoin(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ×
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div className={`text-center p-3 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`}>
                          <span className="text-xs text-green-500">Bought</span>
                          <p className="font-semibold">
                            {getTokenSpecificData(selectedCoin, 'bought')}
                          </p>
                        </div>
                        <div className={`text-center p-3 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`}>
                          <span className="text-xs text-red-500">Sold</span>
                          <p className="font-semibold">
                            {getTokenSpecificData(selectedCoin, 'sold')}
                          </p>
                        </div>
                        <div className={`text-center p-3 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`}>
                          <span className="text-xs text-yellow-500">PnL</span>
                          <p className={`font-semibold ${getPnLColor(getTokenSpecificData(selectedCoin, 'pnl'))}`}>
                            {getTokenSpecificData(selectedCoin, 'pnl')}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomePage;