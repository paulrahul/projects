import os

def resolved_file_path(relative_file_name, calling_file_path=None):
    if calling_file_path:
        current_dir = os.path.dirname(calling_file_path)
    else:
        current_dir = os.path.dirname(__file__)

    return os.path.join(current_dir, relative_file_name)