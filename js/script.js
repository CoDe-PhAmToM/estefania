/* ============================================
   Bitácora — lógica de la aplicación
   Persistencia en localStorage, sin dependencias.
   ============================================ */

const STORAGE_KEY = 'bitacora.tasks.v1';

/** @type {{id:string, title:string, priority:'alta'|'media'|'baja', date:string, notes:string, done:boolean, createdAt:number}[]} */
let tasks = loadTasks();
let currentFilter = 'todas';

// ---------- Referencias al DOM ----------
const form = document.getElementById('taskForm');
const titleInput = document.getElementById('taskTitle');
const priorityInput = document.getElementById('taskPriority');
const dateInput = document.getElementById('taskDate');
const notesInput = document.getElementById('taskNotes');

const taskListEl = document.getElementById('taskList');
const emptyStateEl = document.getElementById('emptyState');
const tabsEl = document.getElementById('tabs');
const clearDoneBtn = document.getElementById('clearDone');

const statTotal = document.getElementById('statTotal');
const statPending = document.getElementById('statPending');
const statDone = document.getElementById('statDone');
const statHigh = document.getElementById('statHigh');

const ringFill = document.getElementById('ringFill');
const ringPercent = document.getElementById('ringPercent');
const RING_CIRCUMFERENCE = 2 * Math.PI * 52;

// ---------- Persistencia ----------

function loadTasks(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(err){
    console.error('No se pudieron leer las tareas guardadas:', err);
    return [];
  }
}

function saveTasks(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }catch(err){
    console.error('No se pudieron guardar las tareas:', err);
  }
}

// ---------- Utilidades ----------

function makeId(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatDate(iso){
  if(!iso) return 'sin fecha';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function priorityLabel(p){
  return { alta: 'Alta', media: 'Media', baja: 'Baja' }[p] || p;
}

// ---------- Render ----------

function render(){
  const filtered = tasks.filter(t => {
    if(currentFilter === 'pendientes') return !t.done;
    if(currentFilter === 'completadas') return t.done;
    return true;
  });

  taskListEl.innerHTML = '';

  filtered
    .slice()
    .sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt - a.createdAt)
    .forEach(task => taskListEl.appendChild(renderTask(task)));

  emptyStateEl.classList.toggle('is-visible', filtered.length === 0);

  updateStats();
}

function renderTask(task){
  const li = document.createElement('li');
  li.className = 'task' + (task.done ? ' is-done' : '');
  li.dataset.priority = task.priority;
  li.dataset.id = task.id;

  const check = document.createElement('input');
  check.type = 'checkbox';
  check.className = 'task__check';
  check.checked = task.done;
  check.setAttribute('aria-label', `Marcar "${task.title}" como completada`);
  check.addEventListener('change', () => toggleDone(task.id));

  const body = document.createElement('div');

  const title = document.createElement('p');
  title.className = 'task__title';
  title.textContent = task.title;
  body.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'task__meta';

  const tag = document.createElement('span');
  tag.className = 'task__tag';
  tag.textContent = `● ${priorityLabel(task.priority)}`;

  const date = document.createElement('span');
  date.textContent = formatDate(task.date);

  meta.appendChild(tag);
  meta.appendChild(date);
  body.appendChild(meta);

  if(task.notes){
    const notes = document.createElement('p');
    notes.className = 'task__notes';
    notes.textContent = task.notes;
    body.appendChild(notes);
  }

  const del = document.createElement('button');
  del.className = 'task__delete';
  del.innerHTML = '&times;';
  del.setAttribute('aria-label', `Eliminar "${task.title}"`);
  del.addEventListener('click', () => deleteTask(task.id));

  li.appendChild(check);
  li.appendChild(body);
  li.appendChild(del);

  return li;
}

function updateStats(){
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  const pending = total - done;
  const high = tasks.filter(t => t.priority === 'alta' && !t.done).length;

  statTotal.textContent = total;
  statPending.textContent = pending;
  statDone.textContent = done;
  statHigh.textContent = high;

  const ratio = total === 0 ? 0 : done / total;
  const offset = RING_CIRCUMFERENCE * (1 - ratio);
  ringFill.style.strokeDashoffset = String(offset);
  ringPercent.textContent = `${Math.round(ratio * 100)}%`;
}

// ---------- Acciones ----------

function addTask(data){
  tasks.push({
    id: makeId(),
    title: data.title.trim(),
    priority: data.priority,
    date: data.date,
    notes: data.notes.trim(),
    done: false,
    createdAt: Date.now(),
  });
  saveTasks();
  render();
}

function toggleDone(id){
  const task = tasks.find(t => t.id === id);
  if(task){
    task.done = !task.done;
    saveTasks();
    render();
  }
}

function deleteTask(id){
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  render();
}

function clearCompleted(){
  tasks = tasks.filter(t => !t.done);
  saveTasks();
  render();
}

// ---------- Eventos ----------

form.addEventListener('submit', (e) => {
  e.preventDefault();

  if(!titleInput.value.trim()){
    titleInput.focus();
    return;
  }

  addTask({
    title: titleInput.value,
    priority: priorityInput.value,
    date: dateInput.value,
    notes: notesInput.value,
  });

  form.reset();
  priorityInput.value = 'media';
  titleInput.focus();
});

tabsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if(!btn) return;

  tabsEl.querySelectorAll('.tab').forEach(t => t.classList.remove('is-active'));
  btn.classList.add('is-active');
  currentFilter = btn.dataset.filter;
  render();
});

clearDoneBtn.addEventListener('click', clearCompleted);

// ---------- Inicio ----------

render();
