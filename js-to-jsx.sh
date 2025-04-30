#!/bin/bash

set -e

echo "🔥 Starting .js ➔ .jsx conversion inside src/ ..."

# 1. Traverse all files inside src/
find src -type f -name "*.js" | while read file; do
  newfile="${file%.js}.jsx"
  echo "🛠 Renaming $file -> $newfile"
  mv "$file" "$newfile"
done

echo "✅ All .js files in src/ converted to .jsx!"
echo "👉 Next: Update your imports if needed manually."

exit 0
