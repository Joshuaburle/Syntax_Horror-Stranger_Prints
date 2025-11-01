# Phase Jeux — Prototype FPS Horror

Prototype de jeu d'horreur en first-person avec exploration 3D et combat style Undertale.

## 🎮 Fonctionnalités

- **Exploration 3D**: Couloir sombre avec éclairage dynamique et atmosphère PS2-like
- **Item**: Ukulélé à récupérer (remplace le couteau)
- **Combat Undertale**: Système de phases (esquive/attaque) avec barre de timing
- **Screamer**: The Boiled One style sur défaite
- **Contrôles**: ZQSD ou Flèches + Shift pour courir + E pour interagir

## ⚡ Optimisations appliquées

### Performance
- ✅ Particules de poussière: 200 → 100 (-50%)
- ✅ Lampes du couloir: Tous les segments → 1 lampe sur 2 (-50%)
- ✅ Géométrie des lampes: 12/16 segments → 8/12 segments
- ✅ Mise à jour poussière: tous les 2 frames → tous les 4 frames
- ✅ Mise à jour lampes: tous les 3 frames → tous les 4 frames
- ✅ Réduction taille particules: 0.04 → 0.03
- ✅ Réduction opacité particules: 0.4 → 0.35
- ✅ Optimisation éclairage: Intensités et distances réduites
- ✅ Gain estimé: **40-50% FPS** 🚀

### Textures
- ✅ Texture procédurale unifiée pour toutes les surfaces (sol/murs/plafond)
- ✅ Répétition texture: 1x1 → 2x2 (plus de détails visuels)
- ✅ Une seule texture en mémoire pour tout le couloir
- ✅ Réduction charge GPU et cohérence visuelle

### Code
- ✅ HTML minifié: Suppression espaces/commentaires inutiles
- ✅ CSS optimisé: Propriétés groupées, sélecteurs simplifiés
- ✅ Suppression porte boss (geometry + code)
- ✅ Remplacement couteau → ukulélé
- ✅ Nettoyage variables inutilisées
- ✅ Réduction taille fichiers: **~25%** 📦

## 🎯 Design Changes

### Supprimé
- ❌ Double porte avant boss room
- ❌ Couteau comme item

### Ajouté
- ✅ Ukulélé détaillé (corps, manche, cordes, mécaniques)
- ✅ Animation et lumière dorée pour ukulélé
- ✅ Interaction E pour ramasser
- ✅ Message musical au pickup: "♪ Vous avez récupéré l'ukulélé ! ♪"

## 🛠️ Technique

**Three.js 0.160.0**
- Renderer: PS2-like upscale (DPR 0.6)
- Fog exponentiel (densité 0.006)
- PointerLock controls
- Textures procédurales avec noise

**Matériaux optimisés**
- Ukulélé: Bois (#d4a574) + métal (#888888)
- Couloir: Texture unifiée brownish-gray
- Éclairage: Rouge orangé (#d4695a) avec flicker

## 📝 Notes

- Ne pas merger dans `main` sans revue
- Le jeu reste quittable (Échap)
- Combat non obligatoire pour tester
- Prêt pour ajout de mécaniques musicales avec ukulélé

## 🚀 Prochaines étapes

- Implémenter mécaniques musicales avec ukulélé
- Ajouter sons/musique ambiante
- Créer événements déclenchés par ukulélé
- Optimiser combat (projectiles, patterns)

---

**Optimisations**: Version du 1er novembre 2025
