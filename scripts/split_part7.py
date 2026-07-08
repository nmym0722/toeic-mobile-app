import json
import os
import re

src_path = r"c:\devlop\toiecapps\toeic-mobile-app\src\data\toeic_part7_questions_v2.json"
dest_dir = r"c:\devlop\toiecapps\toeic-mobile-app\src\data"

with open(src_path, "r", encoding="utf-8") as f:
    data = json.load(f)

level_500 = []
level_700 = []
level_900 = []

for item in data:
    text = item["passage_text"]
    
    # document_type を抽出
    doc_type_match = re.search(r"Document Type:\s*(.*)", text)
    doc_type = doc_type_match.group(1).strip() if doc_type_match else "Reading"
    
    # title を抽出
    title_match = re.search(r"Title:\s*(.*)", text)
    title = title_match.group(1).strip() if title_match else "Reading Comprehension"
    
    # 不要な Document Type 行と Title 行をパッセージ本文から取り除く
    clean_text = text
    clean_text = re.sub(r"^Document Type:.*\n?", "", clean_text)
    clean_text = re.sub(r"^Title:.*\n?", "", clean_text)
    clean_text = clean_text.strip()
    
    # 翻訳テキストも同様にクリーンアップ
    trans = item.get("passage_translation", "")
    clean_trans = trans
    clean_trans = re.sub(r"^文書形式[：:].*\n?", "", clean_trans)
    clean_trans = re.sub(r"^タイトル[：:].*\n?", "", clean_trans)
    clean_trans = clean_trans.strip()
    
    new_item = {
        "passage_id": item["passage_id"],
        "target_level": item["target_level"],
        "document_type": doc_type,
        "title": title,
        "passage_text": clean_text,
        "passage_translation": clean_trans,
        "questions": item["questions"]
    }
    
    lvl = item["target_level"]
    if lvl == 500:
        level_500.append(new_item)
    elif lvl == 700:
        level_700.append(new_item)
    elif lvl == 900:
        level_900.append(new_item)

os.makedirs(dest_dir, exist_ok=True)

with open(os.path.join(dest_dir, "toeic_reading_part7_level500.json"), "w", encoding="utf-8") as f:
    json.dump(level_500, f, ensure_ascii=False, indent=2)

with open(os.path.join(dest_dir, "toeic_reading_part7_level700.json"), "w", encoding="utf-8") as f:
    json.dump(level_700, f, ensure_ascii=False, indent=2)

with open(os.path.join(dest_dir, "toeic_reading_part7_level900.json"), "w", encoding="utf-8") as f:
    json.dump(level_900, f, ensure_ascii=False, indent=2)

print(f"Successfully split and saved. 500: {len(level_500)}, 700: {len(level_700)}, 900: {len(level_900)}")
