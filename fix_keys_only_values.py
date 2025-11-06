# -*- coding: utf-8 -*-
"""
Fix: Only convert values, not keys in translations.ts
"""
import re

def read_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(filename, content):
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

def convert_value_to_cyrillic(value):
    """Convert only the value part to proper Cyrillic"""
    replacements = {
        'q': 'қ', 'Q': 'Қ',
        'h': 'ҳ', 'H': 'Ҳ',
    }
    
    result = value
    for latin, cyrillic in replacements.items():
        result = result.replace(latin, cyrillic)
    
    return result

def fix_keys(content):
    """Fix keys that were incorrectly converted"""
    
    # List of keys that were incorrectly changed
    key_fixes = {
        'view_dasҳboard': 'view_dashboard',
        'view_investiгation': 'view_investigation',
        'view_knowledгe': 'view_knowledge',
        'dasҳboard_': 'dashboard_',
        'nav_dasҳboard': 'nav_dashboard',
        'nav_investiгation': 'nav_investigation',
        'investiгation_': 'investigation_',
        'prompt_investiгation': 'prompt_investigation',
        'excel_sim_questionҳ': 'excel_sim_question',
        'researcҳ_': 'research_',
        'view_researcҳ': 'view_research',
        'nav_researcҳ': 'nav_research',
        'prompt_researcҳ': 'prompt_research',
    }
    
    result = content
    for wrong, correct in key_fixes.items():
        result = result.replace(wrong, correct)
    
    return result

def main():
    print("Reading translations.ts...")
    content = read_file('translations.ts')
    
    print("Fixing incorrectly converted keys...")
    fixed = fix_keys(content)
    
    print("Writing fixed file...")
    write_file('translations.ts', fixed)
    
    print("✅ Done! Keys restored to original English.")

if __name__ == '__main__':
    main()
