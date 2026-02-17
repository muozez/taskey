// ── Project Data Store ─────────────────────────────────
const projectData = {
  'website-redesign': {
    name: 'Website Redesign',
    color: 'orange',
    backlog: [
      { id: 'wr-1', title: 'Update Brand Guidelines for 2024', desc: 'Ensure all typography and color variables match the new design system.', priority: 'high', avatar: 'J', avatarColor: 'orange', dueDate: '2026-02-28', dueTime: '17:00', duration: '4h', progress: 0, tags: ['design', 'branding'], checklist: [{text: 'Review typography', done: true}, {text: 'Update color tokens', done: false}], createdAt: '2026-02-10T09:00:00' },
      { id: 'wr-2', title: 'API Documentation Review', desc: '', priority: 'medium', avatar: 'S', avatarColor: 'green', dueDate: '2026-03-05', dueTime: '', duration: '2h', progress: 0, tags: ['docs'], checklist: [], createdAt: '2026-02-12T14:30:00' },
    ],
    'in-progress': [
      { id: 'wr-3', title: 'Redesign Landing Page Hero', desc: '', priority: 'high', avatar: 'M', avatarColor: 'blue', dueDate: '2026-02-20', dueTime: '12:00', duration: '1d', progress: 65, tags: ['design', 'frontend'], checklist: [{text: 'Wireframe', done: true}, {text: 'Hi-fi mockup', done: true}, {text: 'Implementation', done: false}], createdAt: '2026-02-05T10:00:00' },
      { id: 'wr-4', title: 'Fix CSS spacing on Mobile Navigation', desc: '', priority: 'low', avatar: 'K', avatarColor: 'purple', dueDate: '', dueTime: '', duration: '30m', progress: 0, tags: ['bug', 'mobile'], checklist: [], createdAt: '2026-02-14T16:00:00' },
    ],
    'review': [
      { id: 'wr-5', title: 'Database Schema Update', desc: '', priority: 'medium', avatar: 'A', avatarColor: 'blue', dueDate: '2026-02-22', dueTime: '', duration: '2h', progress: 0, tags: ['backend'], checklist: [], createdAt: '2026-02-08T11:00:00' },
    ],
    'done': [
      { id: 'wr-6', title: 'User Interview Analysis', desc: '', priority: 'high', avatar: '', avatarColor: '', dueDate: '', dueTime: '', duration: '', progress: 100, tags: ['research'], checklist: [], createdAt: '2026-01-20T09:00:00' },
    ],
  },
  'q4-strategy': {
    name: 'Q4 Strategy',
    color: 'blue',
    backlog: [
      { id: 'q4-1', title: 'Competitive Analysis Report', desc: 'Analyze top 5 competitors and market positioning.', priority: 'high', avatar: 'A', avatarColor: 'blue', dueDate: '2026-03-01', dueTime: '', duration: '1d', progress: 0, tags: ['research'], checklist: [], createdAt: '2026-02-11T10:00:00' },
      { id: 'q4-2', title: 'Budget Allocation Draft', desc: '', priority: 'medium', avatar: 'M', avatarColor: 'green', dueDate: '2026-03-10', dueTime: '', duration: '4h', progress: 0, tags: ['finance'], checklist: [], createdAt: '2026-02-13T09:00:00' },
    ],
    'in-progress': [
      { id: 'q4-3', title: 'Revenue Forecast Model', desc: '', priority: 'high', avatar: 'S', avatarColor: 'orange', dueDate: '2026-02-25', dueTime: '18:00', duration: '2d', progress: 40, tags: ['finance', 'data'], checklist: [], createdAt: '2026-02-06T08:00:00' },
    ],
    'review': [],
    'done': [
      { id: 'q4-4', title: 'Stakeholder Meeting Notes', desc: '', priority: 'medium', avatar: '', avatarColor: '', dueDate: '', dueTime: '', duration: '', progress: 100, tags: [], checklist: [], createdAt: '2026-01-25T14:00:00' },
    ],
  },
  'brand-guidelines': {
    name: 'Brand Guidelines',
    color: 'purple',
    backlog: [
      { id: 'bg-1', title: 'Color Palette Refresh', desc: 'Update primary and secondary color palettes.', priority: 'medium', avatar: 'J', avatarColor: 'purple', dueDate: '2026-03-15', dueTime: '', duration: '2h', progress: 0, tags: ['design'], checklist: [], createdAt: '2026-02-14T10:00:00' },
    ],
    'in-progress': [
      { id: 'bg-2', title: 'Typography System Update', desc: '', priority: 'high', avatar: 'K', avatarColor: 'orange', dueDate: '2026-02-19', dueTime: '15:00', duration: '4h', progress: 30, tags: ['design', 'type'], checklist: [], createdAt: '2026-02-07T09:00:00' },
    ],
    'review': [
      { id: 'bg-3', title: 'Logo Usage Guidelines', desc: '', priority: 'low', avatar: 'A', avatarColor: 'blue', dueDate: '', dueTime: '', duration: '1h', progress: 0, tags: ['branding'], checklist: [], createdAt: '2026-02-10T11:00:00' },
    ],
    'done': [],
  },
};

let currentProject = 'website-redesign';
let currentView = 'dashboard'; // 'dashboard' or 'project'
let currentDashFilter = 'today';
let taskIdCounter = 100;

// ── DOM References ────────────────────────────────────
const backlogCards = document.getElementById('backlogCards');
const backlogCount = document.getElementById('backlogCount');
const kanbanColumns = document.getElementById('kanbanColumns');
const projectTitleText = document.getElementById('projectTitleText');
const projectTitleIcon = document.getElementById('projectTitleIcon');
const projectTitleEdit = document.getElementById('projectTitleEdit');
const projectTitleInput = document.getElementById('projectTitleInput');
const backlogPanel = document.getElementById('backlogPanel');
const backlogToggle = document.getElementById('backlogToggle');
const backlogReopen = document.getElementById('backlogReopen');
const backlogAddBtn = document.getElementById('backlogAddBtn');
const boardArea = document.getElementById('boardArea');
const dashboardView = document.getElementById('dashboardView');
const dashStats = document.getElementById('dashStats');
const dashTaskList = document.getElementById('dashTaskList');
const dashDate = document.getElementById('dashDate');
const sidebarProjectList = document.getElementById('sidebarProjectList');
const addProjectBtn = document.getElementById('addProjectBtn');

// Project modal refs
const projectModal = document.getElementById('projectModal');
const projectModalTitle = document.getElementById('projectModalTitle');
const projectModalClose = document.getElementById('projectModalClose');
const projectModalName = document.getElementById('projectModalName');
const colorPicker = document.getElementById('colorPicker');
const projectModalCancel = document.getElementById('projectModalCancel');
const projectModalSave = document.getElementById('projectModalSave');

// Modal refs
const taskModal = document.getElementById('taskModal');
const modalTitle = document.getElementById('modalTitle');
const modalClose = document.getElementById('modalClose');
const modalTaskTitle = document.getElementById('modalTaskTitle');
const modalTaskDesc = document.getElementById('modalTaskDesc');
const modalTaskPriority = document.getElementById('modalTaskPriority');
const modalTaskStatus = document.getElementById('modalTaskStatus');
const modalTaskAvatar = document.getElementById('modalTaskAvatar');
const modalTaskAvatarColor = document.getElementById('modalTaskAvatarColor');
const modalTaskDueDate = document.getElementById('modalTaskDueDate');
const modalTaskDueTime = document.getElementById('modalTaskDueTime');
const modalTaskDuration = document.getElementById('modalTaskDuration');
const modalTaskProgress = document.getElementById('modalTaskProgress');
const modalTaskTags = document.getElementById('modalTaskTags');
const checklistContainer = document.getElementById('checklistContainer');
const checklistNewItem = document.getElementById('checklistNewItem');
const checklistAddBtn = document.getElementById('checklistAddBtn');
const modalMeta = document.getElementById('modalMeta');
const modalSave = document.getElementById('modalSave');
const modalCancel = document.getElementById('modalCancel');
const modalDelete = document.getElementById('modalDelete');

let editingTaskId = null;
let editingTaskStatus = null;
let currentChecklist = [];

// ── Helpers ───────────────────────────────────────────

function generateId() {
  return 'task-' + (++taskIdCounter);
}

function findTask(taskId) {
  const project = projectData[currentProject];
  const statuses = ['backlog', 'in-progress', 'review', 'done'];
  for (const status of statuses) {
    const idx = project[status].findIndex(t => t.id === taskId);
    if (idx !== -1) return { task: project[status][idx], status, index: idx };
  }
  return null;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function formatDuration(dur) {
  if (!dur) return '';
  const map = {'15m':'15min','30m':'30min','1h':'1h','2h':'2h','4h':'4h','1d':'1d','2d':'2d','1w':'1w'};
  return map[dur] || dur;
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const now = new Date();
  now.setHours(0,0,0,0);
  return new Date(dateStr + 'T23:59:59') < now;
}

function getChecklistProgress(checklist) {
  if (!checklist || checklist.length === 0) return null;
  const done = checklist.filter(c => c.done).length;
  return { done, total: checklist.length };
}

// ── Card Meta Builder ─────────────────────────────────

function buildCardMeta(task, isDone) {
  const parts = [];

  // Due date
  if (task.dueDate) {
    const overdue = !isDone && isOverdue(task.dueDate);
    const cls = overdue ? 'card-meta-item overdue' : 'card-meta-item';
    const icon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
    let label = formatDate(task.dueDate);
    if (task.dueTime) label += ` ${task.dueTime}`;
    parts.push(`<span class="${cls}">${icon} ${label}</span>`);
  }

  // Duration
  if (task.duration) {
    const icon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    parts.push(`<span class="card-meta-item">${icon} ${formatDuration(task.duration)}</span>`);
  }

  // Checklist progress
  const cp = getChecklistProgress(task.checklist);
  if (cp) {
    const icon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`;
    parts.push(`<span class="card-meta-item">${icon} ${cp.done}/${cp.total}</span>`);
  }

  // Tags
  if (task.tags && task.tags.length > 0) {
    const tagHTML = task.tags.map(t => `<span class="card-tag">${t}</span>`).join('');
    parts.push(tagHTML);
  }

  if (parts.length === 0) return '';
  return `<div class="card-meta">${parts.join('')}</div>`;
}

// ── Checklist Rendering ───────────────────────────────

function renderChecklist() {
  checklistContainer.innerHTML = '';
  currentChecklist.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'checklist-item';
    row.innerHTML = `
      <label class="checklist-label">
        <input type="checkbox" ${item.done ? 'checked' : ''} data-index="${index}" />
        <span class="${item.done ? 'checklist-text done' : 'checklist-text'}">${item.text}</span>
      </label>
      <button class="checklist-remove" data-index="${index}" title="Remove">&times;</button>
    `;
    checklistContainer.appendChild(row);
  });

  // Bind checkbox toggles
  checklistContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const i = parseInt(e.target.dataset.index);
      currentChecklist[i].done = e.target.checked;
      renderChecklist();
    });
  });

  // Bind remove buttons
  checklistContainer.querySelectorAll('.checklist-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const i = parseInt(e.target.dataset.index);
      currentChecklist.splice(i, 1);
      renderChecklist();
    });
  });
}

// ── Render Functions ──────────────────────────────────

function createTaskCardHTML(task, isDone) {
  const card = document.createElement('div');
  card.className = 'task-card' + (task.progress ? ' in-progress-highlight' : '');
  card.draggable = true;
  card.dataset.taskId = task.id;

  let avatarHTML = '';
  if (isDone) {
    avatarHTML = '<span class="card-done-check">✓</span>';
  } else if (task.avatar) {
    avatarHTML = `<div class="card-avatar ${task.avatarColor}">${task.avatar}</div>`;
  }

  const priorityClass = isDone ? 'done' : task.priority;
  const titleClass = isDone ? 'card-title done-text' : 'card-title';

  card.innerHTML = `
    <div class="card-top">
      <span class="priority-badge ${priorityClass}">${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
      ${avatarHTML}
    </div>
    <div class="${titleClass}">${task.title}</div>
    ${task.desc ? `<div class="card-desc">${task.desc}</div>` : ''}
    ${buildCardMeta(task, isDone)}
    ${(task.progress && task.progress > 0 && !isDone) ? `<div class="progress-bar"><div class="progress-fill" style="width: ${task.progress}%;"></div></div>` : ''}
  `;

  // Click to open detail modal (ignore if dragging)
  let didDrag = false;
  card.addEventListener('mousedown', () => { didDrag = false; });
  card.addEventListener('mousemove', () => { didDrag = true; });
  card.addEventListener('mouseup', (e) => {
    if (!didDrag) {
      e.stopPropagation();
      openTaskModal(task.id);
    }
  });

  return card;
}

function renderBacklog() {
  const project = projectData[currentProject];
  backlogCards.innerHTML = '';
  project.backlog.forEach(task => {
    backlogCards.appendChild(createTaskCardHTML(task, false));
  });
  backlogCount.textContent = project.backlog.length;
}

function renderKanban() {
  const project = projectData[currentProject];
  const statuses = ['in-progress', 'review', 'done'];
  const statusLabels = { 'in-progress': 'In Progress', 'review': 'Review', 'done': 'Done' };
  const countClasses = { 'in-progress': 'primary', 'review': '', 'done': 'green' };

  kanbanColumns.innerHTML = '';

  statuses.forEach(status => {
    const tasks = project[status];
    const isDone = status === 'done';

    const col = document.createElement('div');
    col.className = 'kanban-column';
    col.dataset.column = status;

    col.innerHTML = `
      <div class="column-header">
        <h3 class="column-title">${statusLabels[status]} <span class="column-count ${countClasses[status]}">${tasks.length}</span></h3>
        <button class="column-more">···</button>
      </div>
    `;

    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'column-cards drop-zone' + (isDone ? ' done' : '');
    cardsContainer.dataset.status = status;

    tasks.forEach(task => {
      cardsContainer.appendChild(createTaskCardHTML(task, isDone));
    });

    col.appendChild(cardsContainer);
    kanbanColumns.appendChild(col);
  });

  initDropZones();
}

function renderProject(projectId) {
  currentProject = projectId;
  currentView = 'project';
  const project = projectData[projectId];

  // Show board, hide dashboard
  boardArea.style.display = '';
  dashboardView.style.display = 'none';
  document.querySelector('.command-bar-wrapper').style.display = '';

  // Update title bar
  projectTitleText.textContent = project.name;
  projectTitleIcon.className = 'project-title-icon ' + project.color;
  document.querySelector('.topbar').style.display = '';

  // Update sidebar active state
  document.querySelectorAll('.sidebar-project-link').forEach(link => {
    link.classList.toggle('active', link.dataset.project === projectId);
  });
  document.querySelectorAll('.nav-link[data-view]').forEach(link => {
    link.classList.remove('active');
  });

  // Render board
  renderBacklog();
  renderKanban();
}

// ── Task Modal ────────────────────────────────────────

function openTaskModal(taskId) {
  const found = taskId ? findTask(taskId) : null;

  if (found) {
    editingTaskId = taskId;
    editingTaskStatus = found.status;
    modalTitle.textContent = 'Edit Task';
    modalTaskTitle.value = found.task.title;
    modalTaskDesc.value = found.task.desc || '';
    modalTaskPriority.value = found.task.priority;
    modalTaskStatus.value = found.status;
    modalTaskAvatar.value = found.task.avatar || '';
    modalTaskAvatarColor.value = found.task.avatarColor || 'blue';
    modalTaskDueDate.value = found.task.dueDate || '';
    modalTaskDueTime.value = found.task.dueTime || '';
    modalTaskDuration.value = found.task.duration || '';
    modalTaskProgress.value = found.task.progress || '';
    modalTaskTags.value = (found.task.tags || []).join(', ');
    currentChecklist = (found.task.checklist || []).map(c => ({...c}));
    modalDelete.style.display = 'inline-flex';

    // Show meta info
    const metaParts = [];
    if (found.task.createdAt) {
      const d = new Date(found.task.createdAt);
      metaParts.push(`Created: ${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`);
    }
    metaParts.push(`ID: ${found.task.id}`);
    modalMeta.textContent = metaParts.join('  ·  ');
    modalMeta.style.display = 'block';
  } else {
    editingTaskId = null;
    editingTaskStatus = null;
    modalTitle.textContent = 'New Task';
    modalTaskTitle.value = '';
    modalTaskDesc.value = '';
    modalTaskPriority.value = 'medium';
    modalTaskStatus.value = 'backlog';
    modalTaskAvatar.value = '';
    modalTaskAvatarColor.value = 'blue';
    modalTaskDueDate.value = '';
    modalTaskDueTime.value = '';
    modalTaskDuration.value = '';
    modalTaskProgress.value = '';
    modalTaskTags.value = '';
    currentChecklist = [];
    modalDelete.style.display = 'none';
    modalMeta.style.display = 'none';
  }

  renderChecklist();
  taskModal.classList.add('open');
  modalTaskTitle.focus();
}

function closeTaskModal() {
  taskModal.classList.remove('open');
  editingTaskId = null;
  editingTaskStatus = null;
}

function saveTask() {
  const title = modalTaskTitle.value.trim();
  if (!title) {
    modalTaskTitle.classList.add('modal-input-error');
    setTimeout(() => modalTaskTitle.classList.remove('modal-input-error'), 800);
    return;
  }

  const project = projectData[currentProject];
  const newStatus = modalTaskStatus.value;
  const tags = modalTaskTags.value.split(',').map(t => t.trim()).filter(Boolean);
  const progressVal = parseInt(modalTaskProgress.value) || 0;

  if (editingTaskId) {
    const found = findTask(editingTaskId);
    if (!found) return;

    found.task.title = title;
    found.task.desc = modalTaskDesc.value.trim();
    found.task.priority = modalTaskPriority.value;
    found.task.avatar = modalTaskAvatar.value.trim();
    found.task.avatarColor = modalTaskAvatarColor.value;
    found.task.dueDate = modalTaskDueDate.value;
    found.task.dueTime = modalTaskDueTime.value;
    found.task.duration = modalTaskDuration.value;
    found.task.progress = progressVal;
    found.task.tags = tags;
    found.task.checklist = currentChecklist.map(c => ({...c}));

    if (found.status !== newStatus) {
      project[found.status].splice(found.index, 1);
      if (newStatus === 'done') found.task.progress = 100;
      project[newStatus].push(found.task);
    }
  } else {
    const newTask = {
      id: generateId(),
      title: title,
      desc: modalTaskDesc.value.trim(),
      priority: modalTaskPriority.value,
      avatar: modalTaskAvatar.value.trim(),
      avatarColor: modalTaskAvatarColor.value,
      dueDate: modalTaskDueDate.value,
      dueTime: modalTaskDueTime.value,
      duration: modalTaskDuration.value,
      progress: newStatus === 'done' ? 100 : progressVal,
      tags: tags,
      checklist: currentChecklist.map(c => ({...c})),
      createdAt: new Date().toISOString(),
    };
    project[newStatus].push(newTask);
  }

  closeTaskModal();
  renderBacklog();
  renderKanban();
}

function deleteTask() {
  if (!editingTaskId) return;
  const found = findTask(editingTaskId);
  if (!found) return;

  const project = projectData[currentProject];
  project[found.status].splice(found.index, 1);

  closeTaskModal();
  renderBacklog();
  renderKanban();
}

// Modal event listeners
modalClose.addEventListener('click', closeTaskModal);
modalCancel.addEventListener('click', closeTaskModal);
modalSave.addEventListener('click', saveTask);
modalDelete.addEventListener('click', deleteTask);

// Checklist add
checklistAddBtn.addEventListener('click', () => {
  const text = checklistNewItem.value.trim();
  if (!text) return;
  currentChecklist.push({ text, done: false });
  checklistNewItem.value = '';
  renderChecklist();
});
checklistNewItem.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    checklistAddBtn.click();
  }
});

// Close modal on overlay click
taskModal.addEventListener('click', (e) => {
  if (e.target === taskModal) closeTaskModal();
});

// Close modal on Escape, save on Ctrl+Enter
document.addEventListener('keydown', (e) => {
  if (!taskModal.classList.contains('open')) return;
  if (e.key === 'Escape') closeTaskModal();
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') saveTask();
});

// ── Drag & Drop ───────────────────────────────────────
let draggedTaskId = null;
let draggedFromStatus = null;

document.addEventListener('dragstart', (e) => {
  const card = e.target.closest('.task-card');
  if (!card) return;

  draggedTaskId = card.dataset.taskId;
  const dropZone = card.closest('.drop-zone');
  if (dropZone) {
    draggedFromStatus = dropZone.dataset.status;
  } else if (card.closest('.backlog-cards')) {
    draggedFromStatus = 'backlog';
  }

  card.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedTaskId);
});

document.addEventListener('dragend', (e) => {
  const card = e.target.closest('.task-card');
  if (card) card.classList.remove('dragging');
  document.querySelectorAll('.drop-zone-active').forEach(z => z.classList.remove('drop-zone-active'));
  backlogCards.classList.remove('drop-zone-active');
  draggedTaskId = null;
  draggedFromStatus = null;
});

function initDropZones() {
  const zones = document.querySelectorAll('.drop-zone');

  zones.forEach(zone => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      zone.classList.add('drop-zone-active');
    });

    zone.addEventListener('dragleave', (e) => {
      if (!zone.contains(e.relatedTarget)) {
        zone.classList.remove('drop-zone-active');
      }
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drop-zone-active');
      const targetStatus = zone.dataset.status;
      if (!draggedTaskId || !draggedFromStatus) return;
      if (draggedFromStatus === targetStatus) return;

      moveTask(draggedTaskId, draggedFromStatus, targetStatus);
    });
  });
}

// Backlog as drop zone
backlogCards.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  backlogCards.classList.add('drop-zone-active');
});

backlogCards.addEventListener('dragleave', (e) => {
  if (!backlogCards.contains(e.relatedTarget)) {
    backlogCards.classList.remove('drop-zone-active');
  }
});

backlogCards.addEventListener('drop', (e) => {
  e.preventDefault();
  backlogCards.classList.remove('drop-zone-active');
  if (!draggedTaskId || !draggedFromStatus) return;
  if (draggedFromStatus === 'backlog') return;

  moveTask(draggedTaskId, draggedFromStatus, 'backlog');
});

function moveTask(taskId, fromStatus, toStatus) {
  const project = projectData[currentProject];
  const fromList = project[fromStatus];
  const taskIndex = fromList.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return;

  const [task] = fromList.splice(taskIndex, 1);
  if (toStatus === 'done') delete task.progress;

  project[toStatus].push(task);

  renderBacklog();
  renderKanban();
}

// ── Backlog Toggle & Reopen ───────────────────────────
let backlogCollapsed = false;

function setBacklogCollapsed(collapsed) {
  backlogCollapsed = collapsed;
  backlogPanel.classList.toggle('collapsed', collapsed);
  backlogReopen.classList.toggle('visible', collapsed);
}

backlogToggle.addEventListener('click', () => {
  setBacklogCollapsed(true);
});

backlogReopen.addEventListener('click', () => {
  setBacklogCollapsed(false);
});

// ── Add Task Buttons ──────────────────────────────────
backlogAddBtn.addEventListener('click', () => {
  openTaskModal(null);
  modalTaskStatus.value = 'backlog';
});

// ── Command Bar Task Creation ─────────────────────────
const commandInput = document.querySelector('.command-input');
commandInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const text = commandInput.value.trim();
    if (!text) return;

    // Quick-create task in backlog
    const project = projectData[currentProject];
    project.backlog.push({
      id: generateId(),
      title: text,
      desc: '',
      priority: 'medium',
      avatar: '',
      avatarColor: 'blue',
      dueDate: '',
      dueTime: '',
      duration: '',
      progress: 0,
      tags: [],
      checklist: [],
      createdAt: new Date().toISOString(),
    });

    commandInput.value = '';
    renderBacklog();
  }
});

// ── Dashboard ─────────────────────────────────────────

function getAllTasks() {
  const tasks = [];
  for (const pid of Object.keys(projectData)) {
    const project = projectData[pid];
    for (const status of ['backlog', 'in-progress', 'review', 'done']) {
      project[status].forEach(task => {
        tasks.push({ ...task, projectId: pid, projectName: project.name, projectColor: project.color, status });
      });
    }
  }
  return tasks;
}

function getToday() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0,0,0,0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23,59,59,999);
  return { start: monday, end: sunday };
}

function filterTasks(filter) {
  const all = getAllTasks();
  const today = getToday();
  const week = getWeekRange();

  switch(filter) {
    case 'today':
      return all.filter(t => t.dueDate === today && t.status !== 'done');
    case 'this-week': {
      return all.filter(t => {
        if (!t.dueDate || t.status === 'done') return false;
        const d = new Date(t.dueDate + 'T00:00:00');
        return d >= week.start && d <= week.end;
      });
    }
    case 'overdue':
      return all.filter(t => t.dueDate && t.status !== 'done' && isOverdue(t.dueDate));
    case 'all':
    default:
      return all.filter(t => t.status !== 'done');
  }
}

function getDashboardStats() {
  const all = getAllTasks();
  const today = getToday();
  return {
    total: all.length,
    inProgress: all.filter(t => t.status === 'in-progress').length,
    completed: all.filter(t => t.status === 'done').length,
    overdue: all.filter(t => t.dueDate && t.status !== 'done' && isOverdue(t.dueDate)).length,
    dueToday: all.filter(t => t.dueDate === today && t.status !== 'done').length,
  };
}

function showDashboard(filter) {
  currentView = 'dashboard';
  if (filter) currentDashFilter = filter;

  // Toggle views
  boardArea.style.display = 'none';
  dashboardView.style.display = '';
  document.querySelector('.command-bar-wrapper').style.display = 'none';
  document.querySelector('.topbar').style.display = 'none';

  // Update sidebar
  document.querySelectorAll('.sidebar-project-link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('.nav-link[data-view]').forEach(l => {
    l.classList.toggle('active', l.dataset.view === (currentDashFilter === 'all' ? 'my-tasks' : 'dashboard'));
  });

  // Date display
  const now = new Date();
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  dashDate.textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

  renderDashStats();
  renderDashTasks();
}

function renderDashStats() {
  const s = getDashboardStats();
  dashStats.innerHTML = `
    <div class="dash-stat-card">
      <div class="dash-stat-value">${s.total}</div>
      <div class="dash-stat-label">Total Tasks</div>
    </div>
    <div class="dash-stat-card accent-blue">
      <div class="dash-stat-value">${s.inProgress}</div>
      <div class="dash-stat-label">In Progress</div>
    </div>
    <div class="dash-stat-card accent-green">
      <div class="dash-stat-value">${s.completed}</div>
      <div class="dash-stat-label">Completed</div>
    </div>
    <div class="dash-stat-card accent-orange">
      <div class="dash-stat-value">${s.overdue}</div>
      <div class="dash-stat-label">Overdue</div>
    </div>
    <div class="dash-stat-card accent-purple">
      <div class="dash-stat-value">${s.dueToday}</div>
      <div class="dash-stat-label">Due Today</div>
    </div>
  `;
}

function renderDashTasks() {
  const tasks = filterTasks(currentDashFilter);

  // Update active filter button
  document.querySelectorAll('.dash-filter').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === currentDashFilter);
  });

  if (tasks.length === 0) {
    dashTaskList.innerHTML = `<div class="dash-empty">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-300)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <p>No tasks found for this filter.</p>
    </div>`;
    return;
  }

  // Group by project
  const groups = {};
  tasks.forEach(t => {
    if (!groups[t.projectId]) groups[t.projectId] = { name: t.projectName, color: t.projectColor, tasks: [] };
    groups[t.projectId].tasks.push(t);
  });

  let html = '';
  for (const pid of Object.keys(groups)) {
    const g = groups[pid];
    html += `<div class="dash-group">
      <div class="dash-group-header">
        <span class="dash-group-dot ${g.color}"></span>
        <span class="dash-group-name">${g.name}</span>
        <span class="dash-group-count">${g.tasks.length}</span>
      </div>`;

    g.tasks.forEach(t => {
      const priorityClass = t.status === 'done' ? 'done' : t.priority;
      const overdue = t.dueDate && t.status !== 'done' && isOverdue(t.dueDate);
      const statusLabels = { 'backlog': 'Backlog', 'in-progress': 'In Progress', 'review': 'Review', 'done': 'Done' };

      html += `<div class="dash-task-row" data-task-id="${t.id}" data-project-id="${pid}">
        <div class="dash-task-left">
          <span class="priority-badge sm ${priorityClass}">${t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}</span>
          <span class="dash-task-title${t.status === 'done' ? ' done-text' : ''}">${t.title}</span>
        </div>
        <div class="dash-task-right">
          <span class="dash-task-status">${statusLabels[t.status]}</span>
          ${t.dueDate ? `<span class="dash-task-date${overdue ? ' overdue' : ''}">${formatDate(t.dueDate)}</span>` : ''}
          ${t.avatar ? `<div class="card-avatar sm ${t.avatarColor}">${t.avatar}</div>` : ''}
        </div>
      </div>`;
    });

    html += '</div>';
  }

  dashTaskList.innerHTML = html;

  // Bind click to open task in project view
  dashTaskList.querySelectorAll('.dash-task-row').forEach(row => {
    row.addEventListener('click', () => {
      const pid = row.dataset.projectId;
      const tid = row.dataset.taskId;
      renderProject(pid);
      setTimeout(() => openTaskModal(tid), 100);
    });
  });
}

function initDashboard() {
  document.querySelectorAll('.dash-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      currentDashFilter = btn.dataset.filter;
      renderDashTasks();
    });
  });
}

// ── Project Create Modal ──────────────────────────────
let selectedProjectColor = 'orange';

function openProjectModal() {
  projectModalTitle.textContent = 'New Project';
  projectModalName.value = '';
  selectedProjectColor = 'orange';
  colorPicker.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.color === 'orange');
  });
  projectModal.classList.add('open');
  projectModalName.focus();
}

function closeProjectModal() {
  projectModal.classList.remove('open');
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function createProject() {
  const name = projectModalName.value.trim();
  if (!name) {
    projectModalName.classList.add('modal-input-error');
    setTimeout(() => projectModalName.classList.remove('modal-input-error'), 800);
    return;
  }

  let slug = slugify(name);
  // Ensure uniqueness
  let counter = 1;
  while (projectData[slug]) {
    slug = slugify(name) + '-' + counter;
    counter++;
  }

  projectData[slug] = {
    name: name,
    color: selectedProjectColor,
    backlog: [],
    'in-progress': [],
    'review': [],
    'done': [],
  };

  closeProjectModal();
  renderSidebarProjects();
  renderProject(slug);
}

function initProjectModal() {
  addProjectBtn.addEventListener('click', openProjectModal);
  projectModalClose.addEventListener('click', closeProjectModal);
  projectModalCancel.addEventListener('click', closeProjectModal);
  projectModalSave.addEventListener('click', createProject);

  projectModal.addEventListener('click', (e) => {
    if (e.target === projectModal) closeProjectModal();
  });

  colorPicker.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      selectedProjectColor = swatch.dataset.color;
      colorPicker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
    });
  });

  projectModalName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); createProject(); }
  });
}

// ── Project Rename ────────────────────────────────────

function initProjectRename() {
  projectTitleEdit.addEventListener('click', () => {
    const project = projectData[currentProject];
    projectTitleText.style.display = 'none';
    projectTitleEdit.style.display = 'none';
    projectTitleInput.style.display = '';
    projectTitleInput.value = project.name;
    projectTitleInput.focus();
    projectTitleInput.select();
  });

  function commitRename() {
    const newName = projectTitleInput.value.trim();
    if (newName && projectData[currentProject]) {
      projectData[currentProject].name = newName;
      projectTitleText.textContent = newName;
      renderSidebarProjects();
    }
    projectTitleText.style.display = '';
    projectTitleEdit.style.display = '';
    projectTitleInput.style.display = 'none';
  }

  projectTitleInput.addEventListener('blur', commitRename);
  projectTitleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
    if (e.key === 'Escape') {
      projectTitleInput.value = projectData[currentProject].name;
      commitRename();
    }
  });
}

// ── Sidebar Navigation ────────────────────────────────
function renderSidebarProjects() {
  sidebarProjectList.innerHTML = '';
  const folderSVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z"/></svg>';

  Object.keys(projectData).forEach(pid => {
    const p = projectData[pid];
    const a = document.createElement('a');
    a.className = 'nav-link sidebar-project-link' + (currentView === 'project' && currentProject === pid ? ' active' : '');
    a.href = '#';
    a.dataset.project = pid;
    a.innerHTML = `<span class="nav-link-icon ${p.color}">${folderSVG}</span>${p.name}`;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      renderProject(pid);
    });

    // Right-click context menu (simple: delete project)
    a.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (Object.keys(projectData).length <= 1) return; // keep at least 1
      if (confirm(`Delete project "${p.name}"?`)) {
        delete projectData[pid];
        renderSidebarProjects();
        if (currentProject === pid) {
          const firstPid = Object.keys(projectData)[0];
          if (firstPid) renderProject(firstPid);
          else showDashboard();
        }
      }
    });

    sidebarProjectList.appendChild(a);
  });
}

function bindSidebarNavLinks() {
  document.querySelectorAll('.nav-link[data-view]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      if (link.dataset.view === 'dashboard') {
        showDashboard();
      } else if (link.dataset.view === 'my-tasks') {
        showDashboard('all');
      }
    });
  });
}

// ── Initial Render ────────────────────────────────────
renderSidebarProjects();
bindSidebarNavLinks();
initProjectModal();
initProjectRename();
initDashboard();
showDashboard();
