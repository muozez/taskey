// ── Project Data Store ─────────────────────────────────
const projectData = {
  'website-redesign': {
    name: 'Website Redesign',
    color: 'orange',
    backlog: [
      { id: 'wr-1', title: 'Update Brand Guidelines for 2024', desc: 'Ensure all typography and color variables match the new design system.', priority: 'high', avatar: 'J', avatarColor: 'orange' },
      { id: 'wr-2', title: 'API Documentation Review', desc: '', priority: 'medium', avatar: 'S', avatarColor: 'green' },
    ],
    'in-progress': [
      { id: 'wr-3', title: 'Redesign Landing Page Hero', desc: '', priority: 'high', avatar: 'M', avatarColor: 'blue', progress: 65 },
      { id: 'wr-4', title: 'Fix CSS spacing on Mobile Navigation', desc: '', priority: 'low', avatar: 'K', avatarColor: 'purple' },
    ],
    'review': [
      { id: 'wr-5', title: 'Database Schema Update', desc: '', priority: 'medium', avatar: 'A', avatarColor: 'blue' },
    ],
    'done': [
      { id: 'wr-6', title: 'User Interview Analysis', desc: '', priority: 'high', avatar: '', avatarColor: '' },
    ],
  },
  'q4-strategy': {
    name: 'Q4 Strategy',
    color: 'blue',
    backlog: [
      { id: 'q4-1', title: 'Competitive Analysis Report', desc: 'Analyze top 5 competitors and market positioning.', priority: 'high', avatar: 'A', avatarColor: 'blue' },
      { id: 'q4-2', title: 'Budget Allocation Draft', desc: '', priority: 'medium', avatar: 'M', avatarColor: 'green' },
    ],
    'in-progress': [
      { id: 'q4-3', title: 'Revenue Forecast Model', desc: '', priority: 'high', avatar: 'S', avatarColor: 'orange' },
    ],
    'review': [],
    'done': [
      { id: 'q4-4', title: 'Stakeholder Meeting Notes', desc: '', priority: 'medium', avatar: '', avatarColor: '' },
    ],
  },
  'brand-guidelines': {
    name: 'Brand Guidelines',
    color: 'purple',
    backlog: [
      { id: 'bg-1', title: 'Color Palette Refresh', desc: 'Update primary and secondary color palettes.', priority: 'medium', avatar: 'J', avatarColor: 'purple' },
    ],
    'in-progress': [
      { id: 'bg-2', title: 'Typography System Update', desc: '', priority: 'high', avatar: 'K', avatarColor: 'orange' },
    ],
    'review': [
      { id: 'bg-3', title: 'Logo Usage Guidelines', desc: '', priority: 'low', avatar: 'A', avatarColor: 'blue' },
    ],
    'done': [],
  },
};

let currentProject = 'website-redesign';

// ── DOM References ────────────────────────────────────
const backlogCards = document.getElementById('backlogCards');
const backlogCount = document.getElementById('backlogCount');
const kanbanColumns = document.getElementById('kanbanColumns');
const projectTitleText = document.getElementById('projectTitleText');
const projectTitleIcon = document.getElementById('projectTitleIcon');
const backlogPanel = document.getElementById('backlogPanel');
const backlogToggle = document.getElementById('backlogToggle');

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
    ${task.progress ? `<div class="progress-bar"><div class="progress-fill" style="width: ${task.progress}%;"></div></div>` : ''}
  `;

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
  const project = projectData[projectId];

  // Update title bar
  projectTitleText.textContent = project.name;
  projectTitleIcon.className = 'project-title-icon ' + project.color;

  // Update sidebar active state
  document.querySelectorAll('.nav-link[data-project]').forEach(link => {
    link.classList.toggle('active', link.dataset.project === projectId);
  });
  document.querySelectorAll('.nav-link[data-view]').forEach(link => {
    link.classList.remove('active');
  });

  // Render board
  renderBacklog();
  renderKanban();
}

function updateColumnCounts() {
  const project = projectData[currentProject];

  // Backlog count
  backlogCount.textContent = project.backlog.length;

  // Kanban column counts
  kanbanColumns.querySelectorAll('.kanban-column').forEach(col => {
    const status = col.dataset.column;
    const count = project[status].length;
    col.querySelector('.column-count').textContent = count;
  });
}

// ── Drag & Drop ───────────────────────────────────────
let draggedTaskId = null;
let draggedFromStatus = null;

document.addEventListener('dragstart', (e) => {
  const card = e.target.closest('.task-card');
  if (!card) return;

  draggedTaskId = card.dataset.taskId;
  // Determine source zone
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
  document.querySelectorAll('.backlog-cards.drop-zone-active').forEach(z => z.classList.remove('drop-zone-active'));
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

  // Clean progress if moving to done
  if (toStatus === 'done') {
    delete task.progress;
  }

  project[toStatus].push(task);

  // Re-render
  renderBacklog();
  renderKanban();
}

// ── Backlog Toggle ────────────────────────────────────
let backlogCollapsed = false;

backlogToggle.addEventListener('click', () => {
  backlogCollapsed = !backlogCollapsed;
  backlogPanel.classList.toggle('collapsed', backlogCollapsed);
});

// ── Sidebar Navigation ────────────────────────────────
document.querySelectorAll('.nav-link[data-project]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    renderProject(link.dataset.project);
  });
});

document.querySelectorAll('.nav-link[data-view]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
  });
});

// ── Initial Render ────────────────────────────────────
renderProject('website-redesign');
