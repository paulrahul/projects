from sklearn.feature_extraction.text import TfidfVectorizer

import ollama
import pandas as pd
import logging
import numpy as np 
import json
from tqdm import tqdm 
import multiprocessing as mp
import traceback

from backend.util import resolved_file_path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logging.getLogger("urllib3").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)

log = logging.getLogger(__name__)

CSV_FILE = resolved_file_path("criterion/criterion_recommendations.csv")
DUMP_CSV_FILE = resolved_file_path("criterion/preprocessed.csv")

MODEL = "gemma2:9b"

def _prepare_combined_df(new_data):
    # Open and read the CSV file
    df = pd.read_csv(CSV_FILE)
    if new_data:
        df = pd.concat([df, pd.DataFrame(new_data)], ignore_index=True)

    # Sanitize the data.
    df = df.dropna(subset=['Country', 'Year'])
    df['Recommender'] = df['Recommender'].fillna('')
    df['closet_pick_url'] = df['closet_pick_url'].fillna('')

    # Collapse the df by Title and concatenate the Recommenders and closet_pick_url
    df = (
        df.groupby([
            'Title', 'Description', 'Country', 'Year', 'Duration', 'movie_url'], as_index=False)
        .agg({
            'Recommender': lambda x: ', '.join(sorted(set(x))),  # Ensure unique values and sort them
            'closet_pick_url': lambda x: ', '.join(url.replace('https://www.criterion.com/shop/collection/', '') for url in x)
        })
    )
    
    return df

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
    log.debug(f"{title}: Getting model response..")
    llm_keywords = _get_llm_keywords(description)
    return _extract_unique_keywords(llm_keywords)

def _fetch_existing_titles():
    try:
        # Read only required columns (A and E)
        df = pd.read_csv(DUMP_CSV_FILE, usecols=["Title", "Keywords"])

        # Create a dictionary mapping A → E
        return dict(zip(df["Title"], df["Keywords"]))
    except Exception as e:
        return {}

# Function for multiprocessing
def _process_row(idx, title, description, existing, total):
    log.info(f"Processing {idx}/{total}: {title}")

    if title in existing:
        log.info(f"Found {title} in existing data.")
        return existing[title].split()
    else:
        try:
            return _fetch_intelligent_keywords(title, description)
        except Exception as e:
            log.error(f"Exception processing {title=}: {e}")
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
                log.error(f"Exception: {e}")
    return results
    
def update_preprocessed_data(new_data=None, batch_size=50):
    existing = _fetch_existing_titles()
     
    df = _prepare_combined_df(new_data)

    # First, extract static keywords
    df["Themes"] = df["Description"].apply(lambda x: _extract_themes([x]))

    # Process the LLM Keywords in batches
    # df["LLMKeywords"] = _parallel_process(list(zip(df["Title"], df["Description"])), existing)
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
    df.drop(['Themes', 'LLMKeywords'], axis=1).to_csv(DUMP_CSV_FILE, index=False)
    
if __name__ == "__main__":
    update_preprocessed_data()
    
    