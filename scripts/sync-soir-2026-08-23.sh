#!/bin/bash
# Sync différée après la sortie course du 23/08 au soir
cd ~/coach-ia-mockup
now=$(date +%s); target=$(date -j -f "%Y-%m-%d %H:%M" "2026-08-23 21:35" +%s)
# lancé par launchd à 21h35
export PATH="$HOME/.npm-global/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
LOG=/private/tmp/claude-501/-Users-torrentt-projets/e213cde4-d658-44e5-8342-d60b5bd49184/scratchpad/sync-soir.log
{
echo "=== $(date) — sync du soir ==="
node scripts/sync.js 2>&1 | grep -E "Dernière séance|Carnet|⚠️"
# Note auto sur la course du soir si elle est arrivée
node -e '
const a=require("./scripts/.activities.cache.json").sort((x,y)=>new Date(y.start_date)-new Date(x.start_date))[0];
const d=a.start_date_local||""; const t=(a.sport_type||a.type);
if(d.startsWith("2026-08-23")&&/Run/.test(t)&&d.slice(11,13)>="17"){console.log("RUN_ID="+a.id);}else{console.log("RUN_ID=none");}' > /tmp/runid.txt
RUN_ID=$(sed -n 's/RUN_ID=//p' /tmp/runid.txt)
if [ "$RUN_ID" != "none" ] && [ -n "$RUN_ID" ]; then
  node scripts/note.js "$RUN_ID" "Sortie d'accompagnement avec ma copine — allure facile, pas une séance d'entraînement"
  echo "note ajoutée sur $RUN_ID"
else
  echo "course du soir pas encore sur Strava"
fi
node scripts/bilan.js --force 2>&1 | grep -E "📝|⚠️|🧠"
node scripts/sync.js >/dev/null 2>&1
git add js/data-benoit.js js/observations-strava.js js/carnet-data.js js/bilan-data.js js/sommeil-data.js scripts/notes.json 2>/dev/null
git -c user.email="benoit@coach-ia.local" -c user.name="Benoit Leroy" commit -qm "Sync soir 23/08 + plan S35 recalé" && git push -q origin main && echo "pushed"
echo "=== fin ==="
} >> "$LOG" 2>&1

# auto-désinstallation du job one-shot
launchctl bootout gui/$(id -u)/com.coachia.sync-soir 2>/dev/null; rm -f ~/Library/LaunchAgents/com.coachia.sync-soir.plist
