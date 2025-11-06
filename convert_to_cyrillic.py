# -*- coding: utf-8 -*-
"""
Script to remove uz-latn and populate uz-cyrl with Cyrillic translations
"""

# Latin to Cyrillic conversion mapping for Uzbek
LATIN_TO_CYRILLIC = {
    'a': 'а', 'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'e': 'е', 'yo': 'ё', 'j': 'ж', 'z': 'з',
    'i': 'и', 'y': 'й', 'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п', 'r': 'р',
    's': 'с', 't': 'т', 'u': 'у', 'f': 'ф', 'x': 'х', 'ts': 'ц', 'ch': 'ч', 'sh': 'ш',
    'shch': 'щ', "'": 'ъ', 'yu': 'ю', 'ya': 'я',
    # Uzbek specific
    'oʻ': 'ў', 'gʻ': 'ғ', 'qʻ': 'қ', 'hʻ': 'ҳ',
    "o'": 'ў', "g'": 'ғ', "q'": 'қ', "h'": 'ҳ',
    'o`': 'ў', 'g`': 'ғ', 'q`': 'қ', 'h`': 'ҳ',
    # Capital letters
    'A': 'А', 'B': 'Б', 'V': 'В', 'G': 'Г', 'D': 'Д', 'E': 'Е', 'Yo': 'Ё', 'J': 'Ж', 'Z': 'З',
    'I': 'И', 'Y': 'Й', 'K': 'К', 'L': 'Л', 'M': 'М', 'N': 'Н', 'O': 'О', 'P': 'П', 'R': 'Р',
    'S': 'С', 'T': 'Т', 'U': 'У', 'F': 'Ф', 'X': 'Х', 'Ts': 'Ц', 'Ch': 'Ч', 'Sh': 'Ш',
    'Shch': 'Щ', 'Yu': 'Ю', 'Ya': 'Я',
    'Oʻ': 'Ў', 'Gʻ': 'Ғ', 'Qʻ': 'Қ', 'Hʻ': 'Ҳ',
    "O'": 'Ў', "G'": 'Ғ', "Q'": 'Қ', "H'": 'Ҳ',
    'O`': 'Ў', 'G`': 'Ғ', 'Q`': 'Қ', 'H`': 'Ҳ',
}

def latin_to_cyrillic(text):
    """Convert Latin Uzbek text to Cyrillic"""
    # Sort by length (longest first) to handle multi-character mappings
    sorted_keys = sorted(LATIN_TO_CYRILLIC.keys(), key=len, reverse=True)
    
    result = text
    for latin in sorted_keys:
        result = result.replace(latin, LATIN_TO_CYRILLIC[latin])
    
    return result

def read_file(filename):
    """Read file content"""
    with open(filename, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(filename, content):
    """Write content to file"""
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    print("Reading translations.ts...")
    content = read_file('translations.ts')
    lines = content.split('\n')
    
    # Find uz-latn section
    uz_latn_start = -1
    uz_latn_end = -1
    
    for i, line in enumerate(lines):
        if "'uz-latn': {" in line:
            uz_latn_start = i
        if uz_latn_start > 0 and "'ru': {" in line:
            uz_latn_end = i
            break
    
    print(f"Found uz-latn from line {uz_latn_start + 1} to {uz_latn_end}")
    
    # Extract uz-latn content
    uz_latn_lines = lines[uz_latn_start + 1:uz_latn_end - 1]  # Exclude opening and closing braces
    
    # Convert to Cyrillic
    print("Converting to Cyrillic...")
    uz_cyrl_lines = []
    for line in uz_latn_lines:
        # Convert the value part (after the colon) to Cyrillic
        if ':' in line and not line.strip().startswith('//'):
            parts = line.split(':', 1)
            if len(parts) == 2:
                key_part = parts[0]
                value_part = parts[1]
                # Convert only the string values, not the keys
                if '"' in value_part or "'" in value_part:
                    # Extract the string value
                    converted_value = latin_to_cyrillic(value_part)
                    uz_cyrl_lines.append(key_part + ':' + converted_value)
                else:
                    uz_cyrl_lines.append(line)
            else:
                uz_cyrl_lines.append(line)
        else:
            # Keep comments and other lines as is
            uz_cyrl_lines.append(line)
    
    # Build new content
    print("Building new file...")
    new_lines = []
    new_lines.append(lines[0])  # export const translations...
    new_lines.append("  'uz-cyrl': {")
    new_lines.extend(uz_cyrl_lines)
    new_lines.append("  },")
    
    # Add ru and en sections
    new_lines.extend(lines[uz_latn_end:])
    
    # Write new file
    new_content = '\n'.join(new_lines)
    write_file('translations.ts', new_content)
    
    print("✅ Done! uz-latn removed and uz-cyrl populated with Cyrillic translations.")

if __name__ == '__main__':
    main()
