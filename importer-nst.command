#!/bin/bash
# importer-nst.command — double-clic : lit les captures d'écran NST déposées dans ~/Desktop/NST-captures
cd "$(dirname "$0")"
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   Coach IA — Import du programme NST 📖  ║"
echo "╚══════════════════════════════════════════╝"
echo ""
DOSSIER="$HOME/Desktop/NST-captures"
NB=$(ls "$DOSSIER" 2>/dev/null | grep -icE '\.(png|jpe?g|heic|webp)$')
if [ "$NB" = "0" ]; then
  echo "❌ Aucune capture dans $DOSSIER"
  echo "   Dépose d'abord les captures d'écran de ta semaine NST dans ce dossier."
  read -p "Entrée pour fermer..."; exit 1
fi
# Semaine ISO courante (celle qu'on planifie)
LABEL=$(node -e 'import("./scripts/bilan.js").then(m=>console.log(m.semaineCible(new Date()).label))' 2>/dev/null | tail -1)
echo "📅 Semaine : $LABEL — $NB capture(s) trouvée(s)"
echo ""
node scripts/nst.js dossier "$LABEL" "$DOSSIER"
echo ""
echo "🔄 Mise à jour du carnet…"
node scripts/sync.js >/dev/null 2>&1 && echo "✅ Fait — la semaine NST apparaît dans l'app (onglet Semaine)."
read -p "Entrée pour fermer..."
