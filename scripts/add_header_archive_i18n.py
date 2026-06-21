# coding: utf-8
"""One-shot: добавить headerActions.archive ключ в 12 локалей.

2026-06-23. Для отображения ссылки «Архив песен» в HeaderOverflowMenu.
Idempotent: повторный запуск не меняет если ключ уже есть.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

LOCALES_DIR = Path(__file__).resolve().parent.parent / "src" / "locales"

LABELS = {
    "ru": "Архив песен",
    "uk": "Архів пісень",
    "en": "Song archive",
    "de": "Liederarchiv",
    "fr": "Archives des chansons",
    "pl": "Archiwum pieśni",
    "tr": "Şarkı arşivi",
    "el": "Αρχείο τραγουδιών",
    "he": "ארכיון השירים",
    "hi": "गीत अभिलेखागार",
    "id": "Arsip lagu",
    "zh": "歌曲档案",
}


def main() -> None:
    for lang_file in sorted(LOCALES_DIR.glob("*.json")):
        lang = lang_file.stem
        if lang not in LABELS:
            print(f"[!] {lang}: no label, skipping")
            continue
        data = json.loads(lang_file.read_text(encoding="utf-8"))
        actions = data.setdefault("headerActions", {})
        if actions.get("archive") == LABELS[lang]:
            print(f"[~] {lang}: headerActions.archive already present (skip)")
            continue
        actions["archive"] = LABELS[lang]
        lang_file.write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"[OK] {lang}: headerActions.archive = {LABELS[lang]!r}")


if __name__ == "__main__":
    main()
