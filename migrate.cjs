const Database = require('better-sqlite3');
const path = require('path');
const dataDir = path.join(process.cwd(), 'data');
const db = new Database(path.join(dataDir, 'database.sqlite'));

const tableInfo = db.pragma('table_info(bills)');
const columns = tableInfo.map(c => c.name);

if (!columns.includes('invoicePdfData')) {
  db.exec('ALTER TABLE bills ADD COLUMN invoicePdfData TEXT');
  db.exec('ALTER TABLE bills ADD COLUMN invoicePdfName TEXT');
  db.exec('ALTER TABLE bills ADD COLUMN receiptPdfData TEXT');
  db.exec('ALTER TABLE bills ADD COLUMN receiptPdfName TEXT');
  db.exec('ALTER TABLE bills ADD COLUMN isPaid INTEGER NOT NULL DEFAULT 0');
  db.exec('ALTER TABLE bills ADD COLUMN parentId TEXT');
  console.log('Migrated bills table');
} else {
  console.log('Bills table already migrated');
}
