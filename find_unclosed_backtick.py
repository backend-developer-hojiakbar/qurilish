with open('translations.ts', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
backtick_count = 0
unclosed_line = None

for i, line in enumerate(lines):
    backticks_in_line = line.count('`')
    backtick_count += backticks_in_line
    
    # If we have an odd number of backticks, we might have found the unclosed one
    if backtick_count % 2 == 1:
        unclosed_line = i + 1

print(f"Total backticks: {backtick_count}")
print(f"Last line with opening backtick: {unclosed_line}")

# Let's also check around the end of the file
print("\nLast 10 lines:")
for i in range(max(0, len(lines)-10), len(lines)):
    backtick_count_line = lines[i].count('`')
    if backtick_count_line > 0:
        print(f"Line {i+1}: {backtick_count_line} backticks - {repr(lines[i])}")