(function () {
  "use strict";

  var config = window.CAZOTTE_CONFIG || {};
  var configured = config.supabaseUrl && config.supabaseKey &&
    !config.supabaseUrl.includes("VOTRE_") && !config.supabaseKey.includes("VOTRE_");
  var client = null;
  var session = null;
  var profile = null;
  var documentTypes = [];
  var submissions = [];
  var adminSubmissions = [];
  var adminStudents = [];
  var adminDocumentTypes = [];
  var allMessages = [];
  var announcements = [];
  var announcementReads = [];
  var allAnnouncementReads = [];
  var submissionHistory = [];
  var conversationThreads = [];
  var notifications = [];
  var selectedAdminStudent = null;
  var selectedStudentIds = new Set();
  var currentPreviewUrl = null;
  var liveChannel = null;
  var currentFilter = "all";
  var toastTimer;
  var lastFocusedElement = null;

  var $ = function (selector, root) { return (root || document).querySelector(selector); };
  var $$ = function (selector, root) { return Array.from((root || document).querySelectorAll(selector)); };

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char];
    });
  }
  function initials(name) {
    return (name || "?").trim().split(/\s+/).slice(0, 2).map(function (part) { return part[0]; }).join("").toUpperCase();
  }
  function firstName(name) { return (name || "").trim().split(/\s+/)[0] || ""; }
  function formatDate(value) {
    if (!value) return "Aucune échéance";
    return new Intl.DateTimeFormat(window.CAZOTTE_I18N ? window.CAZOTTE_I18N.locale() : "fr-FR", {day:"numeric", month:"long", year:"numeric"}).format(new Date(value));
  }
  function formatDateTime(value) {
    if (!value) return "—";
    return new Intl.DateTimeFormat(window.CAZOTTE_I18N ? window.CAZOTTE_I18N.locale() : "fr-FR", {day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit"}).format(new Date(value));
  }
  function formatBytes(value) {
    if (!value) return "0 Ko";
    if (value < 1024 * 1024) return Math.ceil(value / 1024) + " Ko";
    return (value / (1024 * 1024)).toFixed(1).replace(".", ",") + " Mo";
  }
  function showToast(message, error) {
    var toast = $("#toast");
    toast.textContent = message;
    toast.style.background = error ? "#8f3b24" : "";
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 4000);
  }
  function setBusy(form, busy) {
    var button = $("button[type=submit]", form);
    if (button) button.disabled = busy;
    form.setAttribute("aria-busy", busy ? "true" : "false");
  }
  function friendlyError(error) {
    var text = error && error.message ? error.message : "Une erreur est survenue.";
    var map = {
      "Invalid login credentials":"Adresse e-mail ou mot de passe incorrect.",
      "User already registered":"Un compte existe déjà avec cette adresse.",
      "Email not confirmed":"Veuillez confirmer votre adresse e-mail avant de vous connecter."
    };
    return map[text] || text;
  }

  async function start() {
    if (!configured || !window.supabase) {
      $("#setup-screen").hidden = false;
      return;
    }
    client = window.supabase.createClient(config.supabaseUrl, config.supabaseKey, {
      auth: {persistSession:true, autoRefreshToken:true, detectSessionInUrl:true}
    });
    var result = await client.auth.getSession();
    session = result.data.session;
    if (session) await enterApp();
    else showAuth();
    client.auth.onAuthStateChange(function (event, nextSession) {
      session = nextSession;
      if (event === "SIGNED_OUT") showAuth();
      if (event === "PASSWORD_RECOVERY") setTimeout(async function () {
        if (session) {
          await enterApp();
          navigate("profile");
          showToast("Choisissez maintenant votre nouveau mot de passe.");
        }
      }, 0);
    });
  }

  function showAuth() {
    if (client && liveChannel) {
      client.removeChannel(liveChannel);
      liveChannel = null;
    }
    $("#setup-screen").hidden = true;
    $("#app").hidden = true;
    $("#auth-screen").hidden = false;
  }
  function switchAuth(tab) {
    $("#login-form").hidden = tab !== "login";
    $("#signup-form").hidden = tab !== "signup";
    $("#reset-form").hidden = tab !== "reset";
    $$(".auth-tabs button").forEach(function (button) {
      button.classList.toggle("active", button.dataset.authTab === tab);
      button.setAttribute("aria-selected", button.dataset.authTab === tab ? "true" : "false");
    });
    $(".auth-tabs").hidden = tab === "reset";
    $("#auth-title").textContent = tab === "signup" ? "Créer un compte" : tab === "reset" ? "Réinitialiser le mot de passe" : "Se connecter";
    $("#auth-subtitle").textContent = tab === "signup" ? "Créez votre espace personnel sécurisé." : tab === "reset" ? "Nous vous enverrons un lien sécurisé." : "Accédez à votre dossier administratif.";
    $("#auth-message").textContent = "";
  }
  function authMessage(text, success) {
    var box = $("#auth-message");
    box.textContent = text;
    box.classList.toggle("success", !!success);
  }

  async function enterApp() {
    var result = await client.from("profiles").select("*").eq("id", session.user.id).single();
    if (result.error) {
      authMessage("Votre profil n'a pas pu être chargé. Vérifiez que le fichier SQL a bien été exécuté.", false);
      await client.auth.signOut();
      return;
    }
    profile = result.data;
    $("#auth-screen").hidden = true;
    $("#app").hidden = false;
    fillIdentity();
    await Promise.all([loadDocuments(), loadMessages(), loadAnnouncements(), loadNotifications()]);
    if (profile.role === "admin") await loadAdmin();
    setupRealtime();
    var requestedView = location.hash.slice(1);
    if (profile.role === "admin" && (!requestedView || requestedView === "dashboard" || requestedView === "documents")) requestedView = "admin";
    navigate(requestedView || "dashboard");
  }

  function fillIdentity() {
    var name = profile.full_name || session.user.email;
    $("#side-name").textContent = name;
    $("#top-name").textContent = name;
    $("#welcome-name").textContent = firstName(name);
    $("#side-role").textContent = profile.role === "admin" ? "Personnel habilité" : (profile.formation || "Apprenant");
    $("#side-initials").textContent = initials(name);
    $("#top-initials").textContent = initials(name);
    $("#today").textContent = new Intl.DateTimeFormat(window.CAZOTTE_I18N ? window.CAZOTTE_I18N.locale() : "fr-FR", {weekday:"long", day:"numeric", month:"long", year:"numeric"}).format(new Date());
    $$(".admin-only").forEach(function (element) { element.hidden = profile.role !== "admin"; });
    $$(".student-only").forEach(function (element) { element.hidden = profile.role === "admin"; });
    var form = $("#profile-form");
    form.elements.full_name.value = profile.full_name || "";
    form.elements.student_number.value = profile.student_number || "";
    if (profile.formation) form.elements.formation.value = profile.formation;
    $("#profile-email").value = session.user.email || "";
  }

  function navigate(view) {
    if (view === "admin" && (!profile || profile.role !== "admin")) view = "dashboard";
    if (profile && profile.role === "admin" && (view === "dashboard" || view === "documents")) view = "admin";
    var labels = {dashboard:"Tableau de bord", documents:"Mes documents", messages:"Support", announcements:"Annonces", profile:"Mon profil", admin:"Secrétariat"};
    if (!labels[view]) view = "dashboard";
    $$(".view").forEach(function (section) { section.classList.remove("active"); });
    $("#view-" + view).classList.add("active");
    $$(".nav-item").forEach(function (button) {
      var active = button.dataset.view === view;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    $("#page-label").textContent = labels[view];
    $("#sidebar").classList.remove("open");
    $("#sidebar-backdrop").classList.remove("show");
    location.hash = view;
    if (view === "messages") setTimeout(function () { renderConversation(); }, 0);
    window.scrollTo({top:0, behavior:"smooth"});
  }

  async function loadDocuments() {
    var typeResult = await client.from("document_types").select("*").eq("active", true).order("created_at");
    if (typeResult.error) return showToast(friendlyError(typeResult.error), true);
    documentTypes = (typeResult.data || []).filter(function (type) {
      return !type.formation || type.formation === profile.formation || profile.role === "admin";
    });
    var submissionResult = await client.from("submissions").select("*").eq("user_id", session.user.id);
    if (submissionResult.error) return showToast(friendlyError(submissionResult.error), true);
    submissions = submissionResult.data || [];
    if (profile.role !== "admin") {
      var historyResult = await client.from("submission_history").select("*").eq("user_id", session.user.id).order("created_at", {ascending:false});
      if (!historyResult.error) submissionHistory = historyResult.data || [];
    }
    renderDocuments();
    renderDashboard();
  }

  function mergedDocuments() {
    if (profile && profile.role === "admin") return [];
    return documentTypes.map(function (type) {
      var submission = submissions.find(function (item) { return item.document_type_id === type.id; });
      return {type:type, submission:submission || null, status:submission ? submission.status : "missing"};
    });
  }
  function statusText(status) {
    return {missing:"À déposer", submitted:"En vérification", approved:"Validé", rejected:"À corriger"}[status] || status;
  }
  function documentRow(item, dashboard) {
    var type = item.type;
    var submission = item.submission;
    var action = item.status === "missing" ? "Déposer" : item.status === "rejected" ? "Corriger" : "Télécharger";
    var canDelete = submission && (item.status === "submitted" || item.status === "rejected");
    var deleteButton = canDelete ? '<button class="action delete" data-delete-submission="' + submission.id + '">Supprimer</button>' : "";
    var detail = submission ? escapeHtml(submission.original_name) + " · " + formatBytes(submission.size_bytes) + " · déposé le " + formatDateTime(submission.submitted_at) : escapeHtml(type.category || "Document administratif");
    var rejected = item.status === "rejected" && submission.rejection_reason ?
      '<small class="reject-reason">Motif : ' + escapeHtml(submission.rejection_reason) + "</small>" : "";
    var historyLabels = {submitted:"Déposé", replaced:"Remplacé", approved:"Validé", rejected:"Correction demandée", deleted:"Supprimé"};
    var historyItems = submissionHistory.filter(function (entry) { return entry.document_type_id === type.id; }).slice(0, 6);
    var historyBlock = !dashboard && historyItems.length ? '<details class="doc-history"><summary>Voir l’historique (' + historyItems.length + ')</summary><div>' + historyItems.map(function (entry) { return '<p><strong>' + escapeHtml(historyLabels[entry.action] || entry.action) + '</strong><span>' + formatDateTime(entry.created_at) + (entry.note ? " · " + escapeHtml(entry.note) : "") + '</span></p>'; }).join("") + '</div></details>' : "";
    return '<article class="doc-row ' + (dashboard ? "dashboard-row" : "") + '">' +
      '<div class="doc-main"><span class="file-icon">' + (item.status === "approved" ? "✓" : "DOC") + '</span><div><strong>' + escapeHtml(type.title) + '</strong><small>' + detail + '</small>' + rejected + '</div></div>' +
      '<span class="deadline">' + (type.deadline ? "Avant le " + formatDate(type.deadline) : "Sans échéance") + '</span>' +
      (dashboard ? "" : '<span class="status ' + item.status + '">' + statusText(item.status) + '</span>') +
      '<div class="doc-actions"><button class="action" data-doc-id="' + type.id + '" data-doc-status="' + item.status + '">' + action + "</button>" + deleteButton + "</div>" + historyBlock + "</article>";
  }
  function renderDocuments() {
    var search = ($("#document-search").value || "").toLowerCase();
    var items = mergedDocuments().filter(function (item) {
      return (currentFilter === "all" || item.status === currentFilter) && item.type.title.toLowerCase().includes(search);
    });
    $("#documents-list").innerHTML = items.map(function (item) { return documentRow(item, false); }).join("");
    $("#documents-empty").hidden = items.length > 0;
    bindDocumentButtons();
    var pending = mergedDocuments().filter(function (item) { return item.status === "missing" || item.status === "rejected"; }).length;
    $("#pending-badge").hidden = pending === 0;
    $("#pending-badge").textContent = pending;
  }
  function renderDashboard() {
    var items = mergedDocuments();
    var valid = items.filter(function (i) { return i.status === "approved"; }).length;
    var pending = items.filter(function (i) { return i.status === "missing" || i.status === "rejected"; }).length;
    var review = items.filter(function (i) { return i.status === "submitted"; }).length;
    $("#stat-valid").textContent = valid;
    $("#stat-pending").textContent = pending;
    $("#stat-review").textContent = review;
    var progress = items.length ? Math.round(((valid + review) / items.length) * 100) : 100;
    $("#completion-percent").textContent = progress + " %";
    $("#completion-bar").style.width = progress + "%";
    var profileComplete = !!(profile.full_name && profile.student_number && profile.formation);
    $("#step-profile").classList.toggle("done", profileComplete);
    $("#step-documents").classList.toggle("done", items.length > 0 && pending === 0);
    $("#step-review").classList.toggle("done", items.length > 0 && review === 0 && pending === 0);
    $("#step-complete").classList.toggle("done", items.length > 0 && valid === items.length);
    var activeStep = !profileComplete ? "#step-profile" : pending ? "#step-documents" : review ? "#step-review" : "#step-complete";
    $$(".journey li").forEach(function (step) { step.classList.toggle("active", step.matches(activeStep)); });
    $("#dashboard-message").textContent = items.length === 0 ? "Aucun document ne vous est demandé pour le moment." :
      pending ? "Votre dossier comporte " + pending + " pièce" + (pending > 1 ? "s" : "") + " à transmettre ou corriger." :
      review ? "Toutes vos pièces ont été transmises. Certaines sont en cours de vérification." : "Votre dossier administratif est complet.";
    var urgent = items.filter(function (i) { return i.status === "missing" || i.status === "rejected"; }).slice(0, 4);
    $("#dashboard-documents").innerHTML = urgent.length ? urgent.map(function (i) { return documentRow(i, true); }).join("") :
      '<div class="empty"><span>✓</span><h3>Rien à déposer</h3><p>Les nouvelles demandes du secrétariat apparaîtront ici.</p></div>';
    bindDocumentButtons();
  }
  function bindDocumentButtons() {
    $$("[data-doc-id]").forEach(function (button) {
      button.onclick = function () {
        var item = mergedDocuments().find(function (entry) { return entry.type.id === button.dataset.docId; });
        if (!item) return;
        if (item.status === "missing" || item.status === "rejected") openUpload(item);
        else downloadSubmission(item.submission);
      };
    });
    $$('[data-delete-submission]').forEach(function (button) {
      button.onclick = function () {
        var submission = submissions.find(function (item) { return item.id === button.dataset.deleteSubmission; });
        if (submission) deleteSubmission(submission, button);
      };
    });
  }
  function openUpload(item) {
    $("#upload-type-id").value = item.type.id;
    $("#upload-title").textContent = item.type.title;
    $("#upload-description").textContent = item.type.description || "Sélectionnez un fichier lisible correspondant à la pièce demandée.";
    openModal("#upload-modal", "#upload-file");
  }
  function openModal(selector, focusSelector) {
    lastFocusedElement = document.activeElement;
    var wrap = $(selector);
    wrap.hidden = false;
    document.body.style.overflow = "hidden";
    window.setTimeout(function () {
      var target = focusSelector ? $(focusSelector, wrap) : $("input:not([type=hidden]), select, textarea, button", wrap);
      if (target) target.focus();
    }, 0);
  }
  function closeModals() {
    $$(".modal-wrap").forEach(function (modal) { modal.hidden = true; });
    document.body.style.overflow = "";
    $("#upload-form").reset();
    $("#upload-file-name").textContent = "Sélectionner un fichier";
    $("#upload-progress").hidden = true;
    $("#upload-preview").hidden = true;
    $("#upload-preview-image").hidden = true;
    if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
    currentPreviewUrl = null;
    var requestForm = $("#request-form");
    requestForm.reset();
    delete requestForm.dataset.requestId;
    delete requestForm.dataset.mode;
    if (lastFocusedElement && document.contains(lastFocusedElement)) lastFocusedElement.focus();
    lastFocusedElement = null;
  }
  function previewUploadFile(file) {
    var preview = $("#upload-preview");
    var image = $("#upload-preview-image");
    if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
    currentPreviewUrl = null;
    if (!file) { preview.hidden = true; image.hidden = true; return; }
    $("#upload-preview-name").textContent = file.name;
    $("#upload-preview-meta").textContent = (file.type === "application/pdf" ? "Document PDF" : "Image") + " · " + formatBytes(file.size);
    preview.hidden = false;
    image.hidden = true;
    if (file.type.indexOf("image/") === 0) {
      currentPreviewUrl = URL.createObjectURL(file);
      image.src = currentPreviewUrl;
      image.hidden = false;
    }
  }
  async function uploadDocument(event) {
    event.preventDefault();
    var form = event.currentTarget;
    var file = $("#upload-file").files[0];
    var typeId = $("#upload-type-id").value;
    if (!file || !typeId) return;
    var allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) return showToast("Format refusé. Utilisez un PDF, JPG ou PNG.", true);
    if (file.size > 10 * 1024 * 1024) return showToast("Le fichier dépasse la limite de 10 Mo.", true);
    setBusy(form, true);
    $("#upload-progress").hidden = false;
    var safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-");
    var path = session.user.id + "/" + typeId + "/" + Date.now() + "-" + safeName;
    var upload = await client.storage.from("administrative-documents").upload(path, file, {contentType:file.type, upsert:false});
    if (upload.error) {
      setBusy(form, false); $("#upload-progress").hidden = true;
      return showToast(friendlyError(upload.error), true);
    }
    var existing = submissions.find(function (item) { return item.document_type_id === typeId; });
    var payload = {user_id:session.user.id, document_type_id:typeId, storage_path:path, original_name:file.name, mime_type:file.type, size_bytes:file.size, status:"submitted", rejection_reason:null, submitted_at:new Date().toISOString(), reviewed_at:null, reviewed_by:null};
    var save = existing ? await client.from("submissions").update(payload).eq("id", existing.id).select("*").single() : await client.from("submissions").insert(payload).select("*").single();
    if (save.error) {
      await client.storage.from("administrative-documents").remove([path]);
      setBusy(form, false); $("#upload-progress").hidden = true;
      return showToast(friendlyError(save.error), true);
    }
    var savedSubmission = save.data;
    await client.from("submission_history").insert({submission_id:savedSubmission.id, user_id:session.user.id, document_type_id:typeId, original_name:file.name, action:existing ? "replaced" : "submitted", note:existing ? "Document remplacé par l'élève" : "Premier dépôt", actor_id:session.user.id});
    if (existing && existing.storage_path) await client.storage.from("administrative-documents").remove([existing.storage_path]);
    setBusy(form, false); closeModals();
    showToast("Votre document a bien été transmis.");
    await loadDocuments();
  }
  async function downloadSubmission(submission) {
    if (!submission) return;
    var signed = await client.storage.from("administrative-documents").createSignedUrl(submission.storage_path, 60, {download:submission.original_name});
    if (signed.error) return showToast(friendlyError(signed.error), true);
    window.open(signed.data.signedUrl, "_blank", "noopener");
  }

  async function deleteSubmission(submission, button) {
    if (!submission || !confirm("Supprimer ce document ? Vous devrez le déposer de nouveau.")) return;
    button.disabled = true;
    var deleted = await client.from("submissions").delete().eq("id", submission.id).eq("user_id", session.user.id).select("id").maybeSingle();
    if (deleted.error || !deleted.data) {
      button.disabled = false;
      return showToast(deleted.error ? friendlyError(deleted.error) : "Ce document ne peut plus être supprimé.", true);
    }
    await client.from("submission_history").insert({submission_id:null, user_id:submission.user_id, document_type_id:submission.document_type_id, original_name:submission.original_name, action:"deleted", note:"Dépôt retiré par l'élève", actor_id:session.user.id});
    var removed = await client.storage.from("administrative-documents").remove([submission.storage_path]);
    if (removed.error) showToast("Le dépôt a été retiré, mais le nettoyage du fichier devra être vérifié par le secrétariat.", true);
    else showToast("Document supprimé. Vous pouvez maintenant déposer le bon fichier.");
    await loadDocuments();
  }

  async function loadMessages() {
    var previousRecipient = $("#message-recipient").value;
    var staffQuery = client.from("profiles").select("id,full_name,formation,role,is_support").order("full_name");
    staffQuery = profile.role === "admin" ? staffQuery.eq("role", "student") : staffQuery.eq("role", "admin").eq("is_support", true);
    var staff = await staffQuery;
    if (staff.error) return showToast(friendlyError(staff.error), true);
    var select = $("#message-recipient");
    var recipients = (staff.data || []).filter(function (p) { return p.id !== session.user.id; });
    var dataResults = await Promise.all([
      client.from("messages").select("*,sender:profiles!messages_sender_id_fkey(full_name),recipient:profiles!messages_recipient_id_fkey(full_name)").order("created_at"),
      client.from("conversation_threads").select("*")
    ]);
    if (dataResults[0].error) return showToast(friendlyError(dataResults[0].error), true);
    allMessages = dataResults[0].data || [];
    conversationThreads = dataResults[1].error ? [] : (dataResults[1].data || []);
    var unreadTotal = allMessages.filter(function (message) { return message.recipient_id === session.user.id && !message.read_at; }).length;
    $("#message-badge").hidden = unreadTotal === 0;
    $("#message-badge").textContent = unreadTotal;
    select.innerHTML = '<option value="">' + (profile.role === "admin" ? "Choisir un élève" : "Support administratif") + '</option>' + recipients.map(function (p) {
      var unread = allMessages.filter(function (message) { return message.sender_id === p.id && message.recipient_id === session.user.id && !message.read_at; }).length;
      return '<option value="' + p.id + '">' + escapeHtml(p.full_name) + (p.role === "admin" ? " · Support" : " · " + escapeHtml(p.formation || "Apprenant")) + (unread ? " · " + unread + " non lu" + (unread > 1 ? "s" : "") : "") + "</option>";
    }).join("");
    if (recipients.some(function (p) { return p.id === previousRecipient; })) select.value = previousRecipient;
    else if (profile.role !== "admin" && recipients.length) select.value = recipients[0].id;
    var noRecipient = recipients.length === 0;
    var hint = $("#message-recipient-hint");
    hint.hidden = !noRecipient;
    hint.textContent = profile.role === "admin" ? "Aucun apprenant n'est encore inscrit. La liste se remplira dès qu'un élève créera son compte." : "Le compte support n'est pas encore activé. Réexécutez le script SQL mis à jour.";
    select.disabled = noRecipient;
    $("#message-content").disabled = noRecipient;
    $("button[type=submit]", $("#message-form")).disabled = noRecipient;
    await renderConversation();
  }
  async function renderConversation() {
    var selected = $("#message-recipient").value;
    var messages = selected ? allMessages.filter(function (message) {
      return (message.sender_id === session.user.id && message.recipient_id === selected) ||
        (message.sender_id === selected && message.recipient_id === session.user.id);
    }) : [];
    var studentId = profile.role === "admin" ? selected : session.user.id;
    var thread = conversationThreads.find(function (item) { return item.student_id === studentId; });
    var closed = !!(thread && thread.status === "closed");
    $("#thread-status").textContent = closed ? "Conversation clôturée" : "Conversation ouverte";
    $("#thread-status").classList.toggle("closed", closed);
    $("#toggle-thread-button").hidden = profile.role !== "admin" || !selected;
    $("#toggle-thread-button").textContent = closed ? "Réouvrir" : "Clôturer";
    $("#message-content").disabled = !selected || closed;
    $("button[type=submit]", $("#message-form")).disabled = !selected || closed;
    $("#message-content").placeholder = closed ? "Cette conversation a été clôturée par le secrétariat." : "Écrivez votre message…";
    var conversationIsActuallyOpen = $("#view-messages").classList.contains("active") && document.visibilityState === "visible";
    var unreadIds = conversationIsActuallyOpen ? messages.filter(function (message) { return message.recipient_id === session.user.id && !message.read_at; }).map(function (message) { return message.id; }) : [];
    if (unreadIds.length) {
      await client.from("messages").update({read_at:new Date().toISOString()}).in("id", unreadIds);
      allMessages.forEach(function (message) { if (unreadIds.includes(message.id)) message.read_at = new Date().toISOString(); });
      var remaining = allMessages.filter(function (message) { return message.recipient_id === session.user.id && !message.read_at; }).length;
      $("#message-badge").hidden = remaining === 0;
      $("#message-badge").textContent = remaining;
    }
    var history = $("#message-history");
    history.innerHTML = messages.length ? messages.map(function (message) {
      var mine = message.sender_id === session.user.id;
      var person = mine ? (message.recipient && message.recipient.full_name) : (message.sender && message.sender.full_name);
      var deleteButton = profile.role === "admin" ? '<button class="message-delete" data-delete-message="' + message.id + '" type="button">Supprimer</button>' : "";
      return '<article class="message ' + (mine ? "mine" : "") + '"><p>' + escapeHtml(message.content) + '</p><footer><small>' + (mine ? "À " : "De ") + escapeHtml(person || "Secrétariat") + " · " + formatDateTime(message.created_at) + (mine ? (message.read_at ? " · Lu" : " · Envoyé") : "") + "</small>" + deleteButton + "</footer></article>";
    }).join("") : '<div class="empty"><span>✉</span><h3>' + (selected ? "Aucun message" : "Choisissez une conversation") + '</h3><p>' + (selected ? "Écrivez le premier message ci-dessous." : "Sélectionnez un élève pour consulter ses échanges.") + '</p></div>';
    $$("[data-delete-message]", history).forEach(function (button) { button.onclick = function () { deleteMessage(button.dataset.deleteMessage); }; });
    history.scrollTop = history.scrollHeight;
  }
  async function sendMessage(event) {
    event.preventDefault();
    var form = event.currentTarget;
    if (form.getAttribute("aria-busy") === "true") return;
    var recipient = $("#message-recipient").value;
    var textarea = $("#message-content");
    var originalContent = textarea.value;
    var content = originalContent.trim();
    if (!recipient || !content) return;
    textarea.value = "";
    textarea.focus();
    setBusy(form, true);
    var result = await client.from("messages").insert({sender_id:session.user.id, recipient_id:recipient, content:content});
    setBusy(form, false);
    if (result.error) {
      if (!textarea.value) textarea.value = originalContent;
      textarea.focus();
      return showToast(friendlyError(result.error), true);
    }
    showToast("Message envoyé.");
    await loadMessages();
    textarea.focus();
  }
  async function deleteMessage(id) {
    if (profile.role !== "admin" || !window.confirm("Supprimer définitivement ce message ? Cette action est irréversible.")) return;
    var result = await client.from("messages").delete().eq("id", id).select("id").maybeSingle();
    if (result.error || !result.data) return showToast(result.error ? friendlyError(result.error) : "Ce message ne peut pas être supprimé.", true);
    showToast("Message supprimé.");
    await loadMessages();
  }
  async function toggleConversationThread() {
    if (profile.role !== "admin") return;
    var studentId = $("#message-recipient").value;
    if (!studentId) return;
    var thread = conversationThreads.find(function (item) { return item.student_id === studentId; });
    var closing = !thread || thread.status !== "closed";
    var payload = {student_id:studentId, status:closing ? "closed" : "open", closed_at:closing ? new Date().toISOString() : null, closed_by:closing ? session.user.id : null, updated_at:new Date().toISOString()};
    var result = await client.from("conversation_threads").upsert(payload, {onConflict:"student_id"});
    if (result.error) return showToast(friendlyError(result.error), true);
    showToast(closing ? "Conversation clôturée." : "Conversation rouverte.");
    await loadMessages();
  }

  async function loadAnnouncements() {
    var queries = [
      client.from("announcements").select("*").order("published_at", {ascending:false}),
      client.from("announcement_reads").select("announcement_id,read_at").eq("user_id", session.user.id)
    ];
    if (profile.role === "admin") queries.push(client.from("announcement_reads").select("announcement_id,user_id,read_at"));
    var results = await Promise.all(queries);
    if (results[0].error) return showToast(friendlyError(results[0].error), true);
    announcements = results[0].data || [];
    announcementReads = results[1].error ? [] : (results[1].data || []);
    allAnnouncementReads = profile.role === "admin" && results[2] && !results[2].error ? (results[2].data || []) : [];
    renderAnnouncements();
  }
  function announcementAudience(announcement) {
    return adminStudents.filter(function (student) { return !announcement.formation || student.formation === announcement.formation; });
  }
  function renderAnnouncements() {
    var list = $("#announcement-list");
    list.innerHTML = announcements.map(function (announcement) {
      var isRead = announcementReads.some(function (read) { return read.announcement_id === announcement.id; });
      var deleteButton = profile.role === "admin" ? '<button class="announcement-delete" data-delete-announcement="' + announcement.id + '">Supprimer</button>' : "";
      var readControl = isRead ? '<span class="announcement-read-state">✓ Lu</span>' : '<button class="announcement-read-button" type="button" data-read-announcement="' + announcement.id + '">Marquer comme lu</button>';
      var audience = profile.role === "admin" ? announcementAudience(announcement) : [];
      var audienceIds = audience.map(function (student) { return student.id; });
      var readCount = profile.role === "admin" ? allAnnouncementReads.filter(function (read) { return read.announcement_id === announcement.id && audienceIds.includes(read.user_id); }).length : 0;
      var readPercent = audience.length ? Math.round(readCount / audience.length * 100) : 0;
      var readStats = profile.role === "admin" ? '<div class="announcement-read-stats"><div><strong>' + readCount + ' sur ' + audience.length + ' élèves ont lu</strong><span>' + readPercent + ' %</span></div><span class="announcement-read-track"><i style="width:' + readPercent + '%"></i></span></div>' : "";
      return '<article class="announcement-card ' + (isRead ? "read" : "unread") + '"><header><div><p class="eyebrow orange">Annonce ' + (isRead ? "" : '<span class="announcement-unread-label">Non lue</span>') + '</p><h2>' + escapeHtml(announcement.title) + '</h2></div><time>' + formatDateTime(announcement.published_at) + '</time></header><p>' + escapeHtml(announcement.content) + '</p>' + readStats + '<footer><span class="announcement-target">' + escapeHtml(announcement.formation || "Tous les apprenants") + '</span><div>' + readControl + deleteButton + '</div></footer></article>';
    }).join("");
    var unreadCount = announcements.filter(function (announcement) { return !announcementReads.some(function (read) { return read.announcement_id === announcement.id; }); }).length;
    $("#announcements-empty").hidden = announcements.length > 0;
    $("#announcement-badge").hidden = unreadCount === 0;
    $("#announcement-badge").textContent = unreadCount;
    $$('[data-read-announcement]').forEach(function (button) {
      button.onclick = function () { markAnnouncementRead(button.dataset.readAnnouncement, button); };
    });
    $$('[data-delete-announcement]').forEach(function (button) {
      button.onclick = function () { deleteAnnouncement(button.dataset.deleteAnnouncement); };
    });
  }
  async function createAnnouncement(event) {
    event.preventDefault();
    var form = event.currentTarget;
    if (profile.role !== "admin") return;
    setBusy(form, true);
    var result = await client.from("announcements").insert({
      title:form.elements.title.value.trim(),
      content:form.elements.content.value.trim(),
      formation:form.elements.formation.value || null,
      created_by:session.user.id
    }).select("id").single();
    setBusy(form, false);
    if (result.error) return showToast(friendlyError(result.error), true);
    await client.from("announcement_reads").insert({announcement_id:result.data.id, user_id:session.user.id});
    form.reset();
    showToast("Annonce publiée. Les élèves la voient immédiatement.");
    await loadAnnouncements();
  }
  async function markAnnouncementRead(id, button) {
    if (announcementReads.some(function (read) { return read.announcement_id === id; })) return;
    button.disabled = true;
    var result = await client.from("announcement_reads").insert({announcement_id:id, user_id:session.user.id}).select("announcement_id,read_at").single();
    button.disabled = false;
    if (result.error) return showToast(friendlyError(result.error), true);
    announcementReads.push(result.data);
    renderAnnouncements();
    showToast("Annonce marquée comme lue.");
  }
  async function deleteAnnouncement(id) {
    if (profile.role !== "admin" || !window.confirm("Supprimer cette annonce ?")) return;
    var result = await client.from("announcements").delete().eq("id", id);
    if (result.error) return showToast(friendlyError(result.error), true);
    showToast("Annonce supprimée.");
    await loadAnnouncements();
  }

  async function loadNotifications() {
    var result = await client.from("notifications").select("*").eq("user_id", session.user.id).order("created_at", {ascending:false}).limit(8);
    if (result.error) return;
    notifications = result.data || [];
    renderNotifications();
  }
  function renderNotifications() {
    var box = $("#dashboard-notifications");
    if (!box || profile.role === "admin") return;
    var unread = notifications.filter(function (item) { return !item.read_at; });
    box.hidden = unread.length === 0;
    box.innerHTML = unread.map(function (item) {
      return '<article><span>!</span><div><strong>' + escapeHtml(item.title) + '</strong><p>' + escapeHtml(item.content) + '</p><small>' + formatDateTime(item.created_at) + '</small></div><button class="action" data-notification-id="' + item.id + '" data-notification-view="' + escapeHtml(item.link_view || "documents") + '">Consulter</button></article>';
    }).join("");
    $$("[data-notification-id]", box).forEach(function (button) {
      button.onclick = async function () {
        await client.from("notifications").update({read_at:new Date().toISOString()}).eq("id", button.dataset.notificationId);
        navigate(button.dataset.notificationView || "documents");
        await loadNotifications();
      };
    });
  }

  async function saveProfile(event) {
    event.preventDefault();
    var form = event.currentTarget;
    setBusy(form, true);
    var update = {full_name:form.elements.full_name.value.trim(), student_number:form.elements.student_number.value.trim(), formation:form.elements.formation.value, updated_at:new Date().toISOString()};
    var result = await client.from("profiles").update(update).eq("id", session.user.id);
    setBusy(form, false);
    if (result.error) return showToast(friendlyError(result.error), true);
    profile = Object.assign({}, profile, update);
    fillIdentity(); await loadDocuments();
    showToast("Profil mis à jour.");
  }

  async function changePassword(event) {
    event.preventDefault();
    var form = event.currentTarget;
    setBusy(form, true);
    var result = await client.auth.updateUser({password:form.elements.password.value});
    setBusy(form, false);
    if (result.error) return showToast(friendlyError(result.error), true);
    form.reset();
    showToast("Votre mot de passe a été modifié.");
  }

  async function loadAdmin() {
    var results = await Promise.all([
      client.from("profiles").select("id,full_name,student_number,formation,created_at").eq("role", "student").order("full_name"),
      client.from("submissions").select("*,profiles!submissions_user_id_fkey(full_name,student_number,formation),document_types(title)").order("submitted_at", {ascending:false}),
      client.from("submission_history").select("*,document_types(title),actor:profiles!submission_history_actor_id_fkey(full_name)").order("created_at", {ascending:false}),
      client.from("document_types").select("*").order("created_at", {ascending:false})
    ]);
    if (results[0].error) return showToast(friendlyError(results[0].error), true);
    if (results[1].error) return showToast(friendlyError(results[1].error), true);
    adminStudents = results[0].data || [];
    adminSubmissions = results[1].data || [];
    submissionHistory = results[2].error ? [] : (results[2].data || []);
    adminDocumentTypes = results[3].error ? documentTypes.slice() : (results[3].data || []);
    var formationSelect = $("#admin-formation-filter");
    var previousFormation = formationSelect.value;
    var formations = Array.from(new Set(adminStudents.map(function (student) { return student.formation; }).filter(Boolean))).sort();
    formationSelect.innerHTML = '<option value="">Toutes les formations</option>' + formations.map(function (formation) { return '<option>' + escapeHtml(formation) + '</option>'; }).join("");
    if (formations.includes(previousFormation)) formationSelect.value = previousFormation;
    selectedStudentIds = new Set(Array.from(selectedStudentIds).filter(function (id) { return adminStudents.some(function (student) { return student.id === id; }); }));
    renderAdmin();
    renderAnnouncements();
  }
  function studentSummary(student) {
    var required = documentTypes.filter(function (type) { return type.active && (!type.formation || type.formation === student.formation); });
    var studentItems = adminSubmissions.filter(function (item) { return item.user_id === student.id && required.some(function (type) { return type.id === item.document_type_id; }); });
    var submitted = studentItems.length;
    var approved = studentItems.filter(function (item) { return item.status === "approved"; }).length;
    var total = required.length;
    var percent = total ? Math.round((submitted / total) * 100) : 0;
    var stateKey = total === 0 ? "empty" : approved === total ? "complete" : submitted === total ? "review" : submitted === 0 ? "empty" : "progress";
    var overdue = required.some(function (type) {
      if (!type.deadline || new Date(type.deadline + "T23:59:59") >= new Date()) return false;
      var item = studentItems.find(function (submission) { return submission.document_type_id === type.id; });
      return !item || item.status === "rejected";
    });
    return {required:required, submissions:studentItems, submitted:submitted, approved:approved, total:total, percent:percent, stateKey:stateKey, overdue:overdue, state:stateKey === "complete" ? "Complet" : stateKey === "review" ? "À vérifier" : stateKey === "progress" ? "En cours" : total ? "Non commencé" : "Aucune demande", stateClass:stateKey === "complete" ? "approved" : stateKey === "review" ? "submitted" : "missing"};
  }
  function matchesAdminFilters(student) {
    var search = ($("#admin-search").value || "").toLowerCase();
    var formationFilter = $("#admin-formation-filter").value;
    var stateFilter = $("#admin-state-filter").value;
    var summary = studentSummary(student);
    var matchesSearch = student.full_name.toLowerCase().includes(search) || (student.student_number || "").toLowerCase().includes(search) || (student.formation || "").toLowerCase().includes(search);
    var matchesState = !stateFilter || (stateFilter === "overdue" ? summary.overdue : stateFilter === "incomplete" ? summary.total > 0 && summary.stateKey !== "complete" : summary.stateKey === stateFilter);
    return matchesSearch && (!formationFilter || student.formation === formationFilter) && matchesState;
  }
  function renderAdminPriorities(summaries) {
    var cards = [
      {key:"review", icon:"◷", count:adminSubmissions.filter(function (item) { return item.status === "submitted"; }).length, title:"Pièces à vérifier", detail:"Valider ou demander une correction"},
      {key:"incomplete", icon:"▤", count:summaries.filter(function (item) { return item.summary.total > 0 && item.summary.stateKey !== "complete"; }).length, title:"Dossiers incomplets", detail:"Sélectionner les élèves à relancer"},
      {key:"overdue", icon:"⌛", count:summaries.filter(function (item) { return item.summary.overdue; }).length, title:"Échéances dépassées", detail:"Afficher les dossiers en retard"},
      {key:"messages", icon:"✉", count:allMessages.filter(function (message) { return message.recipient_id === session.user.id && !message.read_at; }).length, title:"Messages non lus", detail:"Ouvrir le support administratif"}
    ];
    $("#admin-priority-grid").innerHTML = cards.map(function (card) {
      return '<button class="priority-card" type="button" data-admin-priority="' + card.key + '"><span aria-hidden="true">' + card.icon + '</span><div><strong>' + card.count + ' · ' + card.title + '</strong><small>' + card.detail + '</small></div><b aria-hidden="true">→</b></button>';
    }).join("");
    $$('[data-admin-priority]').forEach(function (button) { button.onclick = function () { openAdminPriority(button.dataset.adminPriority); }; });
  }
  function openAdminPriority(priority) {
    if (priority === "messages") return navigate("messages");
    $("#admin-state-filter").value = priority;
    renderAdmin();
    $(".admin-toolbar").scrollIntoView({behavior:"smooth", block:"start"});
  }
  function updateStudentSelectionUI(visibleStudents) {
    var selectedCount = selectedStudentIds.size;
    var selectedVisible = visibleStudents.filter(function (student) { return selectedStudentIds.has(student.id); }).length;
    var selectAll = $("#select-visible-students");
    selectAll.checked = visibleStudents.length > 0 && selectedVisible === visibleStudents.length;
    selectAll.indeterminate = selectedVisible > 0 && selectedVisible < visibleStudents.length;
    $("#student-selection-summary").textContent = selectedCount ? selectedCount + " élève" + (selectedCount > 1 ? "s sélectionnés" : " sélectionné") + " pour une relance." : "Sélectionnez les élèves à relancer.";
    var reminderButton = $("#bulk-reminder-button");
    reminderButton.disabled = selectedCount === 0;
    reminderButton.textContent = selectedCount ? "Relancer la sélection (" + selectedCount + ")" : "Relancer la sélection";
  }
  function renderAdmin() {
    var all = adminSubmissions;
    var summaries = adminStudents.map(function (student) { return {student:student, summary:studentSummary(student)}; });
    $("#admin-total-students").textContent = adminStudents.length;
    $("#admin-incomplete").textContent = summaries.filter(function (item) { return item.summary.total > 0 && item.summary.stateKey !== "complete"; }).length;
    $("#admin-review").textContent = all.filter(function (i) { return i.status === "submitted"; }).length;
    $("#admin-overdue").textContent = summaries.filter(function (item) { return item.summary.overdue; }).length;
    renderAdminPriorities(summaries);
    renderAdminRequests();
    var visibleStudents = adminStudents.filter(matchesAdminFilters);
    var visibleIds = visibleStudents.map(function (student) { return student.id; });
    var filtered = all.filter(function (item) { return visibleIds.includes(item.user_id); });
    $("#admin-students").innerHTML = visibleStudents.map(function (student) {
      var summary = studentSummary(student);
      return '<tr><td data-label="Sélection" class="select-column"><input type="checkbox" data-select-student="' + student.id + '" aria-label="Sélectionner ' + escapeHtml(student.full_name) + '" ' + (selectedStudentIds.has(student.id) ? "checked" : "") + '></td><td data-label="Élève"><strong>' + escapeHtml(student.full_name) + '</strong><small>' + escapeHtml(student.student_number || "Sans numéro") + '</small></td><td data-label="Formation">' + escapeHtml(student.formation || "Non renseignée") + '</td><td data-label="Dossier"><div class="progress-track"><i style="width:' + summary.percent + '%"></i></div><span class="progress-label">' + summary.submitted + ' sur ' + summary.total + ' transmis · ' + summary.percent + ' %</span></td><td data-label="Validés">' + summary.approved + ' sur ' + summary.total + '</td><td data-label="État"><span class="status ' + summary.stateClass + '">' + summary.state + (summary.overdue ? " · En retard" : "") + '</span></td><td data-label="Action"><button class="action" data-open-student="' + student.id + '" aria-label="Ouvrir le dossier de ' + escapeHtml(student.full_name) + '">Ouvrir</button></td></tr>';
    }).join("");
    $("#admin-students-empty").hidden = visibleStudents.length > 0;
    $("#admin-submissions").innerHTML = filtered.map(function (item) {
      var p = item.profiles || {};
      var t = item.document_types || {};
      var actions = '<button class="action" data-admin-download="' + item.id + '">Voir</button>';
      if (item.status === "submitted") actions += '<button class="action approve" data-admin-approve="' + item.id + '">Valider</button><button class="action reject" data-admin-reject="' + item.id + '">Refuser</button>';
      actions += '<button class="action delete" data-admin-delete="' + item.id + '">Supprimer</button>';
      return "<tr><td data-label=\"Apprenant\"><strong>" + escapeHtml(p.full_name || "Compte supprimé") + "</strong><small>" + escapeHtml(p.formation || "") + "</small></td><td data-label=\"Document\"><strong>" + escapeHtml(t.title || "Document") + "</strong><small>" + escapeHtml(item.original_name) + "</small></td><td data-label=\"Déposé le\">" + formatDateTime(item.submitted_at) + '</td><td data-label="Statut"><span class="status ' + item.status + '">' + statusText(item.status) + '</span></td><td data-label="Actions"><div class="table-actions">' + actions + "</div></td></tr>";
    }).join("");
    $("#admin-empty").hidden = filtered.length > 0;
    $$("[data-admin-download]").forEach(function (b) { b.onclick = function () { downloadSubmission(all.find(function (i) { return i.id === b.dataset.adminDownload; })); }; });
    $$("[data-admin-approve]").forEach(function (b) { b.onclick = function () { reviewSubmission(b.dataset.adminApprove, "approved"); }; });
    $$("[data-admin-reject]").forEach(function (b) { b.onclick = function () { reviewSubmission(b.dataset.adminReject, "rejected"); }; });
    $$("[data-admin-delete]").forEach(function (b) { b.onclick = function () { adminDeleteSubmission(b.dataset.adminDelete, b); }; });
    $$("[data-open-student]").forEach(function (b) { b.onclick = function () { openStudentSheet(b.dataset.openStudent); }; });
    $$("[data-select-student]").forEach(function (checkbox) { checkbox.onchange = function () { if (checkbox.checked) selectedStudentIds.add(checkbox.dataset.selectStudent); else selectedStudentIds.delete(checkbox.dataset.selectStudent); updateStudentSelectionUI(visibleStudents); }; });
    updateStudentSelectionUI(visibleStudents);
  }
  function renderAdminRequests() {
    var body = $("#admin-requests");
    body.innerHTML = adminDocumentTypes.map(function (type) {
      var statusClass = type.active ? "approved" : "inactive";
      var statusLabel = type.active ? "Active" : "Désactivée";
      var toggleLabel = type.active ? "Désactiver" : "Réactiver";
      var safeTitle = escapeHtml(type.title);
      return '<tr class="' + (type.active ? "" : "request-inactive") + '"><td data-label="Document"><strong>' + safeTitle + '</strong><small>' + escapeHtml(type.category || "Sans catégorie") + '</small></td><td data-label="Formation">' + escapeHtml(type.formation || "Toutes les formations") + '</td><td data-label="Échéance">' + formatDate(type.deadline) + '</td><td data-label="Statut"><span class="status ' + statusClass + '">' + statusLabel + '</span></td><td data-label="Actions"><div class="table-actions"><button class="action" type="button" data-edit-request="' + type.id + '" aria-label="Modifier la demande ' + safeTitle + '">Modifier</button><button class="action" type="button" data-duplicate-request="' + type.id + '" aria-label="Dupliquer la demande ' + safeTitle + '">Dupliquer</button><button class="action ' + (type.active ? "delete" : "approve") + '" type="button" data-toggle-request="' + type.id + '">' + toggleLabel + '</button><button class="action delete" type="button" data-delete-request="' + type.id + '" aria-label="Supprimer définitivement la demande ' + safeTitle + '">Supprimer</button></div></td></tr>';
    }).join("");
    $("#admin-requests-empty").hidden = adminDocumentTypes.length > 0;
    $$("[data-edit-request]", body).forEach(function (button) { button.onclick = function () { openRequestModal("edit", button.dataset.editRequest); }; });
    $$("[data-duplicate-request]", body).forEach(function (button) { button.onclick = function () { openRequestModal("duplicate", button.dataset.duplicateRequest); }; });
    $$("[data-toggle-request]", body).forEach(function (button) { button.onclick = function () { toggleRequest(button.dataset.toggleRequest, button); }; });
    $$("[data-delete-request]", body).forEach(function (button) { button.onclick = function () { deleteRequest(button.dataset.deleteRequest, button); }; });
  }
  function openStudentSheet(studentId) {
    var student = adminStudents.find(function (item) { return item.id === studentId; });
    if (!student) return;
    selectedAdminStudent = student;
    var summary = studentSummary(student);
    $("#student-modal-title").textContent = student.full_name;
    $("#student-modal-initials").textContent = initials(student.full_name);
    $("#student-modal-meta").textContent = (student.student_number || "Sans numéro") + " · " + (student.formation || "Formation non renseignée");
    $("#student-modal-percent").textContent = summary.percent + " %";
    $("#student-modal-bar").style.width = summary.percent + "%";
    $("#student-modal-documents").innerHTML = summary.required.length ? summary.required.map(function (type) {
      var submission = summary.submissions.find(function (item) { return item.document_type_id === type.id; });
      var status = submission ? submission.status : "missing";
      return '<article><div><strong>' + escapeHtml(type.title) + '</strong><small>' + (submission ? escapeHtml(submission.original_name) + " · " + formatBytes(submission.size_bytes) : "Aucun fichier transmis") + '</small></div><span class="status ' + status + '">' + statusText(status) + '</span>' + (submission ? '<button class="action" data-sheet-download="' + submission.id + '">Voir</button><button class="action delete" data-sheet-delete="' + submission.id + '">Supprimer</button>' : "") + '</article>';
    }).join("") : '<p class="muted-text">Aucun document demandé pour cette formation.</p>';
    var history = submissionHistory.filter(function (item) { return item.user_id === student.id; });
    var historyLabels = {submitted:"Document déposé", replaced:"Document remplacé", approved:"Document validé", rejected:"Correction demandée", deleted:"Document supprimé"};
    $("#student-modal-history").innerHTML = history.length ? history.map(function (item) {
      var title = item.document_types && item.document_types.title || item.original_name || "Document";
      return '<article><i></i><div><strong>' + escapeHtml(historyLabels[item.action] || item.action) + '</strong><p>' + escapeHtml(title) + (item.note ? " · " + escapeHtml(item.note) : "") + '</p><small>' + formatDateTime(item.created_at) + (item.actor && item.actor.full_name ? " · " + escapeHtml(item.actor.full_name) : "") + '</small></div></article>';
    }).join("") : '<p class="muted-text">Aucune action enregistrée pour le moment.</p>';
    $$("[data-sheet-download]").forEach(function (button) { button.onclick = function () { downloadSubmission(adminSubmissions.find(function (item) { return item.id === button.dataset.sheetDownload; })); }; });
    $$("[data-sheet-delete]").forEach(function (button) { button.onclick = function () { adminDeleteSubmission(button.dataset.sheetDelete, button); }; });
    openModal("#student-modal", "#student-message-button");
  }
  async function sendStudentReminder() {
    if (!selectedAdminStudent) return;
    var summary = studentSummary(selectedAdminStudent);
    var missing = summary.required.filter(function (type) { var item = summary.submissions.find(function (submission) { return submission.document_type_id === type.id; }); return !item || item.status === "rejected"; });
    var content = missing.length ? "Votre dossier comporte " + missing.length + " document" + (missing.length > 1 ? "s" : "") + " à déposer ou corriger." : "Une action du secrétariat vous attend dans votre dossier administratif.";
    var result = await client.from("notifications").insert({user_id:selectedAdminStudent.id, title:"Rappel du secrétariat", content:content, link_view:"documents", email_requested:true, email_status:"not_configured", created_by:session.user.id});
    if (result.error) return showToast(friendlyError(result.error), true);
    showToast("Rappel ajouté à l'espace de l'élève. L'e-mail sera disponible après configuration d'un prestataire.");
  }
  async function sendBulkReminders() {
    var targets = adminStudents.filter(function (student) { return selectedStudentIds.has(student.id) && studentSummary(student).stateKey !== "complete"; });
    var skipped = selectedStudentIds.size - targets.length;
    if (!targets.length) return showToast("La sélection ne contient aucun dossier incomplet.", true);
    if (!window.confirm("Envoyer un rappel à " + targets.length + " élève" + (targets.length > 1 ? "s" : "") + " ?" + (skipped ? " " + skipped + " dossier(s) complet(s) seront ignorés." : ""))) return;
    var rows = targets.map(function (student) { var summary = studentSummary(student); return {user_id:student.id, title:"Rappel du secrétariat", content:"Votre dossier administratif est incomplet : " + summary.submitted + " document(s) transmis sur " + summary.total + ".", link_view:"documents", email_requested:true, email_status:"not_configured", created_by:session.user.id}; });
    var result = await client.from("notifications").insert(rows);
    if (result.error) return showToast(friendlyError(result.error), true);
    selectedStudentIds.clear();
    renderAdmin();
    showToast(targets.length + " rappel" + (targets.length > 1 ? "s ajoutés" : " ajouté") + " aux espaces élèves.");
  }
  function exportStudentsCsv() {
    var rows = [["Nom", "Numéro apprenant", "Formation", "Documents transmis", "Documents validés", "Total demandé", "État"]];
    adminStudents.forEach(function (student) { var summary = studentSummary(student); rows.push([student.full_name, student.student_number || "", student.formation || "", summary.submitted, summary.approved, summary.total, summary.state]); });
    var csv = "\ufeff" + rows.map(function (row) { return row.map(function (cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(";"); }).join("\r\n");
    var url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"}));
    var link = document.createElement("a"); link.href = url; link.download = "avancement-eleves-la-cazotte.csv"; link.click(); URL.revokeObjectURL(url);
    showToast("Export CSV téléchargé.");
  }
  async function reviewSubmission(id, status) {
    var reason = null;
    if (status === "rejected") {
      reason = window.prompt("Indiquez précisément pourquoi ce document doit être corrigé :");
      if (!reason || !reason.trim()) return;
      reason = reason.trim();
    }
    var result = await client.from("submissions").update({status:status, rejection_reason:reason, reviewed_at:new Date().toISOString(), reviewed_by:session.user.id}).eq("id", id).select("*").single();
    if (result.error) return showToast(friendlyError(result.error), true);
    var item = result.data;
    await Promise.all([
      client.from("submission_history").insert({submission_id:item.id, user_id:item.user_id, document_type_id:item.document_type_id, original_name:item.original_name, action:status, note:reason, actor_id:session.user.id}),
      client.from("notifications").insert({user_id:item.user_id, title:status === "approved" ? "Document validé" : "Document à corriger", content:status === "approved" ? "Le secrétariat a validé votre document." : "Le secrétariat demande une correction : " + reason, link_view:"documents", email_requested:true, email_status:"not_configured", created_by:session.user.id})
    ]);
    showToast(status === "approved" ? "Document validé." : "Correction demandée.");
    await loadAdmin();
  }
  async function adminDeleteSubmission(id, button) {
    if (profile.role !== "admin") return;
    var item = adminSubmissions.find(function (submission) { return submission.id === id; });
    if (!item) return showToast("Ce dépôt n'est plus disponible.", true);
    var studentName = item.profiles && item.profiles.full_name || "cet élève";
    if (!window.confirm("Supprimer définitivement le fichier « " + item.original_name + " » déposé par " + studentName + " ? L'élève pourra déposer un nouveau document.")) return;
    button.disabled = true;
    var deleted = await client.from("submissions").delete().eq("id", id).select("id").maybeSingle();
    if (deleted.error || !deleted.data) {
      button.disabled = false;
      return showToast(deleted.error ? friendlyError(deleted.error) : "Ce dépôt ne peut pas être supprimé.", true);
    }
    await client.from("submission_history").insert({submission_id:null, user_id:item.user_id, document_type_id:item.document_type_id, original_name:item.original_name, action:"deleted", note:"Dépôt supprimé par l'administration", actor_id:session.user.id});
    var removed = item.storage_path ? await client.storage.from("administrative-documents").remove([item.storage_path]) : {error:null};
    if (!$("#student-modal").hidden) closeModals();
    await loadAdmin();
    showToast(removed.error ? "Le dépôt est supprimé, mais le nettoyage du fichier doit être vérifié." : "Le dépôt de l'élève a été supprimé.", !!removed.error);
  }
  function openRequestModal(mode, requestId) {
    var form = $("#request-form");
    var item = adminDocumentTypes.find(function (type) { return type.id === requestId; });
    form.reset();
    delete form.dataset.requestId;
    form.dataset.mode = mode || "create";
    if (item) {
      form.elements.title.value = item.title || "";
      form.elements.category.value = item.category || "";
      form.elements.description.value = item.description || "";
      form.elements.deadline.value = item.deadline || "";
      form.elements.formation.value = item.formation || "";
    }
    if (mode === "edit" && item) {
      form.dataset.requestId = item.id;
      $("#request-modal-eyebrow").textContent = "Modification";
      $("#request-modal-title").textContent = "Modifier la demande";
      $("#request-modal-help").textContent = "Les changements seront immédiatement visibles par les élèves concernés.";
      $("#request-submit-button").textContent = "Enregistrer les modifications";
    } else if (mode === "duplicate" && item) {
      $("#request-modal-eyebrow").textContent = "Duplication";
      $("#request-modal-title").textContent = "Dupliquer la demande";
      $("#request-modal-help").textContent = "Choisissez notamment la formation qui recevra cette nouvelle demande.";
      $("#request-submit-button").textContent = "Créer la copie";
    } else {
      $("#request-modal-eyebrow").textContent = "Nouvelle demande";
      $("#request-modal-title").textContent = "Demander un document";
      $("#request-modal-help").textContent = "Cette demande apparaîtra dans le dossier des élèves concernés.";
      $("#request-submit-button").textContent = "Créer la demande";
    }
    openModal("#request-modal", 'input[name="title"]');
  }
  async function saveRequest(event) {
    event.preventDefault();
    var form = event.currentTarget;
    setBusy(form, true);
    var payload = {title:form.elements.title.value.trim(), category:form.elements.category.value.trim(), description:form.elements.description.value.trim() || null, deadline:form.elements.deadline.value || null, formation:form.elements.formation.value || null};
    var requestId = form.dataset.requestId;
    if (!requestId) payload.created_by = session.user.id;
    var result = requestId ? await client.from("document_types").update(payload).eq("id", requestId).select("id").single() : await client.from("document_types").insert(payload).select("id").single();
    setBusy(form, false);
    if (result.error) return showToast(friendlyError(result.error), true);
    var message = requestId ? "La demande a été modifiée." : form.dataset.mode === "duplicate" ? "La demande a été dupliquée." : "La demande de document a été créée.";
    closeModals(); showToast(message);
    await loadDocuments(); await loadAdmin();
  }
  async function toggleRequest(id, button) {
    var item = adminDocumentTypes.find(function (type) { return type.id === id; });
    if (!item) return;
    var nextActive = !item.active;
    var prompt = nextActive ? "Réactiver cette demande pour les élèves concernés ?" : "Désactiver cette demande ? Elle ne sera plus affichée aux élèves, mais les dépôts existants seront conservés.";
    if (!window.confirm(prompt)) return;
    button.disabled = true;
    var result = await client.from("document_types").update({active:nextActive}).eq("id", id).select("id").single();
    button.disabled = false;
    if (result.error) return showToast(friendlyError(result.error), true);
    showToast(nextActive ? "Demande réactivée." : "Demande désactivée.");
    await loadDocuments(); await loadAdmin();
  }
  async function deleteRequest(id, button) {
    if (profile.role !== "admin") return;
    var item = adminDocumentTypes.find(function (type) { return type.id === id; });
    if (!item) return showToast("Cette demande n'est plus disponible.", true);
    var linked = await client.from("submissions").select("id,storage_path").eq("document_type_id", id);
    if (linked.error) return showToast(friendlyError(linked.error), true);
    var deposits = linked.data || [];
    var warning = deposits.length ? " Cette action supprimera également " + deposits.length + " dépôt" + (deposits.length > 1 ? "s" : "") + " d'élève et les fichiers correspondants." : "";
    if (!window.confirm("Supprimer définitivement la demande « " + item.title + " » ?" + warning + " Cette action est irréversible.")) return;
    button.disabled = true;
    var deleted = await client.from("document_types").delete().eq("id", id).select("id").maybeSingle();
    if (deleted.error || !deleted.data) {
      button.disabled = false;
      return showToast(deleted.error ? friendlyError(deleted.error) : "Cette demande ne peut pas être supprimée.", true);
    }
    var paths = deposits.map(function (submission) { return submission.storage_path; }).filter(Boolean);
    var removed = paths.length ? await client.storage.from("administrative-documents").remove(paths) : {error:null};
    await loadDocuments(); await loadAdmin();
    showToast(removed.error ? "La demande et les dépôts sont supprimés, mais le nettoyage des fichiers doit être vérifié." : "La demande et ses éventuels dépôts ont été supprimés.", !!removed.error);
  }

  function setupRealtime() {
    if (liveChannel) client.removeChannel(liveChannel);
    liveChannel = client.channel("cazotte-live-" + session.user.id)
      .on("postgres_changes", {event:"*", schema:"public", table:"submissions"}, function () {
        if (profile.role === "admin") loadAdmin();
        else loadDocuments();
      })
      .on("postgres_changes", {event:"*", schema:"public", table:"profiles"}, function () {
        if (profile.role === "admin") Promise.all([loadAdmin(), loadMessages()]);
      })
      .on("postgres_changes", {event:"*", schema:"public", table:"document_types"}, function () {
        loadDocuments().then(function () { if (profile.role === "admin") loadAdmin(); });
      })
      .on("postgres_changes", {event:"*", schema:"public", table:"messages"}, function () { loadMessages().then(function () { if (profile.role === "admin") renderAdmin(); }); })
      .on("postgres_changes", {event:"*", schema:"public", table:"announcements"}, function () { loadAnnouncements(); })
      .on("postgres_changes", {event:"*", schema:"public", table:"announcement_reads"}, function () { loadAnnouncements(); })
      .on("postgres_changes", {event:"*", schema:"public", table:"conversation_threads"}, function () { loadMessages(); })
      .on("postgres_changes", {event:"*", schema:"public", table:"notifications"}, function () { loadNotifications(); })
      .on("postgres_changes", {event:"*", schema:"public", table:"submission_history"}, function () { if (profile.role === "admin") loadAdmin(); })
      .subscribe(function (status) {
        if (status === "CHANNEL_ERROR") showToast("La mise à jour automatique est momentanément indisponible.", true);
      });
  }

  $$(".auth-tabs button, [data-auth-tab]").forEach(function (button) { button.addEventListener("click", function () { switchAuth(button.dataset.authTab); }); });
  $("#forgot-button").addEventListener("click", function () { switchAuth("reset"); });
  $("#login-form").addEventListener("submit", async function (event) {
    event.preventDefault(); setBusy(event.currentTarget, true);
    var result = await client.auth.signInWithPassword({email:event.currentTarget.elements.email.value, password:event.currentTarget.elements.password.value});
    setBusy(event.currentTarget, false);
    if (result.error) return authMessage(friendlyError(result.error), false);
    session = result.data.session; await enterApp();
  });
  $("#signup-form").addEventListener("submit", async function (event) {
    event.preventDefault(); setBusy(event.currentTarget, true); var form = event.currentTarget;
    var result = await client.auth.signUp({email:form.elements.email.value, password:form.elements.password.value, options:{data:{full_name:form.elements.full_name.value.trim(), student_number:form.elements.student_number.value.trim(), formation:form.elements.formation.value}}});
    setBusy(form, false);
    if (result.error) return authMessage(friendlyError(result.error), false);
    form.reset(); authMessage("Compte créé. Consultez votre e-mail pour confirmer votre inscription.", true);
  });
  $("#reset-form").addEventListener("submit", async function (event) {
    event.preventDefault(); setBusy(event.currentTarget, true);
    var result = await client.auth.resetPasswordForEmail(event.currentTarget.elements.email.value, {redirectTo:location.origin + location.pathname});
    setBusy(event.currentTarget, false);
    authMessage(result.error ? friendlyError(result.error) : "Le lien de réinitialisation a été envoyé.", !result.error);
  });
  $("#logout-button").addEventListener("click", function () { client.auth.signOut(); });
  $$(".nav-item, [data-view]").forEach(function (button) { button.addEventListener("click", function () { navigate(button.dataset.view); }); });
  function toggleSidebar(open) {
    $("#sidebar").classList.toggle("open", open);
    $("#sidebar-backdrop").classList.toggle("show", open);
    $("#menu-button").setAttribute("aria-expanded", open ? "true" : "false");
  }
  $("#menu-button").addEventListener("click", function () { toggleSidebar(!$("#sidebar").classList.contains("open")); });
  $("#sidebar-close").addEventListener("click", function () { toggleSidebar(false); });
  $("#sidebar-backdrop").addEventListener("click", function () { toggleSidebar(false); });
  $("#document-search").addEventListener("input", renderDocuments);
  $$(".filter").forEach(function (button) { button.addEventListener("click", function () { currentFilter = button.dataset.filter; $$(".filter").forEach(function (b) { b.classList.toggle("active", b === button); }); renderDocuments(); }); });
  $("#upload-file").addEventListener("change", function () { var file = this.files[0]; $("#upload-file-name").textContent = file ? file.name : "Sélectionner un fichier"; previewUploadFile(file); });
  $("#upload-form").addEventListener("submit", uploadDocument);
  $("#message-form").addEventListener("submit", sendMessage);
  $("#message-content").addEventListener("keydown", function (event) {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    var form = $("#message-form");
    var submitButton = $("button[type=submit]", form);
    if (this.disabled || submitButton.disabled || form.getAttribute("aria-busy") === "true" || !this.value.trim()) return;
    form.requestSubmit(submitButton);
  });
  $("#message-recipient").addEventListener("change", renderConversation);
  $("#toggle-thread-button").addEventListener("click", toggleConversationThread);
  $("#announcement-form").addEventListener("submit", createAnnouncement);
  $("#profile-form").addEventListener("submit", saveProfile);
  $("#password-form").addEventListener("submit", changePassword);
  $("#admin-search").addEventListener("input", renderAdmin);
  $("#admin-formation-filter").addEventListener("change", renderAdmin);
  $("#admin-state-filter").addEventListener("change", renderAdmin);
  $("#select-visible-students").addEventListener("change", function () {
    var visibleStudents = adminStudents.filter(matchesAdminFilters);
    var checked = this.checked;
    visibleStudents.forEach(function (student) { if (checked) selectedStudentIds.add(student.id); else selectedStudentIds.delete(student.id); });
    renderAdmin();
  });
  $("#export-students-button").addEventListener("click", exportStudentsCsv);
  $("#bulk-reminder-button").addEventListener("click", sendBulkReminders);
  $("#student-reminder-button").addEventListener("click", sendStudentReminder);
  $("#student-message-button").addEventListener("click", function () { if (!selectedAdminStudent) return; var id = selectedAdminStudent.id; closeModals(); navigate("messages"); $("#message-recipient").value = id; renderConversation(); });
  $("#new-request-button").addEventListener("click", function () { openRequestModal("create"); });
  $("#new-request-inline-button").addEventListener("click", function () { openRequestModal("create"); });
  $("#request-form").addEventListener("submit", saveRequest);
  $$("[data-close-modal]").forEach(function (button) { button.addEventListener("click", closeModals); });
  $$(".modal-wrap").forEach(function (modal) { modal.addEventListener("click", function (event) { if (event.target === modal) closeModals(); }); });
  document.addEventListener("keydown", function (event) {
    var openWrap = $(".modal-wrap:not([hidden])");
    if (event.key === "Escape" && openWrap) return closeModals();
    if (event.key !== "Tab" || !openWrap) return;
    var focusable = $$('button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])', openWrap).filter(function (element) { return element.offsetParent !== null; });
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible" && $("#view-messages").classList.contains("active")) renderConversation(); });

  start().catch(function (error) {
    $("#setup-screen").hidden = false;
    showToast(friendlyError(error), true);
  });
}());

