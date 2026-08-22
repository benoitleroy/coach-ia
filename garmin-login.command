#!/bin/bash
# garmin-login.command — connexion Garmin Connect (une seule fois). Double-clic dans le Finder.
cd "$(dirname "$0")"
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   Coach IA — Connexion Garmin Connect 😴  ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Tape ton email Garmin, puis ton mot de passe (il ne s'affiche pas, c'est normal),"
echo "puis le code MFA si Garmin en envoie un. Rien n'est enregistré à part un jeton local."
echo ""
scripts/.venv/bin/python -W ignore scripts/garmin.py --login --days 90
echo ""
read -p "Terminé. Appuie sur Entrée pour fermer cette fenêtre..."
