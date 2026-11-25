package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
)

type cache struct {
	sync.RWMutex
	values map[string]string
}

func newHandler() http.Handler {
	store := &cache{values: make(map[string]string)}
	mux := http.NewServeMux()
	mux.HandleFunc("/api/value", func(w http.ResponseWriter, r *http.Request) {
		key := r.URL.Query().Get("key")
		if key == "" {
			http.Error(w, `{"error":"key is required"}`, http.StatusBadRequest)
			return
		}
		switch r.Method {
		case http.MethodGet:
			store.RLock()
			value, exists := store.values[key]
			store.RUnlock()
			w.Header().Set("Content-Type", "application/json")
			if !exists {
				_, _ = w.Write([]byte("null\n"))
				return
			}
			_ = json.NewEncoder(w).Encode(value)
		case http.MethodPut:
			var input struct {
				Value *string `json:"value"`
			}
			decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
			decoder.DisallowUnknownFields()
			if decoder.Decode(&input) != nil || input.Value == nil {
				http.Error(w, `{"error":"value must be a string"}`, http.StatusBadRequest)
				return
			}
			store.Lock()
			store.values[key] = *input.Value
			store.Unlock()
			w.WriteHeader(http.StatusNoContent)
		default:
			w.Header().Set("Allow", "GET, PUT")
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
	})
	return mux
}

func main() { log.Fatal(http.ListenAndServe(":8080", newHandler())) }
