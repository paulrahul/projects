package hangman

import (
	"math/rand"

	"github.com/tjarratt/babble"
)

// GetNewWord returns a new random word.
func GetNewWord() string {
	babbler := babble.NewBabbler()

	babbler.Count = 1
	return babbler.Babble()
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
