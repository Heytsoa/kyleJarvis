# Mini Jarvis

Prototype personnel multiplateforme (Windows et macOS), en français.

Version en ligne : <https://heytsoa.github.io/kylejarvis/>.

## Lancer

Le prototype utilise uniquement Python 3 et un navigateur récent.

```sh
python server.py
```

Ouvrir ensuite <http://localhost:8765>. Pour arrêter le serveur, faire `Ctrl+C` dans le terminal.

Sur Windows, selon l'installation Python, la commande peut être `py server.py`.

## Première version

- Ajouter et terminer des tâches.
- Consulter une page dédiée qui regroupe toutes les tâches d’hier et d’aujourd’hui.
- Définir une heure et choisir une répétition quotidienne ; terminer une tâche quotidienne la coche pour aujourd'hui, puis elle redevient à faire le jour suivant.
- Enregistrer des notes.
- Garder les données dans le navigateur, sur cet ordinateur.
- Saisir au clavier ou dicter via le bouton microphone (si la reconnaissance vocale est prise en charge par le navigateur).

La dictée utilise l'API de reconnaissance vocale du navigateur, qui peut nécessiter une connexion Internet et n'est pas disponible dans tous les navigateurs. Les notes et tâches restent enregistrées localement dans le stockage du navigateur.

## Hébergement

La version en ligne est hébergée avec GitHub Pages. C'est un hébergement de fichiers statiques : `server.py` sert uniquement au lancement local. Les tâches sont stockées dans le navigateur utilisé et ne se synchronisent pas entre appareils.

## Pistes pour la suite

1. Notifications de rappel à l'heure prévue.
2. Assistant conversationnel configurable.
3. Synchronisation entre PC, puis intégrations agenda et courriel sur demande.
