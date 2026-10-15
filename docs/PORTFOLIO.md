# Éléments à intégrer au portfolio

- [x] Titre + accroche
- [x] Visuel de couverture : `docs/screenshots/01-produit-desktop.webp`
- [x] Captures optimisées : `docs/screenshots/*.webp` (18 à 41 Ko)
- [x] Résumé étude de cas : ci-dessous et [CASE_STUDY.md](CASE_STUDY.md)
- [ ] Lien dépôt (après publication GitHub, avec ton accord)
- [ ] Lien démo (après choix de l'hébergement, avec ton accord)

## Titre
**TENSIL — boutique de démonstration avec vue 3D**

## Accroche
Une boutique mono-produit pour une lampe imaginée en 3D : vue à 360° en quatre coloris, panier et commande simulée, dans une direction artistique inspirée des éditeurs de luminaires.

## Texte de la page projet
> TENSIL est une marque fictive : la lampe a été modélisée dans un projet Blender précédent, ce site la met en vente… pour de faux. J'ai défini le périmètre (un produit, quatre coloris, une vue 3D à 360°) et la direction artistique ; Claude (IA d'Anthropic) a écrit le code et les scripts Blender, que j'ai validés étape par étape.
>
> **Problème** : un objet design se vend mal sur une seule photo, et le modèle 3D existant n'était pas exploitable tel quel (matériaux fusionnés, câble qui décentrait la rotation).
> **Solution** : un export 3D dédié (199 Ko, laque recolorable en direct), des rendus studio à fond transparent pour chaque coloris, et un site Astro où la 3D three.js ne se charge qu'à la demande pour garder la page rapide.
>
> **Résultat vérifié** : Lighthouse mobile 99 / 100 / 100 / 100 sur la page produit, 0 violation axe détectée, 26 tests de bout en bout (desktop et mobile) sur le parcours coloris → panier → commande → confirmation. Coût : 0 €.

## Compétences réellement démontrées
- Intégration front-end responsive (Astro, TypeScript, CSS sans framework).
- Intégration 3D web : three.js, glTF/Meshopt, matériaux PBR, recoloration en direct, contrôles clavier.
- Préparation d'assets 3D pour le web (Blender scripté, glTF-Transform).
- Accessibilité (WCAG A/AA vérifiée automatiquement, navigation clavier) et performance mesurée.
- Tests unitaires et E2E, gestion des états et des erreurs.
- Collaboration humain + IA documentée.

**Non démontré ici** : paiement réel, backend, authentification, SEO en production.

## Médias suggérés
| Usage | Fichier | Montre |
|---|---|---|
| Couverture | `01-produit-desktop.webp` | Vue 3D, coloris, achat |
| Galerie | `02-coloris-desktop.webp` | Les quatre coloris |
| Galerie | `03-nuit-desktop.webp` | Section sombre, rendu allumé |
| Galerie | `04-commande-erreurs.webp` | Formulaire, résumé d'erreurs |
| Galerie | `05-produit-mobile.webp`, `06-panier-mobile.webp` | Mobile, tiroir panier |
| Interaction à filmer (optionnel) | — | Changement de coloris sur la 3D en rotation |

## Contrôle final (prévu vs produit)
| Livrable prévu (brief) | Produit ? | Remarque |
|---|---|---|
| Page produit + 3D 360° pour chaque coloris | Oui | 1 GLB, 4 coloris en direct |
| Panier, commande simulée, confirmation | Oui | Testés en E2E |
| À propos, 404 | Oui | |
| Parcours clavier, 375 et 1440 px | Oui | Clavier testé sur la 3D et les formulaires ; 390 px et 1440 px contrôlés |
| Lighthouse mobile ≥ 90 | Oui | 99/100/100/100 sur `/` uniquement |
| Page initiale < 500 Ko hors GLB/vidéo | Oui | 161 Kio |
| Aucun secret, aucune donnée réelle | Oui | Aucun `.env`, aucune clé |
| README, crédits, coûts, étude de cas | Oui | |
| Publication | Non | En attente de ton accord |
