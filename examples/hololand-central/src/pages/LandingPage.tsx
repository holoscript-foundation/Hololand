import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export function LandingPage() {
  useEffect(() => {
    const loading = document.getElementById('loading');
    if (loading) {
      setTimeout(() => {
        loading.classList.add('hidden');
      }, 500);
    }
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-8xl md:text-9xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-12">
          Welcome to Hololand
        </h1>
        
        <Link 
          to="/oasis"
          className="inline-block px-12 py-6 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-2xl text-2xl hover:scale-105 transition-transform shadow-2xl shadow-cyan-500/50"
        >
          Enter Oasis
        </Link>
      </div>
    </main>
  );
}
