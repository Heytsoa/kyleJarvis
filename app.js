const STORE_KEY = "mini-jarvis-v1";
let data = loadData();
let mode = "task";
let activeView = "home";
let editingNoteId = null;

const $ = (selector) => document.querySelector(selector);
const entryInput = $("#entry-input");

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    const tasks = Array.isArray(saved.tasks) ? saved.tasks.map((task) => ({
      ...task,
      dueDate: task.dueDate || (task.createdAt ? localDateKey(new Date(task.createdAt)) : localDateKey()),
      completedDates: Array.isArray(task.completedDates) ? task.completedDates : (task.completedOn ? [task.completedOn] : []),
    })) : [];
    return { tasks, notes: Array.isArray(saved.notes) ? saved.notes : [], reminderHistory: Array.isArray(saved.reminderHistory) ? saved.reminderHistory : [] };
  } catch { return { tasks: [], notes: [], reminderHistory: [] }; }
}

function saveData() { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
function escapeHTML(text) { return String(text).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
function formatDate(date) { return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(date)); }
function formatDateTime(date) { return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(date)); }
function localDateKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function isTaskDone(task, day = localDateKey()) {
  return task.repeatDaily
    ? (task.completedDates || []).includes(day) || task.completedOn === day
    : Boolean(task.done);
}

function taskOccursOn(task, day) {
  const startDate = task.dueDate || (task.createdAt ? localDateKey(new Date(task.createdAt)) : localDateKey());
  return task.repeatDaily ? startDate <= day : startDate === day;
}

function renderTask(task, day = localDateKey()) {
  const done = isTaskDone(task, day);
  const details = [task.time ? `Prévue à ${escapeHTML(task.time)}` : "Heure à préciser", task.repeatDaily ? "Chaque jour" : "", `Ajoutée le ${formatDateTime(task.createdAt)}`].filter(Boolean).join(" · ");
  return `<article class="entry ${done ? "done" : ""}"><button class="check-button" data-complete="${task.id}" data-day="${day}" aria-label="${done ? "Réouvrir" : "Terminer"} la tâche">${done ? "✓" : ""}</button><div class="entry-text">${escapeHTML(task.text)}<div class="entry-meta">${details}</div></div>${task.repeatDaily ? '<span class="repeat-badge" title="Tâche répétée chaque jour">↻ Quotidienne</span>' : ""}<button class="delete-button" data-delete-task="${task.id}" aria-label="Supprimer la tâche">×</button></article>`;
}

function renderNote(note) {
  if (editingNoteId === note.id) {
    return `<article class="entry note-entry note-editing"><label class="sr-only" for="note-edit-${note.id}">Modifier la note</label><textarea id="note-edit-${note.id}" class="note-edit-input" rows="3">${escapeHTML(note.text)}</textarea><div class="note-edit-actions"><button class="note-action primary" type="button" data-save-note="${note.id}">Enregistrer</button><button class="note-action" type="button" data-cancel-note>Annuler</button></div></article>`;
  }
  const dateLabel = note.updatedAt ? `Modifiée le ${formatDateTime(note.updatedAt)}` : formatDate(note.createdAt);
  return `<article class="entry note-entry"><span class="nav-icon" aria-hidden="true">▤</span><div class="entry-text">${escapeHTML(note.text)}<div class="entry-meta">${dateLabel}</div></div><button class="note-action" type="button" data-edit-note="${note.id}" aria-label="Modifier la note">Modifier</button><button class="delete-button" data-delete-note="${note.id}" aria-label="Supprimer la note">×</button></article>`;
}

function render() {
  const openTasks = data.tasks.filter((task) => !isTaskDone(task));
  $("#task-count").textContent = openTasks.length;
  const taskItems = data.tasks.slice(0, 4);
  const noteItems = activeView === "notes" ? data.notes : data.notes.slice(0, 4);
  $("#task-list").innerHTML = taskItems.map((task) => renderTask(task)).join("");
  $("#note-list").innerHTML = noteItems.map(renderNote).join("");
  $("#empty-tasks").classList.toggle("hidden", taskItems.length > 0);
  $("#empty-notes").classList.toggle("hidden", noteItems.length > 0);
  renderTaskDays();
  renderTaskPageNotes();
}

function renderTaskPageNotes() {
  const list = $("#task-notes-list");
  list.innerHTML = data.notes.map(renderNote).join("");
  $("#task-notes-count").textContent = `${data.notes.length} note${data.notes.length === 1 ? "" : "s"}`;
  $("#task-notes-empty").classList.toggle("hidden", data.notes.length > 0);
}

function renderTaskDays() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const days = [
    { key: localDateKey(yesterday), list: "#yesterday-tasks", empty: "#yesterday-empty", count: "#yesterday-count", heading: "#yesterday-heading" },
    { key: localDateKey(today), list: "#today-tasks", empty: "#today-empty", count: "#today-count", heading: "#today-heading" },
  ];
  for (const day of days) {
    const tasks = data.tasks.filter((task) => taskOccursOn(task, day.key)).sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
    $(day.heading).textContent = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(day.key === localDateKey(today) ? today : yesterday);
    $(day.list).innerHTML = tasks.map((task) => renderTask(task, day.key)).join("");
    $(day.count).textContent = `${tasks.length} tâche${tasks.length === 1 ? "" : "s"}`;
    $(day.empty).classList.toggle("hidden", tasks.length > 0);
  }
}

let renderedDay = localDateKey();
function refreshAfterDateChange() {
  const currentDay = localDateKey();
  if (currentDay === renderedDay) return;
  renderedDay = currentDay;
  $("#today").textContent = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "long" }).format(new Date());
  render();
}
setInterval(refreshAfterDateChange, 30_000);
window.addEventListener("focus", () => { refreshAfterDateChange(); checkTaskReminders(); });
document.addEventListener("visibilitychange", () => { if (!document.hidden) { refreshAfterDateChange(); checkTaskReminders(); } });

function setView(view) {
  activeView = view;
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  $("#page-title").textContent = view === "tasks" ? "Tes tâches" : view === "notes" ? "Tes notes" : "Bonjour, comment puis-je t’aider ?";
  $("#home-page").classList.toggle("hidden", view === "tasks");
  $("#task-page").classList.toggle("hidden", view !== "tasks");
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
    item.dueDate = $("#entry-date").value || localDateKey();
    item.time = $("#entry-time").value;
    item.repeatDaily = $("#repeat-daily").checked;
    item.done = false;
  }
  data[mode === "task" ? "tasks" : "notes"].unshift(item);
  saveData();
  entryInput.value = "";
  if (mode === "task") { $("#entry-date").value = localDateKey(); $("#entry-time").value = ""; $("#repeat-daily").checked = false; }
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
  const editNote = event.target.closest("[data-edit-note]");
  const saveNote = event.target.closest("[data-save-note]");
  const cancelNote = event.target.closest("[data-cancel-note]");
  if (editNote) {
    editingNoteId = editNote.dataset.editNote;
    render();
    const input = $(".note-edit-input");
    input?.focus();
    input?.setSelectionRange(input.value.length, input.value.length);
  }
  if (saveNote) {
    const note = data.notes.find((item) => item.id === saveNote.dataset.saveNote);
    const text = $(".note-edit-input")?.value.trim();
    if (note && text) {
      note.text = text;
      note.updatedAt = new Date().toISOString();
      editingNoteId = null;
      saveData();
      render();
    }
  }
  if (cancelNote) { editingNoteId = null; render(); }
  if (complete) {
    const task = data.tasks.find((item) => item.id === complete.dataset.complete);
    if (task?.repeatDaily) {
      const day = complete.dataset.day || localDateKey();
      task.completedDates = Array.isArray(task.completedDates) ? task.completedDates : (task.completedOn ? [task.completedOn] : []);
      task.completedDates = isTaskDone(task, day) ? task.completedDates.filter((date) => date !== day) : [...task.completedDates, day];
      task.completedOn = task.completedDates.at(-1) || "";
    }
    else if (task) task.done = !task.done;
  }
  if (deleteTask) data.tasks = data.tasks.filter((item) => item.id !== deleteTask.dataset.deleteTask);
  if (deleteNote) data.notes = data.notes.filter((item) => item.id !== deleteNote.dataset.deleteNote);
  if (deleteNote && editingNoteId === deleteNote.dataset.deleteNote) editingNoteId = null;
  if (complete || deleteTask || deleteNote) { saveData(); render(); }
});

$("#clear-data").addEventListener("click", () => {
  if (confirm("Effacer toutes les tâches et les notes de ce navigateur ?")) { data = { tasks: [], notes: [], reminderHistory: [] }; saveData(); render(); }
});


const notificationButton = $("#enable-notifications");
const notificationStatus = $("#notification-status");
const reminderToast = $("#reminder-toast");
let reminderToastTimer;

function updateNotificationControls() {
  if (!("Notification" in window)) {
    notificationButton.disabled = true;
    notificationButton.textContent = "Notifications indisponibles";
    notificationStatus.textContent = "Ce navigateur ne prend pas en charge les notifications système.";
    return;
  }
  const permission = Notification.permission;
  notificationButton.textContent = permission === "granted" ? "Notifications activées" : permission === "denied" ? "Notifications bloquées" : "Activer les notifications";
  notificationButton.disabled = permission === "granted" || permission === "denied";
  notificationStatus.textContent = permission === "granted"
    ? "Les rappels système sont activés sur cet appareil."
    : permission === "denied"
      ? "Autorisation refusée. Tu peux la modifier dans les réglages du navigateur."
      : "Rappels dans la page; autorise les notifications pour être averti sur un autre onglet.";
}

notificationButton.addEventListener("click", async () => {
  if (!("Notification" in window)) return;
  try {
    await Notification.requestPermission();
    updateNotificationControls();
  } catch {
    notificationStatus.textContent = "Impossible d’activer les notifications dans ce navigateur.";
  }
});

$("#dismiss-reminder").addEventListener("click", () => reminderToast.classList.add("hidden"));

function showTaskReminder(task) {
  const plannedTime = task.time || "";
  $("#reminder-toast-text").textContent = `${task.text} · prévue à ${plannedTime}`;
  reminderToast.classList.remove("hidden");
  clearTimeout(reminderToastTimer);
  reminderToastTimer = setTimeout(() => reminderToast.classList.add("hidden"), 30_000);
  if ("Notification" in window && Notification.permission === "granted") {
    const notice = new Notification("Mini Jarvis · dans 10 minutes", {
      body: `${task.text} — prévue à ${plannedTime}`,
      tag: `mini-jarvis-${task.id}-${localDateKey()}`,
    });
    notice.onclick = () => { window.focus(); setView("tasks"); notice.close(); };
  }
}

function checkTaskReminders() {
  const now = new Date();
  const today = localDateKey(now);
  const cutoff = now.getTime();
  const reminderWindow = 10 * 60 * 1000;
  const history = new Set(data.reminderHistory || []);
  for (const task of data.tasks) {
    if (!task.time || !taskOccursOn(task, today) || isTaskDone(task, today)) continue;
    const [hour, minute] = task.time.split(":").map(Number);
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) continue;
    const dueAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0).getTime();
    const reminderAt = dueAt - reminderWindow;
    const key = `${task.id}:${today}`;
    if (cutoff < reminderAt || cutoff >= dueAt || history.has(key)) continue;
    history.add(key);
    showTaskReminder(task);
  }
  data.reminderHistory = [...history].slice(-500);
  saveData();
}

updateNotificationControls();
checkTaskReminders();
setInterval(checkTaskReminders, 15_000);

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
$("#entry-date").value = localDateKey();
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
