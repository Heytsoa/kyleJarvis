const STORE_KEY = "mini-jarvis-v1";
let data = loadData();
let mode = "task";
let activeView = "home";

const $ = (selector) => document.querySelector(selector);
const entryInput = $("#entry-input");

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    return { tasks: Array.isArray(saved.tasks) ? saved.tasks : [], notes: Array.isArray(saved.notes) ? saved.notes : [] };
  } catch { return { tasks: [], notes: [] }; }
}

function saveData() { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
function escapeHTML(text) { return String(text).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
function formatDate(date) { return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(date)); }
function formatDateTime(date) { return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(date)); }
function localDateKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function isTaskDone(task) { return task.repeatDaily ? task.completedOn === localDateKey() : Boolean(task.done); }

function render() {
  const openTasks = data.tasks.filter((task) => !isTaskDone(task));
  $("#task-count").textContent = openTasks.length;
  const taskItems = activeView === "tasks" ? data.tasks : openTasks.slice(0, 4);
  const noteItems = activeView === "notes" ? data.notes : data.notes.slice(0, 4);
  $("#task-list").innerHTML = taskItems.map((task) => {
    const done = isTaskDone(task);
    const details = [task.time ? `Prévue à ${escapeHTML(task.time)}` : "Heure à préciser", task.repeatDaily ? "Chaque jour" : "", `Ajoutée le ${formatDateTime(task.createdAt)}`].filter(Boolean).join(" · ");
    return `<article class="entry ${done ? "done" : ""}"><button class="check-button" data-complete="${task.id}" aria-label="${done ? "Réouvrir" : "Terminer"} la tâche">${done ? "✓" : ""}</button><div class="entry-text">${escapeHTML(task.text)}<div class="entry-meta">${details}</div></div>${task.repeatDaily ? '<span class="repeat-badge" title="Tâche répétée chaque jour">↻ Quotidienne</span>' : ""}<button class="delete-button" data-delete-task="${task.id}" aria-label="Supprimer la tâche">×</button></article>`;
  }).join("");
  $("#note-list").innerHTML = noteItems.map((note) => `<article class="entry"><span class="nav-icon">▤</span><div class="entry-text">${escapeHTML(note.text)}<div class="entry-meta">${formatDate(note.createdAt)}</div></div><button class="delete-button" data-delete-note="${note.id}" aria-label="Supprimer la note">×</button></article>`).join("");
  $("#empty-tasks").classList.toggle("hidden", taskItems.length > 0);
  $("#empty-notes").classList.toggle("hidden", noteItems.length > 0);
  $("#empty-tasks p").innerHTML = activeView === "tasks" ? "Tes tâches apparaîtront ici." : "Rien à faire pour l’instant.<br>Ajoute une tâche pour commencer.";
}

function setView(view) {
  activeView = view;
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  $("#page-title").textContent = view === "tasks" ? "Tes tâches" : view === "notes" ? "Tes notes" : "Bonjour, comment puis-je t’aider ?";
  render();
}

document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => {
  mode = button.dataset.mode;
  document.querySelectorAll("[data-mode]").forEach((item) => item.classList.toggle("active", item === button));
  entryInput.placeholder = mode === "task" ? "Ex. Préparer la réunion de lundi…" : "Ex. Idée à garder pour plus tard…";
  $("#task-schedule").classList.toggle("hidden", mode !== "task");
}));

$("#entry-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const text = entryInput.value.trim();
  if (!text) return;
  const item = { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), text, createdAt: new Date().toISOString() };
  if (mode === "task") {
    item.time = $("#entry-time").value;
    item.repeatDaily = $("#repeat-daily").checked;
    item.done = false;
  }
  data[mode === "task" ? "tasks" : "notes"].unshift(item);
  saveData();
  entryInput.value = "";
  if (mode === "task") { $("#entry-time").value = ""; $("#repeat-daily").checked = false; }
  setView("home");
  const reply = mode === "task" ? "C’est noté. J’ai ajouté cette tâche." : "C’est noté. J’ai enregistré cette note.";
  $("#voice-status").textContent = reply;
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(reply);
    utterance.lang = "fr-FR";
    window.speechSynthesis.speak(utterance);
  }
  setTimeout(() => { $("#voice-status").textContent = ""; }, 2200);
});

document.addEventListener("click", (event) => {
  const complete = event.target.closest("[data-complete]");
  const deleteTask = event.target.closest("[data-delete-task]");
  const deleteNote = event.target.closest("[data-delete-note]");
  if (complete) {
    const task = data.tasks.find((item) => item.id === complete.dataset.complete);
    if (task?.repeatDaily) task.completedOn = isTaskDone(task) ? "" : localDateKey();
    else if (task) task.done = !task.done;
  }
  if (deleteTask) data.tasks = data.tasks.filter((item) => item.id !== deleteTask.dataset.deleteTask);
  if (deleteNote) data.notes = data.notes.filter((item) => item.id !== deleteNote.dataset.deleteNote);
  if (complete || deleteTask || deleteNote) { saveData(); render(); }
});

$("#clear-data").addEventListener("click", () => {
  if (confirm("Effacer toutes les tâches et les notes de ce navigateur ?")) { data = { tasks: [], notes: [] }; saveData(); render(); }
});

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const micButton = $("#mic-button");
if (!SpeechRecognition) {
  micButton.title = "La dictée n’est pas prise en charge par ce navigateur";
  micButton.addEventListener("click", () => { $("#voice-status").textContent = "Dictée indisponible dans ce navigateur."; });
} else {
  const recognition = new SpeechRecognition();
  recognition.lang = "fr-FR";
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.onstart = () => { micButton.classList.add("listening"); $("#voice-status").textContent = "Je t’écoute…"; };
  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) transcript += event.results[i][0].transcript;
    entryInput.value = transcript;
  };
  recognition.onerror = () => { $("#voice-status").textContent = "Micro indisponible ou accès refusé."; };
  recognition.onend = () => { micButton.classList.remove("listening"); if ($("#voice-status").textContent === "Je t’écoute…") $("#voice-status").textContent = ""; };
  micButton.addEventListener("click", () => { try { recognition.start(); } catch { recognition.stop(); } });
}

$("#today").textContent = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "long" }).format(new Date());
const clockFormatters = {
  mada: new Intl.DateTimeFormat("fr-FR", { timeZone: "Indian/Antananarivo", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }),
  france: new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }),
};
function updateClocks() {
  const now = new Date();
  for (const [city, formatter] of Object.entries(clockFormatters)) {
    const parts = Object.fromEntries(formatter.formatToParts(now).map(({ type, value }) => [type, value]));
    $(`#clock-${city}`).textContent = `${parts.hour}:${parts.minute}`;
    $(`#clock-${city}-seconds`).textContent = parts.second;
  }
}
updateClocks();
setInterval(updateClocks, 1000);
render();
