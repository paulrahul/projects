import os

from flask import Flask, render_template, request

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
      return render_template("index.html")

    @app.route("/suggest", methods=["GET", "POST"])
    def suggest_un():
      try:
        uname = request.args.get("un")
      except KeyError:
        raise

      try:
        domain = request.args.get("domain")
      except KeyError:
        raise

      include_numbers = False
      try:
        include_numbers = request.args.get("number")
      except KeyError:
        pass

      try:
        ud = db.fetch_user(uname)
        un = suggest.suggest_un(
          ud=ud, domain=domain, numbers=include_numbers)
      except:
        raise

      return render_template(
        "suggest.html",
        message="Suggested username is %s" % un, uname=uname)

    @app.route("/new_user")
    def new_user():
      return render_template("register.html")

    @app.route("/register", methods=["POST"])
    def register():
      # First get all request data.
      user_details = model.extract_registration_data(request)

      un = suggest.suggest_un(
         domain="", ud=user_details)
      try:
        db.register_user(un, user_details)
      except:
        return render_template(
          "info.html",
          info_text="Could not register right now. Try again later.")

      return render_template(
        "info.html",
        info_text="You are registered with username %s" % un)

    @app.route("/login")
    def login():
      try:
        uname = request.args.get("uname")
        db.fetch_user(uname)
      except KeyError:
        return render_template(
          "info.html", info_text="No username provided")
      except:
        return render_template(
          "info.html", info_text="Unable to retrieve user %s." % uname)

      return render_template(
        "suggest.html", message="Hello %s" % uname, uname=uname)

    @app.route("/about")
    def about():
      return render_template("about.html")

    return app
