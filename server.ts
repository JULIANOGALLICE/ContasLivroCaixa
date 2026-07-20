import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import multer from "multer";
import fs from "fs";
import cors from "cors";

const app = express();
const PORT = 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize SQLite Database
const db = new Database(path.join(dataDir, 'database.sqlite'));

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    dueDate TEXT NOT NULL,
    recurrence TEXT NOT NULL,
    isMutableAmount INTEGER,
    addToCashBook INTEGER,
    pdfPassword TEXT,
    pdfData TEXT,
    pdfName TEXT,
    invoicePdfData TEXT,
    invoicePdfName TEXT,
    receiptPdfData TEXT,
    receiptPdfName TEXT,
    isPaid INTEGER NOT NULL,
    parentId TEXT
  );

  CREATE TABLE IF NOT EXISTS cashbook (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    inflow REAL NOT NULL,
    outflow REAL NOT NULL,
    esp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS fixedItems (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    unitPrice REAL NOT NULL,
    esp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sealedMonths (
    id TEXT PRIMARY KEY,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    bookNumber TEXT,
    pageCount INTEGER,
    pdfPath TEXT
  );
`);

// Insert default fixed items if table is empty
const fixedItemsCount = db.prepare('SELECT COUNT(*) as count FROM fixedItems').get() as { count: number };
if (fixedItemsCount.count === 0) {
  const insertFixed = db.prepare('INSERT INTO fixedItems (id, name, unitPrice, esp) VALUES (?, ?, ?, ?)');
  insertFixed.run(crypto.randomUUID(), 'Autenticações', 5.50, 'TAB');
  insertFixed.run(crypto.randomUUID(), 'Reconhecimento de Firma', 10.00, 'TAB');
}

// Setup multer for PDF uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + '.pdf')
  }
});
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes

// Bills
app.get('/api/bills', (req, res) => {
  const bills = db.prepare('SELECT * FROM bills').all() as any[];
  const mapped = bills.map(b => ({
    ...b,
    isMutableAmount: b.isMutableAmount === 1,
    addToCashBook: b.addToCashBook === 1,
    isPaid: b.isPaid === 1
  }));
  res.json(mapped);
});

// Helper to save base64 to file
function processPdfData(dataStr: string | null, id: string, type: string): string | null {
  if (!dataStr) return null;
  if (!dataStr.startsWith('data:')) {
    // It's already a filename
    return dataStr;
  }
  
  try {
    const base64Data = dataStr.replace(/^data:application\/pdf;base64,/, "");
    const filename = `${type}-${id}-${Date.now()}.pdf`;
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, base64Data, 'base64');
    return filename;
  } catch (err) {
    console.error(`Error saving ${type} PDF:`, err);
    return null;
  }
}

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ filename: req.file.filename });
});

app.post('/api/bills', (req, res) => {
  const { id, title = '', amount = 0, dueDate = '', recurrence = 'none', isMutableAmount = false, addToCashBook = false, pdfPassword = null, pdfData = null, pdfName = null, invoicePdfData = null, invoicePdfName = null, receiptPdfData = null, receiptPdfName = null, isPaid = false, parentId = null } = req.body;
  
  const savedPdfData = processPdfData(pdfData, id, 'boleto');
  const savedInvoicePdfData = processPdfData(invoicePdfData, id, 'invoice');
  const savedReceiptPdfData = processPdfData(receiptPdfData, id, 'receipt');

  const stmt = db.prepare('INSERT INTO bills (id, title, amount, dueDate, recurrence, isMutableAmount, addToCashBook, pdfPassword, pdfData, pdfName, invoicePdfData, invoicePdfName, receiptPdfData, receiptPdfName, isPaid, parentId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  stmt.run(id, title, amount, dueDate, recurrence, isMutableAmount ? 1 : 0, addToCashBook ? 1 : 0, pdfPassword, savedPdfData, pdfName, savedInvoicePdfData, invoicePdfName, savedReceiptPdfData, receiptPdfName, isPaid ? 1 : 0, parentId);
  res.json({ success: true });
});

app.put('/api/bills/:id', (req, res) => {
  const { title = '', amount = 0, dueDate = '', recurrence = 'none', isMutableAmount = false, addToCashBook = false, pdfPassword = null, pdfData = null, pdfName = null, invoicePdfData = null, invoicePdfName = null, receiptPdfData = null, receiptPdfName = null, isPaid = false, parentId = null } = req.body;
  
  const savedPdfData = processPdfData(pdfData, req.params.id, 'boleto');
  const savedInvoicePdfData = processPdfData(invoicePdfData, req.params.id, 'invoice');
  const savedReceiptPdfData = processPdfData(receiptPdfData, req.params.id, 'receipt');

  const stmt = db.prepare('UPDATE bills SET title = ?, amount = ?, dueDate = ?, recurrence = ?, isMutableAmount = ?, addToCashBook = ?, pdfPassword = ?, pdfData = ?, pdfName = ?, invoicePdfData = ?, invoicePdfName = ?, receiptPdfData = ?, receiptPdfName = ?, isPaid = ?, parentId = ? WHERE id = ?');
  stmt.run(title, amount, dueDate, recurrence, isMutableAmount ? 1 : 0, addToCashBook ? 1 : 0, pdfPassword, savedPdfData, pdfName, savedInvoicePdfData, invoicePdfName, savedReceiptPdfData, receiptPdfName, isPaid ? 1 : 0, parentId, req.params.id);
  res.json({ success: true });
});

app.delete('/api/bills/:id', (req, res) => {
  const existing = db.prepare('SELECT pdfData, invoicePdfData, receiptPdfData FROM bills WHERE id = ?').get(req.params.id) as any;
  if (existing) {
    [existing.pdfData, existing.invoicePdfData, existing.receiptPdfData].forEach(filename => {
      if (filename && !filename.startsWith('data:')) {
        const fullPath = path.join(uploadsDir, filename);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
    });
  }

  const stmt = db.prepare('DELETE FROM bills WHERE id = ?');
  stmt.run(req.params.id);
  res.json({ success: true });
});

// CashBook
app.get('/api/cashbook', (req, res) => {
  const entries = db.prepare('SELECT * FROM cashbook').all();
  res.json(entries);
});

app.post('/api/cashbook', (req, res) => {
  const { id, date = '', description = '', inflow = 0, outflow = 0, esp = '' } = req.body;
  const stmt = db.prepare('INSERT INTO cashbook (id, date, description, inflow, outflow, esp) VALUES (?, ?, ?, ?, ?, ?)');
  stmt.run(id, date, description, inflow, outflow, esp);
  res.json({ success: true });
});

app.post('/api/cashbook/bulk', (req, res) => {
  const entries = req.body || [];
  const insertStmt = db.prepare('INSERT INTO cashbook (id, date, description, inflow, outflow, esp) VALUES (?, ?, ?, ?, ?, ?)');
  
  const transaction = db.transaction((entries) => {
    for (const entry of entries) {
      const { id, date = '', description = '', inflow = 0, outflow = 0, esp = '' } = entry;
      insertStmt.run(id, date, description, inflow, outflow, esp);
    }
  });
  
  transaction(entries);
  res.json({ success: true });
});

app.put('/api/cashbook/:id', (req, res) => {
  const { date = '', description = '', inflow = 0, outflow = 0, esp = '' } = req.body;
  const stmt = db.prepare('UPDATE cashbook SET date = ?, description = ?, inflow = ?, outflow = ?, esp = ? WHERE id = ?');
  stmt.run(date, description, inflow, outflow, esp, req.params.id);
  res.json({ success: true });
});

app.delete('/api/cashbook/:id', (req, res) => {
  const stmt = db.prepare('DELETE FROM cashbook WHERE id = ?');
  stmt.run(req.params.id);
  res.json({ success: true });
});

// Fixed Items
app.get('/api/fixed-items', (req, res) => {
  const items = db.prepare('SELECT * FROM fixedItems').all();
  res.json(items);
});

app.post('/api/fixed-items', (req, res) => {
  const { id, name = '', unitPrice = 0, esp = '' } = req.body;
  const stmt = db.prepare('INSERT INTO fixedItems (id, name, unitPrice, esp) VALUES (?, ?, ?, ?)');
  stmt.run(id, name, unitPrice, esp);
  res.json({ success: true });
});

app.post('/api/fixed-items/bulk', (req, res) => {
  const items = req.body || [];
  const deleteStmt = db.prepare('DELETE FROM fixedItems');
  const insertStmt = db.prepare('INSERT INTO fixedItems (id, name, unitPrice, esp) VALUES (?, ?, ?, ?)');
  
  const transaction = db.transaction((items) => {
    deleteStmt.run();
    for (const item of items) {
      const { id, name = '', unitPrice = 0, esp = '' } = item;
      insertStmt.run(id, name, unitPrice, esp);
    }
  });
  
  transaction(items);
  res.json({ success: true });
});

// Sealed Months
app.get('/api/sealed-months', (req, res) => {
  const months = db.prepare('SELECT * FROM sealedMonths').all();
  res.json(months);
});

// For upload we accept multipart form data, the PDF file, and month/year info
app.post('/api/sealed-months/seal', upload.single('pdf'), (req, res) => {
  const { month, year, bookNumber, pageCount } = req.body;
  const pdfPath = req.file ? req.file.filename : null;
  
  const existing = db.prepare('SELECT * FROM sealedMonths WHERE month = ? AND year = ?').get(month, year);
  if (!existing) {
    const stmt = db.prepare('INSERT INTO sealedMonths (id, month, year, bookNumber, pageCount, pdfPath) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(crypto.randomUUID(), month, year, bookNumber, pageCount, pdfPath);
  }
  res.json({ success: true, pdfPath });
});

app.post('/api/sealed-months/unseal', (req, res) => {
  const { month, year } = req.body;
  
  // optionally delete the file from disk if you want
  const existing = db.prepare('SELECT * FROM sealedMonths WHERE month = ? AND year = ?').get(month, year) as any;
  if (existing && existing.pdfPath) {
    const fullPath = path.join(uploadsDir, existing.pdfPath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  const stmt = db.prepare('DELETE FROM sealedMonths WHERE month = ? AND year = ?');
  stmt.run(month, year);
  res.json({ success: true });
});

// Serve uploaded PDFs
app.use('/api/uploads', express.static(uploadsDir));

// Vite Middleware for development / Static files for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
