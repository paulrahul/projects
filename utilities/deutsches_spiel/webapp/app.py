import os, sys
sys.path.append(os.path.dirname(os.path.realpath(__file__)))

from flask import Flask, session, render_template, request, url_for, jsonify
from werkzeug.utils import redirect

from deutsches_spiel.spiel import DeutschesSpiel
from deutsches_spiel.translation_compiler import Compiler

spiel = DeutschesSpiel(use_semantic=False)
next_entry = spiel.get_next_entry()

def create_app():
    app = Flask(__name__)
    app.secret_key = 'your_secret_key_here'

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
        next_question = next(next_entry)
        return render_template(
            "question.html",
            entry=next_question)
        
    @app.route("/answer_score")
    def answer_score():
        user_answer = request.args.get('answer')
        translation = request.args.get('translation')
        (score_string, score) = get_spiel().get_answer_score(
            user_answer, translation)
        data = {'score_string': score_string, 'score': score}
        return jsonify(data), 200

    @app.route("/exit")
    def exit():
        get_spiel().exit_game()
        return redirect(url_for('index'))
    
    def get_spiel():
        return spiel

    return app

if __name__ == "__main__":
    create_app().run(port=os.environ.get("SPIEL_PORT"))