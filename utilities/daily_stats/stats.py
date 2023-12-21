# cli_tool.py
import argparse
from collections import OrderedDict
from datetime import datetime
import re

DATE_DELIMITER = ";"
ENTRY_DELIMITER = "->"
USUAL_DAY_START_TIME = "9:30"

class TimeTracker:
    def __init__(self, filename):
        self.filename = filename
        self.entries = OrderedDict()
        
        raw_data = self._read_data_from_file()
        self.entries = self._load_data(raw_data)
        

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
        
        return entries
            
    def add_entry(self, new_entry):
        current_date = datetime.today().date().strftime("%d/%m/%Y")
        
        new_entry_string = ""
        if current_date in self.entries:
            # So an entry for today has already been made. We just need to add
            # -><new entry>
            new_entry_string = "->"
        else:
            # In a new line, add current date's entry and then this new
            # entry i.e. \ncurrent_date;<new_entry>
            new_entry_string = "\n" + current_date + DATE_DELIMITER
            if not _is_time_range(new_entry.split(ENTRY_DELIMITER, 1)[0]):       
                new_entry_string += USUAL_DAY_START_TIME + "-"
            
        new_entry_string += new_entry
        
        self._save_data_to_file(new_entry_string)
        if current_date not in self.entries:
            self.entries[current_date] = {}
        splits = new_entry.split(ENTRY_DELIMITER)
        self.entries[current_date][splits[0]] = splits[1]
        
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
        
def _is_time_range(input_string):
    # Define the pattern for the desired format
    pattern = re.compile(r'^\d{1,2}(:\d{2})?-\d{1,2}:\d{2}$')

    # Check if the input string matches the pattern
    match = pattern.match(input_string)

    # Return True if the input is in the specified format
    return bool(match)
        

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
        if user_input == "n":
            break

        current_time = datetime.now().time().strftime("%H:%M")
        entry_time = input(f"Enter time [{current_time}]: ").strip().lower()
        if not entry_time:
            entry_time = current_time
        
        entry_activities = input('Enter activities: ').strip().lower()

        tracker.add_entry(entry_time + ENTRY_DELIMITER + entry_activities)

if __name__ == '__main__':
    main()
