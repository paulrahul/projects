'''
Run: ~/Codez/projects/utilities/moviesdb: python -m backend.criterion.extractor
'''

import csv
import threading
from queue import Queue
import csv
import time
from concurrent.futures import ThreadPoolExecutor, wait, FIRST_COMPLETED
import logging
import os
import re
import gspread
import traceback
import pandas as pd

from backend.criterion.closet_extractor import extract_closet_picks_links_from_search
from backend.criterion.closet_movie_extractor import extract_criterion_links
from backend.criterion.movie_details_extractor import extract_film_metadata

from backend.util import resolved_file_path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

CSV_FILE = resolved_file_path("criterion/preprocessed.csv")
DUMP_CSV_FILE = resolved_file_path("criterion/raw_dump.csv")

def _extract_name_regex(url):
    pattern = r'collection/\d+-([\w-]+?)(?:-s)?-closet-picks'
    match = re.search(pattern, url)
    if match:
        name = match.group(1).replace("-", " ").title()
        return name
    return None

def _fetch_from_gsheet():
    try:
        sheet = 'Criterion Closet Picks'
        print(f"Reading sheet {sheet}")
        
        # Authenticate with Google Sheets API
        gc = gspread.oauth()

        # Open the spreadsheet by title
        spreadsheet = gc.open(sheet)

        # Select the worksheet by title
        worksheet = spreadsheet.worksheet("New & Complete")

        # Get all values from the worksheet
        return worksheet.col_values(9)  # 9 is the column number for closet_pick_url

    except Exception as e:
        # Catch any exception and print its contents
        print(f"Fetching Google sheet failed")
        traceback.print_exc()
        return None
    
def _write_to_gsheet(rows):
    try:
        sheet = 'Criterion Closet Picks'
        print(f"Writing to sheet {sheet}")
        
        # Authenticate with Google Sheets API
        gc = gspread.oauth()

        # Open the spreadsheet by title
        spreadsheet = gc.open(sheet)

        # Select the worksheet
        worksheet = spreadsheet.worksheet('New & Complete')  # Replace 'Bar' with your worksheet name

        # Prepare rows, applying IMAGE() function to the URL column
        new_rows = []
        for row in rows:
            url = row["Thumbnail"]
            url = url.replace("_original", "_small")
            
            image_url = f'=IMAGE("{url}")'  # Apply IMAGE() function to the URL
            row["Thumbnail"] = image_url
            new_rows.append(list(row.values()))

        # Add rows to the worksheet
        worksheet.append_rows(new_rows, value_input_option='USER_ENTERED')  # Use USER_ENTERED for formulas

    except Exception as e:
        # Catch any exception and print its contents
        print(f"Fetching Google sheet failed")
        traceback.print_exc()
        return None        

class CriterionDataCollector:
    def __init__(self, max_movies=5, max_workers=3, request_delay=1):
        self.max_movies = max_movies
        self.max_workers = max_workers
        self.request_delay = request_delay
        self.collected_movies = 0
        self.lock = threading.Lock()
        self.movie_data = []
        self.should_stop = False
        
    def process_movie(self, movie_url, closet_pick_url):
        if self.should_stop:
            return

        try:
            time.sleep(self.request_delay)
            metadata = extract_film_metadata(movie_url)
            
            if metadata:
                with self.lock:
                    if self.collected_movies >= self.max_movies:
                        self.should_stop = True
                        return
                        
                    self.movie_data.append({
                        'Title': metadata.get('title', ''),
                        # 'Thumbnail': metadata.get('image', ''),
                        'Thumbnail': '',
                        'Recommender': _extract_name_regex(closet_pick_url),
                        'Description': metadata.get('description', ''),
                        'Country': metadata.get('country', ''),
                        'Year': metadata.get('year', ''),
                        'Duration': metadata.get('duration', ''),
                        
                        # Hidden columns
                        'movie_url': movie_url,                        
                        'closet_pick_url': closet_pick_url
                    })
                    
                    self.collected_movies += 1
                    logger.info(f"Processed movie: {metadata.get('title')} ({self.collected_movies}/{self.max_movies})")
                    
                    if self.collected_movies >= self.max_movies:
                        self.should_stop = True
                    
        except Exception as e:
            logger.error(f"Error processing movie {movie_url}: {e}")

    def process_closet_pick(self, closet_pick_url):
        if self.should_stop:
            return

        try:
            time.sleep(self.request_delay)
            movie_urls = extract_criterion_links(closet_pick_url)
            futures = []
            
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                for movie_url in movie_urls:
                    if self.should_stop:
                        break
                    futures.append(executor.submit(self.process_movie, movie_url, closet_pick_url))
                    
                # Wait for any future to complete and check if we should stop
                while futures and not self.should_stop:
                    done, futures = wait(futures, return_when=FIRST_COMPLETED)
                    futures = list(futures)  # Convert the set back to a list
                    
        except Exception as e:
            logger.error(f"Error processing closet pick {closet_pick_url}: {e}")

    def persist_new_recommendations(self, gsheet=False):
        if len(self.movie_data) == 0:
            logger.info(f"No new data to write")
            return False # No data added.
        
        if gsheet:
            logger.info("Writing to Google Sheet")
            _write_to_gsheet(self.movie_data)
        else:
            logger.info("Writing to CSV")
            fieldnames = list(self.movie_data[0].keys())
            # print(f"{self.movie_data=}")
            if not os.path.exists(DUMP_CSV_FILE):
                with open(DUMP_CSV_FILE, 'w', newline='', encoding='utf-8') as csvfile:
                    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                    writer.writeheader()
                    writer.writerows(self.movie_data)
            else:
                with open(DUMP_CSV_FILE, 'a', newline='', encoding='utf-8') as csvfile:
                    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                    writer.writerows(self.movie_data)
        
            logger.info(f"Data written to {DUMP_CSV_FILE}")
            
        return True # Data added.
        
    def get_closet_pick_urls(self, gsheet=False):
        all = set(extract_closet_picks_links_from_search("https://www.criterion.com/closet-picks/search"))
        
        if gsheet:
            logger.info("Fetching from Google Sheet")
            existing = set(_fetch_from_gsheet())
        else:
            logger.info("Fetching from CSV")
            with open(CSV_FILE, mode='r', newline='', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                existing = set()
                for row in reader:
                    closets = row['closet_pick_url'].split(",")
                    for closet in closets:
                        closet = closet.strip()
                        # Only prepend the URL if it's not already a complete URL
                        if not closet.startswith('https://'):
                            closet = "https://www.criterion.com/shop/collection/" + closet
                        existing.add(closet)
                            
        logger.info(f"{len(all)=}")
        logger.info(f"{len(existing)=}")

        return list(all - existing)
    
    def collect_data(self, gsheet=False):
        try:
            logger.info("Starting data collection...")
            
            # # closet_pick_urls = extract_closet_picks_links("https://www.criterion.com/closet-picks")
            
            closet_pick_urls = self.get_closet_pick_urls(gsheet=gsheet)
            futures = []
            
            logger.info(f"{len(closet_pick_urls)} closets to be processed..")
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                for closet_pick_url in closet_pick_urls:
                    if self.should_stop:
                        break
                    logger.info(f"Processing films of {_extract_name_regex(closet_pick_url)}")
                    futures.append(executor.submit(self.process_closet_pick, closet_pick_url))
                    
                # Wait for any future to complete and check if we should stop
                while futures and not self.should_stop:
                    done, futures = wait(futures, return_when=FIRST_COMPLETED)
                    futures = list(futures)
            
            logger.info("Data collection completed")           
  
        except Exception as e:
            logger.error(f"Error in data collection: {e}")
        finally:
            return self.persist_new_recommendations(gsheet=gsheet)  # Ensure we save whatever data we collected

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument("--gs", action="store_true", default=False)
    args = parser.parse_args()
    
    collector = CriterionDataCollector(
        max_movies=2000,
        max_workers=5,
        request_delay=1
    )
    
    # print(collector.collect_data(gsheet=args.gs))
    print(collector.get_closet_pick_urls(gsheet=args.gs))