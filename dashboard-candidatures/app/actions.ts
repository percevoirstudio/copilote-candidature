'use server'

import { exec } from 'child_process';
import util from 'util';
import { revalidatePath } from 'next/cache';
import { GoogleGenerativeAI } from '@google/generative-ai';

const execPromise = util.promisify(exec);

// 1. L'ancienne fonction pour lancer le Python
export async function relancerRecherche() {
  const dossierProjet = '/Users/majdoline/Desktop/copilote-candidature'; 
  try {
    const pythonExe = `${dossierProjet}/env/bin/python3`;
    const scriptPath = `${dossierProjet}/scraper.py`;
    await execPromise(`${pythonExe} ${scriptPath}`, { cwd: dossierProjet });
    revalidatePath('/'); 
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// 2. NOUVELLE FONCTION : Générer la lettre
export async function genererLettre(titrePoste: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Clé API manquante dans .env.local");

  const genAI = new GoogleGenerativeAI(apiKey);
  // On utilise le modèle performant
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const prompt = `
  Agis en tant que Majdoline EZ-ZAHER.
  Mon profil : Développeuse Web Fullstack et Graphiste / UI Designer.
  Compétences : TailwindCSS, HTML/CSS, React.js, Next.js, JavaScript, PHP, Python.
  Profil hybride (Design + Code). Je cherche 100% télétravail.
  
  Rédige une lettre de motivation complète, formelle et professionnelle pour le poste de "${titrePoste}".
  La lettre doit contenir :
  - Un en-tête (Mes coordonnées fictives, date, objet)
  - Une introduction accrocheuse
  - Un paragraphe sur ce que je peux apporter (croise mes compétences UI/UX et Dev)
  - Un appel à l'action pour un entretien
  - Une formule de politesse standard.
  Ne mets aucun commentaire avant ou après, juste le texte de la lettre.
  `;

  try {
    const result = await model.generateContent(prompt);
    return { success: true, texte: result.response.text() };
  } catch (error) {
    console.error("Erreur IA:", error);
    return { success: false, texte: "Erreur lors de la génération." };
  }
}