const titleInput = document.getElementById('titleInput');
const prioSelect = document.getElementById('prioSelect');
const dueInput = document.getElementById('dueInput');
const btnAdd = document.getElementById('btnAdd');

const listActive = document.getElementById('listActive');
const listCompleted = document.getElementById('listCompleted');

const chips = Array.from(document.querySelectorAll('.filters:not(.filters--date) .chip'));
const dateChips = Array.from(document.querySelectorAll('.filters--date .chip'));
const secActive = document.querySelector('.section-active');
const secCompleted = document.querySelector('.section-completed');

const searchInput = document.getElementById('searchInput');
const sortActive = document.getElementById('sortActive');
const sortCompleted = document.getElementById('sortCompleted');
const themeToggle = document.getElementById('themeToggle');

const ui = {
    view: 'all',
    scopeActiveSort: 'newest',
    scopeDoneSort: 'newest',
    query: '',
    dateScope: 'all',
};

const modalDelete = document.getElementById('modalDelete');
const modalDeleteText = document.getElementById('modalDeleteText');
const modalConfirm = document.getElementById('modalConfirm');
const modalCancel = document.getElementById('modalCancel');

let pendingDeleteId = null;

function openDeleteModal(id, title) {
    pendingDeleteId = id;
    modalDeleteText.textContent = title
        ? `Вы уверены, что хотите удалить «${title}»?`
        : 'Вы уверены, что хотите удалить эту задачу?';
    modalDelete.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    modalConfirm.focus();
}

function closeDeleteModal() {
    modalDelete.classList.remove('is-open');
    document.body.style.overflow = '';
    pendingDeleteId = null;
}

modalDelete.addEventListener('click', (e) => {
    if (e.target === modalDelete) closeDeleteModal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalDelete.classList.contains('is-open')) {
        closeDeleteModal();
    }
});

modalCancel.addEventListener('click', () => closeDeleteModal());
modalConfirm.addEventListener('click', async () => {
    if (!pendingDeleteId) return closeDeleteModal();
    await window.go.main.App.DeleteTask(pendingDeleteId);
    closeDeleteModal();
    await renderAll();
});


const root = document.documentElement;
const savedTheme = localStorage.getItem('theme') || 'light';
root.classList.toggle('theme-dark', savedTheme === 'dark');
themeToggle.addEventListener('click', () => {
    const isDark = root.classList.toggle('theme-dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

searchInput.addEventListener('input', (e) => { ui.query = e.target.value.trim(); renderAll(); });
sortActive.addEventListener('change', (e) => { ui.scopeActiveSort = e.target.value; renderAll(); });
sortCompleted.addEventListener('change', (e) => { ui.scopeDoneSort = e.target.value; renderAll(); });

chips.forEach(ch => ch.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('is-active'));
    ch.classList.add('is-active');
    ui.view = ch.dataset.view;
    renderAll();
}));

dateChips.forEach(ch => ch.addEventListener('click', () => {
    dateChips.forEach(c => c.classList.remove('is-active'));
    ch.classList.add('is-active');
    ui.dateScope = ch.dataset.date;
    renderAll();
}));

btnAdd.addEventListener('click', async () => {
    const title = (titleInput.value || '').trim();
    const prio = prioSelect.value || 'low';
    const due = dueInput.value || '';

    if (!title) {
        alert('Название задачи не может быть пустым.');
        return;
    }
    try {
        await window.go.main.App.AddTask(title, due, prio);
        titleInput.value = '';
        dueInput.value = '';
        prioSelect.value = 'low';
        await renderAll();
    } catch (e) {
        alert(e);
    }
});

async function onToggle(id) {
    await window.go.main.App.ToggleTask(id);
    await renderAll();
}

async function onInlineEdit(task, li) {
    const actions = li.querySelector('.actions');
    if (actions) actions.style.display = 'none';

    const row = document.createElement('div');
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '1fr 140px 210px 100px 100px';
    row.style.gap = '8px';
    row.style.marginTop = '8px';

    const titleI = document.createElement('input');
    titleI.className = 'input';
    titleI.value = task.title;

    const prioI = document.createElement('select');
    prioI.className = 'input';
    prioI.innerHTML = `
    <option value="low">low</option>
    <option value="medium">medium</option>
    <option value="high">high</option>`;
    prioI.value = (task.priority || 'low').toLowerCase();

    const dueI = document.createElement('input');
    dueI.className = 'input';
    dueI.type = 'datetime-local';
    try {
        dueI.value = task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 16) : '';
    } catch (_) { dueI.value = ''; }

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn';
    saveBtn.textContent = 'Save';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn';
    cancelBtn.textContent = 'Cancel';

    row.appendChild(titleI);
    row.appendChild(prioI);
    row.appendChild(dueI);
    row.appendChild(saveBtn);
    row.appendChild(cancelBtn);
    li.appendChild(row);

    const cleanup = () => {
        renderAll();
    };

    saveBtn.addEventListener('click', async () => {
        await window.go.main.App.UpdateTask(task.id, titleI.value, prioI.value, dueI.value);
        cleanup();
    });

    cancelBtn.addEventListener('click', cleanup);
}

function badgeForPrio(p) {
    const span = document.createElement('span');
    span.className = 'badge ' + (p === 'high' ? 'badge--prio-high' :
        p === 'medium' ? 'badge--prio-medium' : 'badge--prio-low');
    span.textContent = p || 'low';
    return span;
}

function badgeForDue(iso) {
    if (!iso) return null;
    try {
        const dt = new Date(iso);
        if (!isFinite(dt.getTime()) || dt.getFullYear() <= 1) return null;
        const span = document.createElement('span');
        span.className = 'badge badge--due';
        span.textContent = dt.toLocaleString();
        return span;
    } catch (_) {
        return null;
    }
}

function itemView(task) {
    const li = document.createElement('li');
    li.className = 'item' + (task.done ? ' is-done' : '');

    try {
        if (!task.done && task.dueAt && new Date(task.dueAt) < new Date()) {
            li.classList.add('overdue');
        }
    } catch (_) { }

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = task.title;

    const badges = document.createElement('div');
    badges.className = 'badges';
    badges.appendChild(badgeForPrio((task.priority || 'low').toLowerCase()));
    const dueBadge = badgeForDue(task.dueAt);
    if (dueBadge) badges.appendChild(dueBadge);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const btnToggle = document.createElement('button');
    btnToggle.className = 'action';
    btnToggle.textContent = task.done ? 'Undo' : 'Done';
    btnToggle.addEventListener('click', () => onToggle(task.id));

    const btnEdit = document.createElement('button');
    btnEdit.className = 'action';
    btnEdit.textContent = 'Edit';
    btnEdit.addEventListener('click', () => onInlineEdit(task, li));

    const btnDelete = document.createElement('button');
    btnDelete.className = 'action action--danger';
    btnDelete.textContent = 'Delete';
    btnDelete.addEventListener('click', () => openDeleteModal(task.id, task.title));

    actions.appendChild(btnToggle);
    actions.appendChild(btnEdit);
    actions.appendChild(btnDelete);

    li.appendChild(title);
    li.appendChild(badges);
    li.appendChild(actions);
    return li;
}

async function renderAll() {
    secActive.style.display = (ui.view === 'all' || ui.view === 'active') ? '' : 'none';
    secCompleted.style.display = (ui.view === 'all' || ui.view === 'completed') ? '' : 'none';

    if (ui.view !== 'completed') {
        const itemsA = await window.go.main.App.FilterTasks('active', ui.scopeActiveSort, 'all', ui.query, ui.dateScope);
        listActive.innerHTML = '';
        itemsA.forEach(t => listActive.appendChild(itemView(t, 'active')));
    }

    if (ui.view !== 'active') {
        const itemsD = await window.go.main.App.FilterTasks('done', ui.scopeDoneSort, 'all', ui.query, ui.dateScope);
        listCompleted.innerHTML = '';
        itemsD.forEach(t => listCompleted.appendChild(itemView(t, 'done')));
    }
}

renderAll();
