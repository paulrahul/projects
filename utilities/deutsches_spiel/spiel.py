from datetime import datetime
import gspread
import json
import random

from log import get_logger

logger = get_logger()

DUMP_FILE_NAME =  "_dump.txt"

class DeutschesSpiel:
    def __init__(self):
        self._rows = []

        self._init()

    def _init(self):
        print("Initialising game...")
        
        values = None
        try:
            # First try to read from a local dump file. Re-read if file is not
            # available or if the file is older than current date.        
            with open(DUMP_FILE_NAME, 'r') as file:
                current_date = datetime.today().date()
                last_modified_timestamp = os.path.getmtime(DUMP_FILE_NAME)
                last_modified_date = datetime.fromtimestamp(last_modified_timestamp).date()

                if current_date != last_modified_date:
                    logger.info(f"Dump file last mod date {last_modified_date} is not current.")
                    raise FileNotFoundError
                
                logger.debug(f"Loading entries from current dump file.")
                values = json.load(file)
            
        except FileNotFoundError:
            logger.info(f"Reading Google Spreadsheet file")
            
            # Authenticate with Google Sheets API
            gc = gspread.oauth()

            # Open the spreadsheet by title
            spreadsheet = gc.open('Vokabeln und Phrasen')

            # Select the worksheet by title
            worksheet = spreadsheet.worksheet('Sheet1')

            # Get all values from the worksheet
            values = worksheet.get_all_values()[1:]
            
            with open(DUMP_FILE_NAME, 'w') as file:
                logger.debug(f"Dumping back read contents to file.")
                json.dump(values, file)

        # Load only the entries having German words.
        # TODO: Load reverse translations too (en -> de)
        for row in values:
            if row[0] is not None and row[0] != '':
                self._rows.append((row[0], row[1], None))
                
        self._prepare_game()
                
    def _prepare_game(self):
        translation_fetched = False
        # Fetch the translations of the words.
        for i in range(len(self._rows)):
            translation = self._rows[i][1]
            if  translation is None or translation == '':
                translation = translator.translate_from_deutsch(self._rows[i][0])
                translation_fetched = True

            self._rows[i] = (self._rows[i][0], translation, None)

        # Dump back the translations so that we do not fetch translations every
        # time.
        if translation_fetched:
            logger.debug(f"Dumping new translations to file")
            with open(DUMP_FILE_NAME, 'w') as file:
                json.dump(self._rows, file)

    def play_game(self):
        # Pose a German word and fuzzy compare the user answer with the one in
        # the cache. Keep prompting till user says no.
        while True:
            # Get a word randomly.
            entry = random.choice(self._rows)
            user_answer = input(f'Was bedeutet {entry[0]}?: ').strip().lower()
            similarity_score = find_similarity(user_answer, entry[1])
            print(f"Deine Antwort ist {correctness_string(similarity_score)}, Ähnlichkeitwert {similarity_score}")
            print(f"Echte Antwort: {entry[1]}\n")
            
            if not prompt('Weiter?'):
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