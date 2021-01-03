import spacy
import numpy as np


nlp = spacy.load('en_core_web_lg')

def print_words(vocab):
  for w in vocab:
    print(w.text, end=", ")

def most_similar(word, topn=5):
  word = nlp.vocab[str(word)]
  queries = [
      w for w in word.vocab
      #if w.is_lower == word.is_lower and w.prob >= -15 and np.count_nonzero(w.vector)
  ]

  for w in queries:
      print(w.text, end=" ")

  print()

  by_similarity = sorted(queries, key=lambda w: word.similarity(w), reverse=True)
  return [(w.lower_,w.similarity(word)) for w in by_similarity[:topn+1] if w.lower_ != word.lower_]

def spacy_most_similar(word, topn=10):
  ms = nlp.vocab.vectors.most_similar(
      nlp(word).vector.reshape(1,nlp(word).vector.shape[0]), n=topn)
  words = [nlp.vocab.strings[w] for w in ms[0][0]]
  distances = ms[2]
  return words, distances

#ans = most_similar("dog", topn=3)
#ans = most_similar("car", topn=3)

#for w in ans:
#    print(w.text, end=", ")
#spacy_most_similar("dog", topn=3)

print_words(nlp.vocab["man"].vocab)
#print_words(nlp.vocab["cat"])
