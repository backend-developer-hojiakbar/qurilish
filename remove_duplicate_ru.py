# -*- coding: utf-8 -*-
"""
Remove duplicate 'ru' section from translations.ts
"""

def read_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        return f.readlines()

def write_file(filename, lines):
    with open(filename, 'w', encoding='utf-8') as f:
        f.writelines(lines)

def main():
    print("Reading translations.ts...")
    lines = read_file('translations.ts')
    
    # Find the first 'ru': { (around line 699) and remove it until the next closing brace
    # We need to remove from line 699 to line 1521 (the duplicate uz-cyrl content in 'ru')
    
    first_ru_found = False
    first_ru_line = -1
    second_ru_line = -1
    
    for i, line in enumerate(lines):
        if "'ru': {" in line:
            if not first_ru_found:
                first_ru_line = i
                first_ru_found = True
                print(f"First 'ru' found at line {i+1}")
            else:
                second_ru_line = i
                print(f"Second 'ru' found at line {i+1}")
                break
    
    if first_ru_line >= 0 and second_ru_line >= 0:
        print(f"Removing lines {first_ru_line+1} to {second_ru_line}")
        # Remove the duplicate section (from first 'ru' to just before second 'ru')
        # We need to keep the closing brace and comma before the second 'ru'
        new_lines = lines[:first_ru_line] + lines[second_ru_line:]
        
        print(f"Removed {second_ru_line - first_ru_line} lines")
        print("Writing fixed file...")
        write_file('translations.ts', new_lines)
        print("✅ Done! Duplicate 'ru' section removed.")
    else:
        print("✗ Could not find duplicate 'ru' sections")

if __name__ == '__main__':
    main()
