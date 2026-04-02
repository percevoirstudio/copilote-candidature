'use client'

import { useState, useEffect } from 'react';
import { relancerRecherche, genererLettre } from './actions';

type Offre = {
  'Titre du Poste': string; 'Lien': string; 'Score IA': string; 'Avis': string; 'Message de Motivation': string;
};

export default function DashboardClient({ initialOffres }: { initialOffres: Offre[] }) {
  const [offres] = useState<Offre[]>(initialOffres);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [seenJobs, setSeenJobs] = useState<string[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<string[]>([]);
  
  // NOUVEAU : État pour gérer l'onglet actif
  const [activeTab, setActiveTab] = useState<'a_traiter' | 'postulees'>('a_traiter');

  const [lettreModal, setLettreModal] = useState({ isOpen: false, content: '', isLoading: false });

  const total = offres.length;
  const averageScore = total > 0 ? (offres.reduce((acc, o) => acc + parseFloat(o['Score IA'].split('/')[0] || "0"), 0) / total).toFixed(1) : "0";

  useEffect(() => {
    setSeenJobs(JSON.parse(localStorage.getItem('seenJobs') || '[]'));
    setAppliedJobs(JSON.parse(localStorage.getItem('appliedJobs') || '[]'));
  }, []);

  // Filtrer les offres en fonction de l'onglet choisi
  const filteredOffres = offres.filter(offre => {
    const isApplied = appliedJobs.includes(offre['Lien']);
    if (activeTab === 'postulees') return isApplied;
    return !isApplied; // Onglet "À traiter"
  });

  const currentOffre = filteredOffres[selectedIndex];

  useEffect(() => {
    if (filteredOffres.length > 0 && currentOffre && !seenJobs.includes(currentOffre['Lien'])) {
      const newSeen = [...seenJobs, currentOffre['Lien']];
      setSeenJobs(newSeen);
      localStorage.setItem('seenJobs', JSON.stringify(newSeen));
    }
  }, [selectedIndex, currentOffre, filteredOffres.length, seenJobs]);

  const handleApply = () => {
    if (currentOffre && !appliedJobs.includes(currentOffre['Lien'])) {
      const newApplied = [...appliedJobs, currentOffre['Lien']];
      setAppliedJobs(newApplied);
      localStorage.setItem('appliedJobs', JSON.stringify(newApplied));
      // Optionnel : on pourrait changer d'onglet automatiquement ici, mais on laisse l'utilisateur choisir
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await relancerRecherche();
    setIsRefreshing(false);
    window.location.reload(); 
  };

  const handleGenererLettre = async () => {
    if (!currentOffre) return;
    setLettreModal({ isOpen: true, content: '', isLoading: true });
    const resultat = await genererLettre(currentOffre['Titre du Poste']);
    setLettreModal({ isOpen: true, content: resultat.texte || '', isLoading: false });
  };

  const copierLettre = () => {
    navigator.clipboard.writeText(lettreModal.content);
    alert("Lettre copiée dans le presse-papier ! ✅");
  };

  // Réinitialiser la sélection quand on change d'onglet
  const switchTab = (tab: 'a_traiter' | 'postulees') => {
    setActiveTab(tab);
    setSelectedIndex(0);
  };

  const glassPanel = "bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden";

  return (
    <div className="flex h-full w-full gap-4 z-10 relative">
      
      {/* 1. SIDEBAR */}
      <aside className={`w-64 flex flex-col p-6 shrink-0 hidden md:flex ${glassPanel}`}>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent"></div>
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(139,92,246,0.5)]">M</div>
          <h1 className="text-xl font-semibold tracking-wide">Majdoline AI</h1>
        </div>
        <nav className="flex flex-col gap-2">
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-500/20 text-purple-200 border border-purple-500/30 font-medium">📊 Dashboard</button>
        </nav>
        <div className="mt-auto bg-black/30 rounded-2xl p-4 border border-white/5">
          <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Statut Robot</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-sm text-emerald-300 font-medium">Actif (100% Remote)</span>
          </div>
        </div>
      </aside>

      {/* 2. ZONE PRINCIPALE */}
      <main className="flex-1 flex flex-col gap-4 overflow-hidden">
        
        {/* HEADER */}
        <header className={`h-20 shrink-0 flex justify-between items-center px-8 ${glassPanel}`}>
          <h2 className="text-2xl font-light tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-indigo-200">
            ANALYTICS & OFFRES
          </h2>
          <button onClick={handleRefresh} disabled={isRefreshing} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50">
            {isRefreshing ? '⏳ Analyse Python...' : '✨ Scraping LinkedIn'}
          </button>
        </header>

        {/* WIDGETS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
          {[
            { label: "Sourcées", value: total, color: "text-purple-300" },
            { label: "Score Moyen", value: `${averageScore}/10`, color: "text-indigo-300" },
            { label: "Lues", value: seenJobs.length, color: "text-blue-300" },
            { label: "Postulées", value: appliedJobs.length, color: "text-emerald-300" }
          ].map((stat, i) => (
            <div key={i} className={`p-5 flex flex-col justify-center gap-1 ${glassPanel}`}>
              <span className="text-xs text-gray-400 uppercase tracking-widest">{stat.label}</span>
              <span className={`text-3xl font-bold ${stat.color}`}>{stat.value}</span>
            </div>
          ))}
        </div>

        {/* BAS : LISTE + DETAILS */}
        <div className="flex-1 flex gap-4 overflow-hidden">
          
          {/* Liste des offres avec ONGLETS */}
          <div className={`flex-[1.2] flex flex-col p-4 ${glassPanel}`}>
            
            {/* LES ONGLETS (TABS) */}
            <div className="flex gap-2 mb-4 px-2 bg-black/20 p-1 rounded-xl">
              <button 
                onClick={() => switchTab('a_traiter')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'a_traiter' ? 'bg-purple-600/40 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                À traiter ({offres.length - appliedJobs.length})
              </button>
              <button 
                onClick={() => switchTab('postulees')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'postulees' ? 'bg-emerald-600/40 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                Postulées ({appliedJobs.length})
              </button>
            </div>

            {/* LISTE DYNAMIQUE */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-2">
              {filteredOffres.length === 0 ? (
                <p className="text-gray-500 text-center mt-10">Aucune offre dans cette catégorie</p>
              ) : (
                filteredOffres.map((offre, index) => (
                  <button key={index} onClick={() => setSelectedIndex(index)} className={`text-left w-full p-4 rounded-2xl transition-all border ${selectedIndex === index ? (activeTab === 'postulees' ? 'bg-emerald-600/20 border-emerald-500/50' : 'bg-purple-600/20 border-purple-500/50') : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-white font-medium truncate pr-2">{offre['Titre du Poste']}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeTab === 'postulees' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-purple-500/20 text-purple-300'}`}>
                        {offre['Score IA']}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Détails de l'offre */}
          <div className={`flex-[1.8] flex flex-col p-8 ${glassPanel}`}>
            {filteredOffres.length > 0 && currentOffre ? (
              <>
                <div className="flex flex-col gap-3 shrink-0 mb-6">
                  <div className="flex gap-2">
                    <span className="bg-purple-500/20 border border-purple-500/30 text-purple-200 text-xs px-3 py-1 rounded-full uppercase tracking-wider">
                      ⭐ Score: {currentOffre['Score IA']}
                    </span>
                    {activeTab === 'postulees' && (
                      <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-xs px-3 py-1 rounded-full uppercase tracking-wider">
                        ✅ Envoyée
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl md:text-3xl font-semibold text-white tracking-wide leading-tight">{currentOffre['Titre du Poste']}</h2>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 flex flex-col gap-6">
                  <div className="bg-black/30 border border-white/5 rounded-2xl p-5 shadow-inner">
                    <p className="text-xs text-purple-400 uppercase tracking-widest mb-2 font-bold">🤖 Analyse Gemini</p>
                    <p className="text-sm text-gray-300">{currentOffre['Avis']}</p>
                  </div>

                  <div>
                    <p className="text-xs text-purple-400 uppercase tracking-widest mb-2 font-bold">✉️ Message d'accroche (LinkedIn)</p>
                    <div className="bg-purple-900/10 border border-purple-500/20 rounded-2xl p-6 text-sm text-purple-100 italic font-light shadow-inner">
                      "{currentOffre['Message de Motivation']}"
                    </div>
                  </div>
                </div>

                {/* BOUTONS D'ACTION */}
                <div className="shrink-0 mt-6 pt-4 border-t border-white/10 flex gap-4">
                  <button 
                    onClick={handleGenererLettre}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/20 text-white font-medium py-4 rounded-xl transition-all shadow-md"
                  >
                    📄 Générer Lettre Complète
                  </button>
                  <a 
                    onClick={handleApply} href={currentOffre['Lien']} target="_blank" rel="noopener noreferrer"
                    className={`flex-1 flex items-center justify-center text-center font-medium py-4 rounded-xl transition-all shadow-lg border ${activeTab === 'postulees' ? 'bg-emerald-600/30 border-emerald-400/50 text-emerald-100 hover:bg-emerald-500/40' : 'border-purple-400/30 bg-gradient-to-r from-[#8b5cf6] to-[#5b21b6] hover:from-[#7c3aed] hover:to-[#4c1d95] text-white'}`}
                  >
                    {activeTab === 'postulees' ? '🚀 Postuler à nouveau' : '🚀 Postuler (Lien)'}
                  </a>
                </div>
              </>
            ) : <div className="flex-1 flex items-center justify-center text-gray-500">Aucune offre sélectionnée</div>}
          </div>

        </div>
      </main>

      {/* MODAL POUR LA LETTRE */}
      {lettreModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#130922] border border-purple-500/30 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="text-xl font-bold text-white">Lettre de Motivation</h3>
              <button onClick={() => setLettreModal({ isOpen: false, content: '', isLoading: false })} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-black/20">
              {lettreModal.isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-purple-300 gap-4">
                  <span className="animate-spin text-4xl">⏳</span>
                  <p>L'IA rédige ta lettre sur mesure...</p>
                </div>
              ) : (
                <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-serif">
                  {lettreModal.content}
                </div>
              )}
            </div>
            {!lettreModal.isLoading && (
              <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end gap-4">
                <button onClick={() => setLettreModal({ isOpen: false, content: '', isLoading: false })} className="px-6 py-2 rounded-xl text-gray-300 hover:bg-white/10 transition-colors">
                  Fermer
                </button>
                <button onClick={copierLettre} className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors shadow-lg">
                  📋 Copier le texte
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}