# 🎃 Jean-Michel Pointeur - Windows Package

## 📦 Contenu du package

Ce package contient :
- `JeanMichel.bat` - Lanceur Windows
- `JeanMichel` - Script Python principal
- `images/` - Assets visuels et audio
- `game/` - Prototype WebGL (Three.js)

## 🚀 Installation et lancement

### ⚙️ Installation des prérequis (première fois uniquement)

**Si vous n'avez jamais installé WSL sur votre PC, suivez ces étapes :**

#### 1️⃣ Installer WSL (Windows Subsystem for Linux)
1. Ouvrez **PowerShell en tant qu'administrateur** :
   - Clic droit sur le menu Démarrer → "Windows PowerShell (admin)" ou "Terminal (admin)"
2. Tapez cette commande et appuyez sur Entrée :
   ```powershell
   wsl --install
   ```
3. **Redémarrez votre PC** quand demandé
4. Après le redémarrage, une fenêtre Ubuntu s'ouvrira automatiquement
5. Créez un **nom d'utilisateur** et un **mot de passe** quand demandé (notez-les bien !)

#### 2️⃣ Installer Python 3 et les bibliothèques nécessaires
1. Ouvrez **Ubuntu** (cherchez "Ubuntu" dans le menu Démarrer)
2. Copiez-collez ces commandes une par une :
   ```bash
   sudo apt update
   sudo apt install -y python3 python3-tk python3-pil python3-pygame
   ```
3. Entrez votre mot de passe Ubuntu si demandé
4. Attendez la fin de l'installation (quelques minutes)

✅ **C'est tout ! Vous n'aurez plus jamais à refaire ces étapes.**

---

### 🎮 Lancement du jeu
1. **Extraire le ZIP** dans un dossier (par exemple `Documents\JeanMichel`)
2. **Double-cliquer** sur `JeanMichel.bat`
3. Le jeu se lance automatiquement ! 🎃

**Note :** Si vous voyez "wsl: command not found", relancez votre PC et réessayez.

## ⚠️ Notes importantes

- **Premier lancement** : Windows SmartScreen peut afficher un avertissement. Cliquez sur "Plus d'infos" puis "Exécuter quand même"
- **Fermeture** : Le bouton X est désactivé pour l'expérience Halloween - le programme se ferme automatiquement à la fin
- **Fichiers temporaires** : Le jeu copie les fichiers dans `%TEMP%\JeanMichel_Game` pour fonctionner correctement

## 🎮 À propos

Jean-Michel Pointeur est une application interactive d'apprentissage des pointeurs en C... avec une touche d'horreur pour Halloween 🎃

Créé par la **Stranger Prints team** pour le hackathon **Syntax Horror**.

---

*"Enfin comprendre les pointeurs en C sans se prendre la tête..."* 👻
