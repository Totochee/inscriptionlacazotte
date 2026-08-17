const documents = [
  {name:"Attestation de responsabilité civile", category:"Vie scolaire", deadline:"28 août 2026", status:"pending", note:"Obligatoire"},
  {name:"Autorisation de droit à l'image", category:"Autorisation", deadline:"28 août 2026", status:"pending", note:"À signer"},
  {name:"Certificat de scolarité", category:"Scolarité", deadline:"Déposé le 16 août", status:"review", note:"PDF · 284 Ko"},
  {name:"Relevé d'identité bancaire", category:"Informations financières", deadline:"Validé le 17 août", status:"valid", note:"PDF · 198 Ko"},
  {name:"Pièce d'identité", category:"Identité", deadline:"Validé le 12 août", status:"valid", note:"JPG · 1,2 Mo"},
  {name:"Justificatif de domicile", category:"Identité", deadline:"Validé le 12 août", status:"valid", note:"PDF · 430 Ko"},
  {name:"Fiche de renseignements", category:"Scolarité", deadline:"Validé le 10 août", status:"valid", note:"Formulaire complété"},
  {name:"Autorisation de sortie", category:"Vie scolaire", deadline:"Validé le 10 août", status:"valid", note:"PDF · 165 Ko"},
  {name:"Dossier d'internat", category:"Hébergement", deadline:"Validé le 8 août", status:"valid", note:"PDF · 620 Ko"}
];

const students = [
  {name:"Léa Durand", initials:"LD", course:"BTSA Métiers de l'élevage", progress:100, activity:"Aujourd'hui, 10:12", status:"Complet"},
  {name:"Mathis Roux", initials:"MR", course:"Bac Pro CGEA", progress:75, activity:"Aujourd'hui, 09:38", status:"Incomplet"},
  {name:"Inès Bernard", initials:"IB", course:"Bac Techno STAV", progress:88, activity:"Hier, 17:05", status:"À vérifier"},
  {name:"Noah Garcia", initials:"NG", course:"BTSA Métiers de l'élevage", progress:63, activity:"Hier, 14:20", status:"Incomplet"},
  {name:"Emma Fabre", initials:"EF", course:"Bac Pro CGEA", progress:100, activity:"15 août, 11:42", status:"Complet"}
];

const labels = {dashboard:"Tableau de bord", documents:"Mes documents", messages:"Messages", help:"Aide", admin:"Suivi des dossiers"};
let currentFilter = "all";
const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];

function statusLabel(status){return {pending:"À déposer",review:"En vérification",valid:"Validé"}[status]}
function documentRow(doc, compact=false){
  const action = doc.status === "pending" ? "Déposer" : doc.status === "review" ? "Consulter" : "Voir";
  return `<article class="document-row" data-name="${doc.name.toLowerCase()}" data-status="${doc.status}">
    <div class="document-main"><span class="file-icon ${doc.status}">${doc.status === "valid" ? "✓" : "DOC"}</span><div><strong>${doc.name}</strong><small>${doc.category} · ${doc.note}</small></div></div>
    <span class="deadline ${doc.status === "pending" ? "urgent" : ""}">${doc.deadline}</span>
    ${compact ? "" : `<span class="status ${doc.status}">${statusLabel(doc.status)}</span>`}
    <button class="row-action" data-document="${doc.name}" data-status="${doc.status}">${action}</button>
  </article>`;
}

function renderDocuments(){
  const search = ($("#document-search")?.value || "").trim().toLowerCase();
  const filtered = documents.filter(d => (currentFilter === "all" || d.status === currentFilter) && d.name.toLowerCase().includes(search));
  $("#all-documents").innerHTML = filtered.map(d => documentRow(d)).join("");
  $("#empty-state").hidden = filtered.length > 0;
  bindDocumentActions();
}

function bindDocumentActions(){
  $$('[data-document]').forEach(button => button.addEventListener("click", () => {
    if(button.dataset.status === "pending") openUpload(button.dataset.document);
    else showToast(button.dataset.status === "review" ? "Ce document est en cours de vérification." : "Aperçu indisponible dans cette démonstration.");
  }));
}

function renderStudents(filter=""){
  const value = filter.toLowerCase();
  $("#student-table").innerHTML = students.filter(s => s.name.toLowerCase().includes(value) || s.course.toLowerCase().includes(value)).map(s => `<tr>
    <td><div class="student-cell"><span class="avatar green-avatar">${s.initials}</span><span><strong>${s.name}</strong><small>Dossier 2026–2027</small></span></div></td>
    <td>${s.course}</td><td><span class="mini-progress"><i style="width:${s.progress}%"></i></span>${s.progress} %</td><td>${s.activity}</td>
    <td><span class="status ${s.status === "Complet" ? "valid" : s.status === "À vérifier" ? "review" : "pending"}">${s.status}</span></td><td><button class="row-action" data-student="${s.name}">Ouvrir</button></td></tr>`).join("");
  $$('[data-student]').forEach(b => b.addEventListener("click",()=>showToast(`Ouverture du dossier de ${b.dataset.student} (démonstration).`)));
}

function navigate(view){
  $$(".view").forEach(v => v.classList.remove("active"));
  $(`#view-${view}`).classList.add("active");
  $$(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.view === view));
  $("#page-label").textContent = labels[view];
  $("#sidebar").classList.remove("open");
  $("#menu-button").setAttribute("aria-expanded","false");
  location.hash = view;
  window.scrollTo({top:0,behavior:"smooth"});
}

function openUpload(type=""){
  $("#upload-modal").hidden = false;
  $("#document-type").value = type || "";
  document.body.style.overflow = "hidden";
  setTimeout(()=>$("#document-type").focus(),50);
}
function closeUpload(){
  $("#upload-modal").hidden = true; document.body.style.overflow = "";
  $("#upload-form").reset(); $("#file-label").textContent = "Choisir un fichier";
}
let toastTimer;
function showToast(message){const toast=$("#toast");toast.textContent=message;toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),3200)}

$("#priority-list").innerHTML = documents.filter(d=>d.status==="pending").map(d=>documentRow(d,true)).join("");
renderDocuments(); renderStudents(); bindDocumentActions();

$$(".nav-item").forEach(item=>item.addEventListener("click",()=>navigate(item.dataset.view)));
$$('[data-go]').forEach(item=>item.addEventListener("click",()=>navigate(item.dataset.go)));
$$('[data-open-upload]').forEach(item=>item.addEventListener("click",()=>openUpload(item.dataset.openUpload)));
$("#menu-button").addEventListener("click",()=>{const open=$("#sidebar").classList.toggle("open");$("#menu-button").setAttribute("aria-expanded",String(open))});
$("#admin-button").addEventListener("click",()=>navigate("admin"));
$("#role-switch").addEventListener("click",()=>navigate("admin"));
$("#student-button").addEventListener("click",()=>navigate("dashboard"));
$("#modal-close").addEventListener("click",closeUpload); $("#modal-cancel").addEventListener("click",closeUpload);
$("#upload-modal").addEventListener("click",e=>{if(e.target===$("#upload-modal"))closeUpload()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeUpload();$("#notification-popover").hidden=true}});

$("#document-search").addEventListener("input",renderDocuments);
$$('[data-filter]').forEach(chip=>chip.addEventListener("click",()=>{currentFilter=chip.dataset.filter;$$('[data-filter]').forEach(c=>c.classList.toggle("active",c===chip));renderDocuments()}));
$("#student-search").addEventListener("input",e=>renderStudents(e.target.value));

const fileInput=$("#file-input"), dropZone=$("#drop-zone");
fileInput.addEventListener("change",()=>{if(fileInput.files[0])$("#file-label").textContent=fileInput.files[0].name});
["dragenter","dragover"].forEach(event=>dropZone.addEventListener(event,e=>{e.preventDefault();dropZone.classList.add("dragging")}));
["dragleave","drop"].forEach(event=>dropZone.addEventListener(event,e=>{e.preventDefault();dropZone.classList.remove("dragging")}));
dropZone.addEventListener("drop",e=>{if(e.dataTransfer.files.length){fileInput.files=e.dataTransfer.files;$("#file-label").textContent=e.dataTransfer.files[0].name}});
$("#upload-form").addEventListener("submit",e=>{e.preventDefault();const file=fileInput.files[0];if(file && file.size>10*1024*1024){showToast("Le fichier dépasse 10 Mo.");return}closeUpload();showToast("Document ajouté à la démonstration. Aucun fichier n'a été envoyé.")});

$("#notification-button").addEventListener("click",()=>{$("#notification-popover").hidden=!$("#notification-popover").hidden});
$("#message-form").addEventListener("submit",e=>{e.preventDefault();const input=$("input",e.currentTarget);const bubbles=$(".bubbles");bubbles.insertAdjacentHTML("beforeend",`<div class="bubble sent"><p>${input.value.replace(/[<>]/g,"")}</p><time>À l'instant</time></div>`);input.value="";showToast("Message ajouté à la démonstration.");bubbles.scrollTop=bubbles.scrollHeight});
$("#new-message").addEventListener("click",()=>showToast("Sélectionnez le service destinataire (démonstration)."));
$("#remind-button").addEventListener("click",()=>showToast("Relance préparée pour les dossiers incomplets."));

const initialView=location.hash.slice(1); if(labels[initialView])navigate(initialView);
