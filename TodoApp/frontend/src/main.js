import './style.css';
import { AddTask, GetTasks, DeleteTask, ToggleTask } from '../wailsjs/go/main/App';

document.addEventListener('DOMContentLoaded', async () => {
    const taskInput = document.getElementById('taskInput');
    const addBtn = document.getElementById('addBtn');
    const taskList = document.getElementById('taskList');

    const modal = document.getElementById('modal');
    const confirmYes = document.getElementById('confirmYes');
    const confirmNo = document.getElementById('confirmNo');

    let confirmCb = null;
    function openConfirm(onYes) {
        confirmCb = onYes;
        modal.classList.remove('hidden');
    }
    function closeConfirm() {
        modal.classList.add('hidden');
        confirmCb = null;
    }
    confirmYes.addEventListener('click', () => { if (confirmCb) confirmCb(); });
    confirmNo.addEventListener('click', closeConfirm);

    function renderTask(task) {
        const li = document.createElement('li');
        if (task.done) li.classList.add('done');

        const title = document.createElement('span');
        title.textContent = task.title;
        title.addEventListener('click', async () => {
            const updated = await ToggleTask(task.id);
            li.classList.toggle('done', updated.done);
        });

        const del = document.createElement('button');
        del.className = 'del';
        del.textContent = '✕';
        del.addEventListener('click', (e) => {
            e.stopPropagation();
            openConfirm(async () => {
                await DeleteTask(task.id);
                li.remove();
                closeConfirm();
            });
        });

        li.appendChild(title);
        li.appendChild(del);
        taskList.appendChild(li);
    }

    const tasks = await GetTasks();
    tasks.forEach(renderTask);

    async function handleAdd() {
        const text = taskInput.value.trim();
        if (!text) return alert('Введите текст!');
        const task = await AddTask(text);
        renderTask(task);
        taskInput.value = '';
    }

    addBtn.addEventListener('click', handleAdd);
    taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAdd();
    });
});
