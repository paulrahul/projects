from datetime import datetime
import json
import random

from log import get_logger
from translation_compiler import Compiler, DUMP_FILE_NAME, DEEPL_KEY_VAR
import util

logger = get_logger()

class DeutschesSpiel:
    def __init__(self):
        self._rows = []

        self._init()

    def _init(self):
        print("Initialising game...")
        
        if not util.file_exists(DUMP_FILE_NAME):
            api_key = None
            # Check if the environment variable exists
            if DEEPL_KEY_VAR in os.environ:
                # Access the value of the environment variable
                api_key = os.environ[DEEPL_KEY_VAR]
            else:
                exit(f"The environment variable {DEEPL_KEY_VAR} is not set.")
                          
            compiler = Compiler(api_key)
            compiler.compile()
            
            if not util.file_exists(DUMP_FILE_NAME):
                exit("No dump file found and could not create one inline.")
            
        with open(DUMP_FILE_NAME, 'r') as file:
            logger.debug(f"Loading entries from current dump file.")
            self._rows = json.load(file)
                
        self._prepare_game()
                
    def _prepare_game(self):
        pass

    def play_game(self):
        n = len(self._rows)
        question_indices = set()
        # Pose a German word and fuzzy compare the user answer with the one in
        # the cache. Keep prompting till user says no.
        while True:
            # Get a word randomly.
            next_index = random.randint(0, n - 1)
            if next_index in question_indices:
                continue
            question_indices.add(next_index)
            entry = self._rows[next_index]
            
            user_answer = input(f'Was bedeutet {entry["word"]}?: ').strip().lower()
            similarity_score = find_similarity(user_answer, entry["translation"])
            print(f"Deine Antwort ist {correctness_string(similarity_score)}, Ähnlichkeitwert {similarity_score}")
            print(f"Echte Antwort: {entry['translation']}\n\nExamples:")
            print("\n".join(entry["examples"][:5]))
            
            if "genus" in entry['metadata']:
                print(f"\nGenus: {entry['metadata']['genus']}")
            
            if not prompt('\nWeiter?'):
                break
            
from fuzzywuzzy import fuzz

def correctness_string(score):
    if score >= 90:
        return "richtig!"
    elif score < 90 and score >= 70:
        return "fast richtig."
    else:
        return "nicht ganz richtig."

def find_similarity(str1, str2):
    # Convert strings to lowercase for case-insensitive comparison
    str1_lower = str1.lower()
    str2_lower = str2.lower()

    # Use the fuzz.ratio() method to get a similarity score
    return fuzz.ratio(str1_lower, str2_lower)

THRESHOLD = 80
def are_strings_similar(str1, str2):
    score = find_similarity(str1, str2)
    return (score >= THRESHOLD, score)

import spacy

class SemanticComparator:
    _nlp = None
    
    @classmethod
    def load(cls):
        # Load the pre-trained word embeddings model from spaCy
        logger.info("Loading Spacy model..")
        cls._nlp = spacy.load("en_core_web_md")

    @classmethod
    def semantic_similarity(cls, str1, str2):
        # Process the strings with spaCy to get their word embeddings
        doc1 = cls._nlp(str1)
        doc2 = cls._nlp(str2)

        # Compute the similarity between the two strings based on their word embeddings
        similarity = doc1.similarity(doc2)

        return similarity

def prompt(text):
    user_input = input(f'{text} [j/n] : ').strip().lower()
    print()
    
    return user_input == 'j' or user_input == ''

if __name__ == "__main__":
    import argparse
    import os
    
    parser = argparse.ArgumentParser()
    parser.add_argument('--semantic', '-s', action='store_true', help='Enable semantic comparison')
    args = parser.parse_args()

    if args.semantic:
        SemanticComparator.load()
        
    if prompt('Möchtest du ein Spiel spielen?'):
        spiel = DeutschesSpiel()
        
        spiel.play_game()
    else:
        user_input = prompt('Möchtest du deine Notizen überarbeiten?')
        pass