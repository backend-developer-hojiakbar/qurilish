# -*- coding: utf-8 -*-
"""
Script to convert all Latin text in geminiService.ts to Cyrillic
"""

def read_file(filename):
    """Read file content"""
    with open(filename, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(filename, content):
    """Write content to file"""
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

# Mapping of Latin phrases to Cyrillic in geminiService.ts
REPLACEMENTS = {
    # Schema descriptions
    '"Har bir AI huquqshunosning tahlili va fikrlari."': '"Ҳар бир AI ҳуқуқшуносининг таҳлили ва фикрлари."',
    '"AI huquqshunosning nomi (masalan, \'Qonun Ustuvori\')."': '"AI ҳуқуқшуносининг номи (масалан, \'Қонун Устувори\')."',
    '"AI huquqshunosning ish bo\'yicha batafsil tahlili va argumentlari."': '"AI ҳуқуқшуносининг иш бўйича батафсил таҳлили ва аргументлари."',
    '"Munozara yakunlari bo\'yicha umumlashtirilgan, advokat uchun amaliy strategiya. Markdown formatida bo\'lishi kerak."': '"Мунозара якунлари бўйича умумлаштирилган, адвокат учун амалий стратегия. Markdown форматида бўлиши керак."',
    '"Ishni yutish ehtimoli, 0 dan 100 gacha bo\'lgan foiz."': '"Ишни ютиш эҳтимоли, 0 дан 100 гача бўлган фоиз."',
    '"G\'alaba ehtimoli foizini asoslovchi qisqa izoh."': '"Ғалаба эҳтимоли фоизини асословчи қисқа изоҳ."',
    '"G\'alaba ehtimolini oshiruvchi asosiy omillar ro\'yxati."': '"Ғалаба эҳтимолини оширувчи асосий омиллар рўйхати."',
    '"G\'alaba ehtimolini pasaytiruvchi asosiy xavflar (risklar) ro\'yxati."': '"Ғалаба эҳтимолини пасайтирувчи асосий хавфлар (рисклар) рўйхати."',
    '"Risklar, ularning ehtimoli va kamaytirish yo\'llari ko\'rsatilgan matritsa."': '"Рисклар, уларнинг эҳтимоли ва камайтириш йўллари кўрсатилган матрица."',
    '"Potensial risk tavsifi."': '"Потенсиал риск тавсифи."',
    '"Riskning yuzaga kelish ehtimoli."': '"Рискнинг юзага келиш эҳтимоли."',
    '"Riskni kamaytirish bo\'yicha tavsiya."': '"Рискни камайтириш бўйича тавсия."',
    '"Advokat uchun birinchi navbatda bajarilishi kerak bo\'lgan 3-5 ta amaliy vazifa."': '"Адвокат учун биринчи навбатда бажарилиши керак бўлган 3-5 та амалий вазифа."',
    '"Ish bo\'yicha tuzilgan bilimlar bazasi."': '"Иш бўйича тузилган билимлар базаси."',
    '"Ishning asosiy faktlari va ularning ahamiyati."': '"Ишнинг асосий фактлари ва уларнинг аҳамияти."',
    '"Muhim fakt."': '"Муҳим факт."',
    '"Ushbu faktning ish uchun ahamiyati."': '"Ушбу фактнинг иш учун аҳамияти."',
    '"Hal qilinishi kerak bo\'lgan asosiy huquqiy masalalar."': '"Ҳал қилиниши керак бўлган асосий ҳуқуқий масалалар."',
    '"Ishga aloqador qonun moddalari va ularning qisqacha tavsifi."': '"Ишга алоқадор қонун моддалари ва уларнинг қисқача тавсифи."',
    '"Qonun moddasi (masalan, \'JK 168-modda\')."': '"Қонун моддаси (масалан, \'ЖК 168-модда\')."',
    '"Moddaning ishga aloqador qisqacha mazmuni."': '"Модданинг ишга алоқадор қисқача мазмуни."',
    '"Qonun moddasiga oid lex.uz saytidagi yoki boshqa ishonchli manbadagi to\'g\'ridan-to\'g\'ri havola (URL). Agar topilmasa, bo\'sh qoldiring."': '"Қонун моддасига оид lex.uz сайтидаги ёки бошқа ишончли манбадаги тўғридан-тўғри ҳавола (URL). Агар топилмаса, бўш қолдиринг."',
    '"Mijoz pozitsiyasining kuchli tomonlari."': '"Мижоз позициясининг кучли томонлари."',
    '"Mijoz pozitsiyasining zaif tomonlari."': '"Мижоз позициясининг заиф томонлари."',
    '"Da\'vo muddati bo\'yicha tahlil. Status \'OK\', \'Muddati o\\\'tgan\' (Expired), yoki \'Xavf ostida\' (At Risk) bo\'lishi kerak."': '"Даъво муддати бўйича таҳлил. Статус \'OK\', \'Муддати ўтган\' (Expired), ёки \'Хавф остида\' (At Risk) бўлиши керак."',
    '"Da\'vo muddatining holati."': '"Даъво муддатининг ҳолати."',
    '"Holat bo\'yicha qisqa tushuntirish."': '"Ҳолат бўйича қисқа тушунтириш."',
    
    # Preliminary verdict
    '"G\'alaba ehtimoli foizini asoslovchi qisqa (1-2 jumla) izoh."': '"Ғалаба эҳтимоли фоизини асословчи қисқа (1-2 жумла) изоҳ."',
    '"G\'alaba ehtimolini oshiruvchi 2-3 ta asosiy omil."': '"Ғалаба эҳтимолини оширувчи 2-3 та асосий омил."',
    '"G\'alaba ehtimolini pasaytiruvchi 2-3 ta asosiy xavf."': '"Ғалаба эҳтимолини пасайтирувчи 2-3 та асосий хавф."',
    
    # Participants
    '"Ishda qatnashayotgan aniqlangan shaxslar ro\'yxati."': '"Ишда қатнашаётган аниқланган шахслар рўйхати."',
    '"Shaxsning to\'liq ism-sharifi."': '"Шахснинг тўлиқ исм-шарифи."',
    '"Shaxsning ish bo\'yicha taxminiy roli."': '"Шахснинг иш бўйича тахминий роли."',
    
    # Document type
    '"Aniqlangan hujjat turi."': '"Аниқланган ҳужжат тури."',
    
    # Tasks
    '"Muhimligi bo\'yicha tartiblangan vazifalar ro\'yxati."': '"Муҳимлиги бўйича тартибланган вазифалар рўйхати."',
    
    # Timeline
    '"Xronologik tartibda voqealar ro\'yxati."': '"Хронологик тартибда воқеалар рўйхати."',
    '"Sana (YYYY-MM-DD formatida)."': '"Сана (YYYY-MM-DD форматида)."',
    '"Voqea tavsifi."': '"Воқеа тавсифи."',
    
    # Enum values
    "['Past', 'O\\'rta', 'Yuqori']": "['Паст', 'Ўрта', 'Юқори']",
    '["Da\'vogar", "Javobgar", "Sudlanuvchi", "Jabrlanuvchi", "Guvoh", "Boshqa"]': '["Даъвогар", "Жавобгар", "Судланувчи", "Жабрланувчи", "Гувоҳ", "Бошқа"]',
    '["Shartnoma", "Da\'vo arizasi", "Sud qarori", "Dalolatnoma", "Ishonchnoma", "Bildirishnoma", "Boshqa"]': '["Шартнома", "Даъво аризаси", "Суд қарори", "Далолатнома", "Ишончнома", "Билдиришнома", "Бошқа"]',
    "['OK', 'Muddati o\\'tgan', 'Xavf ostida']": "['OK', 'Муддати ўтган', 'Хавф остида']",
    
    # Comments
    '// This section will be preserved as is': '// Бу бўлим ўзгаришсиз сақланади',
}

def main():
    print("Reading geminiService.ts...")
    content = read_file('services/geminiService.ts')
    
    print("Converting to Cyrillic...")
    for latin, cyrillic in REPLACEMENTS.items():
        if latin in content:
            content = content.replace(latin, cyrillic)
            print(f"  ✓ Replaced: {latin[:50]}...")
    
    print("Writing updated file...")
    write_file('services/geminiService.ts', content)
    
    print("✅ Done! geminiService.ts updated with Cyrillic text.")

if __name__ == '__main__':
    main()
