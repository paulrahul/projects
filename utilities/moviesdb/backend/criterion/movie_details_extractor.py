import requests
from bs4 import BeautifulSoup
import time

def extract_film_metadata(url):
    """
    Extract metadata from a Criterion film page including OpenGraph tags
    and schema.org metadata
    
    Args:
        url (str): The Criterion film page URL
        
    Returns:
        dict: Dictionary containing all extracted metadata
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        # Add a small delay to be respectful to the server
        # time.sleep(1)
        
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Initialize dictionary for metadata
        metadata = {}
        
        # Extract OpenGraph metadata
        metadata['title'] = soup.find('meta', property='og:title')['content'] if soup.find('meta', property='og:title') else None
        metadata['description'] = soup.find('meta', property='og:description')['content'] if soup.find('meta', property='og:description') else None
        metadata['image'] = soup.find('meta', property='og:image')['content'] if soup.find('meta', property='og:image') else None
        metadata['thumbnail'] = soup.find('meta', property='thumbnail')['content'] if soup.find('meta', property='thumbnail') else None
        
        # Extract country of origin
        country_elem = soup.find('li', {'itemprop': 'countryOfOrigin'})
        if country_elem:
            country_name = country_elem.find('span', {'itemprop': 'name'})
            metadata['country'] = country_name.text.strip() if country_name else None
        
        # Extract year
        year_elem = soup.find('meta', {'itemprop': 'datePublished'})
        if year_elem:
            year_li = year_elem.parent
            if year_li:
                metadata['year'] = year_li.text.strip()            
        
        # Extract duration
        duration_elem = soup.find('meta', {'itemprop': 'duration'})
        if duration_elem:
            duration_li = duration_elem.parent
            if duration_li:
                metadata['duration'] = duration_li.text.strip()
        
        return metadata
        
    except requests.RequestException as e:
        print(f"Error fetching the webpage: {e}")
        return None
    except Exception as e:
        print(f"An error occurred: {e}")
        return None

def print_metadata(metadata):
    """
    Print the extracted metadata in a readable format
    """
    if not metadata:
        print("No metadata was extracted")
        return
        
    print("Film Metadata:")
    print("-" * 50)
    print(f"Title: {metadata.get('title')}")
    print(f"Country: {metadata.get('country')}")
    print(f"Year: {metadata.get('year')}")
    print(f"Duration: {metadata.get('duration')}")
    print(f"Image URL: {metadata.get('image')}")
    print("\nDescription:")
    print(metadata.get('description'))

# Example usage
if __name__ == "__main__":
    url = "https://www.criterion.com/films/30223-la-piscine"
    metadata = extract_film_metadata(url)
    print_metadata(metadata)