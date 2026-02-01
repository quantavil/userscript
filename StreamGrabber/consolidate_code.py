import os

# Configuration
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(PROJECT_ROOT, "all_code.txt")

# Extensions to include
INCLUDE_EXTS = {'.ts', '.js', '.json', '.html', '.css', '.md'}

# Directories to exclude
EXCLUDE_DIRS = {'node_modules', 'dist', '.git', '.idea', '.vscode', '__pycache__'}

# Specific files to include (relative to root)
INCLUDE_FILES = {
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'vitest.config.ts',
    'audit-report.md'
}

# Specific directories to include recursively (relative to root)
INCLUDE_DIRS = {
    'src'
}

def is_relevant(path):
    rel_path = os.path.relpath(path, PROJECT_ROOT)
    
    # Check specific files
    if rel_path in INCLUDE_FILES:
        return True
        
    # Check directories
    parts = rel_path.split(os.sep)
    if parts[0] in INCLUDE_DIRS:
        _, ext = os.path.splitext(path)
        return ext in INCLUDE_EXTS
        
    return False

def main():
    print(f"Scanning {PROJECT_ROOT}...")
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as outfile:
        # Write header
        outfile.write(f"Project: StreamGrabber\n")
        outfile.write(f"Root: {PROJECT_ROOT}\n")
        outfile.write("=" * 80 + "\n\n")

        file_count = 0
        
        for root, dirs, files in os.walk(PROJECT_ROOT):
            # Modify dirs in-place to skip excluded
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            
            for file in sorted(files):
                abs_path = os.path.join(root, file)
                
                if is_relevant(abs_path):
                    rel_path = os.path.relpath(abs_path, PROJECT_ROOT)
                    print(f"Adding: {rel_path}")
                    
                    try:
                        with open(abs_path, 'r', encoding='utf-8') as infile:
                            content = infile.read()
                            
                        outfile.write(f"\n{'='*20}\n")
                        outfile.write(f"File: {rel_path}\n")
                        outfile.write(f"{'='*20}\n\n")
                        outfile.write(content)
                        outfile.write("\n")
                        
                        file_count += 1
                    except Exception as e:
                        print(f"Error reading {rel_path}: {e}")

    print(f"\nDone! Consolidated {file_count} files into '{os.path.basename(OUTPUT_FILE)}'.")

if __name__ == "__main__":
    main()
