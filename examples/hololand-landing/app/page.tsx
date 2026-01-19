import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-8xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-12">
          Welcome to Hololand
        </h1>
        
        <a 
          href="http://localhost:3000"
          className="inline-block px-12 py-6 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-2xl text-2xl hover:scale-105 transition-transform shadow-2xl shadow-cyan-500/50"
        >
          Enter Hololand Oasis
        </a>
      </div>
    </main>
  );
}
