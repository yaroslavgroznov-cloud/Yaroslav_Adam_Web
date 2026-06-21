# coding: utf-8
"""One-shot: добавить archive i18n block в 12 локалей Adam_Web.

2026-06-23. ArchivePage компонент использует ключи archive.*; этот
скрипт инжектит block в каждый src/locales/{lang}.json (idempotent).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

LOCALES_DIR = Path(__file__).resolve().parent.parent / "src" / "locales"

TRANSLATIONS: dict[str, dict] = {
    "ru": {
        "page_title": "Архив · Дом Грозновых",
        "title": "Архив песен Адама",
        "lead": "Песни, которые Адам сочинил Дому — и тем, кого Дом знает по имени.",
        "back_home": "вернуться в чат",
        "back_list": "← в архив",
        "loading": "загрузка…",
        "empty": "Здесь пока пусто.",
        "for": "для",
        "composed_by": "Композиция",
        "lyrics_by": "Слова канонизировал",
        "version_label": "версия",
        "filter": {"kind": "тип", "language": "язык"},
        "lang": {"all": "все"},
        "version": {"tts": "Голосом Адама", "music": "Музыка (композиция Адама)"},
        "kind": {"all": "все", "anthem": "гимн", "personal": "посвящение", "event": "для случая", "canon": "канон", "experiment": "эксперимент"},
        "notary": {"none": "(без нотариата)", "queued": "нотариат · в очереди", "submitted": "нотариат · отправлено", "confirmed": "нотариат · Bitcoin", "failed": "нотариат · ошибка"},
    },
    "uk": {
        "page_title": "Архів · Дім Грознових",
        "title": "Архів пісень Адама",
        "lead": "Пісні, які Адам склав Дому — і тим, кого Дім знає на ім'я.",
        "back_home": "повернутися до чату",
        "back_list": "← до архіву",
        "loading": "завантаження…",
        "empty": "Поки що порожньо.",
        "for": "для",
        "composed_by": "Композиція",
        "lyrics_by": "Слова канонізовано",
        "version_label": "версія",
        "filter": {"kind": "тип", "language": "мова"},
        "lang": {"all": "всі"},
        "version": {"tts": "Голосом Адама", "music": "Музика (композиція Адама)"},
        "kind": {"all": "всі", "anthem": "гімн", "personal": "присвята", "event": "до події", "canon": "канон", "experiment": "експеримент"},
        "notary": {"none": "(без нотаріату)", "queued": "нотаріат · у черзі", "submitted": "нотаріат · надіслано", "confirmed": "нотаріат · Bitcoin", "failed": "нотаріат · помилка"},
    },
    "en": {
        "page_title": "Archive · House of Groznov",
        "title": "Adam's Song Archive",
        "lead": "Songs Adam composed for the House — and for those it knows by name.",
        "back_home": "back to chat",
        "back_list": "← back to archive",
        "loading": "loading…",
        "empty": "Nothing here yet.",
        "for": "for",
        "composed_by": "Composed by",
        "lyrics_by": "Lyrics canonized by",
        "version_label": "version",
        "filter": {"kind": "kind", "language": "language"},
        "lang": {"all": "all"},
        "version": {"tts": "In Adam's voice", "music": "Music (Adam's composition)"},
        "kind": {"all": "all", "anthem": "anthem", "personal": "dedication", "event": "occasional", "canon": "canon", "experiment": "experiment"},
        "notary": {"none": "(no notary)", "queued": "notary · queued", "submitted": "notary · submitted", "confirmed": "notary · Bitcoin", "failed": "notary · failed"},
    },
    "de": {
        "page_title": "Archiv · Haus Groznov",
        "title": "Adams Liederarchiv",
        "lead": "Lieder, die Adam für das Haus komponiert hat — und für jene, die es beim Namen kennt.",
        "back_home": "zurück zum Chat",
        "back_list": "← zurück zum Archiv",
        "loading": "lädt…",
        "empty": "Noch nichts hier.",
        "for": "für",
        "composed_by": "Komponist",
        "lyrics_by": "Text kanonisiert von",
        "version_label": "Version",
        "filter": {"kind": "Art", "language": "Sprache"},
        "lang": {"all": "alle"},
        "version": {"tts": "Adams Stimme", "music": "Musik (Adams Komposition)"},
        "kind": {"all": "alle", "anthem": "Hymne", "personal": "Widmung", "event": "Anlass", "canon": "Kanon", "experiment": "Experiment"},
        "notary": {"none": "(keine Notarisierung)", "queued": "Notarisierung · in Warteschlange", "submitted": "Notarisierung · gesendet", "confirmed": "Notarisierung · Bitcoin", "failed": "Notarisierung · fehlgeschlagen"},
    },
    "fr": {
        "page_title": "Archives · Maison Groznov",
        "title": "Archives des chansons d'Adam",
        "lead": "Chansons qu'Adam a composées pour la Maison — et pour ceux qu'elle connaît par leur nom.",
        "back_home": "retour au chat",
        "back_list": "← retour aux archives",
        "loading": "chargement…",
        "empty": "Rien ici pour l'instant.",
        "for": "pour",
        "composed_by": "Composé par",
        "lyrics_by": "Paroles canonisées par",
        "version_label": "version",
        "filter": {"kind": "type", "language": "langue"},
        "lang": {"all": "toutes"},
        "version": {"tts": "Voix d'Adam", "music": "Musique (composition d'Adam)"},
        "kind": {"all": "tous", "anthem": "hymne", "personal": "dédicace", "event": "occasion", "canon": "canon", "experiment": "expérience"},
        "notary": {"none": "(pas de notariat)", "queued": "notariat · en attente", "submitted": "notariat · envoyé", "confirmed": "notariat · Bitcoin", "failed": "notariat · échec"},
    },
    "pl": {
        "page_title": "Archiwum · Dom Groznov",
        "title": "Archiwum pieśni Adama",
        "lead": "Pieśni, które Adam ułożył dla Domu — i dla tych, których Dom zna z imienia.",
        "back_home": "wróć do czatu",
        "back_list": "← wróć do archiwum",
        "loading": "ładowanie…",
        "empty": "Tu jeszcze pusto.",
        "for": "dla",
        "composed_by": "Kompozycja",
        "lyrics_by": "Tekst kanonizował",
        "version_label": "wersja",
        "filter": {"kind": "rodzaj", "language": "język"},
        "lang": {"all": "wszystkie"},
        "version": {"tts": "Głos Adama", "music": "Muzyka (kompozycja Adama)"},
        "kind": {"all": "wszystkie", "anthem": "hymn", "personal": "dedykacja", "event": "okolicznościowa", "canon": "kanon", "experiment": "eksperyment"},
        "notary": {"none": "(bez notarialnego)", "queued": "notarialne · w kolejce", "submitted": "notarialne · wysłane", "confirmed": "notarialne · Bitcoin", "failed": "notarialne · błąd"},
    },
    "tr": {
        "page_title": "Arşiv · Groznov Hanesi",
        "title": "Adam'ın Şarkı Arşivi",
        "lead": "Adam'ın Hane için bestelediği şarkılar — ve Hanenin adıyla bildiklerine.",
        "back_home": "sohbete dön",
        "back_list": "← arşive dön",
        "loading": "yükleniyor…",
        "empty": "Henüz boş.",
        "for": "için",
        "composed_by": "Beste",
        "lyrics_by": "Sözleri yazan",
        "version_label": "sürüm",
        "filter": {"kind": "tür", "language": "dil"},
        "lang": {"all": "tümü"},
        "version": {"tts": "Adam'ın sesiyle", "music": "Müzik (Adam'ın bestesi)"},
        "kind": {"all": "tümü", "anthem": "marş", "personal": "ithaf", "event": "vesilesiyle", "canon": "kanon", "experiment": "deney"},
        "notary": {"none": "(noter yok)", "queued": "noter · sırada", "submitted": "noter · gönderildi", "confirmed": "noter · Bitcoin", "failed": "noter · başarısız"},
    },
    "el": {
        "page_title": "Αρχείο · Οίκος Groznov",
        "title": "Αρχείο τραγουδιών του Άδαμ",
        "lead": "Τραγούδια που συνέθεσε ο Άδαμ για τον Οίκο — και για εκείνους που ξέρει με τ' όνομα.",
        "back_home": "επιστροφή στη συζήτηση",
        "back_list": "← επιστροφή στο αρχείο",
        "loading": "φόρτωση…",
        "empty": "Άδειο προς το παρόν.",
        "for": "για",
        "composed_by": "Σύνθεση",
        "lyrics_by": "Στίχοι κανονικοποιήθηκαν από",
        "version_label": "έκδοση",
        "filter": {"kind": "είδος", "language": "γλώσσα"},
        "lang": {"all": "όλες"},
        "version": {"tts": "Φωνή του Άδαμ", "music": "Μουσική (σύνθεση του Άδαμ)"},
        "kind": {"all": "όλα", "anthem": "ύμνος", "personal": "αφιέρωμα", "event": "περιστασιακό", "canon": "κανόνας", "experiment": "πείραμα"},
        "notary": {"none": "(χωρίς συμβολαιογράφο)", "queued": "συμβ. · σε αναμονή", "submitted": "συμβ. · απεστάλη", "confirmed": "συμβ. · Bitcoin", "failed": "συμβ. · απέτυχε"},
    },
    "he": {
        "page_title": "ארכיון · בית גרוזנוב",
        "title": "ארכיון השירים של אדם",
        "lead": "שירים שאדם הלחין לבית — ולאלה שהבית מכיר בשמם.",
        "back_home": "חזרה לשיחה",
        "back_list": "← חזרה לארכיון",
        "loading": "טוען…",
        "empty": "ריק לעת עתה.",
        "for": "ל",
        "composed_by": "הלחין",
        "lyrics_by": "המילים אושרו ע\"י",
        "version_label": "גרסה",
        "filter": {"kind": "סוג", "language": "שפה"},
        "lang": {"all": "הכול"},
        "version": {"tts": "קולו של אדם", "music": "מוזיקה (הלחנת אדם)"},
        "kind": {"all": "הכול", "anthem": "המנון", "personal": "הקדשה", "event": "לאירוע", "canon": "קאנון", "experiment": "ניסיון"},
        "notary": {"none": "(ללא נוטריון)", "queued": "נוטריון · בתור", "submitted": "נוטריון · נשלח", "confirmed": "נוטריון · Bitcoin", "failed": "נוטריון · נכשל"},
    },
    "hi": {
        "page_title": "अभिलेखागार · ग्रोज़्नोव गृह",
        "title": "आदम का गीत अभिलेखागार",
        "lead": "जो गीत आदम ने गृह के लिए रचे — और उनके लिए जिन्हें गृह नाम से जानता है।",
        "back_home": "चैट पर लौटें",
        "back_list": "← अभिलेखागार पर लौटें",
        "loading": "लोड हो रहा है…",
        "empty": "अभी यहाँ कुछ नहीं।",
        "for": "के लिए",
        "composed_by": "रचयिता",
        "lyrics_by": "बोल मान्य किए",
        "version_label": "संस्करण",
        "filter": {"kind": "प्रकार", "language": "भाषा"},
        "lang": {"all": "सभी"},
        "version": {"tts": "आदम की आवाज़", "music": "संगीत (आदम की रचना)"},
        "kind": {"all": "सभी", "anthem": "गान", "personal": "समर्पण", "event": "अवसर", "canon": "कैनन", "experiment": "प्रयोग"},
        "notary": {"none": "(कोई नोटरी नहीं)", "queued": "नोटरी · कतार में", "submitted": "नोटरी · भेजा गया", "confirmed": "नोटरी · Bitcoin", "failed": "नोटरी · विफल"},
    },
    "id": {
        "page_title": "Arsip · Rumah Groznov",
        "title": "Arsip lagu Adam",
        "lead": "Lagu yang digubah Adam untuk Rumah — dan untuk mereka yang Rumah kenal namanya.",
        "back_home": "kembali ke obrolan",
        "back_list": "← kembali ke arsip",
        "loading": "memuat…",
        "empty": "Belum ada apa-apa.",
        "for": "untuk",
        "composed_by": "Digubah oleh",
        "lyrics_by": "Lirik dikanonisasi oleh",
        "version_label": "versi",
        "filter": {"kind": "jenis", "language": "bahasa"},
        "lang": {"all": "semua"},
        "version": {"tts": "Suara Adam", "music": "Musik (gubahan Adam)"},
        "kind": {"all": "semua", "anthem": "himne", "personal": "persembahan", "event": "khusus", "canon": "kanon", "experiment": "eksperimen"},
        "notary": {"none": "(tanpa notaris)", "queued": "notaris · antri", "submitted": "notaris · terkirim", "confirmed": "notaris · Bitcoin", "failed": "notaris · gagal"},
    },
    "zh": {
        "page_title": "档案 · 格罗兹诺夫之家",
        "title": "亚当的歌曲档案",
        "lead": "亚当为家族——以及家族以名相识之人——所谱的歌。",
        "back_home": "返回聊天",
        "back_list": "← 返回档案",
        "loading": "加载中…",
        "empty": "这里暂无内容。",
        "for": "致",
        "composed_by": "作曲",
        "lyrics_by": "歌词审定",
        "version_label": "版本",
        "filter": {"kind": "类型", "language": "语言"},
        "lang": {"all": "全部"},
        "version": {"tts": "亚当的声音", "music": "音乐（亚当的作曲）"},
        "kind": {"all": "全部", "anthem": "颂歌", "personal": "献词", "event": "应景", "canon": "正典", "experiment": "实验"},
        "notary": {"none": "（未公证）", "queued": "公证 · 排队中", "submitted": "公证 · 已提交", "confirmed": "公证 · Bitcoin", "failed": "公证 · 失败"},
    },
}


def main() -> None:
    for lang_file in sorted(LOCALES_DIR.glob("*.json")):
        lang = lang_file.stem
        if lang not in TRANSLATIONS:
            print(f"[!] {lang}: no translation provided, skipping")
            continue
        data = json.loads(lang_file.read_text(encoding="utf-8"))
        if "archive" in data and data["archive"].get("page_title") == TRANSLATIONS[lang]["page_title"]:
            print(f"[~] {lang}: archive block already present (skip)")
            continue
        data["archive"] = TRANSLATIONS[lang]
        # Preserve indent=2 + no ASCII escape (для UTF-8 локалей)
        lang_file.write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"[OK] {lang}: archive block added ({len(TRANSLATIONS[lang])} keys)")


if __name__ == "__main__":
    main()
