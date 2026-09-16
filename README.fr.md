<p align="center">
  <img src="web/src/assets/about/reading-space-logo.svg" width="112" alt="Logo Reading Space">
</p>

<h1 align="center">Reading Space MN</h1>

<p align="center">
  <strong>Gardez les explications, les questions, la lecture audio et la recherche dans votre flux de lecture MarginNote.</strong>
</p>

<p align="center">
  Reading Space MN est un module de flux de lecture pour MarginNote 4. Il place l’IA, un navigateur intégré, la lecture audio et la connexion à Obsidian à proximité des sélections, extraits et cartes heuristiques.
</p>

<p align="center">
  <a href="README.md">简体中文</a> ·
  <a href="README.en.md">English</a> ·
  <a href="README.ja.md">日本語</a> ·
  <strong>Français</strong> ·
  <a href="README.ru.md">Русский</a> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.ko.md">한국어</a>
</p>

---

## L’étape suivante, au plus près du contenu lu

Lors de la lecture d’un PDF, d’une page Web ou d’une note, l’étape suivante consiste souvent à expliquer un concept, poser une question complémentaire, écouter un extrait ou vérifier une source. Reading Space MN rassemble ces actions dans un même flux et réduit les allers-retours entre le lecteur, le navigateur, les outils d’IA et l’application de notes.

Il ne remplace pas MarginNote : il ajoute des accès ciblés pour rechercher, comprendre, écouter et conserver le contenu déjà affiché.

## Cas d’usage

- Expliquer, rechercher, traduire ou approfondir un texte sélectionné.
- Lire à voix haute, commenter ou créer des cartes liées à partir d’extraits et de cartes heuristiques.
- Rechercher et vérifier des informations dans le navigateur intégré sans quitter le flux de lecture.
- Envoyer des extraits ou cartes utiles vers un coffre Obsidian ReadingSpace local.
- Exporter, importer ou synchroniser manuellement des réglages dans des limites de données explicites.

## Fonctions principales

| Fonction | Utilité |
| --- | --- |
| **Barre d’outils des sélections et cartes** | Propose la lecture audio, l’explication, les questions à l’IA, les commentaires et la création de cartes enfant ou sœurs. |
| **Explication rapide et recherche par IA** | Produit une explication concise et donne accès au dictionnaire, à la traduction et aux questions complémentaires. |
| **Questions-réponses par IA** | Ouvre un panneau séparé avec votre propre fournisseur, modèle, Endpoint et vos prompts. |
| **Navigateur intégré** | Maintient la recherche Web dans le flux de lecture et gère l’accueil, les favoris, l’historique et l’onglet courant. |
| **Lecture audio** | Génère le son via un service TTS configuré ou un pont Obsidian local, puis l’envoie vers un lecteur séparé. |
| **Envoi vers Obsidian** | Transmet l’extrait ou la carte en cours vers un dossier choisi d’Obsidian ReadingSpace local. |
| **Réglages et synchronisation manuelle** | Gère l’apparence, l’IA, le navigateur, l’audio et l’export, avec import ou envoi manuel des données iCloud sélectionnées. |

## Déroulement type

1. Sélectionnez du texte, un extrait ou une carte heuristique dans MarginNote.
2. Choisissez la lecture audio, l’explication, la recherche, l’IA ou une action de carte dans la barre Reading Space.
3. Consultez le résultat dans le panneau ou le lecteur séparé, puis poursuivez si nécessaire.
4. Envoyez les éléments utiles vers Obsidian local, ou traitez manuellement les données choisies depuis les réglages.

## État actuel

Le snapshot public actuel correspond à la version **0.1.5** et nécessite **MarginNote 4.2.3 ou ultérieur**.

> [!IMPORTANT]
> Le paquet `.mnaddon` validé de la version `0.1.5` est disponible dans [Reading Space MN v0.1.5 sur GitHub Releases](https://github.com/Awaker-OTE/readingspace-mn/releases/tag/v0.1.5). Les artefacts compilés depuis les sources restent destinés au développement et à la vérification locale et ne remplacent pas le paquet validé joint à la Release.

Limites importantes :

- Les fonctions d’IA et de TTS nécessitent votre propre fournisseur, Endpoint, clé API ou autre configuration de connexion. Aucun identifiant tiers n’est inclus.
- La synchronisation automatique est expérimentale et actuellement suspendue. L’enregistrement des réglages ne les envoie pas automatiquement ; l’envoi et l’import iCloud manuels restent disponibles.
- Les cookies et l’état de connexion du navigateur restent sur l’appareil et sont exclus de l’export des réglages et de la synchronisation iCloud.
- Le pont Obsidian local est principalement destiné au bureau et n’est pas disponible sur iPad.
- Le comportement peut varier selon la version de MarginNote, l’appareil et l’environnement réseau.

## Vérifier et compiler les sources

L’exécution nécessite MarginNote 4.2.3 ou ultérieur. Le build public requiert également Node.js 22.12 ou ultérieur, pnpm 10 ou ultérieur et la commande système `zip`.

```bash
git clone https://github.com/Awaker-OTE/readingspace-mn.git
cd readingspace-mn
pnpm install --frozen-lockfile
pnpm verify
pnpm build
```

`pnpm verify` contrôle la frontière publique, le reçu du snapshot et les contrats fonctionnels. `pnpm build` écrit des fichiers `.mnaddon` à nom fixe et horodatés dans `artifacts/`, sans installer le module, redémarrer MarginNote, écrire sur le Bureau ni appeler les services internes de publication.

Le build public sert à la reproductibilité et aux tests de régression ; il ne remplace pas un artefact de diffusion formel validé.

## Provenance vérifiable des sources

Ce dépôt est un miroir public géré. Le code produit est exporté depuis un commit Git interne complet. `PUBLIC_SOURCE.json` consigne ce commit, la version, les fichiers gérés et leur SHA-256 individuel.

```bash
pnpm verify:source-snapshot
```

Les fichiers sous `src/`, `web/` et les scripts de contrat gérés ne sont pas développés indépendamment dans ce miroir. Les README, CI, politique de sécurité et enveloppe de build sans effet local propres au dépôt public peuvent être maintenus séparément, sans modifier le comportement du produit à l’exécution.

## Confidentialité et limites des données

- Le dépôt ne contient aucune clé API utilisateur, aucun token Bridge, cookie de navigateur, historique de discussion ni autre donnée utilisateur.
- L’état de connexion du navigateur reste local et n’entre ni dans l’export des réglages ni dans iCloud.
- Les catégories de synchronisation sensibles doivent être sélectionnées explicitement et traitées manuellement.
- Ne publiez pas de secrets, tokens, cookies, documents privés ou données utilisateur réelles dans les Issues, journaux ou captures.
- Signalez les problèmes de sécurité selon [SECURITY.md](SECURITY.md), sans divulguer publiquement les détails ni les preuves non expurgées.

## Licence et indépendance

Le code est rendu public uniquement pour consultation et audit de sécurité ; ce **n’est pas un logiciel open source**. Sauf obligation légale ou permission des Conditions d’utilisation de GitHub, aucun droit de copie, modification, distribution, sous-licence, vente ou création d’œuvres dérivées n’est accordé. Consultez [LICENSE](LICENSE).

Reading Space MN est conçu et réalisé indépendamment. Ce n’est pas un produit officiel de MarginNote, OpenAI, ChatGPT, Obsidian ou d’un autre service tiers, et cela n’implique ni approbation, ni partenariat, ni engagement de compatibilité. Les noms et marques de tiers appartiennent à leurs propriétaires respectifs.
