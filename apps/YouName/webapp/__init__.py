import os

from flask import Flask
from . import suggest

def create_app():
    app = Flask(__name__)
    app.config.from_mapping(
        SECRET_KEY = os.environ.get("SECRET_KEY") or 'dev_key'
    )

    @app.route("/suggest")
    def suggest_un():
        un = suggest.suggest_un("123", "open.spotify.com")
        return un

    return app
