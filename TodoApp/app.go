package main

type App struct {
	repo *TaskRepo
}

func NewApp() *App {
	return &App{repo: NewTaskRepo("tasks.json")}
}

func (a *App) AddTask(title, dueAtISO, priority string) TaskDTO {
	return a.repo.AddTask(title, dueAtISO, priority)
}

func (a *App) FilterTasks(status, order, dateF string) []TaskDTO {
	return a.repo.FilterTasks(status, order, dateF)
}

func (a *App) ToggleTask(id string) (TaskDTO, bool) {
	return a.repo.ToggleTask(id)
}

func (a *App) DeleteTask(id string) bool {
	return a.repo.DeleteTask(id)
}
