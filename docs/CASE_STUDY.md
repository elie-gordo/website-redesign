# Étude de cas — TENSIL, boutique de démonstration

| Rubrique | Contenu |
|---|---|
| Contexte | Projet de portfolio. La lampe TENSIL existait déjà en 3D (projet Blender précédent) ; il manquait un site qui la « vende » de façon crédible. Marque fictive, aucune vente réelle. |
| Objectif | Montrer un parcours e-commerce complet, responsive et accessible, autour d'une vue 3D à 360° en quatre coloris, avec une direction artistique haut de gamme. |
| Démarche | Brief validé → audit du GLB existant → export 3D dédié → rendus des coloris → recherche de références (Flos, Astep, Michael Anastassiades, Apparatus) → développement Astro + three.js → tests unitaires, E2E, axe, Lighthouse → corrections → documentation. |
| Mon rôle | Choix du produit, du périmètre (un produit, quatre coloris, 3D 360°), de l'architecture Blender (script dans ce dépôt plutôt que modification du projet lampe), du GLB unique, et de la direction « sobre, épurée, luxe ». Validation des étapes. |
| Rôle de l'IA | Claude (via Claude Code) a audité le GLB, écrit les scripts Blender et le code du site, lancé les tests et mesures, et rédigé la documentation, sous ma supervision. |
| Outils | Astro 7, TypeScript, three.js, Blender 5.2, glTF-Transform, Vitest, Playwright, axe-core, Lighthouse, Chrome DevTools. |
| Difficultés | 1) Le GLB d'origine fusionnait ses matériaux en textures palette : laque non recolorable → nouvel export qui garde les matériaux séparés. 2) Câble de 80 cm qui décentrait la rotation → câble court avec prise. 3) Rugosité procédurale perdue à l'export → valeurs fixes. 4) Chargement automatique de la 3D : performance Lighthouse mobile 58 (TBT 5,6 s) → chargement à la demande : 99. 5) Barre d'achat mobile ratée par `IntersectionObserver` lors des sauts d'ancre → écouteur de défilement passif. 6) Images étirées faute de `height: auto` → corrigé globalement. |
| Résultat | 6 pages, parcours complet testé (26 tests E2E sur desktop et mobile), 0 violation axe détectée, Lighthouse mobile 99/100/100/100 sur la page produit, 0 € dépensé. En ligne sur Vercel (https://tensil-store.vercel.app) avec CSP stricte. |
| Limites | Données commerciales fictives ; testé sur Chrome uniquement ; pas de test manuel au lecteur d'écran ; teinte 3D temps réel légèrement différente des rendus Cycles ; hébergement gratuit réservé à un usage non commercial. |
