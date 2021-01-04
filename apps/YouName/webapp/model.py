'''
Parsing utils for UI forms.
'''

def _parse_text(text, delimiter=","):
  if not text:
    return None

  tokens = text.split(delimiter)
  return [w.strip() for w in tokens]

def _extract_request_key(request, key):
  try:
    return _parse_text(request.form[key])
  except KeyError:
    return None

def extract_registration_data(request, test=False):
  if test:
    request = _get_test_data()

  name = _extract_request_key(request, "name") or [""]
  profession = _extract_request_key(request, "profession") or [""]
  birthdate = _extract_request_key(request, "birthdate") or ""

  hobbies = _extract_request_key(request, "hobbies") or [""]
  words = _extract_request_key(request, "words") or [""]
  numbers = _extract_request_key(request, "numbers") or [""]
  attitude = _extract_request_key(request, "attitude") or [""]

  genre = _extract_request_key(request, "genre") or [""]
  artist = _extract_request_key(request, "artist") or [""]
  song = _extract_request_key(request, "song") or [""]

  # Create model object.
  user_details = {
    "personal" : {
      "name" : name,
      "profession" : profession,
      "birthdate": birthdate
    },

    "music" : {
      "genre" : genre,
      "artist" : artist,
      "song" : song
    },

    "attitude" : attitude,
    "numbers" : numbers,
    "words" : words,
    "passion" : hobbies
  }

  return user_details

def _get_test_data():
  class Request(object):
    __slots__ = ('form')

  form = {
    "name" : "Rahul Paul",
    "profession" : "developer",
    "birthdate" : "1981-11-17",
    "genre" : "folk, soft rock",
    "artist" : "Nick drake,Tinariwen, Bob Dylan,Simon and Garfunkel",
    "song" : "Northern Sky,Pale blue eyes",
    "attitude" : "freedom,stoic,humility, simplicity",
    "hobbies" : "football, coding, driving, reddit",
    "words" : "chutzpah,clairyoyant, prescient",
    "numbers" : "8"
  }

  request = Request()
  request.form = form

  return request

def test():
  print(extract_registration_data(_get_test_data()))

if __name__ == "__main__":
  test()
