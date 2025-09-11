import './style.css';

document.addEventListener('DOMContentLoaded', () => {

    const taskInput = document.getElementById('taskInput');
    const addBtn = document.getElementById('addBtn');
    const taskList = document.getElementById('taskList');
    const modal = document.getElementById('modal');
    const confirmYes = document.getElementById('confirmYes');
    const confirmNo = document.getElementById('confirmNo');

    if (!taskInput || !addBtn || !taskList) {
        console.error('UI elements not found');
        return;
    }
    if (!modal || !confirmYes || !confirmNo) {
        console.error('Modal elements not found');
        return;
    }

    let confirmCb = null;
    const openConfirm = (onYes) => {
        confirmCb = onYes;
        modal.classList.remove('hidden');
    };
    const closeConfirm = () => {
        modal.classList.add('hidden');
        confirmCb = null;
    };
    confirmYes.addEventListener('click', () => { if (confirmCb) confirmCb(); });
    confirmNo.addEventListener('click', closeConfirm);

    function createTaskItem(text) {
        const li = document.createElement('li');

        const title = document.createElement('span');
        title.textContent = text;
        title.addEventListener('click', () => li.classList.toggle('done'));

        const del = document.createElement('button');
        del.className = 'del';
        del.textContent = '✕';
        del.addEventListener('click', (e) => {
            e.stopPropagation();
            openConfirm(() => {
                li.remove();
                closeConfirm();
            });
        });

        li.appendChild(title);
        li.appendChild(del);
        return li;
    }

    const addTask = () => {
        const text = taskInput.value.trim();
        if (!text) {
            alert('Введите текст задачи!');
            taskInput.focus();
            return;
        }
        taskList.appendChild(createTaskItem(text));
        taskInput.value = '';
        taskInput.focus();
    };

    addBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addTask();
    });
});