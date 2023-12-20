# cli_tool.py
import argparse
from collections import OrderedDict
from datetime import datetime

DATE_DELIMITER = ";"
ENTRY_DELIMITER = "->"

class TimeTracker:
    def __init__(self, filename):
        self.filename = filename
        self.last_date = None
        self.entries = OrderedDict()
        
        raw_data = self._read_data_from_file()
        (self.entries, self.last_date) = self._load_data(raw_data)
        

    def _save_data_to_file(self, data):
        with open(self.filename, 'a') as file:
            file.write(data)

    def _read_data_from_file(self):
        try:
            with open(self.filename, 'r') as file:
                data = file.readlines()
                return data
        except FileNotFoundError:
            print(f'File not found: {self.filename}')
            return None
        
    def _load_data(self, raw_data):
        entries = {}
        
        # Iterate through the non-header lines and append each row as a dictionary to the list
        for line in raw_data:
            date_entries = line.strip().split(DATE_DELIMITER)
            curr_date = date_entries[0]
            
            curr_entries = {}
            split_entries = date_entries[1].split(ENTRY_DELIMITER)
            for i in range(0, len(split_entries), 2):
                key = split_entries[i]
                value = split_entries[i + 1]
                curr_entries[key] = value
                 
            entries[curr_date] = curr_entries
            
        last_date = list(entries.keys())[-1] if len(entries) > 0 else None
        
        return (entries, last_date)
            
    def add_entry(self, new_entry):
        last_entry_date = datetime.strptime(self.last_date, "%d/%m/%Y").date()
        current_date = datetime.today().date()
        
        new_entry_string = ""
        if last_entry_date == current_date:
            # So an entry for today has already been made. We just need to add
            # -><new entry>
            new_entry_string = "->"
        else:
            # In a new line, add current date's entry and then this new
            # entry i.e. \ncurrent_date;<new_entry>
            new_entry_string = "\n" + current_date.strftime("%d/%m/%Y") + DATE_DELIMITER
            
        new_entry_string += new_entry
        self._save_data_to_file(new_entry_string)
        
    def print_entries(self, since=1):
        rev_entries = reversed(self.entries)
        
        while since > 0:
            key = next(rev_entries)
            
            print(key)
            print("==========")
            
            
            entries = self.entries[key]
            for t in entries:
                print(f"{t:>{10}}: ", end = "")
                      
                print(f"{entries[t]}")
            
            since -= 1

        print()
        

def main():
    parser = argparse.ArgumentParser(description='Time Tracker')
    # parser.add_argument('action', choices=['save', 'read'], help='Action to perform: save or read')
    parser.add_argument('--filename', type=str, help='Name of the file to save data to or read data from', default="stats.txt")

    args = parser.parse_args()
    # action = args.action
    
    tracker = TimeTracker(args.filename)

    tracker.print_entries()

    while True:
        user_input = input('Add a new entry? [y/n] : ').strip().lower()
        if user_input != "y":
            break

        entry_time = input('Enter time: ').strip().lower()
        entry_activities = input('Enter activities: ').strip().lower()

        tracker.add_entry(entry_time + ENTRY_DELIMITER + entry_activities)

if __name__ == '__main__':
    main()
