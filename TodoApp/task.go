package main

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

type Priority string

const (
	PrioLow    Priority = "low"
	PrioMedium Priority = "medium"
	PrioHigh   Priority = "high"
)

type Task struct {
	ID       string    `json:"id"`
	Title    string    `json:"title"`
	Done     bool      `json:"done"`
	Priority Priority  `json:"priority"`
	DueAt    time.Time `json:"dueAt"`
	Created  time.Time `json:"created"`
}

type Store struct {
	File string
}

func parseDateFlex(s string) (time.Time, bool) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, false
	}
	layouts := []string{
		time.RFC3339,
		"2006-01-02",
		"02.01.2006",
		"02-01-2006",
	}
	for _, l := range layouts {
		if t, err := time.Parse(l, s); err == nil {
			return t, true
		}
	}
	return time.Time{}, false
}

func (s *Store) load() ([]Task, error) {
	b, err := os.ReadFile(s.File)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return []Task{}, nil
		}
		return nil, err
	}
	if len(b) == 0 {
		return []Task{}, nil
	}

	var items []Task
	if err := json.Unmarshal(b, &items); err == nil {
		return items, nil
	}

	type legacyTask struct {
		ID       string `json:"id"`
		Title    string `json:"title"`
		Done     bool   `json:"done"`
		Priority string `json:"priority"`
		DueAt    string `json:"dueAt"`
		Created  string `json:"created"`
	}
	var old []legacyTask
	if err := json.Unmarshal(b, &old); err != nil {
		return nil, err
	}
	items = make([]Task, 0, len(old))
	for _, o := range old {
		var due time.Time
		if t, ok := parseDateFlex(o.DueAt); ok {
			due = t
		}
		created := time.Now()
		if t, ok := parseDateFlex(o.Created); ok {
			created = t
		}
		items = append(items, Task{
			ID:       o.ID,
			Title:    o.Title,
			Done:     o.Done,
			Priority: Priority(strings.ToLower(strings.TrimSpace(o.Priority))),
			DueAt:    due,
			Created:  created,
		})
	}
	return items, nil
}

func (s *Store) save(items []Task) error {
	dir := filepath.Dir(s.File)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	b, err := json.MarshalIndent(items, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.File, b, 0o644)
}

func addTask(items []Task, t Task) []Task {
	return append(items, t)
}

func toggleTask(items []Task, id string) []Task {
	for i := range items {
		if items[i].ID == id {
			items[i].Done = !items[i].Done
			break
		}
	}
	return items
}

func deleteTask(items []Task, id string) []Task {
	out := make([]Task, 0, len(items))
	for _, t := range items {
		if t.ID != id {
			out = append(out, t)
		}
	}
	return out
}

func updateTask(items []Task, id, title string, priority Priority, dueISO string) ([]Task, error) {
	var due time.Time
	if strings.TrimSpace(dueISO) != "" {
		dt, err := time.Parse("2006-01-02", dueISO)
		if err != nil {
			return nil, err
		}
		due = dt
	}
	for i := range items {
		if items[i].ID == id {
			if title != "" {
				items[i].Title = title
			}
			if priority != "" {
				items[i].Priority = priority
			}
			items[i].DueAt = due
			return items, nil
		}
	}
	return nil, errors.New("task not found")
}

func filterSortSearch(items []Task, scope string, sortBy string, prio string, q string) []Task {
	res := make([]Task, 0, len(items))
	for _, t := range items {
		if scope == "active" && t.Done {
			continue
		}
		if scope == "completed" && !t.Done {
			continue
		}
		if prio != "" && prio != "all" && string(t.Priority) != prio {
			continue
		}
		if q != "" && !strings.Contains(strings.ToLower(t.Title), strings.ToLower(q)) {
			continue
		}
		res = append(res, t)
	}

	sort.Slice(res, func(i, j int) bool {
		switch sortBy {
		case "oldest":
			return res[i].Created.Before(res[j].Created)
		case "dueAsc":
			return res[i].DueAt.Before(res[j].DueAt)
		case "dueDesc":
			return res[i].DueAt.After(res[j].DueAt)
		case "prio":
			ord := map[Priority]int{PrioHigh: 0, PrioMedium: 1, PrioLow: 2}
			return ord[res[i].Priority] < ord[res[j].Priority]
		default:
			return res[i].Created.After(res[j].Created)
		}
	})
	return res
}
