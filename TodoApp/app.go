package main

import (
	"time"

	"github.com/google/uuid"
)

type App struct {
	store *Store
}

func NewApp() *App {
	return &App{
		store: &Store{File: "tasks.json"},
	}
}

func (a *App) AddTask(title, dueISO, prio string) error {
	items, err := a.store.load()
	if err != nil {
		return err
	}
	var due time.Time
	if dueISO != "" {
		if t, err := time.Parse("2006-01-02", dueISO); err == nil {
			due = t
		}
	}
	items = addTask(items, Task{
		ID:       uuid.NewString(),
		Title:    title,
		Done:     false,
		Priority: Priority(prio),
		DueAt:    due,
		Created:  time.Now(),
	})
	return a.store.save(items)
}

func (a *App) ToggleTask(id string) error {
	items, err := a.store.load()
	if err != nil {
		return err
	}
	items = toggleTask(items, id)
	return a.store.save(items)
}

func (a *App) DeleteTask(id string) error {
	items, err := a.store.load()
	if err != nil {
		return err
	}
	items = deleteTask(items, id)
	return a.store.save(items)
}

func (a *App) UpdateTask(id, title, prio, dueISO string) error {
	items, err := a.store.load()
	if err != nil {
		return err
	}
	items, err = updateTask(items, id, title, Priority(prio), dueISO)
	if err != nil {
		return err
	}
	return a.store.save(items)
}

func (a *App) FilterTasks(scope, sortBy, prio, q string) ([]Task, error) {
	items, err := a.store.load()
	if err != nil {
		return nil, err
	}
	return filterSortSearch(items, scope, sortBy, prio, q), nil
}
