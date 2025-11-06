# -*- coding: utf-8 -*-
"""
Fix syntax error in translations.ts
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
    
    # Fix the specific error on line 346 and 1041
    # The problem is: case_title_vs_template: ъ{{cлиентНаме}} вс {{оппонентНаме}} ишиъ,
    # Should be: case_title_vs_template: "{{clientName}} vs {{opponentName}} иши",
    
    old_wrong = 'case_title_vs_template: ъ{{cлиентНаме}} вс {{оппонентНаме}} ишиъ,'
    new_correct = 'case_title_vs_template: "{{clientName}} vs {{opponentName}} иши",'
    
    # Also fix the template above it
    old_template = 'case_title_template: "{{cлиентНаме}} иши",'
    new_template = 'case_title_template: "{{clientName}} иши",'
    
    print(f"Replacing incorrect syntax...")
    
    # Count occurrences
    count_wrong = content.count(old_wrong)
    count_template = content.count(old_template)
    
    print(f"Found {count_wrong} occurrences of wrong case_title_vs_template")
    print(f"Found {count_template} occurrences of wrong case_title_template")
    
    # Replace all occurrences
    content = content.replace(old_wrong, new_correct)
    content = content.replace(old_template, new_template)
    
    print("Writing fixed file...")
    write_file('translations.ts', content)
    
    print("✅ Done! Syntax errors fixed.")

if __name__ == '__main__':
    main()
