import json

with open("dbTblQ_v1_translated.json", "r") as file:
    data = json.load(file)
    
    missing_de_text = []
    missing_en_text = []
    for i, row in enumerate(data):
        if "de_text" not in row:
            missing_de_text.append(i)
            if "en_text" in row:
                print(f"Unexpected en_text in row {i}")
        elif "en_text" not in row:
            missing_en_text.append(i)
            
    print(f"{missing_de_text=}")
    print(f"{missing_en_text=}")