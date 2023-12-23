from datetime import datetime
import deepl
import gspread
import json
import random

class Translator:
    def __init__(self, api_key):
        self.api_key = api_key
        
        self._translator = None
        
        self._init(api_key)
        
    def _init(self, api_key):
        # Create a Deepl client
        self._translator = deepl.Translator(api_key)
    
    def translate_from_deutsch(self, german_text):
        # Translate the German text to English
        response = self._translator.translate_text(
            source_lang="de", target_lang="en-us", text=german_text)

        return response.text

DUMP_FILE_NAME =  "_dump.txt"

class DeutschesSpiel:
    def __init__(self, translator: Translator):
        self._rows = []
        self._translator = translator

        self._init()

    def _init(self):
        values = None
        try:
            # First try to read from a local dump file. Re-read if file is not
            # available or if the file is older than current date.        
            with open(DUMP_FILE_NAME, 'r') as file:
                current_date = datetime.today().date()
                last_modified_timestamp = os.path.getmtime(DUMP_FILE_NAME)
                last_modified_date = datetime.fromtimestamp(last_modified_timestamp).date()

                if current_date != last_modified_date:
                    raise FileNotFoundError
                
                values = json.load(file)
            
        except FileNotFoundError:
            # Authenticate with Google Sheets API
            gc = gspread.oauth()

            # Open the spreadsheet by title
            spreadsheet = gc.open('Vokabeln und Phrasen')

            # Select the worksheet by title
            worksheet = spreadsheet.worksheet('Sheet1')

            # Get all values from the worksheet
            values = worksheet.get_all_values()
            
            with open(DUMP_FILE_NAME, 'w') as file:
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
            print(f"Deine Antwort ist {correctness_string(similarity_score)}, score {similarity_score}")
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
        return "nicht ganz."

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


def prompt(text):
    user_input = input(f'{text} [j/n] : ').strip().lower()
    print()
    
    return user_input == 'j' or user_input == ''

DEEPL_KEY_VAR = "DEEPL_KEY"

if __name__ == "__main__":
    import os
    
    api_key = None
    # Check if the environment variable exists
    if DEEPL_KEY_VAR in os.environ:
        # Access the value of the environment variable
        api_key = os.environ[DEEPL_KEY_VAR]
    else:
        exit(f"The environment variable {DEEPL_KEY_VAR} is not set.")
        
    if prompt('Möchtest du ein Spiel spielen?'):
        translator = Translator(api_key)
        spiel = DeutschesSpiel(translator)
        
        spiel.play_game()
    else:
        user_input = prompt('Möchtest du deine Notizen überarbeiten?')
        pass