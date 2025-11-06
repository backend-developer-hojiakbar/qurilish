# Read the file
with open('translations.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the line with the closing brace
for i, line in enumerate(lines):
    if line.strip() == '};' and i < len(lines) - 1:
        # Check if the next line starts with the invalid content
        if lines[i+1].startswith('Sening vazifang - taqdim etilgan ish materiallari'):
            # Remove all lines from this point onwards except the last closing brace
            lines = lines[:i+1]
            # Add a newline at the end if needed
            if not lines[-1].endswith('\n'):
                lines[-1] += '\n'
            break

# Write the fixed file
with open('translations.ts', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("File fixed successfully!")