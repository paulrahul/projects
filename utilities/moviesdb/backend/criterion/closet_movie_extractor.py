import requests
from bs4 import BeautifulSoup
import time

def extract_criterion_links(url):
    """
    Extract links from filmQuick div elements on a Criterion webpage
    
    Args:
        url (str): The Criterion webpage URL to scrape
        
    Returns:
        list: List of extracted href links
    """
    # Add headers to mimic a browser request
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        # Add a small delay to be respectful to the server
        # time.sleep(1)
        
        # Make the request
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        # Parse the HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find all div elements with class 'filmQuick'
        film_quick_divs = soup.find_all('div', class_='filmQuick')
        
        # Extract href links from the anchor tags
        links = []
        for div in film_quick_divs:
            anchor = div.find('a')
            if anchor and 'href' in anchor.attrs:
                links.append(anchor['href'])
        
        return links
        
    except requests.RequestException as e:
        print(f"Error fetching the webpage: {e}")
        return []
    except Exception as e:
        print(f"An error occurred: {e}")
        return []

# Example usage
if __name__ == "__main__":
    url = "https://www.criterion.com/shop/collection/737-payal-kapadia-s-closet-picks"
    links = extract_criterion_links(url)
    
    for link in links:
        print(link)