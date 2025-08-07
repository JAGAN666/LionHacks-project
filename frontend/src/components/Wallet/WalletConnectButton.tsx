import React from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { WalletIcon } from '@heroicons/react/24/outline';

const WalletConnectButton: React.FC = () => {
  const { account, isConnecting, connectWallet, disconnectWallet, chainId } = useWallet();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getChainName = (chainId: number) => {
    switch (chainId) {
      case 1:
        return 'Ethereum';
      case 11155111:
        return 'Sepolia';
      case 137:
        return 'Polygon';
      case 1337:
        return 'Localhost';
      default:
        return `Chain ${chainId}`;
    }
  };

  if (account) {
    return (
      <div className="flex items-center space-x-2">
        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>{chainId && getChainName(chainId)}</span>
          </div>
        </div>
        <button
          onClick={disconnectWallet}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
        >
          <WalletIcon className="w-4 h-4" />
          <span>{formatAddress(account)}</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connectWallet}
      disabled={isConnecting}
      className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
    >
      <WalletIcon className="w-4 h-4" />
      <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
    </button>
  );
};

export default WalletConnectButton;