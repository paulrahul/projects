package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"

	log "github.com/sirupsen/logrus"

	"github.com/paulrahul/vue3-server/product"
)

func ProductHandler(w http.ResponseWriter, r *http.Request) {
	log.WithFields(log.Fields{
		"method": r.Method,
		"path":   r.URL.Path,
	}).Debug("/product/ called.")

	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		w.WriteHeader(http.StatusOK)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if r.Method == "POST" {
		productKey := r.PostFormValue("product_key")
		product, err := product.GetProduct(productKey)
		if err != nil {
			w.WriteHeader(http.StatusNotFound)
			fmt.Fprintln(w, err)
		}

		err = json.NewEncoder(w).Encode(product)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprintln(w, err)
		}
	} else {
		// Fetch the string after product/
		re := regexp.MustCompile("/product/([A-Za-z0-9-]+)")
		matches := re.FindStringSubmatch(r.URL.Path)
		if len(matches) == 2 {
			product, err := product.GetProduct(matches[1])
			if err != nil {
				w.WriteHeader(http.StatusNotFound)
				fmt.Fprintln(w, err)
			}

			err = json.NewEncoder(w).Encode(product)
			if err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				fmt.Fprintln(w, err)
			}
		} else {
			log.Debug("No product id found in request call.")
			products := product.GetAllProducts()
			err := json.NewEncoder(w).Encode(products)
			if err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				fmt.Fprintln(w, err)
			}
		}
	}

	w.WriteHeader(http.StatusOK)
}
