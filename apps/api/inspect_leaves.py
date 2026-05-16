import sqlite3
conn = sqlite3.connect('workforce_intelligence.db')
cur = conn.cursor()

# Check alembic current version
cur.execute("SELECT version_num FROM alembic_version")
rows = cur.fetchall()
print("alembic_version:", rows)

# Check leave_requests schema
cur.execute("PRAGMA table_info(leave_requests)")
cols = cur.fetchall()
print("\n=== leave_requests table schema ===")
for c in cols:
    print(f"  {c[1]:<25} {c[2]}")

# Sample leave_requests
cur.execute("SELECT id, user_id, leave_type, status, is_half_day, half_day_period, start_date, created_at FROM leave_requests ORDER BY created_at DESC LIMIT 20")
rows = cur.fetchall()
print(f"\n=== leave_requests (latest {len(rows)}) ===")
for r in rows:
    print(f"  id={str(r[0])[:8]}... user={str(r[1])[:8]}... type={r[2]:<10} status={r[3]:<12} half={r[4]} period={r[5]} start={r[6]} created={r[7]}")

conn.close()
