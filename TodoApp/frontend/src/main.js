import './style.css';

console.log("main.js loaded");

document.addEventListener("DOMContentLoaded", () => {
    const taskInput = document.getElementById("taskInput");
    const addBtn = document.getElementById("addBtn");
    const taskList = document.getElementById("taskList");

    if (!taskInput || !addBtn || !taskList) {
        console.error("UI elements not found");
        return;
    }

    addBtn.addEventListener("click", () => {
        const text = taskInput.value.trim();
        if (!text) {
            alert("Введите текст задачи!");
            taskInput.focus();
            return;
        }

        const li = document.createElement("li");
        li.textContent = text;

        li.addEventListener("click", () => li.classList.toggle("done"));

        taskList.appendChild(li);
        taskInput.value = "";
        taskInput.focus();
    });
});



