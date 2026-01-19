/// <reference types="vite/client" />

interface Window {
  ethereum?: {
    isMetaMask?: boolean;
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on: (eventName: string, handler: (params: any) => void) => void;
    removeListener: (eventName: string, handler: (params: any) => void) => void;
  };
}

interface Navigator {
  xr?: {
    isSessionSupported: (mode: string) => Promise<boolean>;
  };
}
