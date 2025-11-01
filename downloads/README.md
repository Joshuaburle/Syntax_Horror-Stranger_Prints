# 🎃 Jean-Michel Pointeur - Windows Package

## 📦 Contenu du package

Ce package contient :
- `JeanMichel.bat` - Lanceur Windows
- `JeanMichel` - Script Python principal
- `images/` - Assets visuels et audio
- `game/` - Prototype WebGL (Three.js)

## 🚀 Installation et lancement

### Prérequis
- **Windows 7/8/10/11**
- **WSL (Windows Subsystem for Linux)** installé
- **Python 3** + bibliothèques dans WSL :
	```bash
	sudo apt update
	sudo apt install python3 python3-tk python3-pil python3-pygame
	```

### Lancement
1. Extraire le ZIP dans un dossier
2. Double-cliquer sur `JeanMichel.bat`
3. Le jeu se lance automatiquement !

## ⚠️ Notes importantes

- **Premier lancement** : Windows SmartScreen peut afficher un avertissement. Cliquez sur "Plus d'infos" puis "Exécuter quand même"
- **Fermeture** : Le bouton X est désactivé pour l'expérience Halloween - le programme se ferme automatiquement à la fin
- **Fichiers temporaires** : Le jeu copie les fichiers dans `%TEMP%\JeanMichel_Game` pour fonctionner correctement

## 🎮 À propos

Jean-Michel Pointeur est une application interactive d'apprentissage des pointeurs en C... avec une touche d'horreur pour Halloween 🎃

Créé par la **Stranger Prints team** pour le hackathon **Syntax Horror**.

---

*"Enfin comprendre les pointeurs en C sans se prendre la tête..."* 👻
