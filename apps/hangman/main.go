package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"sync/atomic"
	"time"
)

var counter uint64
var gameCode string
var words []string

type response struct {
	Word   string `json:"word"`
	Hidden []int  `json:"hidden"`
}

func initWords() {
	file, err := os.Open("./words")
	if err != nil {
		panic(err)
	}

	bytes, err := ioutil.ReadAll(file)
	if err != nil {
		panic(err)
	}

	words = strings.Split(string(bytes), "\n")
}

// GetNewWord returns a new random word.
func GetNewWord() string {
	seed := rand.NewSource(time.Now().UnixNano())
	randomizer := rand.New(seed)
	len := len(words)

	var word string
	for {
		word = words[randomizer.Intn(len)]
		// Avoid pronouns.
		if string(word[0]) != strings.ToUpper(string(word[0])) {
			break
		}
	}

	return word
}

// GetHiddenIndices returns a slice of hidden indices.
func GetHiddenIndices(word string) []int {
	l := len(word)

	numHidden := l / 2

	// We need to hide numHidden letters and ensure that all occurences of
	// a particular letter are hidden.
	letterMap := make(map[rune][]int)
	for i, c := range word {
		letterMap[c] = append(letterMap[c], i)
	}

	ret := make([]int, 0)
	for numHidden > 0 {
		c := rune(word[rand.Intn(l)])
		indices, ok := letterMap[c]
		if !ok || len(indices) > numHidden {
			continue
		}

		numHidden -= len(indices)
		ret = append(ret, indices...)
		delete(letterMap, c)
	}

	return ret
}

func wordHandler(w http.ResponseWriter, r *http.Request) {
	newWord := GetNewWord()
	encodedNewWord := base64.StdEncoding.EncodeToString([]byte(newWord))
	hiddenIndices := GetHiddenIndices(newWord)

	log.Printf("Returning word %s in b64 form %s and hidden indices %v\n",
		newWord, encodedNewWord, hiddenIndices)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	err := json.NewEncoder(w).Encode(&response{encodedNewWord, hiddenIndices})

	// retJSON, err := json.Marshal(&response{encodedNewWord, hiddenIndices})
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintln(w, err)
	}
	// else {

	// 	fmt.Fprintf(w, "%s", retJSON)
	// }
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
	http.Redirect(w, r, "/view/pages/hangman.html", http.StatusSeeOther)
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
			Expires: time.Now().Add(30 * time.Minute),
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

	initWords()
	log.Println("Loaded dictionary")

	http.HandleFunc("/", trafficCountHandler(indexHandler))

	http.HandleFunc("/enter", gameEnterHandler)

	http.HandleFunc("/status", statusHandler)

	http.HandleFunc("/word", authHandler(trafficCountHandler(wordHandler)))

	http.HandleFunc("/game", authHandler(trafficCountHandler(gameHandler)))

	fs := http.FileServer(http.Dir("./view"))
	http.Handle("/view/", http.StripPrefix("/view", fs))

	port := os.Getenv("PORT")
	if port == "" {
		panic("$PORT must be set")
	}

	err := http.ListenAndServe(":"+port, nil)
	if err != nil {
		panic(err)
	}
}
