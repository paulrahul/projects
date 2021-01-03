import os

from flask import Flask, request
from . import suggest

def create_app():
    app = Flask(__name__)
    app.config.from_mapping(
        SECRET_KEY = os.environ.get("SECRET_KEY") or 'dev_key'
    )

    @app.route("/suggest")
    def suggest_un():
        include_numbers = False
        try:
          include_numbers = request.args.get("number")
        except KeyError:
          pass

        un = suggest.suggest_un(
          "123", "open.spotify.com", numbers=include_numbers)
        return un

    return app
