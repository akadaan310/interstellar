#!/usr/bin/env python3
"""INTERSTELLAR content audit: fail on any Arabic script or Quran/religious reference.

Scans src/, index.html, README.md. Exit 0 = clean, 1 = violations found.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ARABIC = re.compile(r"[\u0600-\u06FF]")
WORDS = re.compile(
    r"(?i)\b(quran|koran|surah|sura\b|ayah|ayat|allah|muhammad|musa\b|isa\b|"
    r"islam|arabic|arab\b|mecca|medina|ramadan|hajj|salat|zakat|shahada|"
    r"khatam|khatma|kufi|amiri|nidaa|falak|ghaws|sarf|dawlab|mushaf|"
    r"tilawa|qiraat|qirat|tafseer|tafsir)\b"
)
FONTS = ("amiri", "kufi", "quran-arabic")

violations: list[str] = []
scanned = 0
for path in sorted(ROOT.rglob("*")):
    if any(part in ("node_modules", "dist", ".git", "quarantine") for part in path.parts):
        continue
    if path.suffix not in (".ts", ".css", ".html", ".md", ".json"):
        continue
    scanned += 1
    text = path.read_text(encoding="utf-8", errors="replace")
    for i, line in enumerate(text.splitlines(), 1):
        rel = path.relative_to(ROOT)
        if ARABIC.search(line):
            violations.append(f"{rel}:{i}: ARABIC SCRIPT :: {line.strip()[:90]}")
        m = WORDS.search(line)
        if m:
            violations.append(f"{rel}:{i}: BLOCKED WORD '{m.group(0)}' :: {line.strip()[:90]}")
    low = text.lower()
    for f in FONTS:
        if f in low and "audit" not in path.name:
            violations.append(f"{path.relative_to(ROOT)}: FONT REF '{f}'")

print(f"scanned {scanned} files")
if violations:
    print(f"VIOLATIONS: {len(violations)}")
    for v in violations:
        print(" ", v)
    sys.exit(1)
print("CLEAN — no Arabic script, no Quran/religious references")
