(function () {
  "use strict";

  var supported = ["fr", "en", "es"];
  var language = localStorage.getItem("cazotte-language") || "fr";
  if (!supported.includes(language)) language = "fr";

  var translations = {
    en: {
      "Portail administratif":"Administrative portal", "Configuration nécessaire":"Configuration required", "Connecter le portail à Supabase":"Connect the portal to Supabase",
      "Le site est prêt. Ajoutez l'adresse et la clé publique de votre projet dans":"The site is ready. Add your project URL and public key in", "puis rechargez cette page.":"then reload this page.",
      "Créez un projet Supabase.":"Create a Supabase project.", "Exécutez":"Run", "dans l’éditeur SQL.":"in the SQL editor.", "Copiez l’URL et la clé publique dans":"Copy the URL and public key into",
      "EPLEFPA La Cazotte · Saint-Affrique":"EPLEFPA La Cazotte · Saint-Affrique", "Mes démarches administratives":"My administrative procedures",
      "Un espace unique pour transmettre les documents demandés par l’établissement et suivre l’avancement de votre dossier.":"One place to submit documents requested by the school and track your application.",
      "Je consulte les pièces demandées":"I view the requested documents", "Je dépose mes documents":"I upload my documents", "Je suis leur validation":"I track their approval",
      "Portail réservé aux apprenants et personnels autorisés":"Portal reserved for students and authorised staff", "Se connecter":"Sign in", "Créer un compte":"Create an account",
      "Accédez à votre dossier administratif.":"Access your administrative file.", "Adresse e-mail":"Email address", "Mot de passe":"Password", "Mot de passe oublié ?":"Forgot your password?",
      "Prénom et nom":"First and last name", "N° apprenant":"Student number", "Numéro apprenant":"Student number", "Formation":"Course", "Sélectionner votre formation":"Select your course",
      "J’accepte que mes données soient traitées pour la gestion de mon dossier administratif.":"I agree that my data may be processed to manage my administrative file.",
      "Créer mon compte":"Create my account", "Recevoir le lien":"Send the link", "Retour à la connexion":"Back to sign in", "Mon espace":"My area", "Accueil":"Home",
      "Mes documents":"My documents", "Secrétariat":"Administration", "Communication":"Communication", "Support":"Support", "Annonces":"Announcements", "Mon profil":"My profile", "Se déconnecter":"Sign out",
      "Espace personnel":"Personal area", "Tableau de bord":"Dashboard", "Connexion sécurisée":"Secure connection", "Bonjour":"Hello", "État d’avancement du dossier":"Application progress",
      "Accéder à mes documents":"Go to my documents", "Profil":"Profile", "Informations personnelles":"Personal information", "Documents":"Documents", "Pièces à transmettre":"Items to submit",
      "Vérification":"Review", "Contrôle du secrétariat":"Administration review", "Dossier complet":"Complete file", "Toutes les pièces validées":"All documents approved",
      "Documents validés":"Approved documents", "Documents à déposer":"Documents to upload", "En cours de vérification":"Under review", "Prochaine étape":"Next step", "Documents à traiter":"Documents requiring action",
      "Voir le dossier":"View file", "Une question ?":"Any questions?", "Le secrétariat vous répond":"The administration can help", "Échangez directement avec l’établissement, sans quitter votre espace.":"Contact the school directly without leaving your account.",
      "Écrire un message":"Write a message", "Dossier administratif":"Administrative file", "Déposez les pièces demandées et suivez leur traitement.":"Upload the requested documents and track their status.",
      "Rechercher un document":"Search for a document", "Tous":"All", "À déposer":"To upload", "En vérification":"Under review", "Validés":"Approved", "À corriger":"Needs correction",
      "Document":"Document", "Échéance":"Deadline", "Statut":"Status", "Action":"Action", "Aucun document":"No documents", "Aucune échéance":"No deadline",
      "Le secrétariat n’a encore demandé aucune pièce correspondant à votre formation.":"The administration has not requested any documents for your course yet.",
      "Les documents sont conservés dans un espace privé. Seuls vous-même et les personnels habilités pouvez y accéder.":"Documents are stored privately. Only you and authorised staff can access them.",
      "Conversation privée":"Private conversation", "Support administratif":"Administrative support", "Posez vos questions au compte support de l’établissement.":"Send your questions to the school's support account.",
      "Sélectionnez un élève pour consulter sa conversation et lui répondre.":"Select a student to view and reply to their conversation.", "Conversation avec":"Conversation with", "Choisir le destinataire":"Choose recipient",
      "Conversation ouverte":"Conversation open", "Clôturer":"Close", "Temps réel":"Live", "Aucun message":"No messages", "La conversation apparaîtra ici.":"The conversation will appear here.",
      "Écrivez votre message…":"Write your message…", "Envoyer":"Send", "Entrée pour envoyer · Maj + Entrée pour aller à la ligne":"Enter to send · Shift + Enter for a new line",
      "Informations de l’établissement":"School information", "Les informations générales publiées par le secrétariat sont en lecture seule.":"General information published by the administration is read-only.",
      "Nouvelle annonce":"New announcement", "Publier une information":"Publish information", "Titre":"Title", "Destinataires":"Recipients", "Tous les apprenants":"All students", "Annonce":"Announcement",
      "Rédigez l’annonce…":"Write the announcement…", "Publier l’annonce":"Publish announcement", "Aucune annonce":"No announcements", "Les nouvelles informations de l’établissement apparaîtront ici.":"New school information will appear here.",
      "Non lue":"Unread", "Marquer comme lu":"Mark as read", "Lu":"Read", "Supprimer":"Delete", "Compte utilisateur":"User account", "Mettez à jour les informations utiles au traitement de votre dossier.":"Update the information needed to process your file.",
      "Enregistrer les modifications":"Save changes", "Affichage et langue":"Display and language", "Préférences de l’interface":"Interface preferences", "Ces choix sont enregistrés sur cet appareil.":"These choices are saved on this device.",
      "Apparence":"Appearance", "Thème clair":"Light theme", "Thème sombre":"Dark theme", "Selon l’appareil":"Use device setting", "Langue":"Language", "Sécurité":"Security", "Changer mon mot de passe":"Change my password",
      "Nouveau mot de passe":"New password", "8 caractères minimum":"8 characters minimum", "Mettre à jour le mot de passe":"Update password", "Espace personnel habilité":"Authorised staff area",
      "Gérez les documents demandés et contrôlez les dépôts reçus.":"Manage requested documents and review received uploads.", "Demander un document":"Request a document", "Élèves inscrits":"Registered students", "Dossiers incomplets":"Incomplete files",
      "Pièces à vérifier":"Documents to review", "Dossiers en retard":"Overdue files", "Priorités du jour":"Today's priorities", "Actions à traiter":"Actions required", "Accédez directement aux dossiers qui nécessitent votre attention.":"Go directly to files requiring your attention.",
      "Paramétrage du dossier":"File settings", "Demandes de documents":"Document requests", "Modifiez les consignes et échéances ou désactivez une demande terminée.":"Edit instructions and deadlines or disable a completed request.",
      "Nouvelle demande":"New request", "Toutes les formations":"All courses", "Tous les dossiers":"All files", "Incomplets":"Incomplete", "Complets":"Complete", "À vérifier":"To review", "En cours":"In progress", "Non commencés":"Not started", "En retard":"Overdue",
      "Relancer la sélection":"Remind selected", "Exporter en CSV":"Export CSV", "Mise à jour automatique":"Automatic updates", "Avancement des élèves":"Student progress", "Sélectionnez les élèves à relancer.":"Select students to remind.",
      "Élève":"Student", "Dossier":"File", "Dépôts reçus":"Received uploads", "Pièces à contrôler":"Documents to review", "Apprenant":"Student", "Déposé le":"Uploaded on", "Actions":"Actions", "Voir":"View", "Valider":"Approve", "Refuser":"Reject", "Ouvrir":"Open",
      "Aucun élève inscrit":"No registered students", "Les comptes apprenants apparaîtront ici dès leur inscription.":"Student accounts will appear here once registered.", "Aucun dépôt à afficher":"No uploads to display", "Les pièces transmises par les apprenants apparaîtront ici.":"Documents submitted by students will appear here.",
      "Dépôt sécurisé":"Secure upload", "Transmettre un document":"Submit a document", "Sélectionner un fichier":"Select a file", "Je confirme que ce document est lisible et correspond à la pièce demandée.":"I confirm this document is readable and matches the requested item.", "Annuler":"Cancel", "Transmettre":"Submit",
      "Fiche apprenant":"Student file", "du dossier transmis":"of the file submitted", "Ouvrir la conversation":"Open conversation", "Envoyer un rappel":"Send reminder", "Documents demandés":"Requested documents", "Historique du dossier":"File history",
      "Nom du document":"Document name", "Catégorie":"Category", "Description":"Description", "Date limite":"Deadline", "Formation concernée":"Relevant course", "Créer la demande":"Create request",
      "Complet":"Complete", "Non commencé":"Not started", "Aucune demande":"No requests", "Validé":"Approved", "Déposer":"Upload", "Corriger":"Correct", "Télécharger":"Download", "Modifier":"Edit", "Dupliquer":"Duplicate", "Désactiver":"Disable", "Réactiver":"Reactivate", "Active":"Active", "Désactivée":"Disabled", "Sans échéance":"No deadline", "Sans catégorie":"Uncategorised", "Aucun fichier transmis":"No file submitted", "Document envoyé":"Document submitted", "Document validé":"Document approved", "Correction demandée":"Correction requested",
      "Message envoyé.":"Message sent.", "Annonce marquée comme lue.":"Announcement marked as read.", "Annonce publiée. Les élèves la voient immédiatement.":"Announcement published. Students can see it immediately."
    },
    es: {
      "Portail administratif":"Portal administrativo", "Configuration nécessaire":"Configuración necesaria", "Connecter le portail à Supabase":"Conectar el portal a Supabase",
      "Le site est prêt. Ajoutez l'adresse et la clé publique de votre projet dans":"El sitio está listo. Añada la URL y la clave pública de su proyecto en", "puis rechargez cette page.":"y vuelva a cargar esta página.",
      "Créez un projet Supabase.":"Cree un proyecto de Supabase.", "Exécutez":"Ejecute", "dans l’éditeur SQL.":"en el editor SQL.", "Copiez l’URL et la clé publique dans":"Copie la URL y la clave pública en",
      "Mes démarches administratives":"Mis trámites administrativos", "Un espace unique pour transmettre les documents demandés par l’établissement et suivre l’avancement de votre dossier.":"Un único espacio para enviar los documentos solicitados por el centro y seguir el progreso de su expediente.",
      "Je consulte les pièces demandées":"Consulto los documentos solicitados", "Je dépose mes documents":"Subo mis documentos", "Je suis leur validation":"Sigo su validación", "Portail réservé aux apprenants et personnels autorisés":"Portal reservado a estudiantes y personal autorizado",
      "Se connecter":"Iniciar sesión", "Créer un compte":"Crear una cuenta", "Accédez à votre dossier administratif.":"Acceda a su expediente administrativo.", "Adresse e-mail":"Correo electrónico", "Mot de passe":"Contraseña", "Mot de passe oublié ?":"¿Ha olvidado su contraseña?",
      "Prénom et nom":"Nombre y apellidos", "N° apprenant":"Número de estudiante", "Numéro apprenant":"Número de estudiante", "Formation":"Formación", "Sélectionner votre formation":"Seleccione su formación",
      "J’accepte que mes données soient traitées pour la gestion de mon dossier administratif.":"Acepto que mis datos sean tratados para gestionar mi expediente administrativo.", "Créer mon compte":"Crear mi cuenta", "Recevoir le lien":"Recibir el enlace", "Retour à la connexion":"Volver al inicio de sesión",
      "Mon espace":"Mi espacio", "Accueil":"Inicio", "Mes documents":"Mis documentos", "Secrétariat":"Administración", "Communication":"Comunicación", "Support":"Soporte", "Annonces":"Anuncios", "Mon profil":"Mi perfil", "Se déconnecter":"Cerrar sesión",
      "Espace personnel":"Espacio personal", "Tableau de bord":"Panel", "Connexion sécurisée":"Conexión segura", "Bonjour":"Hola", "État d’avancement du dossier":"Progreso del expediente", "Accéder à mes documents":"Ir a mis documentos",
      "Profil":"Perfil", "Informations personnelles":"Información personal", "Documents":"Documentos", "Pièces à transmettre":"Documentos por enviar", "Vérification":"Revisión", "Contrôle du secrétariat":"Revisión administrativa", "Dossier complet":"Expediente completo", "Toutes les pièces validées":"Todos los documentos validados",
      "Documents validés":"Documentos validados", "Documents à déposer":"Documentos por subir", "En cours de vérification":"En revisión", "Prochaine étape":"Siguiente paso", "Documents à traiter":"Documentos pendientes", "Voir le dossier":"Ver expediente",
      "Une question ?":"¿Alguna pregunta?", "Le secrétariat vous répond":"La administración le responde", "Échangez directement avec l’établissement, sans quitter votre espace.":"Contacte directamente con el centro sin salir de su espacio.", "Écrire un message":"Escribir un mensaje",
      "Dossier administratif":"Expediente administrativo", "Déposez les pièces demandées et suivez leur traitement.":"Suba los documentos solicitados y siga su tramitación.", "Rechercher un document":"Buscar un documento", "Tous":"Todos", "À déposer":"Por subir", "En vérification":"En revisión", "Validés":"Validados", "À corriger":"Por corregir",
      "Document":"Documento", "Échéance":"Fecha límite", "Statut":"Estado", "Action":"Acción", "Aucun document":"Sin documentos", "Aucune échéance":"Sin fecha límite", "Le secrétariat n’a encore demandé aucune pièce correspondant à votre formation.":"La administración aún no ha solicitado documentos para su formación.",
      "Les documents sont conservés dans un espace privé. Seuls vous-même et les personnels habilités pouvez y accéder.":"Los documentos se guardan en un espacio privado. Solo usted y el personal autorizado pueden acceder a ellos.",
      "Conversation privée":"Conversación privada", "Support administratif":"Soporte administrativo", "Posez vos questions au compte support de l’établissement.":"Envíe sus preguntas a la cuenta de soporte del centro.", "Sélectionnez un élève pour consulter sa conversation et lui répondre.":"Seleccione un estudiante para ver su conversación y responder.",
      "Conversation avec":"Conversación con", "Choisir le destinataire":"Elegir destinatario", "Conversation ouverte":"Conversación abierta", "Clôturer":"Cerrar", "Temps réel":"Tiempo real", "Aucun message":"Sin mensajes", "La conversation apparaîtra ici.":"La conversación aparecerá aquí.", "Écrivez votre message…":"Escriba su mensaje…", "Envoyer":"Enviar", "Entrée pour envoyer · Maj + Entrée pour aller à la ligne":"Intro para enviar · Mayús + Intro para nueva línea",
      "Informations de l’établissement":"Información del centro", "Les informations générales publiées par le secrétariat sont en lecture seule.":"La información general publicada por la administración es de solo lectura.", "Nouvelle annonce":"Nuevo anuncio", "Publier une information":"Publicar información", "Titre":"Título", "Destinataires":"Destinatarios", "Tous les apprenants":"Todos los estudiantes", "Annonce":"Anuncio", "Rédigez l’annonce…":"Escriba el anuncio…", "Publier l’annonce":"Publicar anuncio", "Aucune annonce":"Sin anuncios", "Les nouvelles informations de l’établissement apparaîtront ici.":"La nueva información del centro aparecerá aquí.", "Non lue":"No leído", "Marquer comme lu":"Marcar como leído", "Lu":"Leído", "Supprimer":"Eliminar",
      "Compte utilisateur":"Cuenta de usuario", "Mettez à jour les informations utiles au traitement de votre dossier.":"Actualice la información necesaria para tramitar su expediente.", "Enregistrer les modifications":"Guardar cambios", "Affichage et langue":"Pantalla e idioma", "Préférences de l’interface":"Preferencias de la interfaz", "Ces choix sont enregistrés sur cet appareil.":"Estas opciones se guardan en este dispositivo.",
      "Apparence":"Apariencia", "Thème clair":"Tema claro", "Thème sombre":"Tema oscuro", "Selon l’appareil":"Según el dispositivo", "Langue":"Idioma", "Sécurité":"Seguridad", "Changer mon mot de passe":"Cambiar mi contraseña", "Nouveau mot de passe":"Nueva contraseña", "8 caractères minimum":"8 caracteres como mínimo", "Mettre à jour le mot de passe":"Actualizar contraseña",
      "Espace personnel habilité":"Espacio de personal autorizado", "Gérez les documents demandés et contrôlez les dépôts reçus.":"Gestione los documentos solicitados y revise los archivos recibidos.", "Demander un document":"Solicitar un documento", "Élèves inscrits":"Estudiantes registrados", "Dossiers incomplets":"Expedientes incompletos", "Pièces à vérifier":"Documentos por revisar", "Dossiers en retard":"Expedientes atrasados",
      "Priorités du jour":"Prioridades de hoy", "Actions à traiter":"Acciones pendientes", "Accédez directement aux dossiers qui nécessitent votre attention.":"Acceda directamente a los expedientes que requieren su atención.", "Paramétrage du dossier":"Configuración del expediente", "Demandes de documents":"Solicitudes de documentos", "Modifiez les consignes et échéances ou désactivez une demande terminée.":"Modifique las instrucciones y fechas o desactive una solicitud finalizada.",
      "Nouvelle demande":"Nueva solicitud", "Toutes les formations":"Todas las formaciones", "Tous les dossiers":"Todos los expedientes", "Incomplets":"Incompletos", "Complets":"Completos", "À vérifier":"Por revisar", "En cours":"En curso", "Non commencés":"No iniciados", "En retard":"Atrasados", "Relancer la sélection":"Recordar a la selección", "Exporter en CSV":"Exportar CSV",
      "Mise à jour automatique":"Actualización automática", "Avancement des élèves":"Progreso de los estudiantes", "Sélectionnez les élèves à relancer.":"Seleccione los estudiantes a los que recordar.", "Élève":"Estudiante", "Dossier":"Expediente", "Dépôts reçus":"Archivos recibidos", "Pièces à contrôler":"Documentos por revisar", "Apprenant":"Estudiante", "Déposé le":"Subido el", "Actions":"Acciones", "Voir":"Ver", "Valider":"Validar", "Refuser":"Rechazar", "Ouvrir":"Abrir",
      "Aucun élève inscrit":"Ningún estudiante registrado", "Les comptes apprenants apparaîtront ici dès leur inscription.":"Las cuentas de estudiantes aparecerán aquí cuando se registren.", "Aucun dépôt à afficher":"No hay archivos que mostrar", "Les pièces transmises par les apprenants apparaîtront ici.":"Los documentos enviados por los estudiantes aparecerán aquí.",
      "Dépôt sécurisé":"Envío seguro", "Transmettre un document":"Enviar un documento", "Sélectionner un fichier":"Seleccionar un archivo", "Je confirme que ce document est lisible et correspond à la pièce demandée.":"Confirmo que este documento es legible y corresponde al documento solicitado.", "Annuler":"Cancelar", "Transmettre":"Enviar",
      "Fiche apprenant":"Expediente del estudiante", "du dossier transmis":"del expediente enviado", "Ouvrir la conversation":"Abrir conversación", "Envoyer un rappel":"Enviar recordatorio", "Documents demandés":"Documentos solicitados", "Historique du dossier":"Historial del expediente",
      "Nom du document":"Nombre del documento", "Catégorie":"Categoría", "Description":"Descripción", "Date limite":"Fecha límite", "Formation concernée":"Formación correspondiente", "Créer la demande":"Crear solicitud", "Complet":"Completo", "Non commencé":"No iniciado", "Aucune demande":"Sin solicitudes", "Validé":"Validado", "Déposer":"Subir", "Corriger":"Corregir", "Télécharger":"Descargar", "Modifier":"Editar", "Dupliquer":"Duplicar", "Désactiver":"Desactivar", "Réactiver":"Reactivar", "Active":"Activa", "Désactivée":"Desactivada", "Sans échéance":"Sin fecha límite", "Sans catégorie":"Sin categoría", "Aucun fichier transmis":"Ningún archivo enviado", "Document envoyé":"Documento enviado", "Document validé":"Documento validado", "Correction demandée":"Corrección solicitada",
      "Message envoyé.":"Mensaje enviado.", "Annonce marquée comme lue.":"Anuncio marcado como leído.", "Annonce publiée. Les élèves la voient immédiatement.":"Anuncio publicado. Los estudiantes pueden verlo inmediatamente."
    }
  };

  function locale() { return language === "en" ? "en-GB" : language === "es" ? "es-ES" : "fr-FR"; }
  function translateText(text) {
    if (language === "fr" || !text) return text;
    var dictionary = translations[language] || {};
    if (dictionary[text]) return dictionary[text];
    var match = text.match(/^(\d+) sur (\d+) élèves ont lu$/);
    if (match) return language === "en" ? match[1] + " of " + match[2] + " students have read it" : match[1] + " de " + match[2] + " estudiantes lo han leído";
    match = text.match(/^(\d+) sur (\d+) transmis · (\d+) %$/);
    if (match) return language === "en" ? match[1] + " of " + match[2] + " submitted · " + match[3] + "%" : match[1] + " de " + match[2] + " enviados · " + match[3] + "%";
    match = text.match(/^(\d+) sur (\d+)$/);
    if (match) return language === "en" ? match[1] + " of " + match[2] : match[1] + " de " + match[2];
    match = text.match(/^(\d+) non lus?$/);
    if (match) return language === "en" ? match[1] + " unread" : match[1] + " sin leer";
    match = text.match(/^(\d+) élève(?:s)? sélectionné(?:s)? pour une relance\.$/);
    if (match) return language === "en" ? match[1] + " student(s) selected for a reminder." : match[1] + " estudiante(s) seleccionado(s) para un recordatorio.";
    match = text.match(/^Relancer la sélection \((\d+)\)$/);
    if (match) return (language === "en" ? "Remind selected" : "Recordar a la selección") + " (" + match[1] + ")";
    match = text.match(/^Avant le (.+)$/);
    if (match) return language === "en" ? "Before " + match[1] : "Antes del " + match[1];
    return text;
  }

  function translateElement(root) {
    if (language === "fr") return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      if (!node.parentElement || node.parentElement.closest("script,style,[data-no-translate]")) return;
      var raw = node.nodeValue;
      var trimmed = raw.trim();
      if (!trimmed) return;
      var translated = translateText(trimmed);
      if (translated !== trimmed) node.nodeValue = raw.replace(trimmed, translated);
    });
    var dictionary = translations[language] || {};
    root.querySelectorAll("[placeholder],[aria-label],[title]").forEach(function (element) {
      ["placeholder", "aria-label", "title"].forEach(function (attribute) {
        var value = element.getAttribute(attribute);
        if (value && dictionary[value]) element.setAttribute(attribute, dictionary[value]);
      });
    });
  }

  function applyTheme(value) {
    var resolved = value === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : value;
    document.documentElement.dataset.theme = resolved;
  }

  var themeSelect = document.getElementById("theme-select");
  var languageSelect = document.getElementById("language-select");
  var theme = localStorage.getItem("cazotte-theme") || "light";
  if (!["light", "dark", "system"].includes(theme)) theme = "light";
  themeSelect.value = theme;
  languageSelect.value = language;
  themeSelect.addEventListener("change", function () { localStorage.setItem("cazotte-theme", this.value); applyTheme(this.value); });
  languageSelect.addEventListener("change", function () { localStorage.setItem("cazotte-language", this.value); location.reload(); });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { if ((localStorage.getItem("cazotte-theme") || "light") === "system") applyTheme("system"); });

  translateElement(document.body);
  document.title = language === "en" ? "My documents · La Cazotte" : language === "es" ? "Mis documentos · La Cazotte" : "Mes documents · La Cazotte";
  if (language !== "fr") {
    new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === "characterData") translateElement(mutation.target.parentElement || document.body);
        mutation.addedNodes.forEach(function (node) { if (node.nodeType === 1) translateElement(node); else if (node.parentElement) translateElement(node.parentElement); });
      });
    }).observe(document.body, {subtree:true, childList:true, characterData:true});
  }
  document.documentElement.lang = language;
  window.CAZOTTE_I18N = {locale:locale, language:function () { return language; }, translate:translateText, apply:translateElement};
}());

