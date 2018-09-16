import re
import requests
import sys
from threading import Thread

from bs4 import BeautifulSoup
import pdfkit

def scrape_links(soup, pattern):
  return soup.find_all(href=re.compile(pattern))

def fetch_quiz_links(url):
  next_page = url
  pagenum = 1

  final_links = set()

  while next_page:
    print "Going to page %d" % pagenum

    page = requests.get(next_page)
    if page.status_code != 200:
      raise IOError("Unable to open %s. Received %s" % (
        url, page.status_code))

    soup = BeautifulSoup(page.content, "html.parser")

    quiz_links = scrape_links(soup, "\/blink\/hang\/+")
    for link in quiz_links:
      href = link.get("href")
      if href.count("article"):
          final_links.add(href)

    next_page = soup.find(href=re.compile("page=%s" % str(pagenum + 1)))
    if next_page:
      next_page = next_page.get("href")
      pagenum += 1

  f = open("out", "w")
  for l in final_links:
    f.write("%s\n" % l)


def make_pdf(url, filename):
  print "Generating PDF %s" % filename
  try:
    pdfkit.from_url(url, filename)
  except:
    print sys.exc_info()[0]
  print "%s generated." % filename

if __name__ == "__main__":
  if len(sys.argv) != 2:
    raise ValueError("Please provide URL")

  #fetch_quiz_links(sys.argv[1])

  threads = []
  idx = 1
  rexp = re.compile("\/hang\/([A-Za-z0-9-]*)\/")
  f = open("out", "r")
  for l in f:
    m = re.findall(rexp, l)[0]
    if m.lower() == "In-FAQ".lower():
      m = "Quiz-%d" % idx
      idx += 1
    m += ".pdf"
    
    make_pdf(l, m)

    """
    t = Thread(target=make_pdf, args=(l, m))
    t.start()
    threads.append(t)
    """

  """
  for t in threads:
    t.join()
  """
