import json
from pathlib import Path
from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parent.parent
INPUT_PATH = ROOT / "data" / "Ngan-Hang-Cau-Hoi.xlsx"
OUTPUT_PATH = ROOT / "public" / "questions.json"

answer_map = {"A": 0, "B": 1, "C": 2, "D": 3}

wb = load_workbook(INPUT_PATH, data_only=True)
ws = wb.active

questions = []
for row in ws.iter_rows(min_row=2, values_only=True):
    if not any(cell is not None and str(cell).strip() for cell in row):
        continue

    stt, question, options_text, answer = row[0], row[1], row[2], row[3]
    if stt is None:
        continue

    options = []
    if isinstance(options_text, str):
        for line in options_text.splitlines():
            line = line.strip()
            if not line:
                continue
            if line and line[0].upper() in answer_map:
                line = line[2:].strip() if len(line) > 2 else ""
            options.append(line)

    if not options:
        continue

    answer_index = answer_map.get(str(answer).strip().upper())
    if answer_index is None:
        answer_index = 0

    questions.append({
        "id": int(stt),
        "question": str(question).strip(),
        "options": options,
        "answer": answer_index,
    })

OUTPUT_PATH.write_text(json.dumps(questions, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Wrote {len(questions)} questions to {OUTPUT_PATH}")
