import re

file_path = r"d:\HR Monitoring System\apps\api\app\api\routes\messages.py"
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

print("=== SEARCHING FOR HTTPEXCEPTIONS IN MESSAGES.PY ===")
for i, line in enumerate(lines):
    if "HTTPException" in line or "status_code" in line:
        # print the line and the next few lines
        snippet = "".join(lines[i:i+6])
        print(f"Line {i+1}:\n{snippet}")
        print("-" * 40)
