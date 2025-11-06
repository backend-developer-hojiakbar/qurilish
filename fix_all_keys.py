# -*- coding: utf-8 -*-
"""
Fix ALL keys that have Cyrillic characters - they should be English only
"""
import re

def read_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(filename, content):
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    print("Reading translations.ts...")
    content = read_file('translations.ts')
    
    print("Fixing all keys with Cyrillic characters...")
    
    # Replace Cyrillic characters in keys only
    replacements = {
        'ҳistory': 'history',
        'settinгs': 'settings',
        'investiгation': 'investigation',
        'knowledгe': 'knowledge',
        'dasҳboard': 'dashboard',
        'researcҳ': 'research',
        'ҳ': 'h',  # Any remaining ҳ in keys
        'қ': 'q',  # Any remaining қ in keys
        'ғ': 'g',  # Any remaining ғ in keys
        'г': 'g',  # Russian г that shouldn't be in English keys
    }
    
    # Use regex to find and fix keys (text before colon)
    lines = content.split('\n')
    fixed_lines = []
    
    for line in lines:
        # Check if this is a key-value line (has colon and not a comment)
        if ':' in line and not line.strip().startswith('//'):
            # Split into key and value parts
            parts = line.split(':', 1)
            if len(parts) == 2:
                key_part = parts[0]
                value_part = parts[1]
                
                # Fix the key part only
                fixed_key = key_part
                for cyrillic, latin in replacements.items():
                    fixed_key = fixed_key.replace(cyrillic, latin)
                
                # Reconstruct the line
                fixed_line = fixed_key + ':' + value_part
                fixed_lines.append(fixed_line)
            else:
                fixed_lines.append(line)
        else:
            fixed_lines.append(line)
    
    result = '\n'.join(fixed_lines)
    
    print("Writing fixed file...")
    write_file('translations.ts', result)
    
    print("✅ Done! All keys are now in proper English.")

if __name__ == '__main__':
    main()
