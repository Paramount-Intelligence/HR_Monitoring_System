import sqlite3
conn = sqlite3.connect('workforce_intelligence.db')
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = cur.fetchall()
print("Tables in workforce_intelligence.db:")
for t in tables:
    print(" ", t[0])
conn.close()
