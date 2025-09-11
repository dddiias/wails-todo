package main

import (
	"context"
)

type App struct {
	ctx  context.Context
	repo *TaskRepo
}

func NewApp() *App {
	return &App{
		repo: NewTaskRepo("tasks.json"),
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) GetTasks() []Task {
	return a.repo.GetTasks()
}

func (a *App) AddTask(title string) Task {
	return a.repo.AddTask(title)
}

func (a *App) ToggleTask(id string) (Task, error) {
	return a.repo.ToggleTask(id)
}

func (a *App) DeleteTask(id string) error {
	return a.repo.DeleteTask(id)
}
