# -*- coding: utf-8 -*-
"""
Fix 'малумот' to 'маълумот' in uz-cyrl section
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
    
    print("Fixing 'малумот' to 'маълумот'...")
    
    # Count and replace
    count = content.count('малумот')
    content = content.replace('малумот', 'маълумот')
    
    print(f"✓ Replaced {count} occurrences")
    
    print("Writing fixed file...")
    write_file('translations.ts', content)
    
    print("✅ Done!")

if __name__ == '__main__':
    main()
