#!/bin/bash

# Configuration
OUTPUT_FILE="combined-source.md"
PROJECT_NAME="google-ai-brave"
SRC_DIR="src"
META_FILE="meta.txt"

echo "Aggregating source files for $PROJECT_NAME..."

# Initialize output file
cat << EOF > "$OUTPUT_FILE"
# Project: $PROJECT_NAME
Generated on: $(date)

This file contains the full source code and metadata for the $PROJECT_NAME project, aggregated for review or context.

EOF

# Add Metadata file
if [ -f "$META_FILE" ]; then
    echo "Adding $META_FILE..."
    cat << EOF >> "$OUTPUT_FILE"

## File: $META_FILE

\`\`\`text
$(cat "$META_FILE")
\`\`\`
EOF
fi

# Add Source files
# Sort files to ensure deterministic order (important for diffs/review)
FILES=$(find "$SRC_DIR" -type f -name "*.ts" | sort)

for f in $FILES; do
    echo "Adding $f..."
    cat << EOF >> "$OUTPUT_FILE"

## File: $f

\`\`\`typescript
$(cat "$f")
\`\`\`
EOF
done

echo "Done! Combined source saved to: $OUTPUT_FILE"
echo "Total files aggregated: $(echo "$FILES" | wc -l | xargs echo -n) source files + metadata."
