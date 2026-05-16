import sqlite3
conn = sqlite3.connect('workforce_intelligence.db')
cursor = conn.cursor()
cursor.execute("UPDATE projects SET project_status='active' WHERE approval_status='approved'")
conn.commit()
print(f"Updated {cursor.rowcount} projects")
conn.close()
