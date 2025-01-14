import requests
from bs4 import BeautifulSoup
import time

def extract_closet_picks_links_from_search(url):
    # Add headers to mimic a browser request
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    # Base URL for completing relative URLs
    base_url = "https://www.criterion.com"
    
    try:
        # Add a small delay to be respectful to the server
        # time.sleep(1)
        
        # Make the request
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        # Parse the HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find all `tr` tags with an `@click` attribute
        tr_tags = soup.find_all('tr', attrs={"@click": True})

        # Extract href from the `@click` attribute
        hrefs = []
        for tr in tr_tags:
            onclick_attr = tr.get('@click')
            if onclick_attr and "window.location.href" in onclick_attr:
                # Extract the URL
                start = onclick_attr.find("'") + 1
                end = onclick_attr.rfind("'")
                hrefs.append("https://www.criterion.com" + onclick_attr[start:end])
                
        return hrefs
        
    except requests.RequestException as e:
        print(f"Error fetching the webpage: {e}")
        return []
    except Exception as e:
        print(f"An error occurred: {e}")
        return []

def extract_closet_picks_links(url):
    """
    Extract Closet Picks collection links from the Criterion webpage
    
    Args:
        url (str): The Criterion Closet Picks URL
        
    Returns:
        list: List of extracted href links with their full URLs
    """
    # Add headers to mimic a browser request
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    # Base URL for completing relative URLs
    base_url = "https://www.criterion.com"
    
    try:
        # Add a small delay to be respectful to the server
        # time.sleep(1)
        
        # Make the request
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        # Parse the HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find all anchor tags with the specific classes
        closet_picks_links = soup.find_all('a', class_=['popbox', 'popboxFifty', 'super-collection-popbox-left'])
        
        # Extract and process href links
        links = []
        for anchor in closet_picks_links:
            if anchor.get('href'):
                # Convert relative URLs to absolute URLs
                full_url = base_url + anchor['href'] if anchor['href'].startswith('/') else anchor['href']
                links.append(full_url)
        
        return links
        
    except requests.RequestException as e:
        print(f"Error fetching the webpage: {e}")
        return []
    except Exception as e:
        print(f"An error occurred: {e}")
        return []

# Example usage
if __name__ == "__main__":
    url = "https://www.criterion.com/closet-picks"
    # links = extract_closet_picks_links(url)
    links = extract_closet_picks_links_from_search("https://www.criterion.com/closet-picks/search")
    
    print(f"Found {len(links)} Closet Picks links:")
    for link in links:
        print(link)
        
    print(len(links))