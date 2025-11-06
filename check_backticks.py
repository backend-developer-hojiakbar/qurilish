with open('translations.ts', 'r', encoding='utf-8') as f:
    content = f.read()
    
backtick_count = content.count('`')
ends_with_backtick = content.rstrip().endswith('`')

print(f"Total backticks: {backtick_count}")
print(f"Ends with backtick: {ends_with_backtick}")

# Check if backtick count is even (all closed)
if backtick_count % 2 == 0:
    print("All backticks are properly closed")
else:
    print("There is an unclosed backtick")