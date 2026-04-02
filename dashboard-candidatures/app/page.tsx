import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import DashboardClient from './DashboardClient';

type Offre = {
  'Titre du Poste': string; 'Lien': string; 'Score IA': string; 'Avis': string; 'Message de Motivation': string;
};

export default async function Home() {
  const filePath = path.join(process.cwd(), '../candidatures_majdoline.csv');
  let offres: Offre[] = [];

  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const result = Papa.parse<Offre>(fileContent, { header: true, skipEmptyLines: true });
    offres = result.data.reverse(); 
  } catch (error) {
    console.error("Erreur de lecture CSV", error);
  }

  return (
    // Fond global très sombre, style macOS / Dashboard Pro
    <main className="h-screen w-screen overflow-hidden bg-[#0a0510] text-white relative font-sans flex p-2 md:p-4">
      
      {/* Halos lumineux métalliques */}
      <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] left-[50%] w-[30vw] h-[30vw] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Le composant interactif prend tout l'espace restant */}
      <DashboardClient initialOffres={offres} />
    </main>
  );
}