'''
Functions to return username suggestions. Currently, completely stateless
functions. Might become a class and stuff later on.
'''

import random

from PyDictionary import PyDictionary

# Context is a tuple of (kind, [value]) where "kind" can be any free-string
# metadata to the "value". E.g. ("genre", ["rock", "country"]),
# ("mood", ["sad"]), ("hobby", ["sports", "gaming", "guitar"]),
# ("attitude", ["free"])

CATEGORIES = ["music"]

dictionary=PyDictionary()

# Util methods.
def _tokenize(phrase):
  return [t.title() for t in phrase.split()]

def _combine(tokens):
  return "".join(tokens)

def _rand_select(lst):
  l = len(lst)
  idx = random.randint(0, l - 1)
  return lst[idx]

def _get_synonyms(word, include_self=True):
  synonyms = dictionary.synonym(word) or []

  if include_self:
    synonyms.append(word)
  return _tokenize(_rand_select(synonyms))

# Suggestion methods
def _music(context):
  kind = context[0]
  val = context[1]

  return _tokenize(val)

def _attitude(context):
  kind = context[0]
  val = context[1]

  return _get_synonyms(val)

def _personal(context):
  kind = context[0]
  val = context[1]

  if kind == "name":
    return [_rand_select(_tokenize(val))]
  elif kind == "profession":
    return _get_synonyms(val)

def _passion(context):
  kind = context[0]
  val = context[1]

  return _get_synonyms(val)

def _words(context):
  kind = context[0]
  val = context[1]

  return _get_synonyms(val)

def suggest(user_id, domain):
  user_details = _fetch_user_details(user_id)
  domain_lst = _derive_domain(domain)

  pref = []
  for domain in domain_lst:
    if domain == "music":
      # Pick music for sure.
      pref.extend(["music", "attitude", "words"])
    elif domain == "communication":
      # Pick personal
      pref.extend(["personal", "attitude", "passion"])

  # Now append tokens in preference order. Limit adding tokens to a certain
  # limit.
  LIMIT = 3
  tokens = []
  i = 0
  while True:
    if i > 5 or len(tokens) >= LIMIT:
      break

    next_pref = pref[i]
    i += 1
    context = user_details[next_pref]
    if isinstance(context, dict):
      # Select a random key within the dict.
      key = _rand_select(list(context.keys()))
      context = context[key]

    if isinstance(context, list):
      # Select a random value from the list
      val = _rand_select(context)

    # Now call the approppiate suggest method with the chosen Context
    tokens.extend(globals()["_" + next_pref]((context, val)))

  return _combine(tokens)

def _fetch_user_details(user_id):
  return {
    "personal" : {
      "name" : ["Rahul Paul"],
      "profession" : ["developer"]
    },
    "music" : {
      "genre" : ["folk", "soft rock"],
      "artist" : ["Nick drake", "Tinariwen", "Bob Dylan", "Simon and Garfunkel"],
      "song" : ["Northern Sky", "Pale blue eyes"]
    },
    "attitude" : ["freedom", "stoic", "humility", "simplicity"],
    "passion" : ["football", "coding", "driving", "reddit"],
    "words" : ["chutzpah", "clairyoyant", "prescient"]
  }

def _derive_domain(domain):
  if "spotify" in domain:
    return ["music"]
  elif "mail" in domain:
    return ["communication"]

  return ["communication"]

def test():
  d = dictionary.synonym("car")
  d.sort()
  print(d)

if __name__ == "__main__":
  #test()

  print(suggest("123", "open.spotify.com"))