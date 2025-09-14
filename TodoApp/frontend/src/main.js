import './style.css';
import { AddTask, DeleteTask, ToggleTask, FilterTasks, UpdateTask } from '../wailsjs/go/main/App';

document.addEventListener('DOMContentLoaded', async () => {
    const taskInput = document.getElementById('taskInput');
    const dueInput = document.getElementById('dueInput');
    const prioInput = document.getElementById('priorityInput');
    const addBtn = document.getElementById('addBtn');

    const listActive = document.getElementById('taskListActive');
    const listCompleted = document.getElementById('taskListCompleted');

    const btnAll = document.getElementById('fltAll');
    const btnAct = document.getElementById('fltActive');
    const btnDone = document.getElementById('fltCompleted');
    const secAct = document.querySelector('.section-active');
    const secDone = document.querySelector('.section-completed');

    let ui = {
        scopeActiveSort: 'newest',
        scopeDoneSort: 'newest',
        prioFilter: 'all',
        query: '',
        scopeView: 'all',
    };

    const modal = document.getElementById('modal');
    const confirmYes = document.getElementById('confirmYes');
    const confirmNo = document.getElementById('confirmNo');
    let confirmCb = null;
    function openConfirm(onYes) { confirmCb = onYes; modal.classList.remove('hidden'); }
    function closeConfirm() { modal.classList.add('hidden'); confirmCb = null; }
    confirmYes.addEventListener('click', () => { if (confirmCb) confirmCb(); });
    confirmNo.addEventListener('click', closeConfirm);

    function setFilterChips(mode) {
        ui.scopeView = mode;
        [btnAll, btnAct, btnDone].forEach(b => b.classList.remove('is-active'));
        if (mode === 'all') btnAll.classList.add('is-active');
        if (mode === 'active') btnAct.classList.add('is-active');
        if (mode === 'completed') btnDone.classList.add('is-active');

        secAct.classList.toggle('hidden', mode === 'completed');
        secDone.classList.toggle('hidden', mode === 'active');
    }

    btnAll.addEventListener('click', () => setFilterChips('all'));
    btnAct.addEventListener('click', () => setFilterChips('active'));
    btnDone.addEventListener('click', () => setFilterChips('completed'));

    function renderItem(container, task, { allowToggle, showUndo }) {
        const li = document.createElement('li');
        li.className = 'item' + (task.done ? ' item--done' : '');

        const left = document.createElement('div');
        left.className = 'item__left';

        const title = document.createElement('span');
        title.className = 'item__title';
        title.textContent = task.title;

        const badgePrio = document.createElement('span');
        badgePrio.className = 'badge badge--' + (task.priority || 'low');
        badgePrio.textContent = task.priority || 'low';

        const badgeDue = document.createElement('span');
        badgeDue.className = 'chip';
        badgeDue.textContent = task.dueAt ? new Date(task.dueAt).toLocaleDateString() : 'no date';

        if (allowToggle) {
            title.addEventListener('click', async () => {
                try {
                    await ToggleTask(task.id);
                    await renderAll();
                } catch (e) {
                    console.error(e); alert('Toggle error: ' + (e.message || e));
                }
            });
        }

        left.appendChild(title);
        left.appendChild(badgePrio);
        left.appendChild(badgeDue);

        const actions = document.createElement('div');
        actions.className = 'actions';

        if (showUndo) {
            const undo = document.createElement('button');
            undo.className = 'btn btn--ghost action undo';
            undo.textContent = 'Undo';
            undo.addEventListener('click', async () => {
                try {
                    await ToggleTask(task.id);
                    await renderAll();
                } catch (e) {
                    console.error(e); alert('Undo error: ' + (e.message || e));
                }
            });
            actions.appendChild(undo);
        }

        const editBtn = document.createElement('button');
        editBtn.className = 'btn';
        editBtn.textContent = 'Edit';

        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn--danger action del';
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openConfirm(async () => {
                try {
                    await DeleteTask(task.id);
                    closeConfirm();
                    await renderAll();
                } catch (err) {
                    console.error(err); alert('Delete error: ' + (err.message || err));
                }
            });
        });

        const titleInput = document.createElement('input');
        titleInput.className = 'input';
        titleInput.value = task.title;

        const dueInputInline = document.createElement('input');
        dueInputInline.type = 'date';
        dueInputInline.className = 'input';
        dueInputInline.value = task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 10) : '';

        const prioSelect = document.createElement('select');
        prioSelect.className = 'input';
        prioSelect.innerHTML = `
      <option value="low">low</option>
      <option value="medium">medium</option>
      <option value="high">high</option>`;
        prioSelect.value = task.priority || 'low';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn--primary';
        saveBtn.textContent = 'Save';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn';
        cancelBtn.textContent = 'Cancel';

        let editing = false;
        function setEditMode(on) {
            editing = on;
            left.innerHTML = '';
            actions.innerHTML = '';
            if (editing) {
                left.appendChild(titleInput);
                left.appendChild(prioSelect);
                left.appendChild(dueInputInline);
                actions.appendChild(saveBtn);
                actions.appendChild(cancelBtn);
            } else {
                left.appendChild(title);
                left.appendChild(badgePrio);
                left.appendChild(badgeDue);
                if (showUndo) {
                    const undo = document.createElement('button');
                    undo.className = 'btn btn--ghost action undo';
                    undo.textContent = 'Undo';
                    undo.addEventListener('click', async () => {
                        try { await ToggleTask(task.id); await renderAll(); }
                        catch (e) { console.error(e); alert('Undo error: ' + (e.message || e)); }
                    });
                    actions.appendChild(undo);
                }
                actions.appendChild(editBtn);
                actions.appendChild(delBtn);
            }
        }
        setEditMode(false);

        editBtn.addEventListener('click', () => setEditMode(true));
        cancelBtn.addEventListener('click', () => setEditMode(false));
        saveBtn.addEventListener('click', async () => {
            const newTitle = titleInput.value.trim();
            const newPrio = prioSelect.value;
            const newDue = dueInputInline.value;
            if (!newTitle) return alert('Empty title');
            try {
                await UpdateTask(task.id, newTitle, newPrio, newDue);
                await renderAll();
            } catch (e) {
                console.error(e); alert('Update error: ' + (e.message || e));
            }
        });

        li.appendChild(left);
        li.appendChild(actions);
        container.appendChild(li);
    }

    async function renderAll() {
        listActive.innerHTML = '';
        listCompleted.innerHTML = '';
        try {
            const act = await FilterTasks('active', ui.scopeActiveSort, ui.prioFilter, ui.query);
            act.forEach(t => renderItem(listActive, t, { allowToggle: true, showUndo: false }));
            const done = await FilterTasks('completed', ui.scopeDoneSort, ui.prioFilter, ui.query);
            done.forEach(t => renderItem(listCompleted, t, { allowToggle: false, showUndo: true }));
        } catch (e) {
            console.error(e);
            alert('Load error (FilterTasks): ' + (e.message || e));
        }
    }

    async function handleAdd() {
        const text = taskInput.value.trim();
        if (!text) return alert('Введите текст!');
        try {
            await AddTask(text, dueInput.value, prioInput.value);
            taskInput.value = ''; dueInput.value = ''; prioInput.value = 'low';
            await renderAll();
        } catch (e) {
            console.error(e);
            alert('Add error: ' + (e.message || e));
        }
    }

    addBtn.addEventListener('click', handleAdd);
    taskInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAdd(); });

    setFilterChips('all');
    await renderAll();
});
