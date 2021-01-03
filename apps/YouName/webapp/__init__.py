import os

from flask import Flask

def create_app():
    app = Flask(__name__)
    app.config.from_mapping(
        SECRET_KEY = os.environ.get("SECRET_KEY") or 'dev_key'
    )

    @app.route("/suggest")
    def suggest():
        return "Suggestions coming up!"

    return app
