# Brief — Boutique de démonstration TENSIL

> Validé le 2026-10-16. Projet de démonstration : marque fictive, aucune vente réelle.

## Concept
Boutique en ligne mono-produit pour la lampe articulée **TENSIL** (marque fictive), conçue dans le projet [blender-studio-object](https://github.com/elie-gordo/blender-studio-object). Bandeau permanent « Projet de démonstration — aucune vente réelle ».

## Public
- **Réel** : recruteurs (front, intégration 3D web) et clients PME e-commerce.
- **Fictif** : acheteur exigeant (télétravail, métiers créatifs) qui veut voir l'objet sous tous les angles avant d'acheter.

## Besoin
Un objet design s'achète mal sur photo. La boutique répond avec une visionneuse 3D à 360° pour chaque coloris, un changement de coloris en direct et des informations claires (dimensions, matériaux, livraison).

## Objectifs
1. Parcours e-commerce complet : découverte → choix du coloris → panier → commande simulée → confirmation.
2. Intégration 3D web performante, avec solution de repli si WebGL est indisponible.
3. Responsive, accessible au clavier, avec des états gérés (chargement 3D, erreur, panier vide, formulaire invalide, commande envoyée).
4. Faire le lien entre le projet 3D et le développement web.

## Décisions validées
| Sujet | Décision |
|---|---|
| Gamme | Un seul produit, TENSIL |
| Coloris | 4 : Graphite, Sauge, Oxyde, Crème |
| 3D | Visionneuse 360° pour chaque coloris, à partir d'un modèle 3D nettoyé (modifié dans Blender si besoin) |
| Prix | **249 € TTC, fictif**, affiché comme tel |
| Paiement | Aucun. Commande simulée, aucune donnée bancaire, aucune donnée envoyée à un serveur |

## Pages et fonctions
| Page | Contenu |
|---|---|
| Produit (accueil) | Héros, visionneuse 3D 360° + sélecteur de coloris, galerie, caractéristiques, savoir-faire (visuels du processus), FAQ |
| Panier | Quantités, sous-total, livraison fictive, état vide |
| Commande | Formulaire simulé (coordonnées, livraison), validation accessible |
| Confirmation | Récapitulatif + numéro de commande fictif |
| À propos de la démo | Crédits, licences, liens vers les deux dépôts |
| 404 | Page d'erreur |

## Exclu
Paiement réel, comptes clients, base de données, back-office, newsletter, avis clients, analytics, modification du portfolio, publication sans accord.

## Critères de réussite
- Parcours complet au clavier, à 375 px et à 1440 px.
- Lighthouse mobile ≥ 90 (performance, accessibilité, SEO), score réellement mesuré.
- 3D chargée à la demande, avec image de repli ; changement de coloris sans rechargement de page.
- Page initiale < 500 Ko hors GLB et vidéo.
- Aucun secret ni aucune donnée réelle dans le dépôt.

## Coûts
Cible 0 €. Rendus et exports Blender en local.
