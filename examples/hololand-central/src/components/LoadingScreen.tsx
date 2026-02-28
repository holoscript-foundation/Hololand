/**
 * Loading Screen Component
 *
 * Shows a loading animation while the scene is being parsed and loaded
 */

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className="loading-screen">
      <div className="loading-spinner"></div>
      <p className="loading-message">{message}</p>

      <style>{`
        .loading-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: white;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(255, 255, 255, 0.1);
          border-top-color: #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .loading-message {
          margin-top: 20px;
          font-size: 16px;
          color: #bbb;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
