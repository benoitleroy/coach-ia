#!/bin/bash
# sync.command — double-clic pour synchroniser les données Strava
# Ce fichier est dans la racine du projet. Double-clique dessus dans le Finder.

# Aller dans le répertoire du projet (nécessaire pour les double-clics)
cd "$(dirname "$0")"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   Coach IA 2030 — Sync Strava 🚴    ║"
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

# Lancer le script de sync Strava
node scripts/sync.js

# Lancer le sync Whoop via API (tokens auto-gérés)
echo ""
node scripts/whoop-sync.js

echo ""
# Pause uniquement si lancé manuellement (TTY) — pas en mode launchd
if [ -t 0 ]; then
  read -p "✅ Sync terminée. Appuie sur Entrée pour fermer cette fenêtre..."
else
  echo "✅ Sync terminée (mode automatique)"
fi
