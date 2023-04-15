package product

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNormalizeProductKey(t *testing.T) {
	res, err := normalizeProductKey("abcd")
	if assert.NoError(t, err) {
		assert.Equal(t, "abcd", res)
	}

	res, err = normalizeProductKey("a-b-c-d")
	if assert.NoError(t, err) {
		assert.Equal(t, "a b c d", res)
	}

	res, err = normalizeProductKey("a b")
	if assert.NoError(t, err) {
		assert.Equal(t, "a b", res)
	}

	res, err = normalizeProductKey("a b-c")
	assert.ErrorContains(t, err, "is not space or hyphen separated", res)

	res, err = normalizeProductKey("a*b")
	assert.ErrorContains(t, err, "is not space or hyphen separated", res)
}
