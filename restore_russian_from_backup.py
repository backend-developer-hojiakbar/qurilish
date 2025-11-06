# -*- coding: utf-8 -*-
"""
Restore Russian translations from backup file
"""

def read_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(filename, content):
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

def extract_section(content, section_name):
    """Extract a language section from translations file"""
    lines = content.split('\n')
    section_lines = []
    in_section = False
    brace_count = 0
    
    for line in lines:
        if f"'{section_name}':" in line and '{' in line:
            in_section = True
            brace_count = 1
            section_lines.append(line)
            continue
        
        if in_section:
            section_lines.append(line)
            brace_count += line.count('{')
            brace_count -= line.count('}')
            
            if brace_count == 0:
                break
    
    return '\n'.join(section_lines)

def main():
    print("Reading files...")
    current = read_file('translations.ts')
    backup = read_file('translations.backup.ts')
    
    print("Extracting Russian section from backup...")
    ru_section = extract_section(backup, 'ru')
    
    if not ru_section:
        print("✗ Could not find 'ru' section in backup")
        return
    
    print(f"Found Russian section ({len(ru_section)} characters)")
    
    print("Replacing Russian section in current file...")
    
    # Find and replace the 'ru' section
    lines = current.split('\n')
    new_lines = []
    in_ru_section = False
    brace_count = 0
    skip_until_next_section = False
    
    for i, line in enumerate(lines):
        if "'ru':" in line and '{' in line and not in_ru_section:
            in_ru_section = True
            brace_count = 1
            skip_until_next_section = True
            # Insert the backup ru section
            new_lines.append(ru_section)
            continue
        
        if skip_until_next_section:
            brace_count += line.count('{')
            brace_count -= line.count('}')
            
            if brace_count == 0:
                skip_until_next_section = False
                in_ru_section = False
            continue
        
        new_lines.append(line)
    
    result = '\n'.join(new_lines)
    
    print("Writing updated file...")
    write_file('translations.ts', result)
    
    print("✅ Done! Russian translations restored from backup.")

if __name__ == '__main__':
    main()
