import subprocess
import sys
import re

# Mapping of import names to actual pip package names
PACKAGE_MAP = {
    "bs4": "beautifulsoup4",
    "cv2": "opencv-python",
    "PIL": "pillow",
    "tensorflow.keras": "tensorflow",
    "flask": "Flask"  # Maps the CLI command to the Python package
}

COMMAND_NOT_FOUND_PATTERN = re.compile(r"(command not found|No such file or directory)", re.IGNORECASE)

# def run_command(command):
#     """Runs the command and returns output and error messages."""
#     try:
#         result = subprocess.run(command, shell=True, capture_output=True, text=True)
#         return result.stdout, result.stderr
#     except Exception as e:
#         return "", str(e)
    
# def run_command(command, timeout=5):
#     """Runs the command with a timeout to prevent hanging."""
#     try:
#         process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
#         stdout, stderr = process.communicate(timeout=timeout)
#         return stdout, stderr
#     except subprocess.TimeoutExpired:
#         process.kill()
#         return "", "Command execution timed out."
    
def run_command(command, timeout=3):
    """Runs the command with a timeout to prevent hanging during dependency checks."""
    try:
        process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stdout, stderr = process.communicate(timeout=timeout)
        process.kill()
        return stdout, stderr
    except subprocess.TimeoutExpired:
        process.kill()
        return "", "Command execution timed out (this may be expected for long-running processes)."    

def extract_missing_module(error_message):
    """Extracts the missing module name from ModuleNotFoundError."""
    match = re.search(r"ModuleNotFoundError: No module named '(.*?)'", error_message)
    return match.group(1) if match else None

def resolve_package_name(module_name):
    """Resolves the correct package name if different from the module name."""
    return PACKAGE_MAP.get(module_name, module_name)

def install_package(package):
    """Installs the given package using pip."""
    print(f"Installing missing package: {package}")
    subprocess.run([sys.executable, "-m", "pip", "install", package], check=True)

def ensure_dependencies(command):
    """Runs the command iteratively and installs missing dependencies."""
    installed_packages = []
    
    while True:
        stdout, stderr = run_command(command)
        missing_module = extract_missing_module(stderr)
        
        if missing_module:
            package_name = resolve_package_name(missing_module)
            if package_name in installed_packages:
                print(f"Error: Package '{package_name}' was already installed but issue persists.")
                sys.exit(1)
            install_package(package_name)
            installed_packages.append(package_name)
            continue
        
        if COMMAND_NOT_FOUND_PATTERN.search(stderr):
            command_name = command.split()[0]
            if command_name in PACKAGE_MAP:
                package_name = PACKAGE_MAP[command_name]
                print(f"Command '{command_name}' not found. Attempting to install '{package_name}'.")
                install_package(package_name)
                installed_packages.append(package_name)
                continue
            print(f"Error: Command '{command}' not found. Ensure your virtual environment is activated.")
            sys.exit(1)
        
        break  # No missing module error, command should be good now
    
    print("\nAll required packages are installed!")
    if installed_packages:
        print("Installed packages:", ", ".join(installed_packages))
    
    print("\nRunning the command now:\n")
    subprocess.run(command, shell=True)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python auto_install.py '<your command>'")
        sys.exit(1)
    
    user_command = " ".join(sys.argv[1:])
    ensure_dependencies(user_command)
