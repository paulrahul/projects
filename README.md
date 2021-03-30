# projects

###### *Last Updated: 30-Mar-2021*

This repository consists of apps that I tend to write at times to while off some time and to help me with some aspects of my own life. I usually implement these to learn new technologies and hardly ever continue them to the point of making them professionally fit-n-finished. 

The current set of apps checked in here:

##### Apps (standalone services)
1. **[YouName](https://github.com/paulrahul/projects/tree/master/apps/YouName)** - A human readable and personalised username generating service. More about it [here](http://younameapp.herokuapp.com/about). 
	- Stack: Python, Flask, Jinja templates, Redis, Heroku
	- Pending work: Oh, lots! - Fix UI (make it look less like a 90s HTML page), integrate with Spotify, write feature to reserve usernames in popular providers etc. etc.
	- [Live link](http://younameapp.herokuapp.com/)
2. **[Stats server](https://github.com/paulrahul/projects/tree/master/apps/stats/server)** - Just a GRPC based basic Stats service with a client implementation using both synchronous and asynchronous modes of calling the backend API. Implemented this to get acquainted with GRPC and Proto3.
	- Stack: C++, gRPC (sync, async, streaming), Proto3, Bazel build
	- Pending Work: Leverage it in some other useful project as scalable stats persistence and reporting is a much needed feature in most projects.


##### Extensions (Chrome extensions)
1. **[tabahi](https://github.com/paulrahul/projects/tree/master/extensions/tabahi)** - An extension to capture my Chrome browser activity and generate useful usage reports. Implemented this to bring some discipline into my browser usage. There are lots of extensions available in Chrome store for this purpose, but I wanted something which is personalised to my bad habits (e.g. never getting back to those tabs open since ages) and also, since I wanted to try developing a Chrome extension. An offshoot of this project is the **[tabstats](https://github.com/paulrahul/projects/tree/master/extensions/tabstats)** project where I implemented a cleaner version of the tab stats collection pipeline.
	- Stack: Chrome APIs, Node.js, Javascript, Bash, Redis, EJS templating, CanvasJS, LRU algo
	- Pending work: https://github.com/paulrahul/projects/issues [TABSTATS]

##### Utilities (standalone scripts / tools)
1. **[scraper](https://github.com/paulrahul/projects/tree/master/utilities/scraper)** - A simple web scraper I wrote long back to scrape quizzes published by one of my favorite QMs (Joy Bhattacharya) and then download them as PDFs for my further perusal. Discontinued using this tool long back after I lost the discipline of reading those quizzes :/
	- Stack: Python (standard and libs like BeautifulSoup and pdfkit)
	- Pending work: Abandoned :(
