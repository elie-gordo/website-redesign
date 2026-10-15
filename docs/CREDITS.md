# Crédits, origine et licences

Légende origine : **Humain** (réalisé par Elliott) · **IA** (généré, préciser outil/modèle) · **Tiers** (ressource externe).

| Élément | Origine | Outil / source | Licence | Usage commercial | Attribution requise | Lien |
|---|---|---|---|---|---|---|
| Choix du sujet, du périmètre, des coloris, validation de la DA et des étapes | Humain | — | — | — | — | — |
| Code du site (`src/`), tests, scripts `tools/blender/*.py`, textes, documentation | IA | Claude Opus 5.5 via Claude Code | Propriété du projet | Oui | Non | — |
| Modèle 3D, matériaux, rendus studio et film d'origine | IA (projet blender-studio-object) | Blender 5.2.2 LTS | Œuvre du projet | Oui | Non | [dépôt](https://github.com/elie-gordo/blender-studio-object) |
| GLB boutique et 8 rendus des coloris | IA (exécution des scripts sur le poste d'Elliott) | Blender 5.2.2 LTS, glTF-Transform 4.5.1 | Œuvre du projet | Oui | Non | — |
| Captures `docs/screenshots/` | IA (Chrome DevTools) | Chrome | Œuvre du projet | Oui | Non | — |
| Astro 7.4.0 | Tiers | npm | MIT | Oui | Non (licence dans `node_modules`) | [astro.build](https://astro.build) |
| three.js 0.186.1 | Tiers | npm | MIT | Oui | Non | [threejs.org](https://threejs.org) |
| Police Inter (variable) | Tiers | @fontsource-variable/inter 5.3.0 | SIL OFL 1.1 | Oui (vente de la police seule interdite) | Non | [rsms.me/inter](https://rsms.me/inter/) |
| Police Instrument Serif | Tiers | @fontsource/instrument-serif 5.3.0 | SIL OFL 1.1 | Oui (vente de la police seule interdite) | Non | [Google Fonts](https://fonts.google.com/specimen/Instrument+Serif) |
| Vitest, Playwright, @axe-core/playwright | Tiers (outils de test, non livrés) | npm | MIT, Apache-2.0, MPL-2.0 | Oui | Non | — |
| Références visuelles (Flos, Astep, Michael Anastassiades, Apparatus) | Tiers — inspiration uniquement | Sites officiels consultés le 2026-10-16 | — (rien de reproduit) | — | — | — |

Aucune image, texture, HDRI ou police tierce n'est intégrée en dehors de cette liste. L'éclairage de la vue 3D utilise `RoomEnvironment`, généré par three.js (aucun fichier externe).
