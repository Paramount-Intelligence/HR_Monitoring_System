import sqlite3
conn = sqlite3.connect('workforce_intelligence.db')
cur = conn.cursor()

# Schema of approvals table
cur.execute("PRAGMA table_info(approvals)")
cols = cur.fetchall()
print("=== approvals table schema ===")
for c in cols:
    print(f"  {c[1]:<25} {c[2]}")

print()

# Sample rows
cur.execute("SELECT * FROM approvals LIMIT 5")
rows = cur.fetchall()
print(f"=== approvals sample ({len(rows)} rows shown) ===")
for r in rows:
    print(" ", r)

print()

# Schema of approval_steps too
cur.execute("PRAGMA table_info(approval_steps)")
cols2 = cur.fetchall()
print("=== approval_steps table schema ===")
for c in cols2:
    print(f"  {c[1]:<25} {c[2]}")

conn.close()
