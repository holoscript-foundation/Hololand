'use client';

import { useState, useEffect } from 'react';
import { connectWallet, getBrianBalance } from './wallet';
import type { WalletContextValue } from './types';

/**
 * Hook for Web3 wallet integration
 */
export function useWallet(): WalletContextValue {
  const [wallet, setWallet] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    // Check if wallet is already connected
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum
        .request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setWallet(accounts[0]);
            getBrianBalance(accounts[0]).then(setBalance);
          }
        });

      // Listen for account changes
      (window as any).ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setWallet(accounts[0]);
          getBrianBalance(accounts[0]).then(setBalance);
        } else {
          setWallet(null);
          setBalance(0);
        }
      });
    }
  }, []);

  const connect = async (): Promise<string> => {
    const address = await connectWallet();
    setWallet(address);
    const brianBalance = await getBrianBalance(address);
    setBalance(brianBalance);
    return address;
  };

  const disconnect = () => {
    setWallet(null);
    setBalance(0);
  };

  return {
    wallet,
    balance,
    isHolder: balance > 0,
    connect,
    disconnect,
  };
}

/**
 * Hook to check if user is authenticated
 */
export function useRequireAuth() {
  const { useAuth } = require('./provider');
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }, [user, loading]);

  return { user, loading };
}
