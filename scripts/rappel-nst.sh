#!/bin/bash
# Rappel hebdo (fin de semaine) : la nouvelle semaine NST est publiée sur FITR.
# → Ouvrir Claude Code et dire « aspire NST » : il ouvre FITR dans Chrome, aspire les
#   séances de la semaine (texte intégral + liens vidéo), met à jour Bachata N.S.T et le
#   carnet, et le 1er du mois récupère la facture FITR pour Pennylane.
osascript -e 'display notification "Nouvelle semaine NST publiée ? Ouvre Claude et dis : « aspire NST » (5 min, tout se met à jour)." with title "Bachata N.S.T — programme" subtitle "Mise à jour hebdo" sound name "Glass"'
