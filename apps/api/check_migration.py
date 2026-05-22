from sqlalchemy import inspect, create_engine
import sys
sys.path.insert(0, '.')
from app.core.config import settings
engine = create_engine(settings.database_url)
insp = inspect(engine)
cols = [c['name'] for c in insp.get_columns('conversations')]
print('CONVERSATIONS COLUMNS:', cols)
needed = ['who_can_send_messages', 'who_can_edit_group_info', 'who_can_add_members']
for col in needed:
    status = 'OK' if col in cols else 'MISSING'
    print(f'  {col}: {status}')
