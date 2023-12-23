from datetime import datetime
import deepl
import gspread
import json

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

        # Print the translation
        # print("Translation:", response['translations'][0]['text'])

        # print(response)
        return response.text

        # # Print some example sentences
        # print("\nExample Sentences:")
        # for sentence in response['translations'][0]['usage']:
        #     print(f"- {sentence}")

DUMP_FILE_NAME =  "_dump.txt"

class DeutschesSpiel:
    def __init__(self, translator: Translator):
        self._rows = []
        self._translator = translator

        self._init()

    def _init(self):
        # First try to read from a local dump file.
    
        values = None
        try:
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
                
            self.prepare_game()

        # Print the values
        for row in values:
            if row[0] is not None and row[0] != '':
                self._rows.append((row[0], row[1], None))
                
    def prepare_game(self):
        for i in range(len(self._rows)):
            translation = translator.translate_from_deutsch(self._rows[i][0])
            # print(f"{entry[0]} -> {translation}")
            self._rows[i] = (self._rows[i][0], translation, None)
            
        with open(DUMP_FILE_NAME, 'w') as file:
            json.dump(self._rows, file)
            
    def start_game(self):
        print(self._rows)
            
from fuzzywuzzy import fuzz

def find_similarity(str1, str2):
    # Convert strings to lowercase for case-insensitive comparison
    str1_lower = str1.lower()
    str2_lower = str2.lower()

    # Use the fuzz.ratio() method to get a similarity score
    return fuzz.ratio(str1_lower, str2_lower)

THRESHOLD = 80
def are_strings_similar(str1, str2):
    return find_similarity(str1, str2) >= THRESHOLD


DEEPL_KEY_VAR = "DEEPL_KEY"

if __name__ == "__main__":
    # string1 = "Python is a programming language"
    # string2 = "One programming language is Python"

    # if are_strings_similar(string1, string2):
    #     print("The strings are similar.")
    # else:
    #     print("The strings are not similar.")
    
    import os
    
    api_key = None
    # Check if the environment variable exists
    if DEEPL_KEY_VAR in os.environ:
        # Access the value of the environment variable
        api_key = os.environ[DEEPL_KEY_VAR]
    else:
        exit(f"The environment variable {DEEPL_KEY_VAR} is not set.")

    translator = Translator(api_key)
    # translator.translate_from_deutsch("Guten Tag!")
    
    spiel = DeutschesSpiel(translator)
    spiel.start_game()