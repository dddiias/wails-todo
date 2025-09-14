package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

type App struct {
	store *Store
}

func NewApp() *App {
	wd, err := os.Getwd()
	if err != nil {
		wd = "."
	}
	return &App{
		store: &Store{File: filepath.Join(wd, "tasks.json")},
	}
}

func (a *App) FilterTasks(scope, sortBy, prio, q, dateScope string) ([]Task, error) {
	items, err := a.store.load()
	if err != nil {
		return nil, err
	}
	res := filterSortSearch(items, scope, sortBy, prio, q, dateScope)
	return res, nil
}

func (a *App) AddTask(title, dueISO, prio string) error {
	items, err := a.store.load()
	if err != nil {
		return err
	}
	if strings.TrimSpace(title) == "" {
		return fmt.Errorf("title is required")
	}

	var due time.Time
	if strings.TrimSpace(dueISO) != "" {
		if t, ok := parseDateFlex(dueISO); ok {
			due = t
		}
	}

	p := Priority(strings.ToLower(strings.TrimSpace(prio)))
	if p != PrioLow && p != PrioMedium && p != PrioHigh {
		p = PrioLow
	}

	items = addTask(items, Task{
		ID:       uuid.NewString(),
		Title:    title,
		Done:     false,
		Priority: p,
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
