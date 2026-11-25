package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

func TestCacheMissingAndRoundTrip(t *testing.T) {
	server := httptest.NewServer(newHandler())
	defer server.Close()
	response, err := http.Get(server.URL + "/api/value?key=missing")
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != http.StatusOK {
		t.Fatalf("status=%d", response.StatusCode)
	}
	missing, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatal(err)
	}
	response.Body.Close()
	if strings.TrimSpace(string(missing)) != "null" {
		t.Fatalf("missing=%q", missing)
	}
	request, _ := http.NewRequest(http.MethodPut, server.URL+"/api/value?key=a%2Fb", strings.NewReader(`{"value":""}`))
	request.Header.Set("Content-Type", "application/json")
	response, err = http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != http.StatusNoContent {
		t.Fatalf("status=%d", response.StatusCode)
	}
	response.Body.Close()
	response, err = http.Get(server.URL + "/api/value?key=a%2Fb")
	if err != nil {
		t.Fatal(err)
	}
	got, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatal(err)
	}
	response.Body.Close()
	if strings.TrimSpace(string(got)) != `""` {
		t.Fatalf("value=%q", got)
	}
}

func TestCacheRejectsBadRequests(t *testing.T) {
	for _, test := range []struct{ method, path, body string }{{"GET", "/api/value", ""}, {"PUT", "/api/value?key=x", `{}`}, {"PUT", "/api/value?key=x", `{"value":1}`}, {"POST", "/api/value?key=x", ""}} {
		request := httptest.NewRequest(test.method, test.path, strings.NewReader(test.body))
		response := httptest.NewRecorder()
		newHandler().ServeHTTP(response, request)
		want := http.StatusBadRequest
		if test.method == http.MethodPost {
			want = http.StatusMethodNotAllowed
		}
		if response.Code != want {
			t.Errorf("%s %s: status=%d", test.method, test.path, response.Code)
		}
	}
}

func TestCacheConcurrentAccess(t *testing.T) {
	handler := newHandler()
	var wait sync.WaitGroup
	for worker := 0; worker < 16; worker++ {
		wait.Add(1)
		go func(worker int) {
			defer wait.Done()
			for n := 0; n < 30; n++ {
				request := httptest.NewRequest(http.MethodPut, "/api/value?key=k", strings.NewReader(`{"value":"v"}`))
				response := httptest.NewRecorder()
				handler.ServeHTTP(response, request)
			}
		}(worker)
	}
	wait.Wait()
}

func decodeJSON(response *http.Response, target any) error {
	return json.NewDecoder(response.Body).Decode(target)
}
