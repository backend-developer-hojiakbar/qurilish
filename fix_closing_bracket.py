# -*- coding: utf-8 -*-
"""
Fix missing closing bracket and comma in translations.ts
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
    
    # The problem: line 697 ends with backtick but no comma, and line 698 starts with app_name
    # This means uz-cyrl section is not properly closed
    
    # Find and fix the issue
    old_text = """JAVOBNI FAQAT JSON formatida, crossExaminationSchema'ga QAT'IY RIOYA QILGAN HOLDA QAYTAR.`
    app_name: "Адолат АИ","""
    
    new_text = """JAVOBNI FAQAT JSON formatida, crossExaminationSchema'ga QAT'IY RIOYA QILGAN HOLDA QAYTAR.`,
  },
  'ru': {
    app_name: "Адолат АИ","""
    
    print("Fixing closing bracket and adding 'ru' section...")
    
    if old_text in content:
        content = content.replace(old_text, new_text)
        print("✓ Fixed!")
    else:
        print("✗ Pattern not found, trying alternative...")
        # Try with different line ending
        old_text2 = "JAVOBNI FAQAT JSON formatida, crossExaminationSchema'ga QAT'IY RIOYA QILGAN HOLDA QAYTAR.`\n    app_name: \"Адолат АИ\","
        new_text2 = "JAVOBNI FAQAT JSON formatida, crossExaminationSchema'ga QAT'IY RIOYA QILGAN HOLDA QAYTAR.`,\n  },\n  'ru': {\n    app_name: \"Адолат АИ\","
        
        if old_text2 in content:
            content = content.replace(old_text2, new_text2)
            print("✓ Fixed with alternative pattern!")
        else:
            print("✗ Could not find pattern to fix")
            return
    
    print("Writing fixed file...")
    write_file('translations.ts', content)
    
    print("✅ Done! Closing bracket added.")

if __name__ == '__main__':
    main()
