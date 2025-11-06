# -*- coding: utf-8 -*-
"""
Fix remaining Cyrillic characters in English section
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
    
    print("Fixing English section...")
    
    # All Cyrillic to Latin replacements in English section
    replacements = {
        'Ҳello': 'Hello',
        'Ҳow': 'How',
        'қuestion': 'question',
        'processinг': 'processing',
        'reқuest': 'request',
        'aгain': 'again',
        'Гet': 'Get',
        'қuick': 'quick',
        'arcҳive': 'archive',
        'ҳave': 'have',
        'Upcominг': 'Upcoming',
        'cominг': 'coming',
        'Ҳousinг': 'Housing',
        'ҲC': 'HC',
    }
    
    for cyrillic, latin in replacements.items():
        count = content.count(cyrillic)
        if count > 0:
            content = content.replace(cyrillic, latin)
            print(f"  ✓ Replaced '{cyrillic}' → '{latin}' ({count} times)")
    
    print("Writing fixed file...")
    write_file('translations.ts', content)
    
    print("✅ Done! English section fixed.")

if __name__ == '__main__':
    main()
