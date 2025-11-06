# -*- coding: utf-8 -*-
"""
Fix Russian translations - convert Uzbek text back to Russian in 'ru' section
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
    
    print("Fixing Russian translations...")
    
    # Map of Uzbek to Russian translations in 'ru' section
    replacements = {
        # Views - keep only the ones that are wrong
        'view_investigation_debate_title: "Тергов Мунозараси",': 'view_investigation_debate_title: "Дебаты Расследования",',
        'view_investigation_debate_description: "АI терговчиларнинг иш бўйича таҳлилий баҳси.",': 'view_investigation_debate_description: "Аналитические дебаты AI-следователей по делу.",',
        'view_summary_title: "Якуний Стратегия",': 'view_summary_title: "Итоговая Стратегия",',
        'view_summary_description: "Мунозара якунлари бўйича тайёр ҳаракатлар режаси.",': 'view_summary_description: "Готовый план действий на основе результатов дебатов.",',
        'view_knowledge_base_title: "Билимлар Базаси",': 'view_knowledge_base_title: "База Знаний",',
        'view_knowledge_base_description: "Ишнинг тузилган маълумотлари ва чуқур таҳлили.",': 'view_knowledge_base_description: "Структурированные данные и углубленный анализ дела.",',
        'view_simulation_title: "Суд Зали Симулятори",': 'view_simulation_title: "Симулятор Зала Суда",',
        'view_simulation_description: "Суд жараёнига тайёргарлик кўринг ва кутилмаган саволларга тайёрланинг.",': 'view_simulation_description: "Подготовьтесь к судебному процессу и неожиданным вопросам.",',
        'view_history_title: "Ишлар Архиви",': 'view_history_title: "Архив Дел",',
        'view_history_description: "Барча сақланган ишларингизни кўриб чиқинг.",': 'view_history_description: "Просмотрите все ваши сохраненные дела.",',
        'view_research_title: "Ҳуқуқий Тадқиқотчи",': 'view_research_title: "Юридический Исследователь",',
        'view_research_description: "Ўзбекистон қонунчилигини АI ёрдамида ўрганинг.",': 'view_research_description: "Изучайте законодательство Узбекистана с помощью AI.",',
        'view_settings_title: "Созламалар",': 'view_settings_title: "Настройки",',
        'view_settings_description: "Профилингиз ва платформа созламаларини бошқаринг.",': 'view_settings_description: "Управляйте своим профилем и настройками платформы.",',
        'view_investigation_materials_title: "Тергов Материаллари",': 'view_investigation_materials_title: "Материалы Расследования",',
        'view_investigation_materials_description: "Тергов далиллари, гумонланувчилар ва ҳаракатлар режаси.",': 'view_investigation_materials_description: "Доказательства расследования, подозреваемые и план действий.",',
        'view_investigation_summary_title: "Тергов Хулосаси",': 'view_investigation_summary_title: "Итоги Расследования",',
        'view_investigation_summary_description: "Тергов натижалари ва кейинги қадамлар бўйича якуний ҳисобот.",': 'view_investigation_summary_description: "Итоговый отчет по результатам расследования и следующим шагам.",',
        'view_tasks_title: "Вазифалар",': 'view_tasks_title: "Задачи",',
        'view_tasks_description: "Иш бўйича вазифаларни бошқаринг.",': 'view_tasks_description: "Управляйте задачами по делу.",',
        'view_documents_title: "Ҳужжатлар Генератори",': 'view_documents_title: "Генератор Документов",',
        'view_documents_description: "АI ёрдамида процессуал ҳужжатларни яратинг.",': 'view_documents_description: "Создавайте процессуальные документы с помощью AI.",',
        'view_timeline_title: "Хронология",': 'view_timeline_title: "Хронология",',
        'view_timeline_description: "Ишнинг асосий воқеалари ва саналарини кузатиб боринг.",': 'view_timeline_description: "Отслеживайте ключевые события и даты дела.",',
        'view_evidence_title: "Далиллар",': 'view_evidence_title: "Доказательства",',
        'view_evidence_description: "Ишга оид барча далилларни бир жойда бошқаринг.",': 'view_evidence_description: "Управляйте всеми доказательствами по делу в одном месте.",',
        'view_billing_title: "Ҳисоб-китоб",': 'view_billing_title: "Учет Времени",',
        'view_billing_description: "Сарфланган вақт ва харажатларни қайд этинг.",': 'view_billing_description: "Записывайте затраченное время и расходы.",',
        'view_notes_title: "Қайдлар",': 'view_notes_title: "Заметки",',
        'view_notes_description: "Шахсий эслатмалар ва фикрларни ёзиб боринг.",': 'view_notes_description: "Записывайте личные заметки и мысли.",',
        'view_calendar_title: "Тақвим",': 'view_calendar_title: "Календарь",',
        'view_calendar_description: "Барча ишлар бўйича муддатларни режалаштиринг.",': 'view_calendar_description: "Планируйте сроки по всем делам.",',
        'view_overview_title: "Умумий кўриниш",': 'view_overview_title: "Общий Обзор",',
        'view_overview_description: "Ишнинг асосий кўрсаткичлари ва тезкор маълумотлар.",': 'view_overview_description: "Ключевые показатели дела и быстрая информация.",',
        'view_witness_prep_title: "Гувоҳларни Тайёрлаш",': 'view_witness_prep_title: "Подготовка Свидетелей",',
        'view_witness_prep_description: "Тўғридан-тўғри ва кесишган сўроққа тайёргарлик кўринг.",': 'view_witness_prep_description: "Подготовьтесь к прямому и перекрестному допросу.",',
    }
    
    for uzbek, russian in replacements.items():
        if uzbek in content:
            content = content.replace(uzbek, russian)
            print(f"  ✓ Fixed: {uzbek[:50]}...")
    
    print("Writing fixed file...")
    write_file('translations.ts', content)
    
    print("✅ Done! Russian translations fixed.")

if __name__ == '__main__':
    main()
