from colorama import Back, Fore, Style
import json
import random

from log import get_logger, update_logging_level
from translation_compiler import Compiler, DUMP_FILE_NAME, DEEPL_KEY_VAR
import util

logger = get_logger()

class DeutschesSpiel:
    def __init__(self, use_semantic=False):
        self._use_semantic = use_semantic
        self._rows = []

        self._init()

    def _init(self):
        print("Initialising game...\n\n")
        
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
            
            user_answer = input(
                Fore.CYAN + f'Was bedeutet {entry["word"]}?: ' + Style.RESET_ALL).strip().lower()
            similarity_score = find_similarity(user_answer, entry["translation"], self._use_semantic)
            print(f"Deine Antwort ist {correctness_string(similarity_score, self._use_semantic)}, Ähnlichkeitwert {similarity_score}")
            print(Fore.GREEN + f"Echte Antwort: {entry['translation']}" + Style.RESET_ALL + 
                  Back.GREEN + Style.BRIGHT + "\n\nExamples:" + Style.RESET_ALL)
            print("\n".join(entry["examples"][:5]))
            
            if "genus" in entry['metadata']:
                print(Back.GREEN + Style.BRIGHT + f"\nGenus:" + Style.RESET_ALL + " " + str(entry['metadata']['genus']))
            
            if not prompt('\nWeiter?'):
                break
            
from fuzzywuzzy import fuzz

def correctness_string(score, semantic=False):
    if semantic:
        score *= 100
    if score >= 90:
        return "richtig"
    elif score < 90 and score >= 70:
        return "fast richtig"
    else:
        return "nicht ganz richtig"

def find_similarity(str1, str2, semantic=False):
    # Convert strings to lowercase for case-insensitive comparison
    str1_lower = str1.lower()
    str2_lower = str2.lower()

    if not semantic:
        # Use the fuzz.ratio() method to get a similarity score
        return fuzz.ratio(str1_lower, str2_lower)
    else:
        return SemanticComparator.semantic_similarity(str1_lower, str2_lower)

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
    parser.add_argument('--debug', '-d', action='store_true', help='Enable debug logging level')
    parser.add_argument('--semantic', '-s', action='store_true', help='Enable semantic comparison')
    parser.add_argument('--reload', action='store_true', help='Load new translations')    
    args = parser.parse_args()

    if args.debug:
        update_logging_level(logger, "debug")
        logger.info("Enabled debug logging")

    use_semantic = False
    if args.semantic:
        SemanticComparator.load()
        use_semantic = True
        
    if args.reload:
        api_key = None
        # Check if the environment variable exists
        if DEEPL_KEY_VAR in os.environ:
            # Access the value of the environment variable
            api_key = os.environ[DEEPL_KEY_VAR]
        else:
            exit(f"The environment variable {DEEPL_KEY_VAR} is not set.")
                        
        compiler = Compiler(api_key)
        compiler.compile(reload=True)
        
    if prompt('Möchtest du ein Spiel spielen?'):
        spiel = DeutschesSpiel(use_semantic)
        
        spiel.play_game()
    else:
        user_input = prompt('Möchtest du deine Notizen überarbeiten?')
        pass