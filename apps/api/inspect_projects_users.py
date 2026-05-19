import sqlite3

def main():
    conn = sqlite3.connect('workforce_intelligence.db')
    cur = conn.cursor()
    
    print("--- PROJECTS ---")
    cur.execute("SELECT id, title, project_status FROM projects")
    for row in cur.fetchall():
        print(f"ID: {row[0]} | Title: {row[1]} | Status: {row[2]}")
        
    print("\n--- USERS ---")
    cur.execute("SELECT id, full_name, role, status FROM users")
    for row in cur.fetchall():
        print(f"ID: {row[0]} | Name: {row[1]} | Role: {row[2]} | Status: {row[3]}")
        
    conn.close()

if __name__ == '__main__':
    main()
