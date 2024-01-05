from collections import namedtuple

TranslationEntry = namedtuple(
    'TranslationEntry',
    ['word', 'de_to_en', 'translation', 'examples', 'metadata'])
