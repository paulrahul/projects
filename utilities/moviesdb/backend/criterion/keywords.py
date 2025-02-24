from sklearn.feature_extraction.text import TfidfVectorizer

import ollama
import pandas as pd
import logging
import numpy as np 
import json
from tqdm import tqdm 
import multiprocessing as mp
import traceback
import os

from backend.util import resolved_file_path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logging.getLogger("urllib3").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)

log = logging.getLogger(__name__)
log.propagate = True

DUMP_CSV_FILE = resolved_file_path("criterion/raw_dump.csv")
CSV_FILE = resolved_file_path("criterion/preprocessed.csv")

MODEL = "gemma2:9b"

def _prepare_combined_df():
    # Read the raw dump file
    raw_df = pd.read_csv(DUMP_CSV_FILE)
    
    # Sanitize the raw data
    raw_df['Country'] = raw_df['Country'].fillna('')
    raw_df['Year'] = raw_df['Year'].fillna('')
    raw_df['Recommender'] = raw_df['Recommender'].fillna('')
    raw_df['closet_pick_url'] = raw_df['closet_pick_url'].fillna('')
    
    # Group raw_df by Title to combine all columns appropriately
    raw_grouped = raw_df.groupby('Title').agg({
        'Description': 'first',  # Take first non-null description
        'Country': 'first',      # Take first non-null country
        'Year': 'first',         # Take first non-null year
        'Duration': 'first',     # Take first non-null duration
        'movie_url': 'first',    # Take first non-null movie_url
        'Recommender': lambda x: ', '.join(sorted(set(filter(None, x)))),  # Combine unique recommenders
        'closet_pick_url': 'first'  # Take first non-null closet_pick_url
    }).reset_index()
    
    # Read the preprocessed data
    preprocessed = pd.read_csv(CSV_FILE)
    
    # Update existing entries
    merged = preprocessed.merge(raw_grouped, on='Title', how='left', suffixes=('', '_new'))
    
    # For existing entries, combine old and new recommenders, ensuring uniqueness
    merged.loc[merged['Recommender'].isna(), 'Recommender'] = merged['Recommender_new']
    merged.loc[merged['Recommender_new'].notna(), 'Recommender'] = merged.apply(
        lambda row: ', '.join(sorted(set(
            filter(None, 
                  (row['Recommender'].split(', ') if pd.notna(row['Recommender']) else []) +
                  (row['Recommender_new'].split(', ') if pd.notna(row['Recommender_new']) else [])
            )
        ))) if pd.notna(row['Recommender_new']) else row['Recommender'],
        axis=1
    )
    
    merged.loc[merged['closet_pick_url'].isna(), 'closet_pick_url'] = merged['closet_pick_url_new']
    merged.loc[merged['closet_pick_url_new'].notna(), 'closet_pick_url'] = merged.apply(
        lambda row: ', '.join(sorted(set(
            filter(None, 
                  (row['closet_pick_url'].split(', ') if pd.notna(row['closet_pick_url']) else []) +
                  (row['closet_pick_url_new'].split(', ') if pd.notna(row['closet_pick_url_new']) else [])
            )
        ))) if pd.notna(row['closet_pick_url_new']) else row['closet_pick_url'],
        axis=1
    )
    
    # Add new entries from raw_df that don't exist in preprocessed
    new_entries = raw_grouped[~raw_grouped['Title'].isin(preprocessed['Title'])]
    
    # Combine existing and new entries
    final_df = pd.concat([
        merged[['Title', 'Description', 'Country', 'Year', 'Duration', 
                'movie_url', 'Recommender', 'closet_pick_url', 'Keywords']],
        new_entries
    ], ignore_index=True)
    
    return final_df

PROMPT_TEMPLATE = """
Here is a movie's description. Using this, could you give me the relevant 
keywords as well as some important synonyms for those keywords which summarise 
the description. Make sure, you retain the proper nouns and numbers in the 
keywords. Also, add some keywords which indicate the genre or mood of the movie.

Generate a JSON object with unique keywords. 
The response must be a compact, minified JSON string with the following format:

{{"keywords": ["keyword1", "keyword2", "keyword3", ...], "synonyms": ["keyword1", "keyword2", "keyword3", ...]}}

Do not include extra text, explanations, or formatting. Just return the JSON object.

{description}
"""

def _get_llm_keywords(description):
    response = ollama.generate(
        model=MODEL, prompt=PROMPT_TEMPLATE.format(description=description))

    try:    
        keywords = response["response"]
        keywords = keywords.strip('```json').strip('```').strip()    
        
        log.debug(f"Returned keywords: {keywords}")
        return json.loads(keywords)
    except Exception as e:
        log.exception("Got exception: ")
        raise Exception(f"Could not unmarshal {response} for {e}")
    
def _extract_unique_keywords(data):
    # Extract keywords and split into a list
    keywords = set(data["keywords"])
    
    if "synonyms" in data:
        keywords.update(set(data["synonyms"]))
    
    return keywords  # Sorted for readability

def _extract_themes(descriptions):
    vectorizer = TfidfVectorizer(max_features=100, stop_words='english')
    X = vectorizer.fit_transform(descriptions)
    return vectorizer.get_feature_names_out().tolist()

def _fetch_intelligent_keywords(title, description):    
    # Then call an LLM to generate more intelligent keywords. Make sure we dedupe
    # keywords.
    log.info(f"Getting model response for: {title}")
    llm_keywords = _get_llm_keywords(description)
    return _extract_unique_keywords(llm_keywords)

def _fetch_existing_titles():
    try:
        # Read only required columns (A and E)
        df = pd.read_csv(CSV_FILE, usecols=["Title", "Keywords"])
        df = df[df['Keywords'].notna() & (df['Keywords'] != '')]

        # Create a dictionary mapping A → E
        return dict(zip(df["Title"], df["Keywords"]))
    except Exception as e:
        return {}

# Function for multiprocessing
def _process_row(idx, title, description, existing, total):
    if title in existing:
        # Don't log for existing titles to reduce noise
        keywords = str(existing[title]) if pd.notna(existing[title]) else ''
        return keywords.split()
    else:
        log.info(f"[{idx}/{total}] Processing new title: {title}")
        try:
            return _fetch_intelligent_keywords(title, description)
        except Exception as e:
            log.error(f"[{idx}/{total}] Exception processing {title}: {e}")
            return set()

# Use macOS-friendly multiprocessing
def _parallel_process(data, existing, workers=mp.cpu_count() - 2, batch_size=100):
    """Process data in parallel using multiprocessing with batch processing."""
    results = []
    total = len(data)
    with mp.Pool(workers) as pool:
        for batch in tqdm(range(0, total, batch_size)):
            chunk = data[batch : batch + batch_size]
            # results.extend(pool.map(_process_row, chunk, existing))
            try:
                results.extend(pool.starmap(_process_row, [(idx + 1, title, desc, existing, total) for idx, title, desc in chunk]))
            except Exception as e:
                # traceback.print_exc()
                log.error(f"Exception: {e}")
    return results
    
def update_preprocessed_data(batch_size=50):     
    df = _prepare_combined_df()
        
    # First, extract static keywords
    df["Themes"] = df["Description"].apply(lambda x: _extract_themes([x]))

    existing = _fetch_existing_titles()

    # Process the LLM Keywords in batches    
    df["LLMKeywords"] = _parallel_process(list(zip(df.index, df["Title"], df["Description"])), existing)
    
    # Drop rows which got empty LLM fetches (possibly due to some error) so
    # that they can later be retried.
    df = df.dropna(subset=['LLMKeywords'])

    # Merge Themes and LLMKeywords
    # df["Keywords"] = df.apply(lambda x: sorted(list(set(x["Themes"]).union(x["LLMKeywords"]))), axis=1)
    # df["Keywords"] = df.apply(lambda x: ", ".join(sorted(set(x["Themes"]).union(x["LLMKeywords"]))), axis=1)
    df["Keywords"] = df.apply(
        lambda x: existing[x["Title"]] if x["Title"] in existing 
        else ", ".join(sorted(set(x["Themes"]).union(x["LLMKeywords"]))), 
        axis=1
    )

    # Save the output
    df.drop(['Themes', 'LLMKeywords'], axis=1).to_csv(CSV_FILE, index=False)
    
    # Delete the raw dump file.
    os.remove(DUMP_CSV_FILE)
    
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-size", type=int, default=50)
    parser.add_argument("-d", "--debug", action="store_true", default=False)
    args = parser.parse_args()
    
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
        log.setLevel(logging.DEBUG)
        log.debug("Debug mode enabled")
    
    update_preprocessed_data(args.batch_size)
    
    