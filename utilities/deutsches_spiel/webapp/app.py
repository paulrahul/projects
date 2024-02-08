import os, sys
sys.path.append(os.path.dirname(os.path.realpath(__file__)))

from flask import Flask, g, render_template, request, url_for, session
from werkzeug.utils import redirect

from deutsches_spiel.spiel import DeutschesSpiel
from deutsches_spiel.translation_compiler import Compiler

def create_app():
    app = Flask(__name__)
    app.config.from_mapping(
        DEEPL_KEY = os.environ.get("DEEPL_KEY")
    )

    @app.route("/")
    def index():
        return render_template("index.html")

    @app.route("/reload")
    def reload():
        compiler = Compiler(app.config["DEEPL_KEY"])
        compiler.compile(reload=True)
        return render_template(
            "index.html",
            reloaded=True)
        
    @app.route("/play")
    def play():
        return redirect(url_for('next_question'))
    
    @app.route("/next_question")
    def next_question():
        next_entry = get_next_entry()
        return render_template(
            "question.html",
            entry=next(next_entry))

    @app.route("/exit")
    def exit():
        get_spiel().exit_game()
        return redirect(url_for('index'))
            
    def get_spiel():
        if 'spiel' not in g:
            g.spiel = DeutschesSpiel(use_semantic=False)
            
        return g.spiel
    
    def get_next_entry():
        if 'next_entry' not in g:
            g.next_entry = get_spiel().get_next_entry()
            
        return g.next_entry 

    return app

if __name__ == "__main__":
    print("hey!")
    create_app().run(port=os.environ.get("SPIEL_PORT"))