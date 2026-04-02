'use client' // Indique que ce composant s'exécute dans le navigateur de l'utilisateur

import { useState } from 'react';
import { relancerRecherche } from './actions';

export default function RefreshButton() {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    // Lance le script Python via notre Server Action
    await relancerRecherche();
    setLoading(false);
  };

  return (
    <button 
      onClick={handleClick} 
      disabled={loading}
      className={`px-6 py-3 rounded-full font-bold shadow-md transition-all flex items-center gap-2 ${
        loading 
          ? 'bg-slate-200 text-slate-500 cursor-wait' 
          : 'bg-gradient-to-r from-teal-400 to-emerald-400 text-white hover:shadow-lg hover:-translate-y-0.5'
      }`}
    >
      {loading ? (
        <>
          <span className="animate-spin text-xl">⏳</span> Analyse IA en cours...
        </>
      ) : (
        <>
          <span className="text-xl">✨</span> Chercher de nouvelles offres
        </>
      )}
    </button>
  );
}