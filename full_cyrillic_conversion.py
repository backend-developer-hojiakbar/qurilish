# -*- coding: utf-8 -*-
"""
Complete conversion of all Latin characters to proper Cyrillic in translations.ts
"""

def read_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(filename, content):
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

def convert_to_cyrillic(text):
    """Convert mixed Latin-Cyrillic text to pure Cyrillic"""
    
    # Mapping for conversion
    replacements = {
        # Latin letters that should be Cyrillic
        'q': 'қ',
        'Q': 'Қ',
        'h': 'ҳ',
        'H': 'Ҳ',
        'g': 'г',
        'G': 'Г',
        
        # Common mixed patterns
        'qўш': 'қўш',
        'qил': 'қил',
        'qанд': 'қанд',
        'qайд': 'қайд',
        'qўлл': 'қўлл',
        'qўр': 'қўр',
        'qўй': 'қўй',
        'hуqуq': 'ҳуқуқ',
        'hеч': 'ҳеч',
        'hисоб': 'ҳисоб',
        'hужжат': 'ҳужжат',
        'hаракат': 'ҳаракат',
        'hимоя': 'ҳимоя',
        'hолат': 'ҳолат',
        'hисобот': 'ҳисобот',
        'Hозир': 'Ҳозир',
        'Hисоб': 'Ҳисоб',
        'Hужжат': 'Ҳужжат',
        'таhлил': 'таҳлил',
        'баhси': 'баҳси',
        'маълумот': 'маълумот',
        'Таhлил': 'Таҳлил',
        'Тадqиqот': 'Тадқиқот',
        'Qонун': 'Қонун',
        'Qайд': 'Қайд',
        'Qўш': 'Қўш',
        'Яqин': 'Яқин',
        'Таqвим': 'Тақвим',
        'саqл': 'сақл',
        'муваффаqият': 'муваффақият',
        'аниqл': 'аниқл',
        'Нутq': 'Нутқ',
        'чуqур': 'чуқур',
        'воqеа': 'воқеа',
        'Хронология': 'Хронология',
        'Еслатма': 'Эслатма',
        'еслатма': 'эслатма',
        'Експресс': 'Экспресс',
        'Барча': 'Барча',
        'Бошqарув': 'Бошқарув',
        'бошqар': 'бошқар',
        'Ёзилмоqда': 'Ёзилмоқда',
        'олинмоqда': 'олинмоқда',
        'кўринг': 'кўринг',
        'кўриш': 'кўриш',
        'танланг': 'танланг',
        'олинг': 'олинг',
        'етинг': 'етинг',
        'боринг': 'боринг',
        'режалаштиринг': 'режалаштиринг',
        'Амаллар': 'Амаллар',
        'Овозли': 'Овозли',
        'Фикрларингизни': 'Фикрларингизни',
        'Менинг': 'Менинг',
        'Ишларим': 'Ишларим',
        'Бошлаш': 'Бошлаш',
        'Панели': 'Панели',
        'муддатлар': 'муддатлар',
        'воситаларни': 'воситаларни',
        'жойда': 'жойда',
        'Тезкор': 'Тезкор',
        'моддаси': 'моддаси',
        'бўйича': 'бўйича',
        'овоз': 'овоз',
        'билан': 'билан',
        'ёзиб': 'ёзиб',
        'олинг': 'олинг',
    }
    
    result = text
    for latin, cyrillic in replacements.items():
        result = result.replace(latin, cyrillic)
    
    return result

def main():
    print("Reading translations.ts...")
    content = read_file('translations.ts')
    
    print("Converting all Latin characters to Cyrillic...")
    
    # Convert the entire content
    converted = convert_to_cyrillic(content)
    
    # Count changes
    changes = sum(1 for a, b in zip(content, converted) if a != b)
    print(f"Made {changes} character replacements")
    
    print("Writing converted file...")
    write_file('translations.ts', converted)
    
    print("✅ Done! All text converted to proper Cyrillic.")

if __name__ == '__main__':
    main()
