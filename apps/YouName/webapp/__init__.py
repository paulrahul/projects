import os

from flask import Flask, request

from . import db
from . import model
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

    @app.route("/register", methods=["GET", "POST"])
    def register():
      # First get all request data.
      user_details = model.extract_registration_data(request, test=True)

      un = suggest.suggest_un(
         domain="open.spotify.com", ud=user_details)
      try:
        db.register_user(un, user_details)
      except:
        return "Could not register right now. Try again later."

      return "You are registered with username %s" % (un)

    return app
