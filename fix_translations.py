# Script to fix the translations.ts file by removing the extra closing brace

file_path = "translations.ts"

# Read the file
with open(file_path, 'r', encoding='utf-8') as file:
    lines = file.readlines()

# Remove the last line if it contains only the extra closing brace
if lines[-1].strip() == '};':
    lines = lines[:-1]
    print("Removed extra closing brace")

# Write the file back
with open(file_path, 'w', encoding='utf-8') as file:
    file.writelines(lines)

print("File fixed successfully")