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
  var currentFilter = "all";
  var toastTimer;

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
    return new Intl.DateTimeFormat("fr-FR", {day:"numeric", month:"long", year:"numeric"}).format(new Date(value));
  }
  function formatDateTime(value) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("fr-FR", {day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit"}).format(new Date(value));
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
    await Promise.all([loadDocuments(), loadMessages()]);
    if (profile.role === "admin") await loadAdmin();
    navigate(location.hash.slice(1) || "dashboard");
  }

  function fillIdentity() {
    var name = profile.full_name || session.user.email;
    $("#side-name").textContent = name;
    $("#top-name").textContent = name;
    $("#welcome-name").textContent = firstName(name);
    $("#side-role").textContent = profile.role === "admin" ? "Personnel habilité" : (profile.formation || "Apprenant");
    $("#side-initials").textContent = initials(name);
    $("#top-initials").textContent = initials(name);
    $("#today").textContent = new Intl.DateTimeFormat("fr-FR", {weekday:"long", day:"numeric", month:"long", year:"numeric"}).format(new Date());
    $$(".admin-only").forEach(function (element) { element.hidden = profile.role !== "admin"; });
    var form = $("#profile-form");
    form.elements.full_name.value = profile.full_name || "";
    form.elements.student_number.value = profile.student_number || "";
    if (profile.formation) form.elements.formation.value = profile.formation;
    $("#profile-email").value = session.user.email || "";
  }

  function navigate(view) {
    if (view === "admin" && (!profile || profile.role !== "admin")) view = "dashboard";
    var labels = {dashboard:"Tableau de bord", documents:"Mes documents", messages:"Messagerie", profile:"Mon profil", admin:"Secrétariat"};
    if (!labels[view]) view = "dashboard";
    $$(".view").forEach(function (section) { section.classList.remove("active"); });
    $("#view-" + view).classList.add("active");
    $$(".nav-item").forEach(function (button) { button.classList.toggle("active", button.dataset.view === view); });
    $("#page-label").textContent = labels[view];
    $("#sidebar").classList.remove("open");
    location.hash = view;
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
    renderDocuments();
    renderDashboard();
  }

  function mergedDocuments() {
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
    var detail = submission ? escapeHtml(submission.original_name) : escapeHtml(type.category || "Document administratif");
    var rejected = item.status === "rejected" && submission.rejection_reason ?
      '<small class="reject-reason">Motif : ' + escapeHtml(submission.rejection_reason) + "</small>" : "";
    return '<article class="doc-row ' + (dashboard ? "dashboard-row" : "") + '">' +
      '<div class="doc-main"><span class="file-icon">' + (item.status === "approved" ? "✓" : "DOC") + '</span><div><strong>' + escapeHtml(type.title) + '</strong><small>' + detail + '</small>' + rejected + '</div></div>' +
      '<span class="deadline">' + (type.deadline ? "Avant le " + formatDate(type.deadline) : "Sans échéance") + '</span>' +
      (dashboard ? "" : '<span class="status ' + item.status + '">' + statusText(item.status) + '</span>') +
      '<button class="action" data-doc-id="' + type.id + '" data-doc-status="' + item.status + '">' + action + "</button></article>";
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
  }
  function openUpload(item) {
    $("#upload-type-id").value = item.type.id;
    $("#upload-title").textContent = item.type.title;
    $("#upload-description").textContent = item.type.description || "Sélectionnez un fichier lisible correspondant à la pièce demandée.";
    $("#upload-modal").hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeModals() {
    $$(".modal-wrap").forEach(function (modal) { modal.hidden = true; });
    document.body.style.overflow = "";
    $("#upload-form").reset();
    $("#upload-file-name").textContent = "Sélectionner un fichier";
    $("#upload-progress").hidden = true;
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
    var save = existing ? await client.from("submissions").update(payload).eq("id", existing.id) : await client.from("submissions").insert(payload);
    if (save.error) {
      await client.storage.from("administrative-documents").remove([path]);
      setBusy(form, false); $("#upload-progress").hidden = true;
      return showToast(friendlyError(save.error), true);
    }
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

  async function loadMessages() {
    var staffQuery = client.from("profiles").select("id,full_name,role").order("full_name");
    if (profile.role !== "admin") staffQuery = staffQuery.eq("role", "admin");
    var staff = await staffQuery;
    var select = $("#message-recipient");
    select.innerHTML = '<option value="">Choisir le destinataire</option>' + (staff.data || []).filter(function (p) { return p.id !== session.user.id; }).map(function (p) {
      return '<option value="' + p.id + '">' + escapeHtml(p.full_name) + (p.role === "admin" ? " · Secrétariat" : " · Apprenant") + "</option>";
    }).join("");
    var result = await client.from("messages").select("*,sender:profiles!messages_sender_id_fkey(full_name),recipient:profiles!messages_recipient_id_fkey(full_name)").order("created_at");
    if (result.error) return;
    var messages = result.data || [];
    var history = $("#message-history");
    history.innerHTML = messages.length ? messages.map(function (message) {
      var mine = message.sender_id === session.user.id;
      var person = mine ? (message.recipient && message.recipient.full_name) : (message.sender && message.sender.full_name);
      return '<article class="message ' + (mine ? "mine" : "") + '"><p>' + escapeHtml(message.content) + '</p><small>' + (mine ? "À " : "De ") + escapeHtml(person || "Secrétariat") + " · " + formatDateTime(message.created_at) + "</small></article>";
    }).join("") : '<div class="empty"><span>✉</span><h3>Aucun message</h3><p>Vous pouvez démarrer une conversation avec le secrétariat.</p></div>';
    history.scrollTop = history.scrollHeight;
  }
  async function sendMessage(event) {
    event.preventDefault();
    var recipient = $("#message-recipient").value;
    var content = $("#message-content").value.trim();
    if (!recipient || !content) return;
    setBusy(event.currentTarget, true);
    var result = await client.from("messages").insert({sender_id:session.user.id, recipient_id:recipient, content:content});
    setBusy(event.currentTarget, false);
    if (result.error) return showToast(friendlyError(result.error), true);
    $("#message-content").value = "";
    showToast("Message envoyé.");
    await loadMessages();
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
    var result = await client.from("submissions").select("*,profiles!submissions_user_id_fkey(full_name,student_number,formation),document_types(title)").order("submitted_at", {ascending:false});
    if (result.error) return showToast(friendlyError(result.error), true);
    submissions.admin = result.data || [];
    renderAdmin();
  }
  function renderAdmin() {
    var all = submissions.admin || [];
    var search = ($("#admin-search").value || "").toLowerCase();
    var filtered = all.filter(function (item) {
      var name = item.profiles && item.profiles.full_name || "";
      return name.toLowerCase().includes(search);
    });
    $("#admin-approved").textContent = all.filter(function (i) { return i.status === "approved"; }).length;
    $("#admin-review").textContent = all.filter(function (i) { return i.status === "submitted"; }).length;
    $("#admin-types").textContent = documentTypes.length;
    $("#admin-submissions").innerHTML = filtered.map(function (item) {
      var p = item.profiles || {};
      var t = item.document_types || {};
      var actions = '<button class="action" data-admin-download="' + item.id + '">Voir</button>';
      if (item.status === "submitted") actions += '<button class="action approve" data-admin-approve="' + item.id + '">Valider</button><button class="action reject" data-admin-reject="' + item.id + '">Refuser</button>';
      return "<tr><td><strong>" + escapeHtml(p.full_name || "Compte supprimé") + "</strong><small>" + escapeHtml(p.formation || "") + "</small></td><td><strong>" + escapeHtml(t.title || "Document") + "</strong><small>" + escapeHtml(item.original_name) + "</small></td><td>" + formatDateTime(item.submitted_at) + '</td><td><span class="status ' + item.status + '">' + statusText(item.status) + '</span></td><td><div class="table-actions">' + actions + "</div></td></tr>";
    }).join("");
    $("#admin-empty").hidden = filtered.length > 0;
    $$("[data-admin-download]").forEach(function (b) { b.onclick = function () { downloadSubmission(all.find(function (i) { return i.id === b.dataset.adminDownload; })); }; });
    $$("[data-admin-approve]").forEach(function (b) { b.onclick = function () { reviewSubmission(b.dataset.adminApprove, "approved"); }; });
    $$("[data-admin-reject]").forEach(function (b) { b.onclick = function () { reviewSubmission(b.dataset.adminReject, "rejected"); }; });
  }
  async function reviewSubmission(id, status) {
    var reason = null;
    if (status === "rejected") {
      reason = window.prompt("Indiquez précisément pourquoi ce document doit être corrigé :");
      if (!reason || !reason.trim()) return;
      reason = reason.trim();
    }
    var result = await client.from("submissions").update({status:status, rejection_reason:reason, reviewed_at:new Date().toISOString(), reviewed_by:session.user.id}).eq("id", id);
    if (result.error) return showToast(friendlyError(result.error), true);
    showToast(status === "approved" ? "Document validé." : "Correction demandée.");
    await loadAdmin();
  }
  async function createRequest(event) {
    event.preventDefault();
    var form = event.currentTarget;
    setBusy(form, true);
    var payload = {title:form.elements.title.value.trim(), category:form.elements.category.value.trim(), description:form.elements.description.value.trim() || null, deadline:form.elements.deadline.value || null, formation:form.elements.formation.value || null, created_by:session.user.id};
    var result = await client.from("document_types").insert(payload);
    setBusy(form, false);
    if (result.error) return showToast(friendlyError(result.error), true);
    form.reset(); closeModals(); showToast("La demande de document a été créée.");
    await loadDocuments(); await loadAdmin();
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
  $("#menu-button").addEventListener("click", function () { $("#sidebar").classList.toggle("open"); });
  $("#document-search").addEventListener("input", renderDocuments);
  $$(".filter").forEach(function (button) { button.addEventListener("click", function () { currentFilter = button.dataset.filter; $$(".filter").forEach(function (b) { b.classList.toggle("active", b === button); }); renderDocuments(); }); });
  $("#upload-file").addEventListener("change", function () { $("#upload-file-name").textContent = this.files[0] ? this.files[0].name : "Sélectionner un fichier"; });
  $("#upload-form").addEventListener("submit", uploadDocument);
  $("#message-form").addEventListener("submit", sendMessage);
  $("#profile-form").addEventListener("submit", saveProfile);
  $("#password-form").addEventListener("submit", changePassword);
  $("#admin-search").addEventListener("input", renderAdmin);
  $("#new-request-button").addEventListener("click", function () { $("#request-modal").hidden = false; document.body.style.overflow = "hidden"; });
  $("#request-form").addEventListener("submit", createRequest);
  $$("[data-close-modal]").forEach(function (button) { button.addEventListener("click", closeModals); });
  $$(".modal-wrap").forEach(function (modal) { modal.addEventListener("click", function (event) { if (event.target === modal) closeModals(); }); });
  document.addEventListener("keydown", function (event) { if (event.key === "Escape") closeModals(); });

  start().catch(function (error) {
    $("#setup-screen").hidden = false;
    showToast(friendlyError(error), true);
  });
}());
