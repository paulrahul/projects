package main

import (
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/rs/cors"
	log "github.com/sirupsen/logrus"

	"github.com/paulrahul/vue3-server/product"
)

func init() {
	log.SetOutput(os.Stdout)
	log.SetLevel(log.DebugLevel)
}

func serverShutDownHandler(done chan bool) func() {
	sigs := make(chan os.Signal, 1)

	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)
	return func() {
		sig := <-sigs
		log.Info()
		log.Info(sig)
		done <- true
	}
}

func statusHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "Status: OK")
}

func main() {
	log.Info("Starting vue3-server...")

	Port := os.Getenv("VUE3_SERVER_PORT")
	if Port == "" {
		panic("$VUE3_SERVER_PORT must be set")
	}

	product.Init()

	// For dev only - Set up CORS so React client can consume our API
	corsWrapper := cors.New(cors.Options{
		AllowedMethods: []string{"GET", "POST"},
		AllowedHeaders: []string{"Content-Type", "Origin", "Accept", "*"},
	})

	mux := http.NewServeMux()

	// Index
	mux.HandleFunc("/", (statusHandler))

	// Login
	mux.HandleFunc("/product/", ProductHandler)

	go func() {
		err := http.ListenAndServe(":"+Port, corsWrapper.Handler(mux))
		if err != nil {
			panic(err)
		}
	}()

	log.Info("Server running now")

	done := make(chan bool, 1)
	log.Debug("Server Awaiting shutdown signal")
	serverShutDownHandler(done)()
	<-done

	log.Info("Server Shutting down..")
}
