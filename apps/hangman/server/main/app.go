package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync/atomic"

	"hangman"
)

var counter uint64

type response struct {
	Word   string `json:"word"`
	Hidden []int  `json:"hidden"`
}

func wordHandler(w http.ResponseWriter, r *http.Request) {
	newWord := hangman.GetNewWord()
	encodedNewWord := base64.StdEncoding.EncodeToString([]byte(newWord))
	hiddenIndices := hangman.GetHiddenIndices(newWord)

	log.Printf("Returning word %s in b64 form %s and hidden indices %v\n",
		newWord, encodedNewWord, hiddenIndices)
	w.Header().Set("Content-Type", "application/json")
	retJSON, err := json.Marshal(&response{encodedNewWord, hiddenIndices})
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintln(w, err)
	} else {
		fmt.Fprintf(w, "%s", retJSON)
	}
}

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

func gameHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "../../view/pages/hangman.html")
}

func indexHandler(w http.ResponseWriter, r *http.Request) {
	// Return a HTML which asks for invitation code.
}

func main() {
	log.SetFlags(log.Lshortfile)

	http.HandleFunc("/", trafficCountHandler(indexHandler))

	http.HandleFunc("/status", statusHandler)

	http.HandleFunc("/word", trafficCountHandler(wordHandler))

	http.HandleFunc("/game", trafficCountHandler(gameHandler))

	fs := http.FileServer(http.Dir("../../view"))
	http.Handle("/view/", http.StripPrefix("/view", fs))

	err := http.ListenAndServe(":4000", nil)
	if err != nil {
		panic(err)
	}
}
