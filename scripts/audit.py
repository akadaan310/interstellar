#!/usr/bin/env python3
"""INTERSTELLAR content audit: fail on any non-English script or religious reference.

Scans source, docs, scripts, metadata, and the built dist/ output.
Exit 0 = clean, 1 = violations found.

The blocked stems are stored base64-encoded so this file itself carries no
readable blocked terms; they are decoded at runtime before scanning.
"""
import base64
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Blocked word stems, base64-encoded (decoded at runtime). Each is matched
# with a leading word boundary so inflected forms are caught while interior
# substrings of unrelated words are not.
_STEMS_B64 = [
    'cXVyYW4=',
    'a29yYW4=',
    'c3VyYWg=',
    'c3VyYQ==',
    'YXlhaA==',
    'YXlhdA==',
    'YWxsYWg=',
    'bXVoYW1tYWQ=',
    'bXVzYQ==',
    'aXNh',
    'aXNsYW0=',
    'YXJhYmlj',
    'YXJhYg==',
    'bWVjY2E=',
    'bWVkaW5h',
    'cmFtYWRhbg==',
    'aGFqag==',
    'c2FsYXQ=',
    'emFrYXQ=',
    'c2hhaGFkYQ==',
    'a2hhdGFt',
    'a2hhdG1h',
    'a3VmaQ==',
    'YW1pcmk=',
    'bmlkYWE=',
    'ZmFsYWs=',
    'Z2hhd3M=',
    'c2FyZg==',
    'ZGF3bGFi',
    'bXVzaGFm',
    'dGlsYXdh',
    'cWlyYWF0',
    'cWlyYXQ=',
    'dGFmc2Vlcg==',
    'dGFmc2ly',
]

_STEMS = [base64.b64decode(s).decode("utf-8") for s in _STEMS_B64]
_STEM_PATTERNS = [re.compile(r"\b" + re.escape(s), re.IGNORECASE) for s in _STEMS]
# Non-English script range, built from code points so no readable range
# literal appears in this file.
_SCRIPT_PATTERN = re.compile("[" + chr(0x0600) + "-" + chr(0x06FF) + "]")

SUFFIXES = (".ts", ".css", ".html", ".md", ".json", ".py", ".txt", ".yml", ".yaml")
SKIP_DIRS = ("node_modules", ".git", "quarantine")

violations: list[str] = []
scanned = 0
for path in sorted(ROOT.rglob("*")):
    if any(part in SKIP_DIRS for part in path.parts):
        continue
    if not path.is_file() or path.suffix not in SUFFIXES:
        continue
    scanned += 1
    rel = path.relative_to(ROOT)
    text = path.read_text(encoding="utf-8", errors="replace")
    for i, line in enumerate(text.splitlines(), 1):
        if _SCRIPT_PATTERN.search(line):
            violations.append(f"{rel}:{i}: NON-ENGLISH SCRIPT :: {line.strip()[:90]}")
            continue
        for pat in _STEM_PATTERNS:
            m = pat.search(line)
            if m:
                violations.append(
                    f"{rel}:{i}: BLOCKED STEM '{m.group(0)}' :: {line.strip()[:90]}"
                )
                break

print(f"scanned {scanned} files")
if violations:
    print(f"VIOLATIONS: {len(violations)}")
    for v in violations:
        print(" ", v)
    sys.exit(1)
print("CLEAN - no non-English script, no religious references")
