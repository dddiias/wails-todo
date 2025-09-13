import './style.css';
import { AddTask, DeleteTask, ToggleTask, FilterTasks } from '../wailsjs/go/main/App';

document.addEventListener('DOMContentLoaded', async () => {
    const taskInput = document.getElementById('taskInput');
    const dueInput = document.getElementById('dueInput');
    const prioInput = document.getElementById('priorityInput');
    const addBtn = document.getElementById('addBtn');
    const listActive = document.getElementById('taskListActive');
    const listCompleted = document.getElementById('taskListCompleted');

    const modal = document.getElementById('modal');
    const confirmYes = document.getElementById('confirmYes');
    const confirmNo = document.getElementById('confirmNo');
    let confirmCb = null;
    function openConfirm(onYes) { confirmCb = onYes; modal.classList.remove('hidden'); }
    function closeConfirm() { modal.classList.add('hidden'); confirmCb = null; }
    confirmYes.addEventListener('click', () => { if (confirmCb) confirmCb(); });
    confirmNo.addEventListener('click', closeConfirm);

    function renderItem(container, task, { allowToggle, showUndo }) {
        const li = document.createElement('li');
        if (task.done) li.classList.add('done');

        const title = document.createElement('span');
        title.textContent = task.title;
        if (task.priority) title.textContent += ` [${task.priority}]`;
        if (task.dueAt) title.textContent += ` (${new Date(task.dueAt).toLocaleDateString()})`;

        if (allowToggle) {
            title.addEventListener('click', async () => {
                await ToggleTask(task.id);
                await renderAll();
            });
        }

        const del = document.createElement('button');
        del.className = 'btn btn--danger'; del.textContent = 'Delete';
        del.addEventListener('click', (e) => {
            e.stopPropagation();
            openConfirm(async () => {
                await DeleteTask(task.id);
                closeConfirm();
                await renderAll();
            });
        });

        li.appendChild(title);
        if (showUndo) {
            const undo = document.createElement('button');
            undo.className = 'btn btn--ghost'; undo.textContent = 'Undo';
            undo.addEventListener('click', async () => {
                await ToggleTask(task.id);
                await renderAll();
            });
            li.appendChild(undo);
        }
        li.appendChild(del);
        container.appendChild(li);
    }

    async function renderAll() {
        listActive.innerHTML = '';
        listCompleted.innerHTML = '';
        const act = await FilterTasks('active', 'newest', 'all');
        act.forEach(t => renderItem(listActive, t, { allowToggle: true, showUndo: false }));
        const done = await FilterTasks('completed', 'newest', 'all');
        done.forEach(t => renderItem(listCompleted, t, { allowToggle: false, showUndo: true }));
    }

    async function handleAdd() {
        const text = taskInput.value.trim();
        if (!text) return alert('Введите текст!');
        const due = dueInput.value;
        const pr = prioInput.value;
        await AddTask(text, due, pr);
        taskInput.value = ''; dueInput.value = ''; prioInput.value = 'low';
        await renderAll();
    }

    addBtn.addEventListener('click', handleAdd);
    taskInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAdd(); });

    await renderAll();
});
