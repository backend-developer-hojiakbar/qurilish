# Script to fix the translations.ts file by removing the extra closing brace

file_path = "translations.ts"

# Read the file
with open(file_path, 'r', encoding='utf-8') as file:
    lines = file.readlines()

# Check if the last line is just the extra closing brace
if lines[-1].strip() == '};':
    # Remove the last line
    lines = lines[:-1]
    print("Removed extra closing brace: '};'")
else:
    print("No extra closing brace found")

# Write the file back
with open(file_path, 'w', encoding='utf-8') as file:
    file.writelines(lines)

print("File fixed successfully")