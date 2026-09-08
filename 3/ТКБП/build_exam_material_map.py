import math
import re
from collections import Counter
from pathlib import Path


ROOT = Path(r"D:\Ilya\MIREA\3\ТКБП")
OCR = ROOT / "Материалы" / "OCR"
OUT = ROOT / "Материалы" / "Карта_вопросов_к_материалам.md"
QUESTIONS = OCR / "Технологии контроллинга бизнес-процессов_Вопросы к промежуточной аттестации.txt"


STOP = {
    "понятие", "роль", "задачи", "задача", "функции", "организации", "отличие",
    "сущность", "необходимость", "создания", "условия", "возможности", "методы",
    "методика", "порядок", "проведения", "основные", "целевая", "глобальные",
    "локальные", "характеристика", "состав", "этапы", "стадии", "направления",
    "проявление", "сопоставление", "инструментарий", "инструмент", "бизнес",
    "процессов", "процесса", "контроллинга", "контроллинг", "организация",
    "предприятии", "предприятия", "управлении", "управления", "информационных",
    "информационное", "системы", "системах", "система", "фаза", "базе",
}


def words(text: str) -> list[str]:
    return [
        w.lower()
        for w in re.findall(r"[А-Яа-яЁёA-Za-z0-9]+", text)
        if len(w) >= 3 and w.lower() not in STOP
    ]


def parse_questions(text: str) -> list[tuple[int, str]]:
    normalized = re.sub(r"\n(?=\d+\.)", "\n\n", text)
    result = []
    for match in re.finditer(r"(?ms)^\s*(\d+)\.\s*(.*?)(?=\n\s*\d+\.|\Z)", normalized):
        question = " ".join(match.group(2).split())
        if question:
            result.append((int(match.group(1)), question))
    return result


def chunks(text: str, size: int = 1400, overlap: int = 250) -> list[str]:
    clean = re.sub(r"\s+", " ", text).strip()
    if not clean:
        return []
    result = []
    start = 0
    while start < len(clean):
        result.append(clean[start : start + size])
        start += size - overlap
    return result


def score(query: list[str], chunk_words: Counter[str], idf: dict[str, float]) -> float:
    total = 0.0
    for word in query:
        variants = [w for w in chunk_words if w == word or w.startswith(word[:6])]
        if variants:
            total += max(chunk_words[v] for v in variants) * idf.get(word, 1.0)
    return total


def main() -> None:
    questions = parse_questions(QUESTIONS.read_text(encoding="utf-8", errors="replace"))
    docs = []
    for path in sorted(OCR.glob("*.txt"), key=lambda p: p.name):
        if path == QUESTIONS:
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for i, chunk in enumerate(chunks(text), start=1):
            token_counter = Counter(words(chunk))
            if token_counter:
                docs.append({"file": path.name, "chunk": i, "text": chunk, "tokens": token_counter})

    df = Counter()
    for doc in docs:
        for token in doc["tokens"]:
            df[token] += 1
    idf = {token: math.log((1 + len(docs)) / (1 + count)) + 1 for token, count in df.items()}

    lines = [
        "# Карта вопросов к материалам",
        "",
        "Автоматическая карта по текстам из папки `OCR`. Для каждого вопроса указаны наиболее релевантные фрагменты материалов.",
        "",
    ]
    for number, question in questions:
        query = words(question)
        ranked = []
        for doc in docs:
            value = score(query, doc["tokens"], idf)
            if value:
                ranked.append((value, doc))
        ranked.sort(key=lambda item: item[0], reverse=True)

        lines.append(f"## {number}. {question}")
        if not ranked:
            lines.append("")
            lines.append("Материал не найден автоматически.")
            lines.append("")
            continue

        for value, doc in ranked[:3]:
            snippet = doc["text"][:650].strip()
            lines.append("")
            lines.append(f"**Источник:** `{doc['file']}`, фрагмент {doc['chunk']}, score {value:.2f}")
            lines.append("")
            lines.append(f"> {snippet}")
        lines.append("")

    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(OUT)


if __name__ == "__main__":
    main()
