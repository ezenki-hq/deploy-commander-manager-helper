package main

import (
	"bytes"
	"embed"
	"encoding/json"
	"io"
	"io/fs"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

//go:embed web/dist
var assets embed.FS

func newHandler(origin *url.URL, client *http.Client, page fs.FS) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/value", func(w http.ResponseWriter, r *http.Request) {
		key := r.URL.Query().Get("key")
		if key == "" || (r.Method != http.MethodGet && r.Method != http.MethodPut) {
			http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
			return
		}
		var body io.Reader
		if r.Method == http.MethodPut {
			data, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 1<<20))
			if err != nil {
				http.Error(w, "invalid body", http.StatusBadRequest)
				return
			}
			var value struct {
				Value *string `json:"value"`
			}
			if json.Unmarshal(data, &value) != nil || value.Value == nil {
				http.Error(w, "value must be a string", http.StatusBadRequest)
				return
			}
			body = bytes.NewReader(data)
		}
		upstream := *origin
		upstream.Path = strings.TrimRight(origin.Path, "/") + "/api/value"
		query := url.Values{}
		query.Set("key", key)
		upstream.RawQuery = query.Encode()
		request, _ := http.NewRequestWithContext(r.Context(), r.Method, upstream.String(), body)
		if body != nil {
			request.Header.Set("Content-Type", "application/json")
		}
		response, err := client.Do(request)
		if err != nil {
			http.Error(w, "cache unavailable", http.StatusBadGateway)
			return
		}
		defer response.Body.Close()
		if r.Method == http.MethodPut {
			if response.StatusCode != http.StatusNoContent {
				http.Error(w, "cache rejected write", http.StatusBadGateway)
				return
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if response.StatusCode != http.StatusOK {
			http.Error(w, "cache rejected read", http.StatusBadGateway)
			return
		}
		var value any
		decoder := json.NewDecoder(io.LimitReader(response.Body, 1<<20))
		if decoder.Decode(&value) != nil || (value != nil && func() bool { _, ok := value.(string); return !ok }()) {
			http.Error(w, "invalid cache response", http.StatusBadGateway)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(value)
	})
	static, _ := fs.Sub(page, "web/dist")
	mux.Handle("/", http.FileServer(http.FS(static)))
	return mux
}

func main() {
	origin, err := url.Parse(os.Getenv("CACHE_URL"))
	if err != nil || (origin.Scheme != "http" && origin.Scheme != "https") || origin.Host == "" {
		log.Fatal("CACHE_URL must be an absolute HTTP(S) origin")
	}
	log.Fatal(http.ListenAndServe(":8080", newHandler(origin, &http.Client{Timeout: 5 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}, assets)))
}
