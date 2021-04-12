package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync/atomic"
	"time"

	"hangman"
)

var counter uint64
var gameCode string

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

func authHandler(origHandler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		c, err := r.Cookie("session_token")
		if err != nil {
			if err == http.ErrNoCookie {
				// If the cookie is not set, redirect to index page.
				indexHandler(w, r)
				return
			}
			// For any other type of error, return a bad request status
			w.WriteHeader(http.StatusBadRequest)
			fmt.Fprintln(w, "Unauthorized Access: Bad Request")
			return
		}

		if c.Value != gameCode {
			indexHandler(w, r)
			return
		}

		origHandler(w, r)
	}
}

func gameHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "../../view/pages/hangman.html")
}

func indexHandler(w http.ResponseWriter, r *http.Request) {
	// Return a HTML which asks for invitation code.
	http.Redirect(w, r, "/view/pages/", http.StatusSeeOther)
}

func gameEnterHandler(w http.ResponseWriter, r *http.Request) {
	// Process invitation code.
	if r.Method != "POST" {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "Method %s not supported\n", r.Method)
		return
	}

	code := r.PostFormValue("code")
	if code == gameCode {
		http.SetCookie(w, &http.Cookie{
			Name:    "session_token",
			Value:   gameCode,
			Expires: time.Now().Add(120 * time.Second),
		})

		http.Redirect(w, r, "/game", http.StatusSeeOther)
	} else {
		indexHandler(w, r)
	}
}

func main() {
	// gameCode = flag.String("code", "", "Invitation code")
	// flag.Parse()
	gameCode = os.Getenv("CODE")

	if gameCode == "" {
		panic("Invitation code not provided")
	}

	log.SetFlags(log.Lshortfile)

	http.HandleFunc("/", trafficCountHandler(indexHandler))

	http.HandleFunc("/enter", gameEnterHandler)

	http.HandleFunc("/status", statusHandler)

	http.HandleFunc("/word", authHandler(trafficCountHandler(wordHandler)))

	http.HandleFunc("/game", authHandler(trafficCountHandler(gameHandler)))

	fs := http.FileServer(http.Dir("../../view"))
	http.Handle("/view/", http.StripPrefix("/view", fs))

	err := http.ListenAndServe(":4000", nil)
	if err != nil {
		panic(err)
	}
}
