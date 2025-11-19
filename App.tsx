import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { HowItWorks } from './components/HowItWorks';
import { SetupGuide } from './components/SetupGuide';
import { FAQ } from './components/FAQ';
import { Footer } from './components/Footer';

function App() {
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const path = window.location.pathname.replace(/\/$/, ''); // Remove trailing slash
    if (path === '/docs') {
      setIsRedirecting(true);
      window.location.href = 'https://github.com/CliqueGamesLLC/HWLink/blob/master/README.md';
    } else if (path === '/download') {
      setIsRedirecting(true);
      window.location.href = 'https://github.com/CliqueGamesLLC/HWLink';
    }
  }, []);

  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-brand-darker flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-pink"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-darker text-slate-200 font-sans selection:bg-brand-pink selection:text-white">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        
        <SetupGuide />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}

export default App;
