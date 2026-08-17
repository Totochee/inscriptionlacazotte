# La Cazotte — portail administratif réel

Application HTML/CSS/JavaScript destinée à GitHub Pages, avec authentification, base de données et stockage privé fournis par Supabase.

## Ce qui fonctionne

- création de compte et confirmation par e-mail ;
- connexion, déconnexion et récupération du mot de passe ;
- profil apprenant et formation ;
- demandes de documents créées par le secrétariat ;
- dépôt réel de PDF, JPG et PNG (10 Mo maximum) ;
- stockage privé avec règles d'accès par utilisateur ;
- téléchargement temporaire par URL signée ;
- validation ou refus avec motif par le secrétariat ;
- messagerie entre les apprenants et les comptes administrateurs ;
- conversation privée entre chaque élève et le compte support ;
- annonces administratives en lecture seule pour les élèves ;
- tableau d'avancement des dossiers actualisé en temps réel ;
- affichage adapté au téléphone et à l'ordinateur.

Le site ne contient aucun apprenant, document ou message prérempli.

## 1. Créer le projet Supabase

1. Créez un projet sur <https://supabase.com> et choisissez de préférence une région européenne.
2. Dans **SQL Editor**, créez une nouvelle requête.
3. Copiez tout le contenu de `supabase-schema.sql`, puis cliquez sur **Run**.
4. Dans **Authentication → URL Configuration**, ajoutez l'adresse finale de votre GitHub Pages dans les URL de redirection autorisées.

## 2. Relier le site

Dans Supabase, ouvrez **Project Settings → API** et récupérez :

- l'URL du projet ;
- la clé publique `publishable` ou `anon`.

Ouvrez `config.js` et remplacez les deux valeurs :

```js
window.CAZOTTE_CONFIG = {
  supabaseUrl: "https://votre-projet.supabase.co",
  supabaseKey: "votre-cle-publique"
};
```

La clé publique est conçue pour être visible dans un navigateur. Ne placez jamais la clé `service_role` dans le site ou dans GitHub.

## 3. Créer le premier compte secrétariat

1. Publiez ou ouvrez le site et créez normalement votre propre compte.
2. Confirmez l'adresse reçue par e-mail.
3. Dans le SQL Editor Supabase, exécutez en remplaçant l'adresse :

```sql
update public.profiles
set role = 'admin', formation = null, is_support = true
where id = (
  select id from auth.users
  where email = 'tbsngroupe@gmail.com'
);
```

Déconnectez-vous puis reconnectez-vous. La rubrique **Secrétariat** apparaîtra. Vous pourrez créer les premières demandes de documents.

## Mise à niveau d'une installation existante

Après chaque évolution du portail, vous pouvez réexécuter l'intégralité de `supabase-schema.sql`. Le script conserve les comptes et les documents existants, ajoute les éléments manquants et configure `tbsngroupe@gmail.com` comme compte administrateur support.

Cette mise à niveau ajoute notamment les annonces et les mises à jour en temps réel. Elle doit être exécutée avant de publier les nouveaux fichiers HTML et JavaScript.

## 4. Publier sur GitHub Pages

1. Placez tous les fichiers de ce dossier à la racine d'un dépôt GitHub privé ou public.
2. Ouvrez **Settings → Pages**.
3. Choisissez **Deploy from a branch**, `main`, puis `/ (root)`.
4. Enregistrez et attendez l'apparition de l'adresse du site.

## Sécurité et mise en production

Les fichiers sont placés dans un bucket Supabase privé. Les règles RLS du fichier SQL limitent l'accès au propriétaire du document et aux comptes ayant le rôle `admin`.

Avant une utilisation par un établissement, faites néanmoins réaliser :

- une validation technique et un test d'intrusion ;
- un registre des traitements et une politique de confidentialité RGPD ;
- la définition des durées de conservation et de suppression ;
- une procédure de sauvegarde des fichiers, ceux-ci n'étant pas inclus dans les sauvegardes ordinaires de la base Supabase ;
- la vérification contractuelle de l'hébergement, du sous-traitant et de la région choisis ;
- une procédure formelle de création et de révocation des comptes administrateurs.

N'utilisez pas le site pour des données de santé sans analyse juridique et mesures de sécurité adaptées.
