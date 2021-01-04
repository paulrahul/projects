'''
Mallu name generator

A Mallu name has the following basic funda:
1. Place the letter J either at the beginning or somewhere in the middle.
2. If J is in the beginning, then:
   a. ending has to be with in/esh/eesh
   b. Set up middle-ish letter as either of b/g/k/l/m/n/t/v
3. If J is in the middle, then:
   a. ending can be with in/esh/eesh
   b. either or i or o
   c. Set up starting letter as either of b/g/k/l/m/n/t/v
4. Fill up position between first and middle letter with o or i
'''

import random

def _rand_select(lst):
    l = len(lst)
    idx = random.randint(0, l - 1)
    return lst[idx]

def add_ending(name, vowels_allowed=False):
    kosher_endings = ["in", "esh", "eesh"]
    kosher_vowels = "io"

    if vowels_allowed:
        kosher_endings.extend(kosher_vowels)

    return (name + _rand_select(kosher_endings))

def add_middle(name, thej=False):
    kosher_consonants = "bgklmntv"

    if thej:
        return add_ending(name + "j", vowels_allowed=True)

    return add_ending(name + _rand_select(kosher_consonants))

def generate_random_mallu_name():
    kosher_beginnings = "bgjklmntv"
    kosher_vowels = "io"

    b = _rand_select("j" + _rand_select(kosher_beginnings))
    v = _rand_select(kosher_vowels)

    return add_middle(b + v, b != "j")

if __name__ == "__main__":
    for _ in xrange(20):
        print(generate_random_mallu_name())
