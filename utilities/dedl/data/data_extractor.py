import gevent
from gevent import monkey
monkey.patch_all()
from gevent.pool import Pool

import argparse
import codecs
import json
import os
from threading import Lock

import deepl
import fnvhash

def hash_string_fnv(s):
    return fnvhash.fnv1a_64(s.encode('utf-8'))  # Returns 64-bit hash

class DataExtractor:
    def __init__(self, translator, num_threads):
        self._translator = translator
        self._num_threads = num_threads
        
        self._billed_characters = 0
        self._lock = Lock()

    def data_stats(self, data):
        null_indices = []
        kein_text_indices = []
        kein_asw_indices = []
        kein_asw2_indices = []
        kein_asw3_indices = []

        qn_text_len = 0
        for i, row in enumerate(data):
            if not row:
                null_indices.append(i)
                continue
            
            if "text" not in row:
                kein_text_indices.append(i)
            else:
                de_text = codecs.decode(row["text"], "rot_13")
            
            if "asw_1" not in row:
                kein_asw_indices.append(i)
            else:
                qn_text_len += len(row["asw_1"])
                
            if "asw_2" not in row:
                kein_asw2_indices.append(i)
            else:
                qn_text_len += len(row["asw_2"])            
                
            if "asw_3" not in row:
                kein_asw3_indices.append(i)
            else:
                qn_text_len += len(row["asw_3"])            
        
        # print(f"{null_indices=}")
        # print(f"{kein_text_indices=}")    
        # print(f"{kein_asw_indices=}")
        # print(f"{kein_asw2_indices=}")
        # print(f"{kein_asw3_indices=}")
        
        total_cnt = len(data)
        invalid_cnt = len(null_indices) + len(kein_text_indices)
        
        print(f"Total count: {total_cnt}")
        print(f"Invalid count: {invalid_cnt}")
        
        print(f"Total question text length: {qn_text_len}")
        print(f"Average question text length: {qn_text_len/(total_cnt - invalid_cnt)}")
        
        with open("_invalid_indices.txt", "w") as file:
            file.write(
                json.dumps({
                    "null_indices": null_indices,
                    "kein_text_indices": kein_text_indices,
                    "kein_asw_indices": kein_asw_indices,
                    "kein_asw2_indices": kein_asw2_indices,
                    "kein_asw3_indices": kein_asw3_indices
                    },
                    indent=4)
                )
            
    def _translate_from_deutsch(self, de_text):
        print(f"Fetching translation for {de_text}")
        
        # Translate the German text to English
        response = self._translator.translate_text(
            source_lang="de", target_lang="en-us", text=de_text)
        
        # print(f"Fetched translation {response.text} for {de_text}")
        
        # return (response.text, response.billed_characters)
        return (response.text, len(de_text))

    def _translate_row(self, row):
        translation, billed = self._translate_from_deutsch(row["de_text"])
        row["en_text"] = translation
        
        with self._lock:
            self._billed_characters += billed
            if self._billed_characters > 200000:  # 200k
                raise Exception(f"Limit exceeded: {self._billed_characters}")        

    def extract(self, data):
        new_json_data = []
        for row in data:
            if not row or "text" not in row:
                continue

            new_row = row
            if "de_text" not in new_row:
                de_text = codecs.decode(row["text"], "rot_13")
                new_row["de_text"] = de_text

            new_json_data.append(new_row)
        
        existing_hashes = set()
        with open(QNS_FILE_NAME + "_translated.json", 'r') as file:
            existing_data = json.load(file)
            
            for row in existing_data:
                existing_hashes.add(hash_string_fnv(row["text"]))
        
        pool = Pool(self._num_threads)
        try:
            for i, row in enumerate(new_json_data):
                hash_str = hash_string_fnv(row["text"])
                
                if hash_str in existing_hashes:
                    print(f"Skipping {row['de_text']} as it's already translated.")
                    continue
                else:
                    print(f"{row['text']} needs to be translated yet.")
                # g = pool.spawn(self._translate_row, row)
                # g.name = str(i)
                
            pool.join(timeout=10, raise_error=True)
        except Exception as e:
            print(f"Error in greenlet {gevent.getcurrent().name}: {e}")
            # Optionally terminate all greenlets by killing them
            pool.kill()
            raise

        new_data = "const data = "
        formatted_data = json.dumps(new_json_data, indent=4)
        new_data += formatted_data + ";"
        
        print(f"{self._billed_characters=}")
        
        # Write the updated list back to the file
        # with open(QNS_FILE_NAME + "_translated.json", 'w') as file:
        #     file.write(new_data)

QNS_FILE_NAME = "dbTblQ_v1"
if __name__ == "__main__":
    api_key = os.environ["DEEPL_KEY"]
    
    parser = argparse.ArgumentParser()
    parser.add_argument('-N', type=int, default=5, help='Which mode to use')
    
    args = parser.parse_args()
    
    with open(QNS_FILE_NAME + ".json", "r") as file:
        data = json.load(file)
        
        o = DataExtractor(
            translator=deepl.Translator(api_key),
            num_threads=args.N
        )
        
        # o.extract(data)
        o.data_stats(data)
    
    
    