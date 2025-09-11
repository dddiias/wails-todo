package main

import (
	"encoding/json"
	"errors"
	"os"
	"sync"
	"time"

	"github.com/google/uuid"
)

type Task struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	Done      bool      `json:"done"`
	CreatedAt time.Time `json:"createdAt"`
}

type TaskRepo struct {
	mu    sync.Mutex
	tasks []Task
	file  string
}

func NewTaskRepo(file string) *TaskRepo {
	repo := &TaskRepo{file: file}
	repo.load()
	return repo
}

func (r *TaskRepo) load() {
	r.mu.Lock()
	defer r.mu.Unlock()

	data, err := os.ReadFile(r.file)
	if err != nil {
		if os.IsNotExist(err) {
			r.tasks = []Task{}
			return
		}
		panic(err)
	}
	_ = json.Unmarshal(data, &r.tasks)
}

func (r *TaskRepo) save() {
	data, _ := json.MarshalIndent(r.tasks, "", "  ")
	_ = os.WriteFile(r.file, data, 0644)
}

func (r *TaskRepo) GetTasks() []Task {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.tasks
}

func (r *TaskRepo) AddTask(title string) Task {
	r.mu.Lock()
	defer r.mu.Unlock()
	t := Task{
		ID:        uuid.New().String(),
		Title:     title,
		Done:      false,
		CreatedAt: time.Now(),
	}
	r.tasks = append(r.tasks, t)
	r.save()
	return t
}

func (r *TaskRepo) ToggleTask(id string) (Task, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i, t := range r.tasks {
		if t.ID == id {
			r.tasks[i].Done = !t.Done
			r.save()
			return r.tasks[i], nil
		}
	}
	return Task{}, errors.New("task not found")
}

func (r *TaskRepo) DeleteTask(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i, t := range r.tasks {
		if t.ID == id {
			r.tasks = append(r.tasks[:i], r.tasks[i+1:]...)
			r.save()
			return nil
		}
	}
	return errors.New("task not found")
}
