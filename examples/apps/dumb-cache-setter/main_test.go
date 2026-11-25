package main

import (
	"io"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"testing/fstest"
)

func TestProxyForwardsEscapedKeyAndNull(t *testing.T) {
	var gotKey string
	cache := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotKey = r.URL.Query().Get("key")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte("null"))
	}))
	defer cache.Close()
	origin, _ := url.Parse(cache.URL)
	page := fstest.MapFS{"web/dist/index.html": &fstest.MapFile{Data: []byte("setter page")}}
	server := httptest.NewServer(newHandler(origin, cache.Client(), fs.FS(page)))
	defer server.Close()
	response, err := http.Get(server.URL + "/api/value?key=a%2Fb")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if gotKey != "a/b" || response.StatusCode != 200 {
		t.Fatalf("key=%q status=%d", gotKey, response.StatusCode)
	}
}

func TestProxyForwardsWriteAndPreservesEmptyValue(t *testing.T) {
	var body string
	cache := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPut {
			data, _ := io.ReadAll(r.Body)
			body = string(data)
			w.WriteHeader(http.StatusNoContent)
			return
		}
		_, _ = w.Write([]byte(`""`))
	}))
	defer cache.Close()
	origin, _ := url.Parse(cache.URL)
	server := httptest.NewServer(newHandler(origin, cache.Client(), fstest.MapFS{"web/dist/index.html": &fstest.MapFile{Data: []byte("page")}}))
	defer server.Close()
	response, err := http.Post(server.URL+"/api/value?key=k", "application/json", strings.NewReader(`{"value":""}`))
	if err != nil {
		t.Fatal(err)
	}
	response.Body.Close()
	if response.StatusCode != http.StatusBadRequest {
		t.Fatalf("post status=%d", response.StatusCode)
	}
	request, _ := http.NewRequest(http.MethodPut, server.URL+"/api/value?key=k", strings.NewReader(`{"value":""}`))
	request.Header.Set("Content-Type", "application/json")
	response, err = http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	response.Body.Close()
	if response.StatusCode != http.StatusNoContent || body != `{"value":""}` {
		t.Fatalf("status=%d body=%q", response.StatusCode, body)
	}
	response, err = http.Get(server.URL + "/api/value?key=k")
	if err != nil {
		t.Fatal(err)
	}
	data, _ := io.ReadAll(response.Body)
	response.Body.Close()
	if strings.TrimSpace(string(data)) != `""` {
		t.Fatalf("response=%q", data)
	}
}

func TestProxyServesPageAndRejectsBadCacheResponse(t *testing.T) {
	cache := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte(`{"bad":true}`)) }))
	defer cache.Close()
	origin, _ := url.Parse(cache.URL)
	server := httptest.NewServer(newHandler(origin, cache.Client(), fstest.MapFS{"web/dist/index.html": &fstest.MapFile{Data: []byte("setter page")}}))
	defer server.Close()
	response, _ := http.Get(server.URL + "/")
	if response.StatusCode != 200 {
		t.Fatalf("page status=%d", response.StatusCode)
	}
	response.Body.Close()
	response, _ = http.Get(server.URL + "/api/value?key=x")
	if response.StatusCode != http.StatusBadGateway {
		t.Fatalf("proxy status=%d", response.StatusCode)
	}
	response.Body.Close()
	response, _ = http.Post(server.URL+"/api/value?key=x", "application/json", strings.NewReader(`{}`))
	if response.StatusCode != http.StatusBadRequest {
		t.Fatalf("input status=%d", response.StatusCode)
	}
	response.Body.Close()
}
