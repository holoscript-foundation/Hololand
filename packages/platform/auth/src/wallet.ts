import { ethers } from 'ethers';
import { updateUser } from './auth';
import type { WalletSignInResult } from './types';

const BRIAN_CONTRACT = process.env.NEXT_PUBLIC_BRIAN_CONTRACT || '0x3ecced5b416e58664f04a39dD18935eB71D33B15';
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '8453'); // Based Chain

// ERC-20 ABI for balanceOf
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

/**
 * Connect MetaMask wallet
 */
export async function connectWallet(): Promise<string> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('MetaMask not installed');
  }

  const ethereum = (window as any).ethereum;

  try {
    // Request account access
    const accounts = await ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found');
    }

    const address = accounts[0];

    // Switch to Based Chain if needed
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
      });
    } catch (switchError: any) {
      // Chain doesn't exist, add it
      if (switchError.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${CHAIN_ID.toString(16)}`,
              chainName: 'Base',
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org'],
            },
          ],
        });
      } else {
        throw switchError;
      }
    }

    return address;
  } catch (error: any) {
    throw new Error(`Wallet connection failed: ${error.message}`);
  }
}

/**
 * Get $BRIAN token balance for address
 */
export async function getBrianBalance(address: string): Promise<number> {
  try {
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const contract = new ethers.Contract(BRIAN_CONTRACT, ERC20_ABI, provider);

    const balance = await contract.balanceOf(address);
    const decimals = await contract.decimals();

    return parseFloat(ethers.formatUnits(balance, decimals));
  } catch (error: any) {
    console.error('Failed to get BRIAN balance:', error);
    return 0;
  }
}

/**
 * Verify user holds $BRIAN tokens
 */
export async function verifyBrianHolder(address: string): Promise<number> {
  return await getBrianBalance(address);
}

/**
 * Sign in with Web3 wallet
 */
export async function signInWithWallet(): Promise<WalletSignInResult> {
  const wallet = await connectWallet();
  const balance = await getBrianBalance(wallet);

  // Update user profile with wallet and balance
  const user = await updateUser({
    wallet,
    brianBalance: balance,
  });

  return {
    user,
    wallet,
  };
}

/**
 * Sign message with wallet (for verification)
 */
export async function signMessage(message: string): Promise<string> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('MetaMask not installed');
  }

  const ethereum = (window as any).ethereum;
  const accounts = await ethereum.request({ method: 'eth_accounts' });

  if (!accounts || accounts.length === 0) {
    throw new Error('No wallet connected');
  }

  const address = accounts[0];

  const signature = await ethereum.request({
    method: 'personal_sign',
    params: [message, address],
  });

  return signature;
}
