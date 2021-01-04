import os

from flask import Flask, request
from . import suggest

def create_app():
    app = Flask(__name__)
    app.config.from_mapping(
        SECRET_KEY = os.environ.get("SECRET_KEY") or 'dev_key'
    )

    @app.route("/")
    def index():
      return "Welcome to Rahul's Useless App"

    @app.route("/suggest")
    def suggest_un():
        include_numbers = False
        try:
          include_numbers = request.args.get("number")
        except KeyError:
          pass

        un = suggest.suggest_un(
          user_id="123", domain="open.spotify.com", numbers=include_numbers)
        return un

    @app.route("/register", methods=["POST"])
    def register():
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

      # First get all request data.


      un = suggest.suggest_un(
         domain="open.spotify.com", ud=user_details)
      return un

    return app
