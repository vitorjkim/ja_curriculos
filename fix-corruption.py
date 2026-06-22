#!/usr/bin/env python
# -*- coding: utf-8 -*-

file_path = r'c:\Users\vitor\Desktop\Ja-curriculos\Site Curriculos funcionando\Site Curriculos funcionando\src\pages\SchoolClassStats.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Remove lines 1295-1533 (Python uses 0-based indexing, so lines[1294:1533])
fixed_lines = lines[:1294] + lines[1533:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(fixed_lines)

print(f"Fixed! Removed {1533-1294} lines of corrupted code.")
print(f"Original: {len(lines)} lines")
print(f"After fix: {len(fixed_lines)} lines")
