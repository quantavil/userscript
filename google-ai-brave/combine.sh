#!/bin/bash
# combine_project.sh - Aggregates all non-ignored project files into a single text file.
# Respects .gitignore rules using git ls-files.

# Default output file or user-specified one
OUTPUT_FILE=${1:-"project_context.txt"}

# Check if git is initialized to respect .gitignore
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo "ERROR: Not a git repository. This script requires git to respect .gitignore."
    exit 1
fi

# Clear or create the output file
> "$OUTPUT_FILE"

# Count files to process
count=$(git ls-files -co --exclude-standard | wc -l)
echo "Found $count files. Starting aggregation into $OUTPUT_FILE..."

# Iterate through non-ignored files
# Uses -z and null delimiters to handle special characters or spaces in paths
git ls-files -co --exclude-standard -z | while IFS= read -r -d '' file; do
    # Skip the output file itself to avoid "input file is output file" error
    if [ "$file" == "$OUTPUT_FILE" ]; then
        continue
    fi
    
    if [ -f "$file" ]; then
        # Append a header with the file path
        echo "================================================================================" >> "$OUTPUT_FILE"
        echo "FILE PATH: $file" >> "$OUTPUT_FILE"
        echo "================================================================================" >> "$OUTPUT_FILE"
        
        # Append file content
        cat "$file" >> "$OUTPUT_FILE"
        
        # Add spacing between files
        echo -e "\n\n" >> "$OUTPUT_FILE"
    fi
done

echo "Success! Combined project content saved to: $(realpath "$OUTPUT_FILE")"
