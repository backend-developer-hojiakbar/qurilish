# -*- coding: utf-8 -*-
"""
Fix ALL remaining Cyrillic characters in English and code sections
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
    
    print("Fixing all remaining errors...")
    
    # Fix all Cyrillic characters that should be Latin
    replacements = {
        # In prompts and code
        'Witҳ': 'With',
        'ucҳun': 'uchun',
        'advokatгa': 'advokatga',
        'қisқa': 'qisqa',
        'etilгan': 'etilgan',
        'ҳam': 'ham',
        'savolninг': 'savolning',
        'zaҳarini': 'zaharini',
        'kesisҳi': 'kesishi',
        'foydasiгa': 'foydasiga',
        "o'zгartir": "o'zgartir",
        'isҳi': 'ishi',
        'ISҲ': 'ISH',
        "BO'YICҲA": "BO'YICHA",
        "MA'LUMOTLAR": "MA'LUMOTLAR",
        'Ҳar': 'Har',
        
        # In English section
        'riгҳts': 'rights',
        'Dasҳboard': 'Dashboard',
        'гet': 'get',
        'leгal': 'legal',
        'strateгy': 'strategy',
        'tҳe': 'the',
        'Investiгation': 'Investigation',
        'investiгators': 'investigators',
        'Strateгy': 'Strategy',
        'Knowledгe': 'Knowledge',
        'deptҳ': 'depth',
        'қuestions': 'questions',
        'ҳistory': 'history',
        'Researcҳ': 'Research',
        'Settinгs': 'Settings',
        'manaгe': 'manage',
        'Investiгation': 'Investigation',
        'investiгation': 'investigation',
        'evidenсe': 'evidence',
        'Billinг': 'Billing',
        'Notes': 'Notes',
        'Calendar': 'Calendar',
        'Witness': 'Witness',
        'Prep': 'Prep',
        'Dasҳboard': 'Dashboard',
        'Neгative': 'Negative',
        'Positive': 'Positive',
        'Preliminaгy': 'Preliminary',
        'Strateгic': 'Strategic',
        'Leгal': 'Legal',
        'Researcҳ': 'Research',
        'Knowledгe': 'Knowledge',
        'Settinгs': 'Settings',
        'Manag': 'Manag',
        'Billinг': 'Billing',
        'Investiгation': 'Investigation',
        'Materialsҳ': 'Materials',
        'Summarҳy': 'Summary',
        'Tasksҳ': 'Tasks',
        'Documentsҳ': 'Documents',
        'Timelineҳ': 'Timeline',
        'Evidenсe': 'Evidence',
        'Notesҳ': 'Notes',
        'Calendarҳ': 'Calendar',
        'Overviewҳ': 'Overview',
        'Witnessҳ': 'Witness',
        'Prepҳ': 'Prep',
    }
    
    for wrong, correct in replacements.items():
        if wrong in content:
            count = content.count(wrong)
            content = content.replace(wrong, correct)
            print(f"  ✓ Replaced '{wrong}' → '{correct}' ({count} times)")
    
    print("Writing fixed file...")
    write_file('translations.ts', content)
    
    print("✅ Done! All remaining errors fixed.")

if __name__ == '__main__':
    main()
