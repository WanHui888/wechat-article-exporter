import { getDb } from '~/server/utils/sqlite';

export default defineEventHandler(() => {
  const db = getDb();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
  db.transaction(() => {
    tables.forEach(t => db.prepare(`DELETE FROM "${t.name}"`).run());
  })();
  return { success: true };
});
