package main

import (
	"fmt"
	"log"
	"net/http"
	"sync/atomic"
)

var counter uint64

func statusHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "Status: OK")
	fmt.Fprintf(w, "Number of visits: %d\n", atomic.LoadUint64(&counter))
}

func trafficCountHandler(origHandler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		atomic.AddUint64(&counter, 1)
		origHandler(w, r)
	}
}

func main() {
	log.SetFlags(log.Lshortfile)

	http.HandleFunc("/", trafficCountHandler(statusHandler))
	http.HandleFunc("/status", trafficCountHandler(statusHandler))

	err := http.ListenAndServe(":4000", nil)
	if err != nil {
		panic(err)
	}
}
