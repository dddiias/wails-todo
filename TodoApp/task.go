package main

import (
	"encoding/json"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

type TaskDTO struct {
	ID        string  `json:"id"`
	Title     string  `json:"title"`
	Done      bool    `json:"done"`
	Priority  string  `json:"priority"`
	DueAt     *string `json:"dueAt,omitempty"`
	CreatedAt string  `json:"createdAt"`
}

type task struct {
	ID        string
	Title     string
	Done      bool
	Priority  string
	DueAt     *time.Time
	CreatedAt time.Time
}

func toDTO(t task) TaskDTO {
	var due *string
	if t.DueAt != nil {
		s := t.DueAt.Format("2006-01-02")
		due = &s
	}
	return TaskDTO{
		ID:        t.ID,
		Title:     t.Title,
		Done:      t.Done,
		Priority:  t.Priority,
		DueAt:     due,
		CreatedAt: t.CreatedAt.Format(time.RFC3339),
	}
}

func fromDTO(d TaskDTO) task {
	var due *time.Time
	if d.DueAt != nil && *d.DueAt != "" {
		if tt, err := time.Parse("2006-01-02", *d.DueAt); err == nil {
			due = &tt
		} else if tt2, err2 := time.Parse(time.RFC3339, *d.DueAt); err2 == nil {
			due = &tt2
		}
	}
	created := time.Now()
	if d.CreatedAt != "" {
		if tt, err := time.Parse(time.RFC3339, d.CreatedAt); err == nil {
			created = tt
		}
	}
	pr := normalizePriority(d.Priority)

	return task{
		ID:        d.ID,
		Title:     d.Title,
		Done:      d.Done,
		Priority:  pr,
		DueAt:     due,
		CreatedAt: created,
	}
}

type TaskRepo struct {
	mu    sync.Mutex
	tasks []task
	file  string
}

func NewTaskRepo(filename string) *TaskRepo {
	r := &TaskRepo{file: filename}
	r.load()
	return r
}

func (r *TaskRepo) load() {
	r.mu.Lock()
	defer r.mu.Unlock()

	data, err := os.ReadFile(r.file)
	if err != nil {
		if os.IsNotExist(err) {
			r.tasks = []task{}
			return
		}
		panic(err)
	}

	var dtos []TaskDTO
	if err := json.Unmarshal(data, &dtos); err != nil {
		r.tasks = []task{}
		return
	}
	r.tasks = make([]task, 0, len(dtos))
	for _, d := range dtos {
		r.tasks = append(r.tasks, fromDTO(d))
	}
}

func (r *TaskRepo) save() {
	dtos := make([]TaskDTO, 0, len(r.tasks))
	for _, t := range r.tasks {
		dtos = append(dtos, toDTO(t))
	}
	data, _ := json.MarshalIndent(dtos, "", "  ")
	_ = os.WriteFile(r.file, data, 0644)
}

func parseDate(iso string) *time.Time {
	if iso == "" {
		return nil
	}
	if len(iso) == 10 {
		if t, err := time.Parse("2006-01-02", iso); err == nil {
			return &t
		}
	}
	if t, err := time.Parse(time.RFC3339, iso); err == nil {
		return &t
	}
	return nil
}

func normalizePriority(s string) string {
	switch strings.ToLower(s) {
	case "high":
		return "high"
	case "medium":
		return "medium"
	default:
		return "low"
	}
}

var prioOrder = map[string]int{"high": 3, "medium": 2, "low": 1}

func sameDay(a, b time.Time) bool {
	return a.Year() == b.Year() && a.YearDay() == b.YearDay()
}

func (r *TaskRepo) AddTask(title, dueAtISO, priority string) TaskDTO {
	r.mu.Lock()
	defer r.mu.Unlock()

	t := task{
		ID:        uuid.New().String(),
		Title:     title,
		Done:      false,
		Priority:  normalizePriority(priority),
		DueAt:     parseDate(dueAtISO),
		CreatedAt: time.Now(),
	}
	r.tasks = append(r.tasks, t)
	r.save()
	return toDTO(t)
}

func (r *TaskRepo) FilterTasks(status, order, dateF string) []TaskDTO {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	endOfWeek := startOfDay.AddDate(0, 0, 7)

	selected := make([]task, 0, len(r.tasks))
	for _, t := range r.tasks {
		switch status {
		case "active":
			if t.Done {
				continue
			}
		case "completed":
			if !t.Done {
				continue
			}
		}

		switch dateF {
		case "today":
			if t.DueAt == nil || !sameDay(*t.DueAt, startOfDay) {
				continue
			}
		case "week":
			if t.DueAt == nil || t.DueAt.Before(startOfDay) || t.DueAt.After(endOfWeek) {
				continue
			}
		case "overdue":
			if t.DueAt == nil || !t.DueAt.Before(startOfDay) {
				continue
			}
		}

		selected = append(selected, t)
	}

	sort.Slice(selected, func(i, j int) bool {
		switch order {
		case "oldest":
			return selected[i].CreatedAt.Before(selected[j].CreatedAt)
		case "priority":
			wi := prioOrder[selected[i].Priority]
			wj := prioOrder[selected[j].Priority]
			if wi == wj {
				return selected[i].CreatedAt.After(selected[j].CreatedAt)
			}
			return wi > wj
		default:
			return selected[i].CreatedAt.After(selected[j].CreatedAt)
		}
	})

	out := make([]TaskDTO, 0, len(selected))
	for _, t := range selected {
		out = append(out, toDTO(t))
	}
	return out
}

func (r *TaskRepo) ToggleTask(id string) (TaskDTO, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i := range r.tasks {
		if r.tasks[i].ID == id {
			r.tasks[i].Done = !r.tasks[i].Done
			r.save()
			return toDTO(r.tasks[i]), true
		}
	}
	return TaskDTO{}, false
}

func (r *TaskRepo) DeleteTask(id string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i := range r.tasks {
		if r.tasks[i].ID == id {
			r.tasks = append(r.tasks[:i], r.tasks[i+1:]...)
			r.save()
			return true
		}
	}
	return false
}
