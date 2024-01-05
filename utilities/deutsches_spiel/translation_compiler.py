import json
import os
import traceback

import gspread

from log import get_logger
from scraper.crawler import CrawlerFactory
from scraper.translator import TranslatorFactory
import util

DUMP_FILE_NAME =  "_dump.txt"
SCRAPE_QUEUE_FILE_NAME = "_scrape_queue.txt"
DEEPL_KEY_VAR = "DEEPL_KEY"

logger = get_logger()

class Compiler:
    def __init__(self, translator_api_key):
        logger.info("Starting Compiler...")
        
        self._entries = None
        self._gs_entries = None
        
        self._crawler = CrawlerFactory.get_crawler("dwds")
        self._translator = TranslatorFactory.get_translator("deepl", translator_api_key)
                      
    def compile(self):
        # Step 1. Read word list.
        fetched = util.file_exists(DUMP_FILE_NAME)
        if not fetched:
            fetched = self._fetch_glossary()
        if not fetched:
            logger.critical("Fetching glossary failed", exc_info=1) 
        
        # Step 2. Build scrape list.
        if not util.file_exists(SCRAPE_QUEUE_FILE_NAME):
            self._prepare_for_scrape()
        
        # Step 3. Scrape.
        self._scrape_and_translate()
        
        # Step 5.
        self._cleanup()
        
    def _cleanup(self):
        _delete_file(SCRAPE_QUEUE_FILE_NAME)
        
    def _scrape_de_to_en(self, word):
        return self._crawler.crawl(word)
    
    def _translate_de_to_en(self, word):
        return self._translator.translate_from_deutsch(word)
        
    def _scrape_and_translate(self):
        try:
            with open(SCRAPE_QUEUE_FILE_NAME, 'r') as file:                
                to_be_scraped_queue = json.load(file)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            logger.warning(f"Could not read dump file {SCRAPE_QUEUE_FILE_NAME} due to: {e}")

        for scrape_word, scrape_entry in to_be_scraped_queue.items():
            if scrape_entry['de_to_en']:
                file_name = self._scrape_de_to_en(scrape_word)
                scrape_entry['file'] = file_name
                translation = self._translate_de_to_en(scrape_word)
                scrape_entry['translation'] = translation
                
        self._combine_metadata(to_be_scraped_queue)
                
    def _combine_metadata(self, scraped_entries):
        dump_entries = []
        for word, entry in scraped_entries.items():
            if not entry['de_to_en']:
                continue
            
            dump_entries.append({
                "word": word,
                "de_to_en": entry["de_to_en"],
                "translation": entry["translation"],
                "examples": None,
                "metadata": None
            })
            
        with open(DUMP_FILE_NAME, 'w') as file:
            logger.debug(f"Dumping all metadata to file.")
            json.dump(dump_entries, file)          
                    
    def _prepare_for_scrape(self):  
        # Schedule scraping for any word in GS not having a translation.
        to_be_scraped_queue = {}
        empty_dump_file = self._entries is None or len(self._entries) == 0
        for row in self._gs_entries:
            word = None
            de_to_en = False
            
            if row[0] is not None and row[0] != '':
                word = row[0]
                de_to_en = True
            else:
                word = row[1]
            
            if empty_dump_file or word not in self._entries:
                to_be_scraped_queue[word] = {'de_to_en': de_to_en}
                logger.debug(f"To be scraped: {word}, de_to_en={de_to_en}")
    
        if len(to_be_scraped_queue) > 0:
            with open(SCRAPE_QUEUE_FILE_NAME, 'w') as file:
                logger.debug(f"Writing scrape entries")
                json.dump(to_be_scraped_queue, file)
        
    def _fetch_glossary(self, fetch_from_google_sheet=False):
        # 1. Fetch from dump file first.
        # 2. If dump file not found or if fetch_from_google_sheet, then fetch
        #    Google spreadsheet contents.
        
        dump_file_found = False
        try:
            # First try to read from a local dump file. Re-read if file is not
            # available or if the file is older than current date.        
            with open(DUMP_FILE_NAME, 'r') as file:                
                logger.debug(f"Loading entries from current dump file.")
                self._entries = json.load(file)
                dump_file_found = True
        except (FileNotFoundError, json.JSONDecodeError) as e:
            logger.warning(f"Could not read dump file {DUMP_FILE_NAME} due to: {e}")
            
        if not dump_file_found or fetch_from_google_sheet:
            return self._fetch_from_gsheet()
        
        return True
        
    def _fetch_from_gsheet(self):
        try:
            logger.info(f"Reading Google Spreadsheet file")
            
            # Authenticate with Google Sheets API
            gc = gspread.oauth()

            # Open the spreadsheet by title
            spreadsheet = gc.open('Vokabeln und Phrasen')

            # Select the worksheet by title
            worksheet = spreadsheet.worksheet('Sheet1')

            # Get all values from the worksheet
            self._gs_entries = worksheet.get_all_values()[1:]
            
            logger.debug(f"Obtained values from GS: {self._gs_entries}")
            
            # with open(DUMP_FILE_NAME, 'w') as file:
            #     logger.debug(f"Dumping back read contents to file.")
            #     json.dump(self._entries, file)
                
            return True

        except Exception as e:
            # Catch any exception and print its contents
            logger.error(f"Fetching Google sheet failed")
            traceback.print_exc()
            return False
    
def _delete_file(file_name):
    try:
        os.remove(file_name)
        logger.debug(f"File '{file_name}' deleted successfully.")
    except FileNotFoundError:
        logger.error(f"File '{file_name}' not found.")
    except Exception as e:
        logger.error(f"An error occurred: {e}")

if __name__ == "__main__":    
    api_key = None
    # Check if the environment variable exists
    if DEEPL_KEY_VAR in os.environ:
        # Access the value of the environment variable
        api_key = os.environ[DEEPL_KEY_VAR]
    else:
        exit(f"The environment variable {DEEPL_KEY_VAR} is not set.")
    
    o = Compiler(api_key)
    o.compile()
    
