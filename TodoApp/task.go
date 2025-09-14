package main

import (
	"encoding/json"
	"errors"
	"os"
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

func (s *Store) load() ([]Task, error) {
	b, err := os.ReadFile(s.File)
	if err != nil {
		if os.IsNotExist(err) {
			return []Task{}, nil
		}
		return nil, err
	}
	var items []Task
	if err := json.Unmarshal(b, &items); err != nil {
		return []Task{}, nil
	}
	return items, nil
}

func (s *Store) save(items []Task) error {
	_ = os.MkdirAll(filepathDir(s.File), 0o755)
	data, err := json.MarshalIndent(items, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.File, data, 0o644)
}

func filepathDir(p string) string {
	i := strings.LastIndexAny(p, `/\`)
	if i < 0 {
		return "."
	}
	if i == 0 {
		return string(p[0:1])
	}
	return p[:i]
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
	out := items[:0]
	for _, it := range items {
		if it.ID != id {
			out = append(out, it)
		}
	}
	return out
}

func updateTask(items []Task, id, title string, priority Priority, dueISO string) ([]Task, error) {
	var due time.Time
	if strings.TrimSpace(dueISO) != "" {
		if t, ok := parseDateFlex(dueISO); ok {
			due = t
		}
	}
	for i := range items {
		if items[i].ID == id {
			if strings.TrimSpace(title) != "" {
				items[i].Title = title
			}
			switch strings.ToLower(string(priority)) {
			case "low", "medium", "high":
				items[i].Priority = priority
			}
			items[i].DueAt = due
			return items, nil
		}
	}
	return items, errors.New("Задача не найдена")
}

func parseDateFlex(s string) (time.Time, bool) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, false
	}

	if t, err := time.ParseInLocation("2006-01-02T15:04", s, time.Local); err == nil {
		return t, true
	}
	if t, err := time.ParseInLocation("2006-01-02", s, time.Local); err == nil {
		return t, true
	}
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t, true
	}
	if t, err := time.ParseInLocation("2006-01-02T15:04:05", s, time.Local); err == nil {
		return t, true
	}
	return time.Time{}, false
}

func filterSortSearch(items []Task, scope, sortBy, prio, q, dateScope string) []Task {
	scope = strings.ToLower(strings.TrimSpace(scope))
	sortBy = strings.ToLower(strings.TrimSpace(sortBy))
	prio = strings.ToLower(strings.TrimSpace(prio))
	q = strings.ToLower(strings.TrimSpace(q))
	dateScope = strings.ToLower(strings.TrimSpace(dateScope))

	now := time.Now()
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	res := make([]Task, 0, len(items))
	for _, it := range items {
		switch scope {
		case "active":
			if it.Done {
				continue
			}
		case "done":
			if !it.Done {
				continue
			}
		}

		if prio != "" && prio != "all" && strings.ToLower(string(it.Priority)) != prio {
			continue
		}

		if dateScope != "" && dateScope != "all" {
			switch dateScope {
			case "today":
				if it.DueAt.IsZero() || it.DueAt.Before(start) || !it.DueAt.Before(start.Add(24*time.Hour)) {
					continue
				}
			case "week":
				if it.DueAt.IsZero() || it.DueAt.Before(start) || !it.DueAt.Before(start.AddDate(0, 0, 7)) {
					continue
				}
			case "overdue":
				if it.DueAt.IsZero() || !it.DueAt.Before(now) || it.Done {
					continue
				}
			}
		}

		if q != "" && !strings.Contains(strings.ToLower(it.Title), q) {
			continue
		}

		res = append(res, it)
	}

	sort.SliceStable(res, func(i, j int) bool {
		switch strings.ToLower(sortBy) {
		case "oldest":
			return res[i].Created.Before(res[j].Created)
		case "dueasc":
			zi, zj := res[i].DueAt.IsZero(), res[j].DueAt.IsZero()
			if zi && zj {
				return false
			}
			if zi {
				return false
			}
			if zj {
				return true
			}
			return res[i].DueAt.Before(res[j].DueAt)
		case "duedesc":
			zi, zj := res[i].DueAt.IsZero(), res[j].DueAt.IsZero()
			if zi && zj {
				return false
			}
			if zi {
				return true
			}
			if zj {
				return false
			}
			return res[i].DueAt.After(res[j].DueAt)
		case "prio":
			prioRank := func(p Priority) int {
				switch p {
				case PrioHigh:
					return 0
				case PrioMedium:
					return 1
				default:
					return 2
				}
			}
			return prioRank(res[i].Priority) < prioRank(res[j].Priority)
		default:
			return res[i].Created.After(res[j].Created)
		}
	})

	return res
}
