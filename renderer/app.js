// ── Database API (exposed via preload) ─────────────────
const db = window.taskey;

// ── Project Data Store (in-memory cache, synced with SQLite) ──
let projectData = {};

let currentProject = '';
let currentView = 'dashboard'; // 'dashboard' or 'project'
let currentDashFilter = 'today';
let taskIdCounter = 100;

// ── User Profile (loaded from DB) ─────────────────────
let userProfile = {
  firstName: '',
  lastName: '',
};

// ── Command Aliases (loaded from DB) ──────────────────
let commandAliases = {}; // { ':taşı': ':mv', ... }

// ── Default seed data (used only on first launch) ──────
const DEFAULT_SEED_DATA = {
  'website-redesign': {
    name: 'Website Redesign',
    color: 'orange',
    columns: [
      { id: 'in-progress', label: 'In Progress' },
      { id: 'review', label: 'Review' },
      { id: 'done', label: 'Done', isDone: true }
    ],
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
    columns: [
      { id: 'in-progress', label: 'In Progress' },
      { id: 'review', label: 'Review' },
      { id: 'done', label: 'Done', isDone: true }
    ],
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
    columns: [
      { id: 'in-progress', label: 'In Progress' },
      { id: 'review', label: 'Review' },
      { id: 'done', label: 'Done', isDone: true }
    ],
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

// ── Project Templates ─────────────────────────────────
const projectTemplates = {
  'basic-kanban': {
    label: 'Basic Kanban',
    columns: [
      { id: 'in-progress', label: 'In Progress' },
      { id: 'done', label: 'Done', isDone: true }
    ]
  },
  'daily-checks': {
    label: 'Daily Checks',
    columns: [
      { id: 'today', label: 'Today' },
      { id: 'in-progress', label: 'In Progress' },
      { id: 'completed', label: 'Completed', isDone: true }
    ]
  },
  'software-project': {
    label: 'Software Project',
    columns: [
      { id: 'in-progress', label: 'In Progress' },
      { id: 'review', label: 'Code Review' },
      { id: 'testing', label: 'Testing' },
      { id: 'hot-fix', label: 'Hot-fix' },
      { id: 'done', label: 'Done', isDone: true }
    ]
  }
};

// ── Color Utilities ───────────────────────────────────
const namedColors = {
  'orange': '#fb923c',
  'blue': '#60a5fa',
  'green': '#22c55e',
  'purple': '#a78bfa'
};

function getColorValue(color) {
  return namedColors[color] || color;
}

function isNamedColor(color) {
  return !!namedColors[color];
}

function colorStyle(color) {
  return isNamedColor(color) ? '' : ` style="color: ${color}"`;
}

function colorClass(color) {
  return isNamedColor(color) ? color : '';
}

function bgColorStyle(color) {
  return isNamedColor(color) ? '' : ` style="background: ${color}"`;
}

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
const dashGreeting = document.getElementById('dashGreeting');
const dashProjectOverview = document.getElementById('dashProjectOverview');
const dashUpcoming = document.getElementById('dashUpcoming');
const sidebarProjectList = document.getElementById('sidebarProjectList');
const addProjectBtn = document.getElementById('addProjectBtn');
const globalSearchInput = document.getElementById('globalSearchInput');
const searchResults = document.getElementById('searchResults');

// Project modal refs
const projectModal = document.getElementById('projectModal');
const projectModalTitle = document.getElementById('projectModalTitle');
const projectModalClose = document.getElementById('projectModalClose');
const projectModalName = document.getElementById('projectModalName');
const colorPicker = document.getElementById('colorPicker');
const projectModalCancel = document.getElementById('projectModalCancel');
const projectModalSave = document.getElementById('projectModalSave');
const templatePicker = document.getElementById('templatePicker');
const colorCustomInput = document.getElementById('colorCustomInput');

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
const modalTaskProgressRange = document.getElementById('modalTaskProgressRange');
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
  return 'task-' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

function getProjectStatuses(project) {
  return ['backlog', ...project.columns.map(c => c.id)];
}

function isColumnDone(project, status) {
  const col = project.columns.find(c => c.id === status);
  return col && col.isDone;
}

function findTask(taskId) {
  const project = projectData[currentProject];
  const statuses = getProjectStatuses(project);
  for (const status of statuses) {
    if (!project[status]) continue;
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

// ── Global Search ─────────────────────────────────────

let searchActiveIndex = -1;

function getAllTasksFromMemory() {
  const results = [];
  for (const [pid, project] of Object.entries(projectData)) {
    const statuses = getProjectStatuses(project);
    for (const status of statuses) {
      const tasks = project[status] || [];
      for (const task of tasks) {
        const col = project.columns.find(c => c.id === status);
        const statusLabel = status === 'backlog' ? 'Backlog' : (col ? col.label : status);
        results.push({ ...task, projectId: pid, projectName: project.name, status, statusLabel });
      }
    }
  }
  return results;
}

function highlightMatch(text, query) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
}

function performSearch(query) {
  if (!query || query.length < 2) {
    searchResults.classList.remove('visible');
    return;
  }

  const q = query.toLowerCase();
  const allTasks = getAllTasksFromMemory();

  const matches = allTasks.filter(t =>
    t.title.toLowerCase().includes(q) ||
    (t.desc && t.desc.toLowerCase().includes(q)) ||
    (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
  );

  if (matches.length === 0) {
    searchResults.innerHTML = '<div class="search-results-empty">Sonuç bulunamadı</div>';
    searchResults.classList.add('visible');
    searchActiveIndex = -1;
    return;
  }

  // Limit to 12 results
  const limited = matches.slice(0, 12);

  searchResults.innerHTML = limited.map((task, i) => `
    <div class="search-result-item" data-task-id="${task.id}" data-project-id="${task.projectId}" data-index="${i}">
      <div class="search-result-priority ${task.priority}"></div>
      <div class="search-result-info">
        <div class="search-result-title">${highlightMatch(task.title, query)}</div>
        <div class="search-result-meta">
          <span class="search-result-project">${task.projectName}</span>
          <span>·</span>
          <span class="search-result-status">${task.statusLabel}</span>
          ${task.tags && task.tags.length > 0 ? `<span>· ${task.tags.join(', ')}</span>` : ''}
        </div>
      </div>
    </div>
  `).join('');

  searchResults.classList.add('visible');
  searchActiveIndex = -1;

  // Click handlers
  searchResults.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const taskId = item.dataset.taskId;
      const projectId = item.dataset.projectId;
      // Navigate to project and open task
      globalSearchInput.value = '';
      searchResults.classList.remove('visible');
      renderProject(projectId);
      setTimeout(() => openTaskModal(taskId), 300);
    });
  });
}

function updateSearchActiveItem() {
  const items = searchResults.querySelectorAll('.search-result-item');
  items.forEach((item, i) => {
    item.classList.toggle('active', i === searchActiveIndex);
  });
  // Scroll active into view
  const active = items[searchActiveIndex];
  if (active) active.scrollIntoView({ block: 'nearest' });
}

if (globalSearchInput) {
  let searchDebounce = null;

  globalSearchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      performSearch(globalSearchInput.value.trim());
    }, 200);
  });

  globalSearchInput.addEventListener('keydown', (e) => {
    const items = searchResults.querySelectorAll('.search-result-item');
    if (!searchResults.classList.contains('visible') || items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      searchActiveIndex = Math.min(searchActiveIndex + 1, items.length - 1);
      updateSearchActiveItem();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      searchActiveIndex = Math.max(searchActiveIndex - 1, 0);
      updateSearchActiveItem();
    } else if (e.key === 'Enter' && searchActiveIndex >= 0) {
      e.preventDefault();
      items[searchActiveIndex].click();
    } else if (e.key === 'Escape') {
      globalSearchInput.value = '';
      searchResults.classList.remove('visible');
      globalSearchInput.blur();
    }
  });

  globalSearchInput.addEventListener('blur', () => {
    // Delay to allow click on results
    setTimeout(() => searchResults.classList.remove('visible'), 200);
  });

  globalSearchInput.addEventListener('focus', () => {
    if (globalSearchInput.value.trim().length >= 2) {
      performSearch(globalSearchInput.value.trim());
    }
  });
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
    ${(task.progress && task.progress > 0 && !isDone) ? `<div class="progress-bar-wrapper"><div class="progress-bar"><div class="progress-fill" style="width: ${task.progress}%;"></div></div><span class="progress-label">${task.progress}%</span></div>` : ''}
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

  kanbanColumns.innerHTML = '';

  project.columns.forEach(colDef => {
    const tasks = project[colDef.id] || [];
    const isDone = !!colDef.isDone;

    const col = document.createElement('div');
    col.className = 'kanban-column';
    col.dataset.column = colDef.id;

    const countClass = isDone ? 'green' : (colDef.id === 'in-progress' ? 'primary' : '');

    col.innerHTML = `
      <div class="column-header">
        <h3 class="column-title">${colDef.label} <span class="column-count ${countClass}">${tasks.length}</span></h3>
        <button class="column-more" data-column-id="${colDef.id}">···</button>
      </div>
    `;

    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'column-cards drop-zone' + (isDone ? ' done' : '');
    cardsContainer.dataset.status = colDef.id;

    tasks.forEach(task => {
      cardsContainer.appendChild(createTaskCardHTML(task, isDone));
    });

    col.appendChild(cardsContainer);
    kanbanColumns.appendChild(col);
  });

  // Add Column button
  const addColEl = document.createElement('div');
  addColEl.className = 'kanban-add-column';
  addColEl.innerHTML = `
    <button class="add-column-btn" type="button">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Add Column
    </button>
  `;
  addColEl.querySelector('.add-column-btn').addEventListener('click', () => addColumn());
  kanbanColumns.appendChild(addColEl);

  initDropZones();
  initColumnMenus();
}

function renderProject(projectId) {
  currentProject = projectId;
  currentView = 'project';

  // Refresh project data from DB, then render
  refreshProjectData(projectId).then(() => {
    const project = projectData[projectId];

    // Show board, hide dashboard
    boardArea.style.display = '';
    dashboardView.style.display = 'none';
    document.querySelector('.command-bar-wrapper').style.display = '';

    // Update title bar
    projectTitleText.textContent = project.name;
    if (isNamedColor(project.color)) {
      projectTitleIcon.className = 'project-title-icon ' + project.color;
      projectTitleIcon.style.color = '';
    } else {
      projectTitleIcon.className = 'project-title-icon';
      projectTitleIcon.style.color = project.color;
    }
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
  });
}

// ── Task Modal ────────────────────────────────────────

function openTaskModal(taskId) {
  const found = taskId ? findTask(taskId) : null;

  // Populate status dropdown with project columns
  const project = projectData[currentProject];
  modalTaskStatus.innerHTML = '<option value="backlog">Backlog</option>';
  project.columns.forEach(col => {
    const opt = document.createElement('option');
    opt.value = col.id;
    opt.textContent = col.label;
    modalTaskStatus.appendChild(opt);
  });

  if (found) {
    editingTaskId = taskId;
    editingTaskStatus = found.status;
    modalTitle.textContent = 'Görev Düzenle';
    modalTaskTitle.value = found.task.title;
    modalTaskDesc.value = found.task.desc || '';
    modalTaskPriority.value = found.task.priority;
    modalTaskStatus.value = found.status;
    modalTaskAvatar.value = found.task.avatar || '';
    modalTaskAvatarColor.value = found.task.avatarColor || 'blue';
    modalTaskDueDate.value = found.task.dueDate || '';
    modalTaskDueTime.value = found.task.dueTime || '';
    modalTaskDuration.value = found.task.duration || '';
    modalTaskProgress.value = found.task.progress || 0;
    modalTaskProgressRange.value = found.task.progress || 0;
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
    modalTitle.textContent = 'Yeni Görev';
    modalTaskTitle.value = '';
    modalTaskDesc.value = '';
    modalTaskPriority.value = 'medium';
    modalTaskStatus.value = 'backlog';
    modalTaskAvatar.value = '';
    modalTaskAvatarColor.value = 'blue';
    modalTaskDueDate.value = '';
    modalTaskDueTime.value = '';
    modalTaskDuration.value = '';
    modalTaskProgress.value = 0;
    modalTaskProgressRange.value = 0;
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

  const taskPayload = {
    title: title,
    desc: modalTaskDesc.value.trim(),
    priority: modalTaskPriority.value,
    avatar: modalTaskAvatar.value.trim(),
    avatarColor: modalTaskAvatarColor.value,
    dueDate: modalTaskDueDate.value,
    dueTime: modalTaskDueTime.value,
    duration: modalTaskDuration.value,
    progress: progressVal,
    tags: tags,
    checklist: currentChecklist.map(c => ({...c})),
  };

  if (editingTaskId) {
    // Update existing task
    const found = findTask(editingTaskId);
    if (!found) return;

    const updatePayload = { ...taskPayload, status: newStatus };
    if (isColumnDone(project, newStatus) && found.status !== newStatus) {
      updatePayload.progress = 100;
    }

    db.tasks.update(editingTaskId, updatePayload).then(() => {
      return refreshProjectData(currentProject);
    }).then(() => {
      renderBacklog();
      renderKanban();
    });
  } else {
    // Create new task
    const finalProgress = isColumnDone(project, newStatus) ? 100 : progressVal;
    const newTaskData = {
      id: generateId(),
      ...taskPayload,
      progress: finalProgress,
      createdAt: new Date().toISOString(),
    };

    db.tasks.create(currentProject, newStatus, newTaskData).then(() => {
      return refreshProjectData(currentProject);
    }).then(() => {
      renderBacklog();
      renderKanban();
    });
  }

  closeTaskModal();
  renderBacklog();
  renderKanban();
}

function deleteTask() {
  if (!editingTaskId) return;
  const found = findTask(editingTaskId);
  if (!found) return;

  db.tasks.delete(editingTaskId).then(() => {
    return refreshProjectData(currentProject);
  }).then(() => {
    closeTaskModal();
    renderBacklog();
    renderKanban();
  });
}

// Modal event listeners
modalClose.addEventListener('click', closeTaskModal);
modalCancel.addEventListener('click', closeTaskModal);
modalSave.addEventListener('click', saveTask);
modalDelete.addEventListener('click', deleteTask);

// Progress range ↔ number sync
modalTaskProgressRange.addEventListener('input', () => {
  modalTaskProgress.value = modalTaskProgressRange.value;
});
modalTaskProgress.addEventListener('input', () => {
  modalTaskProgressRange.value = modalTaskProgress.value;
});

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

// Close modal on overlay click (mousedown + click must both be on overlay)
let taskModalMouseDownTarget = null;
taskModal.addEventListener('mousedown', (e) => {
  taskModalMouseDownTarget = e.target;
});
taskModal.addEventListener('click', (e) => {
  if (e.target === taskModal && taskModalMouseDownTarget === taskModal) {
    closeTaskModal();
  }
  taskModalMouseDownTarget = null;
});

// Close modal on Escape, save on Ctrl+Enter
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (document.getElementById('settingsModal').classList.contains('open')) { closeSettingsModal(); return; }
    if (projectModal.classList.contains('open')) { closeProjectModal(); return; }
    if (taskModal.classList.contains('open')) { closeTaskModal(); return; }
  }
  if (!taskModal.classList.contains('open')) return;
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
  let newProgress = undefined;

  if (isColumnDone(project, toStatus)) {
    newProgress = 100;
  } else if (isColumnDone(project, fromStatus)) {
    newProgress = 0;
  }

  db.tasks.move(taskId, toStatus, newProgress).then(() => {
    return refreshProjectData(currentProject);
  }).then(() => {
    renderBacklog();
    renderKanban();
  });
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

// ── Command Bar ───────────────────────────────────────
const commandInput = document.querySelector('.command-input');
const commandSyntaxTooltip = document.getElementById('commandSyntaxTooltip');

// Tooltip: shown on focus, toggled with /help
let tooltipPinned = false;

commandInput.addEventListener('focus', () => {
  commandInput.closest('.command-bar').classList.add('focused');
});
commandInput.addEventListener('blur', () => {
  setTimeout(() => {
    commandSyntaxTooltip.classList.remove('visible');
    commandInput.closest('.command-bar').classList.remove('focused');
    tooltipPinned = false;
    hideAliasHint();
  }, 150);
});

// Live alias hint
commandInput.addEventListener('input', () => {
  const raw = commandInput.value.trim();
  if (!raw || Object.keys(commandAliases).length === 0) {
    hideAliasHint();
    return;
  }
  const resolved = resolveAliases(raw);
  if (resolved !== raw) {
    showAliasHint(resolved);
  } else {
    hideAliasHint();
  }
});

function showAliasHint(resolved) {
  let hint = document.querySelector('.cmd-alias-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.className = 'cmd-alias-hint';
    // Place hint inside the wrapper (above the bar) instead of inside the bar
    const wrapper = commandInput.closest('.command-bar-wrapper');
    wrapper.insertBefore(hint, wrapper.firstChild);
  }
  hint.textContent = `→ ${resolved}`;
  hint.style.display = '';
}

function hideAliasHint() {
  const hint = document.querySelector('.cmd-alias-hint');
  if (hint) hint.style.display = 'none';
}

// ── Command History ─────────────────────────────────
const commandHistory = [];
const MAX_HISTORY = 50;
let historyIndex = -1;
let historyDraft = '';

function pushHistory(cmd) {
  if (!cmd) return;
  // Don't duplicate consecutive entries
  if (commandHistory.length > 0 && commandHistory[commandHistory.length - 1] === cmd) return;
  commandHistory.push(cmd);
  if (commandHistory.length > MAX_HISTORY) commandHistory.shift();
  historyIndex = -1;
  historyDraft = '';
}

// Last-used quick-add settings (persisted per session, remembered between tasks)
let lastQuickSettings = {
  priority: 'medium',
  avatarColor: 'blue',
  tags: [],
  duration: '',
};

// ── Command Parser ────────────────────────────────────

/**
 * All standalone commands (entered alone, no title):
 *   :sw1 / :sw2 / :swa       → move last N backlog → first column
 *   :del QUERY                → delete task(s) matching query
 *   :col NAME                 → create a new column
 *   :delcol NAME              → delete a column
 *   :proj NAME $color         → create a new project
 *   :done N                   → move last N from first non-done col → done col
 *   :mv SRC>DST N             → move last N from SRC column → DST column
 *   :clear                    → reset remembered settings
 *
 * Inline modifiers (mixed with task title):
 *   :t60 / :t2h               → estimate time
 *   $red                      → avatar color
 *   #tag1,tag2                → tags
 *   !high / !low              → priority
 */
function parseCommandInput(raw) {
  const result = {
    title: '',
    command: null, // { type, ...params }
    settings: { ...lastQuickSettings },
    hasExplicitSettings: false,
  };

  // ── Standalone commands ──

  // :sw
  const swMatch = raw.match(/^:sw(a|\d+)$/i);
  if (swMatch) {
    result.command = { type: 'sw', count: swMatch[1].toLowerCase() === 'a' ? -1 : parseInt(swMatch[1], 10) };
    return result;
  }

  // :done N / :donea
  const doneMatch = raw.match(/^:done(a|\d+)?$/i);
  if (doneMatch) {
    const val = doneMatch[1] ? (doneMatch[1].toLowerCase() === 'a' ? -1 : parseInt(doneMatch[1], 10)) : 1;
    result.command = { type: 'done', count: val };
    return result;
  }

  // :mv SRC DST N (space-separated, min 3-char prefix match, N optional)
  const mvMatch = raw.match(/^:mv\s+(\S+)\s+(\S+)(?:\s+(a|\d+))?$/i);
  if (mvMatch) {
    const count = mvMatch[3] ? (mvMatch[3].toLowerCase() === 'a' ? -1 : parseInt(mvMatch[3], 10)) : 1;
    result.command = { type: 'mv', from: mvMatch[1].toLowerCase(), to: mvMatch[2].toLowerCase(), count };
    return result;
  }

  // :del QUERY
  const delMatch = raw.match(/^:del\s+(.+)$/i);
  if (delMatch) {
    result.command = { type: 'del', query: delMatch[1].trim() };
    return result;
  }

  // :delcol NAME
  const delcolMatch = raw.match(/^:delcol\s+(.+)$/i);
  if (delcolMatch) {
    result.command = { type: 'delcol', name: delcolMatch[1].trim() };
    return result;
  }

  // :col NAME
  const colMatch = raw.match(/^:col\s+(.+)$/i);
  if (colMatch) {
    result.command = { type: 'col', name: colMatch[1].trim() };
    return result;
  }

  // :proj NAME $color
  const projMatch = raw.match(/^:proj\s+(.+)$/i);
  if (projMatch) {
    let projStr = projMatch[1].trim();
    let color = 'orange';
    projStr = projStr.replace(/\$(\w+)/g, (_, c) => { color = c.toLowerCase(); return ''; });
    result.command = { type: 'proj', name: projStr.trim(), color };
    return result;
  }

  // :clear
  if (raw.match(/^:clear$/i)) {
    result.command = { type: 'clear' };
    return result;
  }

  // /help
  if (raw.match(/^\/help$/i)) {
    result.command = { type: 'help' };
    return result;
  }

  // ── Inline modifiers (task creation) ──
  let remaining = raw;

  // :tNUM or :tNUMu (time estimate)
  remaining = remaining.replace(/:t(\d+)(m|h|d|w)?/gi, (_, num, unit) => {
    unit = (unit || 'm').toLowerCase();
    result.settings.duration = parseInt(num, 10) + unit;
    result.hasExplicitSettings = true;
    return '';
  });

  // $color (avatar color)
  remaining = remaining.replace(/\$(\w+)/g, (_, color) => {
    result.settings.avatarColor = color.toLowerCase();
    result.hasExplicitSettings = true;
    return '';
  });

  // #tag1,tag2 (tags)
  remaining = remaining.replace(/#([\w,]+)/g, (_, tagStr) => {
    result.settings.tags = tagStr.split(',').map(t => t.trim()).filter(Boolean);
    result.hasExplicitSettings = true;
    return '';
  });

  // !priority
  remaining = remaining.replace(/!(high|medium|low)/gi, (_, p) => {
    result.settings.priority = p.toLowerCase();
    result.hasExplicitSettings = true;
    return '';
  });

  result.title = remaining.replace(/\s+/g, ' ').trim();
  return result;
}

// ── Command Executors ─────────────────────────────────

/** :sw — move N backlog → first column */
async function cmdSwitch(count) {
  const project = projectData[currentProject];
  if (!project?.backlog?.length) return;
  const firstCol = project.columns[0];
  if (!firstCol) return;
  const n = count === -1 ? project.backlog.length : Math.min(count, project.backlog.length);
  const toMove = project.backlog.slice(-n);
  for (const task of toMove) {
    await db.tasks.move(task.id, firstCol.id, firstCol.isDone ? 100 : undefined);
  }
  await refreshProjectData(currentProject);
  renderBacklog();
  renderKanban();
}

/** :done — move N from first non-done column → done column */
async function cmdDone(count) {
  const project = projectData[currentProject];
  if (!project) return;
  const doneCol = project.columns.find(c => c.isDone);
  if (!doneCol) return;
  // Find first non-done column that has tasks
  const sourceCol = project.columns.find(c => !c.isDone && (project[c.id]?.length > 0));
  if (!sourceCol) return;
  const tasks = project[sourceCol.id] || [];
  const n = count === -1 ? tasks.length : Math.min(count, tasks.length);
  const toMove = tasks.slice(-n);
  for (const task of toMove) {
    await db.tasks.move(task.id, doneCol.id, 100);
  }
  await refreshProjectData(currentProject);
  renderBacklog();
  renderKanban();
}

/** :mv SRC DST N — move between named columns (min 3-char prefix match) */
async function cmdMove(from, to, count) {
  const project = projectData[currentProject];
  if (!project) return;

  // Build lookup: id + label for matching
  const statusEntries = [
    { id: 'backlog', label: 'Backlog' },
    ...project.columns.map(c => ({ id: c.id, label: c.label }))
  ];

  // Match by: label prefix > id prefix > stripped-label prefix > label includes > id includes
  function resolveColumn(query) {
    const q = query.toLowerCase();
    const strip = s => s.replace(/[\s\-_]/g, ''); // "In Progress" → "inprogress", "in-progress" → "inprogress"
    return statusEntries.find(s => s.label.toLowerCase().startsWith(q))
        || statusEntries.find(s => s.id.toLowerCase().startsWith(q))
        || statusEntries.find(s => strip(s.label.toLowerCase()).startsWith(q))
        || statusEntries.find(s => strip(s.id.toLowerCase()).startsWith(q))
        || statusEntries.find(s => s.label.toLowerCase().includes(q))
        || statusEntries.find(s => s.id.toLowerCase().includes(q));
  }

  const fromEntry = resolveColumn(from);
  const toEntry = resolveColumn(to);
  if (!fromEntry) { showToast(`Kaynak kolon bulunamadı: "${from}"`, 'error'); return; }
  if (!toEntry) { showToast(`Hedef kolon bulunamadı: "${to}"`, 'error'); return; }
  if (fromEntry.id === toEntry.id) { showToast('Kaynak ve hedef kolon aynı olamaz', 'error'); return; }

  const tasks = project[fromEntry.id] || [];
  if (tasks.length === 0) { showToast(`"${fromEntry.label}" kolonunda görev yok`, 'error'); return; }
  const n = count === -1 ? tasks.length : Math.min(count, tasks.length);
  const toMove = tasks.slice(-n);
  const isDone = isColumnDone(project, toEntry.id);
  for (const task of toMove) {
    await db.tasks.move(task.id, toEntry.id, isDone ? 100 : undefined);
  }
  await refreshProjectData(currentProject);
  renderBacklog();
  renderKanban();
}

/** :del QUERY — delete task(s) matching title substring */
async function cmdDelete(query) {
  const project = projectData[currentProject];
  if (!project) return;
  const q = query.toLowerCase();
  const statuses = getProjectStatuses(project);
  const matches = [];
  for (const status of statuses) {
    if (!project[status]) continue;
    for (const task of project[status]) {
      if (task.title.toLowerCase().includes(q) || task.id === query) {
        matches.push(task);
      }
    }
  }
  if (matches.length === 0) return;
  if (matches.length > 1) {
    if (!confirm(`${matches.length} task found matching "${query}". Delete all?`)) return;
  }
  for (const task of matches) {
    await db.tasks.delete(task.id);
  }
  await refreshProjectData(currentProject);
  renderBacklog();
  renderKanban();
}

/** :col NAME — create new column */
async function cmdCreateColumn(name) {
  const project = projectData[currentProject];
  if (!project) return;
  let id = slugify(name);
  let counter = 1;
  let finalId = id;
  while (project.columns.some(c => c.id === finalId) || finalId === 'backlog') {
    finalId = id + '-' + counter++;
  }
  await db.columns.add(currentProject, finalId, name, false);
  await refreshProjectData(currentProject);
  renderKanban();
}

/** :delcol NAME — delete a column by name */
async function cmdDeleteColumn(name) {
  const project = projectData[currentProject];
  if (!project) return;
  const q = name.toLowerCase();
  const col = project.columns.find(c => c.label.toLowerCase() === q || c.id === q);
  if (!col) return;
  if (project.columns.length <= 1) return;
  const tasks = project[col.id] || [];
  if (tasks.length > 0) {
    if (!confirm(`"${col.label}" has ${tasks.length} task(s). They'll move to Backlog. Continue?`)) return;
  }
  await db.columns.delete(currentProject, col.id);
  await refreshProjectData(currentProject);
  renderBacklog();
  renderKanban();
}

/** :proj NAME $color — create new project */
async function cmdCreateProject(name, color) {
  let slug = slugify(name);
  let counter = 1;
  while (projectData[slug]) {
    slug = slugify(name) + '-' + counter++;
  }
  const defaultCols = [
    { id: 'in-progress', label: 'In Progress' },
    { id: 'done', label: 'Done', isDone: true }
  ];
  await db.projects.create(slug, name, color, defaultCols);
  await refreshAllProjects();
  renderSidebarProjects();
  renderProject(slug);
}

// ── Command Dispatcher ────────────────────────────────

async function executeCommand(parsed) {
  const cmd = parsed.command;
  try {
    switch (cmd.type) {
      case 'sw':      await cmdSwitch(cmd.count); showToast('Görevler taşındı', 'success'); return;
      case 'done':    await cmdDone(cmd.count); showToast('Görevler tamamlandı', 'success'); return;
      case 'mv':      await cmdMove(cmd.from, cmd.to, cmd.count); showToast('Görevler taşındı', 'success'); return;
      case 'del':     await cmdDelete(cmd.query); showToast('Görev silindi', 'success'); return;
      case 'col':     await cmdCreateColumn(cmd.name); showToast(`"${cmd.name}" kolonu oluşturuldu`, 'success'); return;
      case 'delcol':  await cmdDeleteColumn(cmd.name); showToast('Kolon silindi', 'success'); return;
      case 'proj':    await cmdCreateProject(cmd.name, cmd.color); showToast(`"${cmd.name}" projesi oluşturuldu`, 'success'); return;
      case 'clear':
        lastQuickSettings = { priority: 'medium', avatarColor: 'blue', tags: [], duration: '' };
        showToast('Ayarlar sıfırlandı', 'info');
        return;
      case 'help':
        tooltipPinned = !tooltipPinned;
        commandSyntaxTooltip.classList.toggle('visible', tooltipPinned);
        return;
    }
  } catch (err) {
    console.error('[Taskey] Command error:', err);
    showToast('Komut çalıştırılamadı', 'error');
  }
}

// ── Command Bar Key Handler ───────────────────────────

commandInput.addEventListener('keydown', (e) => {
  // Escape / Space (when empty) → blur
  if (e.key === 'Escape') {
    commandInput.value = '';
    commandInput.blur();
    return;
  }
  if (e.key === ' ' && commandInput.value === '') {
    e.preventDefault();
    commandInput.blur();
    return;
  }

  // ── History navigation with up/down arrows ──
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (commandHistory.length === 0) return;
    if (historyIndex === -1) {
      historyDraft = commandInput.value;
      historyIndex = commandHistory.length - 1;
    } else if (historyIndex > 0) {
      historyIndex--;
    }
    commandInput.value = commandHistory[historyIndex];
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (historyIndex === -1) return;
    if (historyIndex < commandHistory.length - 1) {
      historyIndex++;
      commandInput.value = commandHistory[historyIndex];
    } else {
      historyIndex = -1;
      commandInput.value = historyDraft;
    }
    return;
  }

  if (e.key === 'Enter') {
    const raw = commandInput.value.trim();
    if (!raw) return;

    // Save to history
    pushHistory(raw);

    // Resolve aliases before parsing
    const resolved = resolveAliases(raw);
    const parsed = parseCommandInput(resolved);
    commandInput.value = '';

    // Standalone command
    if (parsed.command) {
      executeCommand(parsed);
      return;
    }

    // Must have a title to create a task
    if (!parsed.title) return;

    // Prevent creating tasks that look like unknown commands
    if (parsed.title.match(/^:\w+/)) {
      showToast(`Bilinmeyen komut: ${parsed.title.split(' ')[0]}`, 'error');
      return;
    }

    // Remember settings for next time
    if (parsed.hasExplicitSettings) {
      lastQuickSettings = { ...parsed.settings };
    }

    const newTaskData = {
      id: generateId(),
      title: parsed.title,
      desc: '',
      priority: parsed.settings.priority,
      avatar: '',
      avatarColor: parsed.settings.avatarColor,
      dueDate: '',
      dueTime: '',
      duration: parsed.settings.duration,
      progress: 0,
      tags: parsed.settings.tags,
      checklist: [],
      createdAt: new Date().toISOString(),
    };

    db.tasks.create(currentProject, 'backlog', newTaskData).then(() => {
      return refreshProjectData(currentProject);
    }).then(() => {
      renderBacklog();
      showToast(`"${parsed.title}" eklendi`, 'success');
    });
  }
});

// ── Focus: Enter → cmd bar, Esc/Space → release ──────
document.addEventListener('keydown', (e) => {
  if (currentView !== 'project') return;
  if (taskModal.classList.contains('open')) return;
  if (projectModal.classList.contains('open')) return;
  const active = document.activeElement;
  const isInputFocused = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT');

  if (!isInputFocused && e.key === 'Enter') {
    e.preventDefault();
    commandInput.focus();
  }
});

// Click on empty board area → focus command bar
boardArea.addEventListener('click', (e) => {
  if (e.target === boardArea || e.target.classList.contains('kanban-columns') || e.target.classList.contains('column-cards')) {
    commandInput.focus();
  }
});

// ── Dashboard ─────────────────────────────────────────

function getAllTasks() {
  const tasks = [];
  for (const pid of Object.keys(projectData)) {
    const project = projectData[pid];
    const allStatuses = getProjectStatuses(project);
    for (const status of allStatuses) {
      if (!project[status]) continue;
      project[status].forEach(task => {
        const isDone = isColumnDone(project, status);
        tasks.push({ ...task, projectId: pid, projectName: project.name, projectColor: project.color, status, isDoneTask: isDone });
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
      return all.filter(t => t.dueDate === today && !t.isDoneTask);
    case 'this-week': {
      return all.filter(t => {
        if (!t.dueDate || t.isDoneTask) return false;
        const d = new Date(t.dueDate + 'T00:00:00');
        return d >= week.start && d <= week.end;
      });
    }
    case 'overdue':
      return all.filter(t => t.dueDate && !t.isDoneTask && isOverdue(t.dueDate));
    case 'all':
    default:
      return all.filter(t => !t.isDoneTask);
  }
}

function getDashboardStats() {
  const all = getAllTasks();
  const today = getToday();
  return {
    total: all.length,
    inProgress: all.filter(t => !t.isDoneTask && t.status !== 'backlog').length,
    completed: all.filter(t => t.isDoneTask).length,
    overdue: all.filter(t => t.dueDate && !t.isDoneTask && isOverdue(t.dueDate)).length,
    dueToday: all.filter(t => t.dueDate === today && !t.isDoneTask).length,
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

  // Greeting
  const hour = new Date().getHours();
  let greetText = 'İyi Günler';
  if (hour < 12) greetText = 'Günaydın';
  else if (hour < 18) greetText = 'İyi Günler';
  else greetText = 'İyi Akşamlar';
  const displayName = userProfile.firstName || 'Kullanıcı';
  dashGreeting.textContent = `${greetText}, ${displayName}!`;

  // Date display
  const now = new Date();
  const days = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  dashDate.textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

  // Refresh from DB then render
  refreshAllProjects().then(() => {
    renderDashStats();
    renderDashProjectOverview();
    renderDashUpcoming();
    renderDashTasks();
  });
}

function renderDashStats() {
  const s = getDashboardStats();
  dashStats.innerHTML = `
    <div class="dash-stat-card">
      <div class="dash-stat-value">${s.total}</div>
      <div class="dash-stat-label">Toplam Görev</div>
    </div>
    <div class="dash-stat-card accent-blue">
      <div class="dash-stat-value">${s.inProgress}</div>
      <div class="dash-stat-label">Devam Eden</div>
    </div>
    <div class="dash-stat-card accent-green">
      <div class="dash-stat-value">${s.completed}</div>
      <div class="dash-stat-label">Tamamlanan</div>
    </div>
    <div class="dash-stat-card accent-orange">
      <div class="dash-stat-value">${s.overdue}</div>
      <div class="dash-stat-label">Gecikmiş</div>
    </div>
    <div class="dash-stat-card accent-purple">
      <div class="dash-stat-value">${s.dueToday}</div>
      <div class="dash-stat-label">Bugün</div>
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
      <p>Bu filtre için görev bulunamadı.</p>
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
    const dotColor = isNamedColor(g.color) ? g.color : '';
    const dotStyle = isNamedColor(g.color) ? '' : ` style="background: ${g.color}"`;
    html += `<div class="dash-group">
      <div class="dash-group-header">
        <span class="dash-group-dot ${dotColor}"${dotStyle}></span>
        <span class="dash-group-name">${g.name}</span>
        <span class="dash-group-count">${g.tasks.length}</span>
      </div>`;

    g.tasks.forEach(t => {
      const priorityClass = t.isDoneTask ? 'done' : t.priority;
      const overdue = t.dueDate && !t.isDoneTask && isOverdue(t.dueDate);
      // Build status label from project columns
      const proj = projectData[pid];
      const colDef = proj.columns.find(c => c.id === t.status);
      const statusLabel = t.status === 'backlog' ? 'Backlog' : (colDef ? colDef.label : t.status);

      html += `<div class="dash-task-row" data-task-id="${t.id}" data-project-id="${pid}">
        <div class="dash-task-left">
          <span class="priority-badge sm ${priorityClass}">${t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}</span>
          <span class="dash-task-title${t.isDoneTask ? ' done-text' : ''}">${t.title}</span>
        </div>
        <div class="dash-task-right">
          <span class="dash-task-status">${statusLabel}</span>
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

// ── Dashboard: Project Overview ─────────────────────────

function renderDashProjectOverview() {
  if (!dashProjectOverview) return;
  const projectIds = Object.keys(projectData);
  if (projectIds.length === 0) {
    dashProjectOverview.innerHTML = '<div class="dash-upcoming-empty">Henüz proje yok.</div>';
    return;
  }

  let html = '';
  for (const pid of projectIds) {
    const p = projectData[pid];
    const allStatuses = getProjectStatuses(p);
    let totalTasks = 0;
    let doneTasks = 0;
    let inProgressTasks = 0;
    let backlogTasks = (p.backlog || []).length;
    totalTasks += backlogTasks;

    for (const col of p.columns) {
      const tasks = p[col.id] || [];
      totalTasks += tasks.length;
      if (col.isDone) doneTasks += tasks.length;
      else inProgressTasks += tasks.length;
    }

    const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    const accentClass = isNamedColor(p.color) ? p.color : '';
    const accentStyle = isNamedColor(p.color) ? '' : ` style="background: ${p.color}"`;
    const progressColor = isNamedColor(p.color) ? getColorValue(p.color) : p.color;

    html += `<div class="dash-project-card" data-project-id="${pid}">
      <div class="dash-project-card-accent ${accentClass}"${accentStyle}></div>
      <div class="dash-project-name">${p.name}</div>
      <div class="dash-project-stats">
        <div class="dash-project-stat">
          <div class="dash-project-stat-value">${backlogTasks}</div>
          <div class="dash-project-stat-label">Backlog</div>
        </div>
        <div class="dash-project-stat">
          <div class="dash-project-stat-value">${inProgressTasks}</div>
          <div class="dash-project-stat-label">Aktif</div>
        </div>
        <div class="dash-project-stat">
          <div class="dash-project-stat-value">${doneTasks}</div>
          <div class="dash-project-stat-label">Tamamlanan</div>
        </div>
      </div>
      <div class="dash-project-progress">
        <div class="dash-project-progress-bar">
          <div class="dash-project-progress-fill" style="width: ${progress}%; background: ${progressColor};"></div>
        </div>
        <div class="dash-project-progress-label">%${progress} tamamlandı</div>
      </div>
    </div>`;
  }

  dashProjectOverview.innerHTML = html;

  // Click to navigate to project
  dashProjectOverview.querySelectorAll('.dash-project-card').forEach(card => {
    card.addEventListener('click', () => {
      renderProject(card.dataset.projectId);
    });
  });
}

// ── Dashboard: Upcoming Tasks ─────────────────────────

function renderDashUpcoming() {
  if (!dashUpcoming) return;
  const all = getAllTasks();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get upcoming tasks (due in the next 7 days, not done)
  const upcoming = all
    .filter(t => t.dueDate && !t.isDoneTask)
    .map(t => ({
      ...t,
      dateObj: new Date(t.dueDate + 'T00:00:00')
    }))
    .sort((a, b) => a.dateObj - b.dateObj)
    .slice(0, 8);

  if (upcoming.length === 0) {
    dashUpcoming.innerHTML = '<div class="dash-upcoming-empty">Yaklaşan görev yok.</div>';
    return;
  }

  const months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  let html = '';
  for (const t of upcoming) {
    const d = t.dateObj;
    const overdueClass = d < today ? ' overdue' : '';
    html += `<div class="dash-upcoming-item${overdueClass}" data-task-id="${t.id}" data-project-id="${t.projectId}">
      <div class="dash-upcoming-date">
        <span class="dash-upcoming-day">${d.getDate()}</span>
        <span class="dash-upcoming-month">${months[d.getMonth()]}</span>
      </div>
      <div class="dash-upcoming-info">
        <div class="dash-upcoming-title">${t.title}</div>
        <div class="dash-upcoming-project">${t.projectName}</div>
      </div>
      <span class="priority-badge sm ${t.priority}">${t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}</span>
    </div>`;
  }

  dashUpcoming.innerHTML = html;

  dashUpcoming.querySelectorAll('.dash-upcoming-item').forEach(row => {
    row.addEventListener('click', () => {
      const pid = row.dataset.projectId;
      const tid = row.dataset.taskId;
      renderProject(pid);
      setTimeout(() => openTaskModal(tid), 100);
    });
  });
}

// ── Welcome Modal ─────────────────────────────────────

function showWelcomeModal() {
  const modal = document.getElementById('welcomeModal');
  modal.classList.add('open');

  const firstNameInput = document.getElementById('welcomeFirstName');
  const lastNameInput = document.getElementById('welcomeLastName');
  const saveBtn = document.getElementById('welcomeSave');

  firstNameInput.focus();

  saveBtn.addEventListener('click', async () => {
    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    if (!firstName) {
      firstNameInput.classList.add('modal-input-error');
      setTimeout(() => firstNameInput.classList.remove('modal-input-error'), 800);
      return;
    }
    userProfile.firstName = firstName;
    userProfile.lastName = lastName;

    await db.settings.setMultiple({
      'user.firstName': firstName,
      'user.lastName': lastName,
    });

    updateSidebarUser();
    modal.classList.remove('open');
    showToast(`Hoş geldin, ${firstName}!`, 'success');
    showDashboard();
  });

  // Enter on inputs
  lastNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); saveBtn.click(); }
  });
  firstNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); lastNameInput.focus(); }
  });
}

// ── Settings Modal ────────────────────────────────────

let settingsAliasesTemp = {};

function openSettingsModal() {
  const modal = document.getElementById('settingsModal');
  modal.classList.add('open');

  document.getElementById('settingsFirstName').value = userProfile.firstName;
  document.getElementById('settingsLastName').value = userProfile.lastName;
  settingsAliasesTemp = { ...commandAliases };
  renderAliasListInSettings();
}

function closeSettingsModal() {
  document.getElementById('settingsModal').classList.remove('open');
}

function renderAliasListInSettings() {
  const container = document.getElementById('aliasListContainer');
  const entries = Object.entries(settingsAliasesTemp);
  if (entries.length === 0) {
    container.innerHTML = '<div class="dash-upcoming-empty" style="padding:12px;">Henüz özel komut tanımlanmamış.</div>';
    return;
  }

  let html = '';
  for (const [alias, cmd] of entries) {
    html += `<div class="alias-row">
      <span class="alias-from">${alias}</span>
      <span class="alias-arrow">→</span>
      <span class="alias-to">${cmd}</span>
      <button class="alias-remove" data-alias="${alias}" title="Kaldır">&times;</button>
    </div>`;
  }
  container.innerHTML = html;

  container.querySelectorAll('.alias-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      delete settingsAliasesTemp[btn.dataset.alias];
      renderAliasListInSettings();
    });
  });
}

function initSettingsModal() {
  const closeBtn = document.getElementById('settingsModalClose');
  const cancelBtn = document.getElementById('settingsModalCancel');
  const saveBtn = document.getElementById('settingsModalSave');
  const addAliasBtn = document.getElementById('addAliasBtn');
  const settingsModal = document.getElementById('settingsModal');

  // Open via sidebar settings button
  document.querySelector('.user-settings').addEventListener('click', openSettingsModal);

  closeBtn.addEventListener('click', closeSettingsModal);
  cancelBtn.addEventListener('click', closeSettingsModal);

  // Overlay click to close
  let settingsMouseDownTarget = null;
  settingsModal.addEventListener('mousedown', (e) => { settingsMouseDownTarget = e.target; });
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal && settingsMouseDownTarget === settingsModal) closeSettingsModal();
    settingsMouseDownTarget = null;
  });

  // Add alias
  addAliasBtn.addEventListener('click', () => {
    const fromInput = document.getElementById('newAliasFrom');
    const toInput = document.getElementById('newAliasTo');
    let alias = fromInput.value.trim();
    let cmd = toInput.value.trim();
    if (!alias || !cmd) return;
    // Ensure they start with ':'
    if (!alias.startsWith(':')) alias = ':' + alias;
    if (!cmd.startsWith(':')) cmd = ':' + cmd;
    settingsAliasesTemp[alias] = cmd;
    fromInput.value = '';
    toInput.value = '';
    renderAliasListInSettings();
  });

  document.getElementById('newAliasTo').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addAliasBtn.click(); }
  });

  // Save
  saveBtn.addEventListener('click', async () => {
    const firstName = document.getElementById('settingsFirstName').value.trim();
    const lastName = document.getElementById('settingsLastName').value.trim();
    if (!firstName) {
      document.getElementById('settingsFirstName').classList.add('modal-input-error');
      setTimeout(() => document.getElementById('settingsFirstName').classList.remove('modal-input-error'), 800);
      return;
    }

    try {
      // Save profile
      userProfile.firstName = firstName;
      userProfile.lastName = lastName;
      await db.settings.setMultiple({
        'user.firstName': firstName,
        'user.lastName': lastName,
      });

      // Save aliases — clean empty entries
      const cleanAliases = {};
      for (const [k, v] of Object.entries(settingsAliasesTemp)) {
        const key = k.trim();
        const val = v.trim();
        if (key && val) cleanAliases[key] = val;
      }
      await db.aliases.setAll(cleanAliases);
      commandAliases = cleanAliases;

      updateSidebarUser();
      closeSettingsModal();
      showToast('Ayarlar kaydedildi', 'success');

      // Refresh dashboard if visible
      if (currentView === 'dashboard') showDashboard();
    } catch (err) {
      console.error('[Taskey] Settings save error:', err);
      showToast('Ayarlar kaydedilemedi', 'error');
    }
  });

  // Escape to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && settingsModal.classList.contains('open')) {
      closeSettingsModal();
    }
  });
}

// ── Sidebar User Display ──────────────────────────────

function updateSidebarUser() {
  const nameEl = document.querySelector('.user-name');
  const avatarEl = document.querySelector('.user-avatar');
  const fullName = [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ') || 'Kullanıcı';
  nameEl.textContent = fullName;
  avatarEl.textContent = (userProfile.firstName || 'K').charAt(0).toUpperCase();
}

// ── Toast Notification System ─────────────────────────

function showToast(message, type = 'info') {
  // type: 'success', 'error', 'info'
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;

  const icons = {
    success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  };

  toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-msg">${message}</span>`;
  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.classList.add('toast-hiding');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function showConfirmToast(message, onConfirm) {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-notification toast-confirm';
  toast.innerHTML = `
    <span class="toast-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></span>
    <span class="toast-msg">${message}</span>
    <button class="toast-btn toast-btn-confirm">Evet</button>
    <button class="toast-btn toast-btn-cancel">İptal</button>
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  toast.querySelector('.toast-btn-confirm').addEventListener('click', () => {
    toast.remove();
    onConfirm();
  });
  toast.querySelector('.toast-btn-cancel').addEventListener('click', () => {
    toast.classList.remove('toast-visible');
    toast.classList.add('toast-hiding');
    setTimeout(() => toast.remove(), 300);
  });

  // Auto-dismiss after 8 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.remove('toast-visible');
      toast.classList.add('toast-hiding');
      setTimeout(() => toast.remove(), 300);
    }
  }, 8000);
}

// ── Command Alias Resolution ──────────────────────────

function resolveAliases(raw) {
  if (!raw || Object.keys(commandAliases).length === 0) return raw;

  // Sort aliases by length (longest first) to avoid partial matches
  const sortedAliases = Object.entries(commandAliases)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [alias, cmd] of sortedAliases) {
    if (!alias || !cmd) continue;
    // Exact match
    if (raw === alias) {
      return cmd;
    }
    // Alias followed by space + args (word boundary)
    if (raw.startsWith(alias + ' ')) {
      return cmd + raw.slice(alias.length);
    }
    // Also try case-insensitive match
    const rawLower = raw.toLowerCase();
    const aliasLower = alias.toLowerCase();
    if (rawLower === aliasLower) {
      return cmd;
    }
    if (rawLower.startsWith(aliasLower + ' ')) {
      return cmd + raw.slice(alias.length);
    }
  }
  return raw;
}

// ── Project Create Modal ──────────────────────────────
let selectedProjectColor = 'orange';
let selectedTemplate = 'basic-kanban';
let activeColumnMenu = null;

function openProjectModal() {
  projectModalTitle.textContent = 'New Project';
  projectModalName.value = '';
  selectedProjectColor = 'orange';
  selectedTemplate = 'basic-kanban';

  colorPicker.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.color === 'orange');
  });
  const customLabel = colorPicker.querySelector('.color-swatch-custom');
  if (customLabel) customLabel.classList.remove('active');

  templatePicker.querySelectorAll('.template-card').forEach(t => {
    t.classList.toggle('active', t.dataset.template === 'basic-kanban');
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
  let counter = 1;
  while (projectData[slug]) {
    slug = slugify(name) + '-' + counter;
    counter++;
  }

  const template = projectTemplates[selectedTemplate];
  const columns = template.columns.map(c => ({...c}));

  db.projects.create(slug, name, selectedProjectColor, columns).then(() => {
    return refreshAllProjects();
  }).then(() => {
    closeProjectModal();
    renderSidebarProjects();
    renderProject(slug);
  });
}

// ── Column Management ─────────────────────────────────

function closeColumnMenu() {
  if (activeColumnMenu) {
    activeColumnMenu.remove();
    activeColumnMenu = null;
  }
}

function initColumnMenus() {
  kanbanColumns.querySelectorAll('.column-more').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const columnId = btn.dataset.columnId;

      if (activeColumnMenu) {
        closeColumnMenu();
        return;
      }

      const menu = document.createElement('div');
      menu.className = 'column-dropdown';
      menu.innerHTML = `
        <button class="column-dropdown-item" data-action="rename" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Yeniden Adlandır
        </button>
        <button class="column-dropdown-item" data-action="move-left" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Sola Taşı
        </button>
        <button class="column-dropdown-item" data-action="move-right" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          Sağa Taşı
        </button>
        <button class="column-dropdown-item danger" data-action="delete" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          Kolonu Sil
        </button>
      `;

      // Disable move buttons at edges
      const project = projectData[currentProject];
      const colIdx = project.columns.findIndex(c => c.id === columnId);
      if (colIdx === 0) {
        menu.querySelector('[data-action="move-left"]').disabled = true;
        menu.querySelector('[data-action="move-left"]').style.opacity = '0.35';
        menu.querySelector('[data-action="move-left"]').style.pointerEvents = 'none';
      }
      if (colIdx === project.columns.length - 1) {
        menu.querySelector('[data-action="move-right"]').disabled = true;
        menu.querySelector('[data-action="move-right"]').style.opacity = '0.35';
        menu.querySelector('[data-action="move-right"]').style.pointerEvents = 'none';
      }

      btn.parentElement.style.position = 'relative';
      btn.parentElement.appendChild(menu);
      activeColumnMenu = menu;

      menu.querySelector('[data-action="rename"]').addEventListener('click', () => {
        closeColumnMenu();
        renameColumn(columnId);
      });

      menu.querySelector('[data-action="move-left"]').addEventListener('click', () => {
        closeColumnMenu();
        moveColumn(columnId, -1);
      });

      menu.querySelector('[data-action="move-right"]').addEventListener('click', () => {
        closeColumnMenu();
        moveColumn(columnId, 1);
      });

      menu.querySelector('[data-action="delete"]').addEventListener('click', () => {
        closeColumnMenu();
        deleteColumn(columnId);
      });

      setTimeout(() => {
        document.addEventListener('click', closeColumnMenu, { once: true });
      }, 0);
    });
  });
}

function addColumn() {
  // Replace the Add Column button with an inline input
  const addColEl = kanbanColumns.querySelector('.kanban-add-column');
  if (!addColEl) return;

  const input = document.createElement('input');
  input.className = 'column-inline-input';
  input.type = 'text';
  input.placeholder = 'Kolon adı...';
  input.style.cssText = 'width:180px;padding:8px 12px;font-size:13px;font-weight:600;border:2px solid var(--primary);border-radius:8px;outline:none;font-family:inherit;background:var(--white);';

  addColEl.innerHTML = '';
  addColEl.appendChild(input);
  input.focus();

  function commitAdd() {
    const name = input.value.trim();
    if (!name) {
      // Restore button
      renderKanban();
      return;
    }

    const project = projectData[currentProject];
    let id = slugify(name);
    let counter = 1;
    let finalId = id;
    while (project.columns.some(c => c.id === finalId) || finalId === 'backlog') {
      finalId = id + '-' + counter;
      counter++;
    }

    db.columns.add(currentProject, finalId, name, false).then(() => {
      return refreshProjectData(currentProject);
    }).then(() => {
      renderKanban();
      showToast(`"${name}" kolonu oluşturuldu`, 'success');
    });
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitAdd(); }
    if (e.key === 'Escape') { renderKanban(); }
  });
  input.addEventListener('blur', () => {
    // Small delay to allow Enter to fire first
    setTimeout(() => {
      if (document.activeElement !== input) commitAdd();
    }, 100);
  });
}

function renameColumn(columnId) {
  const project = projectData[currentProject];
  const col = project.columns.find(c => c.id === columnId);
  if (!col) return;

  // Find the column title element and replace with inline input
  const colEl = kanbanColumns.querySelector(`.kanban-column[data-column="${columnId}"]`);
  if (!colEl) return;
  const titleEl = colEl.querySelector('.column-title');
  if (!titleEl) return;

  const input = document.createElement('input');
  input.className = 'column-inline-input';
  input.type = 'text';
  input.value = col.label;
  input.style.cssText = 'width:140px;padding:4px 8px;font-size:13px;font-weight:600;border:2px solid var(--primary);border-radius:6px;outline:none;font-family:inherit;background:var(--white);';

  titleEl.style.display = 'none';
  titleEl.parentElement.insertBefore(input, titleEl);
  input.focus();
  input.select();

  function commitRename() {
    const newName = input.value.trim();
    if (!newName || newName === col.label) {
      input.remove();
      titleEl.style.display = '';
      return;
    }

    db.columns.rename(currentProject, columnId, newName).then(() => {
      return refreshProjectData(currentProject);
    }).then(() => {
      renderKanban();
      showToast(`Kolon "${newName}" olarak yeniden adlandırıldı`, 'success');
    });
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
    if (e.key === 'Escape') { input.remove(); titleEl.style.display = ''; }
  });
  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (document.activeElement !== input) commitRename();
    }, 100);
  });
}

async function moveColumn(columnId, direction) {
  const project = projectData[currentProject];
  const colIds = project.columns.map(c => c.id);
  const idx = colIds.indexOf(columnId);
  if (idx === -1) return;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= colIds.length) return;

  // Swap
  [colIds[idx], colIds[newIdx]] = [colIds[newIdx], colIds[idx]];

  await db.columns.reorder(currentProject, colIds);
  await refreshProjectData(currentProject);
  renderKanban();
}

function deleteColumn(columnId) {
  const project = projectData[currentProject];
  const colIndex = project.columns.findIndex(c => c.id === columnId);
  if (colIndex === -1) return;

  if (project.columns.length <= 1) {
    showToast('Son kolon silinemez', 'error');
    return;
  }

  const tasks = project[columnId] || [];
  const msg = tasks.length > 0
    ? `Bu kolonda ${tasks.length} görev var. Backlog'a taşınacak. Emin misiniz?`
    : 'Bu kolon silinecek. Emin misiniz?';

  // Show confirmation inline
  showConfirmToast(msg, () => {
    db.columns.delete(currentProject, columnId).then(() => {
      return refreshProjectData(currentProject);
    }).then(() => {
      renderBacklog();
      renderKanban();
      showToast('Kolon silindi', 'success');
    });
  });
}

function initProjectModal() {
  addProjectBtn.addEventListener('click', openProjectModal);
  projectModalClose.addEventListener('click', closeProjectModal);
  projectModalCancel.addEventListener('click', closeProjectModal);
  projectModalSave.addEventListener('click', createProject);

  let projectModalMouseDownTarget = null;
  projectModal.addEventListener('mousedown', (e) => {
    projectModalMouseDownTarget = e.target;
  });
  projectModal.addEventListener('click', (e) => {
    if (e.target === projectModal && projectModalMouseDownTarget === projectModal) {
      closeProjectModal();
    }
    projectModalMouseDownTarget = null;
  });

  // Color swatches
  colorPicker.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      selectedProjectColor = swatch.dataset.color;
      colorPicker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      const customLabel = colorPicker.querySelector('.color-swatch-custom');
      if (customLabel) customLabel.classList.remove('active');
      swatch.classList.add('active');
    });
  });

  // Custom color picker
  colorCustomInput.addEventListener('input', (e) => {
    selectedProjectColor = e.target.value;
    colorPicker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    const customLabel = colorPicker.querySelector('.color-swatch-custom');
    if (customLabel) {
      customLabel.classList.add('active');
      customLabel.style.setProperty('--custom-color', e.target.value);
    }
  });

  // Template picker
  templatePicker.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', () => {
      selectedTemplate = card.dataset.template;
      templatePicker.querySelectorAll('.template-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
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
      db.projects.update(currentProject, { name: newName }).then(() => {
        projectData[currentProject].name = newName;
        projectTitleText.textContent = newName;
        renderSidebarProjects();
      });
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
    const iconColorClass = isNamedColor(p.color) ? p.color : '';
    const iconColorStyle = isNamedColor(p.color) ? '' : ` style="color: ${p.color}"`;
    a.innerHTML = `<span class="nav-link-icon ${iconColorClass}"${iconColorStyle}>${folderSVG}</span>${p.name}`;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      renderProject(pid);
    });

    // Right-click context menu (simple: delete project)
    a.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (Object.keys(projectData).length <= 1) return; // keep at least 1
      if (confirm(`Delete project "${p.name}"?`)) {
        db.projects.delete(pid).then(() => {
          return refreshAllProjects();
        }).then(() => {
          renderSidebarProjects();
          if (currentProject === pid) {
            const firstPid = Object.keys(projectData)[0];
            if (firstPid) renderProject(firstPid);
            else showDashboard();
          }
        });
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

// ── Database ↔ Cache Sync ─────────────────────────────

/**
 * Loads all projects and their tasks from SQLite into the in-memory cache.
 */
async function refreshAllProjects() {
  const projects = await db.projects.getAll();
  projectData = {};

  for (const p of projects) {
    const tasksMap = await db.tasks.getByProject(p.id);
    projectData[p.id] = {
      name: p.name,
      color: p.color,
      columns: p.columns,
      backlog: tasksMap['backlog'] || [],
    };
    for (const col of p.columns) {
      projectData[p.id][col.id] = tasksMap[col.id] || [];
    }
  }
}

/**
 * Refreshes a single project's data from SQLite.
 */
async function refreshProjectData(projectId) {
  const p = await db.projects.get(projectId);
  if (!p) return;

  const tasksMap = await db.tasks.getByProject(projectId);
  projectData[projectId] = {
    name: p.name,
    color: p.color,
    columns: p.columns,
    backlog: tasksMap['backlog'] || [],
  };
  for (const col of p.columns) {
    projectData[projectId][col.id] = tasksMap[col.id] || [];
  }
}

// ── Initial Render ────────────────────────────────────
async function initApp() {
  // Check if DB has data; if not, seed with defaults
  const hasData = await db.hasData();
  if (!hasData) {
    console.log('[Taskey] First launch — seeding database with default data...');
    await db.seed(DEFAULT_SEED_DATA);
  }

  // Load user profile from settings
  const settings = await db.settings.getAll();
  userProfile.firstName = settings['user.firstName'] || '';
  userProfile.lastName = settings['user.lastName'] || '';

  // Load command aliases
  commandAliases = await db.aliases.getAll();

  // Load all data from SQLite into memory cache
  await refreshAllProjects();

  // Set initial project
  const projectIds = Object.keys(projectData);
  if (projectIds.length > 0) {
    currentProject = projectIds[0];
  }

  renderSidebarProjects();
  bindSidebarNavLinks();
  initProjectModal();
  initProjectRename();
  initDashboard();
  initSettingsModal();
  updateSidebarUser();

  // If no user profile, show welcome modal
  if (!userProfile.firstName) {
    showWelcomeModal();
  } else {
    showDashboard();
  }
}

initApp();
