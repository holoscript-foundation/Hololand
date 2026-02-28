import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCReact, httpBatchLink } from '@trpc/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import type { TraitMarketplaceRouter } from '../server/trpc';
import { MarketplaceBrowser } from './pages/MarketplaceBrowser';
import { TraitDetail } from './pages/TraitDetail';
import { SellerDashboard } from './pages/SellerDashboard';
import { MyPurchases } from './pages/MyPurchases';
import { Navigation } from './components/Navigation';
import './styles.css';

export const trpc = createTRPCReact<TraitMarketplaceRouter>();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/trpc',
      headers() {
        // In production, get auth token from your auth provider
        const token = localStorage.getItem('authToken');
        return {
          authorization: token ? `Bearer ${token}` : '',
        };
      },
    }),
  ],
});

export default function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div className="app">
            <Navigation />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<MarketplaceBrowser />} />
                <Route path="/trait/:id" element={<TraitDetail />} />
                <Route path="/sell" element={<SellerDashboard />} />
                <Route path="/purchases" element={<MyPurchases />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
