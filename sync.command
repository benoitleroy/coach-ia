#!/bin/bash
# sync.command — double-clic pour synchroniser les données Strava
# Ce fichier est dans la racine du projet. Double-clique dessus dans le Finder.

# Aller dans le répertoire du projet (nécessaire pour les double-clics)
cd "$(dirname "$0")"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   Coach IA — Carnet · Sync Strava 🚴 ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Vérifier que Node.js est installé
if ! command -v node &> /dev/null; then
  echo "❌ Node.js n'est pas installé."
  echo "   Installe-le sur https://nodejs.org"
  read -p "Appuie sur Entrée pour fermer..."
  exit 1
fi

# Vérifier que le .env.local existe
if [ ! -f "scripts/.env.local" ]; then
  echo "❌ Fichier scripts/.env.local introuvable."
  echo "   Crée-le avec tes clés Strava (voir README)."
  read -p "Appuie sur Entrée pour fermer..."
  exit 1
fi

# Sommeil / HRV / FC repos Garmin Connect (avant la sync Strava : le bilan coach les utilise)
if [ -x scripts/.venv/bin/python ] && [ -d scripts/.garmin.tokens ]; then
  scripts/.venv/bin/python -W ignore scripts/garmin.py < /dev/null || echo "⚠️  Import Garmin échoué (sommeil non mis à jour)"
fi

# Lancer le script de sync Strava
node scripts/sync.js

# Whoop débranché depuis le recentrage "Carnet" (20/08/2026).
# Pour le réactiver : décommenter la ligne ci-dessous.
# node scripts/whoop-sync.js

echo ""

# Push automatique vers GitHub Pages si des données ont changé
if [ -d .git ]; then
  if ! git diff --quiet js/data-benoit.js js/observations-strava.js js/carnet-data.js js/bilan-data.js js/sommeil-data.js 2>/dev/null; then
    echo "📤 Push des nouvelles données vers GitHub Pages…"
    git add js/data-benoit.js js/observations-strava.js js/carnet-data.js js/bilan-data.js js/sommeil-data.js
    git -c user.email="benoit@coach-ia.local" -c user.name="Benoit Leroy" \
      commit -m "Sync auto $(date +%Y-%m-%d)" >/dev/null
    git push origin main >/dev/null 2>&1 && echo "   → en ligne dans ~1min" || echo "   ⚠️  push échoué (vérifie ta connexion)"
  else
    echo "ℹ️  Aucune nouvelle donnée à publier."
  fi
fi

echo ""
# Pause uniquement si lancé manuellement (TTY) — pas en mode launchd
if [ -t 0 ]; then
  read -p "✅ Sync terminée. Appuie sur Entrée pour fermer cette fenêtre..."
else
  echo "✅ Sync terminée (mode automatique)"
fi
