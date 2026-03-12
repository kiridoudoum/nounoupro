#!/bin/bash
cd "$(dirname "$0")"
echo "Serveur Nounou Pro démarré sur http://localhost:8080"
echo "Appuyez sur Ctrl+C pour arrêter"
python3 -m http.server 8080
