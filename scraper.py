from playwright.sync_api import sync_playwright
from google import genai
import os
import csv
import re
import time
from dotenv import load_dotenv
import requests
from bs4 import BeautifulSoup

load_dotenv()
cle_api = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=cle_api)

# 🧠 SYSTÈME DE MÉMOIRE
FICHIER_DEJA_VUES = "offres_deja_vues.txt"

def charger_offres_deja_vues():
    if not os.path.exists(FICHIER_DEJA_VUES):
        return set()
    with open(FICHIER_DEJA_VUES, "r", encoding="utf-8") as f:
        return set(line.strip() for line in f)

def enregistrer_offre_vue(lien):
    with open(FICHIER_DEJA_VUES, "a", encoding="utf-8") as f:
        f.write(f"{lien}\n")

# 📄 TON CV AU FORMAT TEXTE
MON_PROFIL = """
Je m'appelle Majdoline EZ-ZAHER. Je suis Développeuse Web Fullstack et Graphiste / UI Designer.
J'ai un profil hybride alliant conception visuelle (Figma, suite Adobe) et développement technique rigoureux.

Mes compétences techniques clés :
- Frontend : JavaScript, HTML5, CSS, TailwindCSS. (Actuellement en montée en compétences intensive sur React.js et Next.js via la création d'un tableau de bord Fullstack).
- Backend : PHP, architecture de bases de données, API REST, Python (Scripting & automatisation).
- DevOps & IA : Playwright, intégration API Gemini, automatisation de workflows.

Mes réalisations marquantes (Projet DEEJAY13) :
- Développement de A à Z d'une plateforme de réservation sur mesure.
- Tunnel de prise de RDV en visio (synchronisation API Google Calendar).
- Notifications multicanaux (Bot Telegram, emails transactionnels) et workflows automatisés.
- Création d'un CMS avec back-office sécurisé et intégration frontend en Tailwind CSS.

Portfolio : percevoirstudio.com
Je recherche un poste en 100% télétravail.
"""

def analyser_offre_avec_ia(titre, texte_offre):
    prompt = f"""
    Tu es mon assistant de recherche d'emploi. Voici mon profil :
    {MON_PROFIL}
    
    Voici une offre d'emploi pour "{titre}". 
    Description : {texte_offre[:3000]}
    
    Analyse l'offre et réponds EXACTEMENT avec ce format :
    ELIGIBLE: [OUI ou NON. 
    Règles de sélection : 
    - CRITÈRE ABSOLU : Réponds STRICTEMENT NON si l'offre n'est pas 100% télétravail (Full Remote). S'il y a la moindre mention de présentiel, de jours sur site ou d'hybride, c'est éliminatoire.
    - TOLÉRANCE 1 : L'anglais est ACCEPTÉ (beaucoup de startups tech rédigent en anglais mais acceptent des francophones).
    - TOLÉRANCE 2 : Les mentions "Bac+3/5" sont ACCEPTÉES si le poste reste un poste de dev Web classique accessible avec un bon portfolio.
    Si l'offre est 100% Remote ET accessible, réponds OUI.]
    SCORE: [Note sur 10. (Ex: 9/10 pour du dev Web en Full Remote)]
    AVIS: [Une phrase courte expliquant pourquoi tu as validé ou recalé l'offre.]
    MESSAGE: [Si ELIGIBLE est OUI, rédige l'accroche de 3 lignes. Sinon, écris N/A]
    """
    try:
        reponse = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
        return reponse.text
    except Exception as e:
        return f"ELIGIBLE: NON\nSCORE: 0\nAVIS: Erreur IA\nMESSAGE: Erreur {e}"

def sauvegarder_en_csv(donnees):
    fichier_existe = os.path.isfile('candidatures_majdoline.csv')
    with open('candidatures_majdoline.csv', mode='a', newline='', encoding='utf-8') as fichier:
        noms_colonnes = ['Titre du Poste', 'Lien', 'Score IA', 'Avis', 'Remote', 'Message de Motivation']
        writer = csv.DictWriter(fichier, fieldnames=noms_colonnes)
        if not fichier_existe:
            writer.writeheader()
        writer.writerow(donnees)

def aspirer_remotive():
    print("🚀 Interrogation de l'API Remotive (100% Remote Tech)...")
    url = "https://remotive.com/api/remote-jobs?category=software-dev"
    
    try:
        reponse = requests.get(url)
        donnees = reponse.json()
        jobs = donnees.get('jobs', [])
        
        offres_trouvees = []
        for job in jobs[:10]: # 10 premières offres
            titre = job.get('title', '')
            lien = job.get('url', '')
            
            description_html = job.get('description', '')
            soup = BeautifulSoup(description_html, "html.parser")
            texte_propre = soup.get_text(separator=" ", strip=True)
            
            offres_trouvees.append({"titre": titre, "lien": lien, "description": texte_propre})
            
        print(f"✅ {len(offres_trouvees)} offres trouvées sur Remotive !")
        return offres_trouvees
        
    except Exception as e:
        print(f"❌ Erreur avec Remotive: {e}")
        return []

def extraire_offres_et_analyser(deja_vues):
    print("\n🚀 Lancement de la recherche sur LinkedIn...")
    MAX_ANALYSE = 40
    
    with sync_playwright() as p:
        navigateur = p.chromium.launch(headless=True) 
        page = navigateur.new_page()
        
        print("🌐 Navigation vers LinkedIn (en arrière-plan)...")
        url = "https://fr.linkedin.com/jobs/search?keywords=D%C3%A9veloppeur%20Web&location=France&f_WT=2&f_TPR=r86400"
        page.goto(url)
        page.wait_for_timeout(3000)
        
        for _ in range(15): 
            page.keyboard.press("PageDown")
            page.wait_for_timeout(1000)
        
        cartes_offres = page.locator(".base-search-card")
        liens_a_analyser = []
        
        for i in range(cartes_offres.count()): 
            if len(liens_a_analyser) >= MAX_ANALYSE: break
            carte = cartes_offres.nth(i)
            try:
                titre = carte.locator(".base-search-card__title").inner_text(timeout=1000).strip()
                lien_brut = carte.locator(".base-card__full-link").get_attribute("href", timeout=1000)
                # On coupe les paramètres de tracking LinkedIn pour avoir une URL propre
                lien_propre = lien_brut.split('?')[0]
                
                # 🛑 On vérifie si on l'a déjà vue AVANT de la mettre dans la liste
                if lien_propre not in deja_vues:
                    liens_a_analyser.append({"titre": titre, "lien": lien_propre})
            except:
                pass
        
        print(f"👀 {len(liens_a_analyser)} NOUVELLES offres à analyser sur LinkedIn.")
        
        offres_validees = 0
        for index, offre in enumerate(liens_a_analyser):
            print(f"👀 Analyse LinkedIn : {offre['titre']}...")
            page.goto(offre['lien'])
            page.wait_for_timeout(2000)
            
            try:
                description = page.locator(".show-more-less-html__markup").inner_text(timeout=3000)
                avis_ia_brut = analyser_offre_avec_ia(offre['titre'], description)
                
                eligible_match = re.search(r'ELIGIBLE:\s*(.*)', avis_ia_brut, re.IGNORECASE)
                score_match = re.search(r'SCORE:\s*(.*)', avis_ia_brut, re.IGNORECASE)
                avis_match = re.search(r'AVIS:\s*(.*)', avis_ia_brut, re.IGNORECASE)
                message_match = re.search(r'MESSAGE:\s*(.*)', avis_ia_brut, re.IGNORECASE | re.DOTALL)
                
                eligible = eligible_match.group(1).strip().upper() if eligible_match else "NON"
                score = score_match.group(1).strip() if score_match else "N/A"
                avis = avis_match.group(1).strip() if avis_match else "N/A"
                message = message_match.group(1).strip() if message_match else "N/A"

                if "OUI" in eligible:
                    print(f"   ✅ RETENUE ! Score: {score}")
                    offres_validees += 1
                    sauvegarder_en_csv({
                        'Titre du Poste': offre['titre'],
                        'Lien': offre['lien'],
                        'Score IA': score,
                        'Avis': avis,
                        'Remote': 'OUI',
                        'Message de Motivation': message
                    })
                else:
                    print(f"   🚫 RECALÉE.")
                
                # 🧠 On enregistre le lien dans la mémoire pour ne plus jamais le revoir
                enregistrer_offre_vue(offre['lien'])
                
                # Petite pause pour ne pas fâcher Google et LinkedIn
                time.sleep(4)
                
            except Exception as e:
                pass
        
        navigateur.close()
        print(f"\n🎉 Terminé ! {offres_validees} nouvelles offres ajoutées depuis LinkedIn.")


if __name__ == "__main__":
    print("🤖 Démarrage du Copilote IA...")
    
    # 🧠 On charge la mémoire du robot
    deja_vues = charger_offres_deja_vues()
    print(f"📚 Le robot se souvient de {len(deja_vues)} annonces déjà analysées.")
    
    # --- PHASE 1 : REMOTIVE ---
    offres_remotive = aspirer_remotive()
    
    for offre in offres_remotive:
        titre = offre["titre"]
        lien = offre["lien"]
        description = offre["description"]
        
        # 🛑 On passe directement à l'offre suivante si on l'a déjà vue
        if lien in deja_vues:
            continue
            
        print(f"\n👀 Analyse Remotive : {titre}...")
        avis_ia_brut = analyser_offre_avec_ia(titre, description)
        
        eligible_match = re.search(r'ELIGIBLE:\s*(.*)', avis_ia_brut, re.IGNORECASE)
        score_match = re.search(r'SCORE:\s*(.*)', avis_ia_brut, re.IGNORECASE)
        avis_match = re.search(r'AVIS:\s*(.*)', avis_ia_brut, re.IGNORECASE)
        message_match = re.search(r'MESSAGE:\s*(.*)', avis_ia_brut, re.IGNORECASE | re.DOTALL)
        
        eligible = eligible_match.group(1).strip().upper() if eligible_match else "NON"
        score = score_match.group(1).strip() if score_match else "N/A"
        avis = avis_match.group(1).strip() if avis_match else "N/A"
        message = message_match.group(1).strip() if message_match else "N/A"

        if "OUI" in eligible:
            print(f"   ✅ RETENUE ! Score: {score}")
            sauvegarder_en_csv({
                'Titre du Poste': titre,
                'Lien': lien,
                'Score IA': score,
                'Avis': avis,
                'Remote': 'OUI',
                'Message de Motivation': message
            })
        else:
            print("   🚫 RECALÉE.")
            
        # 🧠 On enregistre le lien dans la mémoire
        enregistrer_offre_vue(lien)
            
        print("   ⏳ Pause de 4 secondes (Rate Limiting API)...")
        time.sleep(4)

    # --- PHASE 2 : LINKEDIN ---
    # On passe la mémoire à la fonction LinkedIn
    extraire_offres_et_analyser(deja_vues)