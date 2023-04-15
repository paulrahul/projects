package product

import (
	"encoding/csv"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"

	trie "github.com/Vivino/go-autocomplete-trie"
	log "github.com/sirupsen/logrus"

	. "github.com/paulrahul/vue3-server"
)

type ProductCache struct {
	Products    map[string]Product
	Titles      Products
	ProductTrie *trie.Trie
}

var cache *ProductCache

func Init() {
	filePath, err := filepath.Abs("product/products.csv")
	f, err := os.Open(filePath)
	if err != nil {
		log.Fatal(fmt.Sprintf("Unable to read input file %s; Error: %s\n", filePath, err))
	}
	defer f.Close()

	csvReader := csv.NewReader(f)
	records, err := csvReader.ReadAll()
	if err != nil {
		log.Fatal("Unable to parse file as CSV for "+filePath, err)
	}

	n := len(records)
	cache = &ProductCache{}
	cache.Titles.Products = []Product{}
	cache.Products = make(map[string]Product)
	cache.ProductTrie = trie.New().WithoutNormalisation().CaseSensitive().WithoutFuzzy()

	for i := 1; i < n; i++ {
		r := records[i]

		if len(r) != 6 {
			log.Fatal(fmt.Sprintf(
				"Encountered record with unexpected number of fields. Expected 6, got %d. Record: %s\n", len(r), r))
		}

		sku := r[1]
		unitsSold, err := strconv.Atoi(r[2])
		price, err := strconv.ParseFloat(r[3], 32)
		title := r[4]
		discount, err := strconv.ParseFloat(r[5], 32)

		if err != nil {
			log.Fatal(fmt.Sprintf("Unparseable record %s; Error: %s", r, err))
		}

		cache.Products[title] = Product{
			SKU:       sku,
			UnitsSold: unitsSold,
			Price:     price,
			Title:     title,
			Discount:  discount,
		}
	}

	for k, _ := range cache.Products {
		cache.Titles.Products = append(cache.Titles.Products, Product{Title: k})
		cache.ProductTrie.Insert(k)
	}

	sort.Slice(cache.Titles.Products, func(i, j int) bool {
		ret := strings.Compare(cache.Titles.Products[i].Title,
			cache.Titles.Products[j].Title)
		if ret <= 0 {
			return true
		} else {
			return false
		}
	})
}

func GetCache() *ProductCache {
	if cache == nil {
		Init()
	}

	return cache
}

func findBestMatch(productTitle string) string {
	matches := GetCache().ProductTrie.Search(productTitle, 1)

	if len(matches) > 0 {
		return matches[0]
	} else {
		return ""
	}
}

// Replaces any non-space delimiter with space.
func normalizeProductKey(productKey string) (string, error) {
	// We look for only hyphen or space as delmiters. Anything else is rejected.
	hyphenRegexp := regexp.MustCompile("^[^-\\s]+(-[^-]+)*$")
	if hyphenRegexp.MatchString(productKey) {
		return strings.ReplaceAll(productKey, "-", " "), nil
	}

	spaceRegegexp := regexp.MustCompile("^[^\\s]+(\\s[^\\s]+)*$")
	if spaceRegegexp.MatchString(productKey) {
		return productKey, nil
	}

	return "", errors.New(
		fmt.Sprintf(
			"Product key %s is not space or hyphen separated", productKey))
}

func GetProduct(productKey string) (Product, error) {
	// First normalize the input productKey to a product name.
	// This is done by removing any hyphen or other delimiter the from the key.
	normProductKey, err := normalizeProductKey(productKey)
	if err != nil {
		return Product{}, err
	}

	productTitle := findBestMatch(normProductKey)
	log.Debug(fmt.Sprintf("Best match for %s is %s", productKey, productTitle))

	p, ok := GetCache().Products[productTitle]
	if !ok {
		return Product{}, errors.New("Could not find product: " + productKey)
	} else {
		return p, nil
	}
}

func GetAllProducts() Products {
	return GetCache().Titles
}
