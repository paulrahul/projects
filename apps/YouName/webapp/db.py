import os
import json
import redis

redis_url = os.getenv('REDISTOGO_URL', 'redis://localhost:6379')
redis = redis.from_url(redis_url)

def register_user(uname, user_details):
  s_val = json.dumps(user_details)
  redis.set(uname, s_val)

def fetch_user(uname):
  d = redis.get(uname)
  return json.loads(d)

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

  s_val = json.dumps(user_details)
  redis.set("testuser123", s_val)

  d = redis.get("testuser123")
  print(json.loads(d))

if __name__ == "__main__":
  test()
