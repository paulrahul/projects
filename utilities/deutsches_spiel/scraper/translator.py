import deepl

from log import get_logger

logger = get_logger()

class Translator:
    def __init__(self, api_key):
        self.api_key = api_key
        
        self._translator = None
        
        self._init(api_key)
        
    def _init(self, api_key):
        pass
    
    def translate_from_deutsch(self, german_text):
        pass

class DeeplTranslator(Translator):        
    def _init(self, api_key):
        # Create a Deepl client
        self._translator = deepl.Translator(api_key)
    
    def translate_from_deutsch(self, german_text):
        # Translate the German text to English
        response = self._translator.translate_text(
            source_lang="de", target_lang="en-us", text=german_text)
        
        logger.debug(f"Fetched translation {response.text} for {german_text}")

        return response.text
    
class TranslatorFactory:
    def get_translator(self, translator_source):
        if translator_source.lower() == "deepl":
            return DeeplTranslator()
        else:
            raise ValueError(f"Invalid translator source type {translator_source}")