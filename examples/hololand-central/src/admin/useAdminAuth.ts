import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

/**
 * Admin Authentication Hook
 *
 * Authenticates users via Web3 wallet and checks against allowed admin addresses.
 * Environment variable VITE_ADMIN_WALLETS should contain comma-separated wallet addresses.
 */

export interface AdminUser {
  address: string;
  isAdmin: boolean;
  shortAddress: string;
}

export function useAdminAuth() {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get allowed admin wallets from environment
  const getAllowedAdmins = (): string[] => {
    const admins = import.meta.env.VITE_ADMIN_WALLETS || '';
    return admins
      .split(',')
      .map((addr: string) => addr.trim().toLowerCase())
      .filter(Boolean);
  };

  const checkIsAdmin = (address: string): boolean => {
    const allowedAdmins = getAllowedAdmins();
    return allowedAdmins.includes(address.toLowerCase());
  };

  const connectWallet = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // Check if MetaMask is installed
      if (!(window as any).ethereum) {
        throw new Error('MetaMask not installed. Please install MetaMask to access admin.');
      }

      const provider = new ethers.BrowserProvider((window as any).ethereum);

      // Request account access
      const accounts = await provider.send('eth_requestAccounts', []);
      const address = accounts[0];

      // Get network
      const network = await provider.getNetwork();
      console.log('Connected to network:', network.name, network.chainId);

      const isAdmin = checkIsAdmin(address);

      if (!isAdmin) {
        throw new Error('Wallet address not authorized as admin. Contact system administrator.');
      }

      setAdminUser({
        address,
        isAdmin,
        shortAddress: `${address.slice(0, 6)}...${address.slice(-4)}`,
      });

      console.log(`✅ Admin authenticated: ${address}`);
    } catch (err: any) {
      console.error('Admin auth error:', err);
      setError(err.message || 'Failed to authenticate admin wallet');
      setAdminUser(null);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = (): void => {
    setAdminUser(null);
    setError(null);
  };

  // Check for existing connection on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      if ((window as any).ethereum) {
        try {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const accounts = await provider.send('eth_accounts', []);

          if (accounts.length > 0) {
            const address = accounts[0];
            const isAdmin = checkIsAdmin(address);

            if (isAdmin) {
              setAdminUser({
                address,
                isAdmin,
                shortAddress: `${address.slice(0, 6)}...${address.slice(-4)}`,
              });
            }
          }
        } catch (err) {
          console.error('Error checking existing connection:', err);
        }
      }
    };

    checkExistingConnection();
  }, []);

  // Listen for account changes
  useEffect(() => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        const address = accounts[0];
        const isAdmin = checkIsAdmin(address);

        if (isAdmin) {
          setAdminUser({
            address,
            isAdmin,
            shortAddress: `${address.slice(0, 6)}...${address.slice(-4)}`,
          });
        } else {
          setError('New wallet address not authorized as admin');
          setAdminUser(null);
        }
      }
    };

    ethereum.on('accountsChanged', handleAccountsChanged);

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  return {
    adminUser,
    loading,
    error,
    connectWallet,
    disconnect,
    isAdmin: adminUser?.isAdmin || false,
  };
}
