import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { NetworkClient, StateSync } from '@hololand/network';

export interface NetworkContextValue {
  client: NetworkClient | null;
  sync: StateSync | null;
  isConnected: boolean;
}

export const NetworkContext = createContext<NetworkContextValue>({
  client: null,
  sync: null,
  isConnected: false,
});

export const useNetwork = () => useContext(NetworkContext);

export interface NetworkProviderProps {
  url: string;
  children: React.ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ url, children }) => {
  const [isConnected, setIsConnected] = useState(false);

  const client = useMemo(() => new NetworkClient({ url }), [url]);
  const sync = useMemo(() => new StateSync(), []);

  useEffect(() => {
    client.connect().then(() => {
      setIsConnected(true);
    });

    const offMessage = client.onMessage('state_update', (msg) => {
      sync.processSnapshot(msg.payload as any);
    });

    return () => {
      offMessage();
      client.disconnect();
    };
  }, [client, sync]);

  const value = useMemo(() => ({ client, sync, isConnected }), [client, sync, isConnected]);

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};
