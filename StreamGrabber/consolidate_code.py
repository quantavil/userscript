import os
import re

# Configuration
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
AUDIT_REPORT_FILE = os.path.join(PROJECT_ROOT, "audit-report.md")

# Categories and their output files
CATEGORIES = {
    "ui": {
        "output": os.path.join(PROJECT_ROOT, "ui_code.txt"),
        "audit_output": os.path.join(PROJECT_ROOT, "ui_audit.txt"),
        "dirs": {"src/ui"},
        "files": set()
    },
    "logic": {
        "output": os.path.join(PROJECT_ROOT, "logic_code.txt"),
        "audit_output": os.path.join(PROJECT_ROOT, "logic_audit.txt"),
        "dirs": {"src/core", "src/detection", "src/types"},
        "files": {"src/main.ts", "src/messaging.ts", "src/state.ts", "src/utils.ts"}
    },
    "config": {
        "output": os.path.join(PROJECT_ROOT, "config_code.txt"),
        "audit_output": os.path.join(PROJECT_ROOT, "config_audit.txt"),
        "dirs": set(),
        "files": {
            "package.json", "tsconfig.json", "vite.config.ts", "vitest.config.ts",
            "src/config.ts", "src/vite-env.d.ts", "README.md"
        }
    }
}

# Extensions to include
INCLUDE_EXTS = {'.ts', '.js', '.json', '.html', '.css', '.md'}

# Directories to exclude
EXCLUDE_DIRS = {'node_modules', 'dist', '.git', '.idea', '.vscode', '__pycache__'}

def get_category(rel_path):
    # Normalize path separators to forward slash
    rel_path = rel_path.replace(os.sep, '/')
    
    for cat_name, config in CATEGORIES.items():
        if rel_path in config["files"]:
            return cat_name
        for d in config["dirs"]:
            if rel_path.startswith(d + '/'):
                return cat_name
    return None

def process_audit_report():
    if not os.path.exists(AUDIT_REPORT_FILE):
        print(f"Audit report not found at {AUDIT_REPORT_FILE}")
        return

    print(f"Parsing audit report: {AUDIT_REPORT_FILE}...")
    
    with open(AUDIT_REPORT_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    audit_data = {cat: [] for cat in CATEGORIES}
    headers = []
    
    # Simple markdown table parser
    table_started = False
    for line in lines:
        if '|' in line:
            parts = [p.strip() for p in line.split('|')]
            if len(parts) < 4: continue
            
            # Skip separator line
            if '---' in line:
                if table_started: headers.append(line)
                continue
                
            if not table_started:
                headers.append(line)
                if 'Severity' in line:
                    table_started = True
                continue
            
            # File/Module is usually 2nd column (index 2 after split with empty first element)
            file_cell = parts[2]
            # Extract path from backticks if present
            match = re.search(r'`([^`]+)`', file_cell)
            path = match.group(1) if match else file_cell
            
            cat = get_category(path)
            if cat:
                audit_data[cat].append(line)
            else:
                # Default to logic if unsure, or skip? Let's check if it matches a top level file
                # If it's a general finding, we might want it everywhere or nowhere.
                # For now, if no category, skip or put in logic.
                audit_data["logic"].append(line)

    for cat, items in audit_data.items():
        output_path = CATEGORIES[cat]["audit_output"]
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(f"Audit Findings - {cat.upper()}\n")
            f.write("=" * 40 + "\n\n")
            f.writelines(headers)
            f.writelines(items)
        print(f"Created '{os.path.basename(output_path)}' with {len(items)} findings.")

def main():
    print(f"Scanning {PROJECT_ROOT}...")
    
    # Open all output files
    out_files = {}
    file_counts = {cat: 0 for cat in CATEGORIES}
    
    try:
        for cat_name, config in CATEGORIES.items():
            f = open(config["output"], 'w', encoding='utf-8')
            f.write(f"Project: StreamGrabber - {cat_name.upper()}\n")
            f.write(f"Root: {PROJECT_ROOT}\n")
            f.write("=" * 80 + "\n\n")
            out_files[cat_name] = f

        for root, dirs, files in os.walk(PROJECT_ROOT):
            # Modify dirs in-place to skip excluded
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            
            for file in sorted(files):
                abs_path = os.path.join(root, file)
                rel_path = os.path.relpath(abs_path, PROJECT_ROOT)
                
                # Skip audit report itself from code consolidation if desired, 
                # or let it be categorized (usually config)
                if abs_path == AUDIT_REPORT_FILE:
                    continue

                cat_name = get_category(rel_path)
                if not cat_name:
                    continue
                
                _, ext = os.path.splitext(file)
                if ext not in INCLUDE_EXTS:
                    continue

                print(f"Adding to {cat_name}: {rel_path}")
                
                try:
                    with open(abs_path, 'r', encoding='utf-8') as infile:
                        content = infile.read()
                        
                    outfile = out_files[cat_name]
                    outfile.write(f"\n{'='*20}\n")
                    outfile.write(f"File: {rel_path}\n")
                    outfile.write(f"{'='*20}\n\n")
                    outfile.write(content)
                    outfile.write("\n")
                    
                    file_counts[cat_name] += 1
                except Exception as e:
                    print(f"Error reading {rel_path}: {e}")

    finally:
        for f in out_files.values():
            if f:
                f.close()

    print("\nProcessing audit report...")
    process_audit_report()

    print("\nDone!")
    for cat_name, count in file_counts.items():
        print(f"Created '{os.path.basename(CATEGORIES[cat_name]['output'])}' with {count} files.")

if __name__ == "__main__":
    main()
