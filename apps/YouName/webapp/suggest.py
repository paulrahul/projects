'''
Functions to return username suggestions. Currently, completely stateless
functions. Might become a class and stuff later on.
'''

import datetime
import random
import sys

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

def _tokenize_date(date_str):
  dt = datetime.datetime.strptime(date_str, "%Y-%m-%d")
  return [dt.year, dt.month, dt.day]

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

def _numbers(context):
  kind = context[0]
  val = context[1]

  return [str(val)]

def suggest_un(domain, user_id=None, numbers=False, sc=False, ud=None):
  assert user_id or ud

  user_details = ud or _fetch_user_details(user_id)
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
  preflen = len(pref)
  while True:
    if len(tokens) >= LIMIT:
      break

    if i >= preflen:
      next_pref = _rand_select(list(user_details.keys()))
    else:
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
    try:
      tokens.extend(globals()["_" + next_pref]((context, val)))
    except:
      print("Adding token for pref %s failed with %s" %
            (next_pref, sys.exc_info()[0]))
      continue

  if numbers:
    # First check if the un already has a number or not.
    val = _rand_select(user_details["numbers"])
    tokens.extend(_numbers(("numbers", val)))

  return _combine(tokens)

def _fetch_user_details(user_id):
  user_details = {
    "personal" : {
      "name" : ["Rahul Paul"],
      "profession" : ["developer"],
      "birthdate" : ["1981-11-17"]
    },
    "music" : {
      "genre" : ["folk", "soft rock"],
      "artist" : ["Nick drake", "Tinariwen", "Bob Dylan", "Simon and Garfunkel"],
      "song" : ["Northern Sky", "Pale blue eyes"]
    },
    "attitude" : ["freedom", "stoic", "humility", "simplicity"],
    "passion" : ["football", "coding", "driving", "reddit"],
    "words" : ["chutzpah", "clairyoyant", "prescient"],
    "numbers" : ["8"]
  }

  # Move the numbers from birthdate to the numbers key.
  user_details["numbers"].extend(
    _tokenize_date(user_details["personal"]["birthdate"][0]))
  del user_details["personal"]["birthdate"]

  return user_details

def _derive_domain(domain):
  if "spotify" in domain or "music" in domain:
    return ["music"]
  elif "mail" in domain:
    return ["communication"]

  return ["communication"]

def test():
  suggest_un(
    user_id="123", domain="open.spotify.com", numbers=include_numbers)

if __name__ == "__main__":
  #test()
  user_details = {
    "personal" : {
      "name" : ["Rahul Paul"],
      "profession" : ["developer"],
      "birthdate" : "1981-11-17"
    },
    "music" : {
      "genre" : ["folk", "soft rock"],
      "artist" : ["Nick drake", "Tinariwen", "Bob Dylan", "Simon and Garfunkel"],
      "song" : ["Northern Sky", "Pale blue eyes"]
    },
    "attitude" : ["freedom", "stoic", "humility", "simplicity"],
    "passion" : ["football", "coding", "driving", "reddit"],
    "words" : ["chutzpah", "clairyoyant", "prescient"],
    "numbers" : ["8"]
  }

  print(suggest_un(domain="open.spotify.com", user_id="123"))
