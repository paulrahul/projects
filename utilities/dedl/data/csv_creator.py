import csv
import json

FILE_NAME = "current_data.json"
CSV_FILE_NAME = "questions.csv"

with open(FILE_NAME, "r") as file:
    data = json.load(file)
    
    csv_rows = []
    for row in data:
        type = row.get("asw_corr1", 0) + row.get("asw_corr2", 0) + row.get("asw_corr3", 0)
        if type == 1:
            for i in range(1, 4):
                if row.get("asw_corr" + str(i), -1) == 1:
                    correct_ans = row.get("asw_" + str(i), "")
                    en_ans = ""
        
            if not correct_ans or len(correct_ans) == 0:
                exit(f"Could not find the one correct answer for {row['de_text']}")
                    
            incorrect_ans = ""
        elif type == 2:
            for i in range(1, 4):
                if row.get("asw_corr" + str(i), -1) == 0:
                    incorrect_ans = row.get("asw_" + str(i), "")
                    en_ans = ""
                    
            if not incorrect_ans or len(incorrect_ans) == 0:
                exit(f"Could not find the one incorrect answer for {row['de_text']}")

            correct_ans = ""
        else:
            correct_ans = incorrect_ans = en_ans = ""
            
        media_type = "text"
        if row["picture"].endswith(".jpg"):
            media_type = "image"
        if row["picture"].endswith(".m4v"):
            media_type = "video"
            
        new_row = {}
        new_row["type"] = type        
        new_row["de_text"] = row["de_text"]
        new_row["media_type"] = media_type
        new_row["correct_ans"] = correct_ans
        new_row["incorrect_ans"] = incorrect_ans
        new_row["index"] = row["index"]
        new_row["en_text"] = row["en_text"]
        new_row["en_ans"] = en_ans
        
        
        csv_rows.append(new_row)
        
    written = 0
    with open(CSV_FILE_NAME, mode='w', newline='', encoding='utf-8') as csvfile:
        if len(csv_rows) == 0:
            exit("No CSV row created")
        
        # Creating a CSV writer object
        csv_writer = csv.writer(csvfile)

        # Writing header row
        headers = csv_rows[0].keys()
        csv_writer.writerow(headers)

        # Writing data rows
        for t in csv_rows:
            csv_writer.writerow(t.values())
            written += 1
    
    print(f"Finished writing {written} rows in analysis CSV file.") 
        
