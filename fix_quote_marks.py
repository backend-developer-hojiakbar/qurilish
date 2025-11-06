# -*- coding: utf-8 -*-
"""
Fix incorrect quote marks (ъ) in translations.ts
"""

def read_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(filename, content):
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    print("Reading translations.ts...")
    content = read_file('translations.ts')
    
    print("Fixing quote marks...")
    
    # Count occurrences
    count = content.count('ъ')
    print(f"Found {count} incorrect quote marks (ъ)")
    
    # Replace all ъ with nothing (remove them)
    # They appear where quotes should be
    content = content.replace('ъ', '')
    
    print("Writing fixed file...")
    write_file('translations.ts', content)
    
    print(f"✅ Done! Removed {count} incorrect characters.")

if __name__ == '__main__':
    main()
