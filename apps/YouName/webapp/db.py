import os
import json
import redis
import sys

redis_url = os.getenv('REDISTOGO_URL', 'redis://localhost:6379')
redis = redis.from_url(redis_url)

def register_user(uname, user_details):
  s_val = json.dumps(user_details)

  try:
    redis.set(uname, s_val)
  except:
    print("Could not register user %s with details %s for: %s" %
          (uname, s_val, sys.exc_info()[0]))
    raise

def fetch_user(uname):
  try:
    d = redis.get(uname)
  except:
    print("Could not fetch user %s: %s" %
          (uname, sys.exc_info()[0]))
    raise

  if not d:
    raise Exception("Could not find user %s" % uname)

  return json.loads(d)

def register_mallu_vote(name, vote):
  KEY = "mallu_votes"

  mallu_votes = None
  try:
    mallu_votes = redis.get(KEY)
  except:
    print("Could not fetch key %s: %s" %
          (KEY, sys.exc_info()[0]))

  if not mallu_votes:
    mallu_votes = {}
  else:
    mallu_votes = json.loads(mallu_votes)

  current_count = 0
  try:
    current_count = mallu_votes[name]
  except KeyError:
    pass

  mallu_votes[name] = current_count + vote

  s_val = json.dumps(mallu_votes)

  try:
    redis.set(KEY, s_val)
  except:
    print("Could not register vote %s with details %s for: %s" %
          (name + ":" + str(vote), s_val, sys.exc_info()[0]))
    raise

def test():
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

  register_user("testuser567", user_details)
  print(fetch_user("BobDylanFree"))

if __name__ == "__main__":
  test()
