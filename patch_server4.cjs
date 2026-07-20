const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
`app.post('/api/bills', (req, res) => {
  const { id, title = '', amount = 0, dueDate = '', recurrence = 'none', isMutableAmount = false, addToCashBook = false, pdfPassword = null, pdfData = null, pdfName = null, invoicePdfData = null, invoicePdfName = null, receiptPdfData = null, receiptPdfName = null, isPaid = false, parentId = null } = req.body;
  
  const stmt = db.prepare('INSERT INTO bills (id, title, amount, dueDate, recurrence, isMutableAmount, addToCashBook, pdfPassword, pdfData, pdfName, invoicePdfData, invoicePdfName, receiptPdfData, receiptPdfName, isPaid, parentId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  stmt.run(id, title, amount, dueDate, recurrence, isMutableAmount ? 1 : 0, addToCashBook ? 1 : 0, pdfPassword, pdfData, pdfName, invoicePdfData, invoicePdfName, receiptPdfData, receiptPdfName, isPaid ? 1 : 0, parentId);
  
  res.json({ success: true });
});`,
`app.post('/api/bills', (req, res) => {
  try {
    const { id, title = '', amount = 0, dueDate = '', recurrence = 'none', isMutableAmount = false, addToCashBook = false, pdfPassword = null, pdfData = null, pdfName = null, invoicePdfData = null, invoicePdfName = null, receiptPdfData = null, receiptPdfName = null, isPaid = false, parentId = null } = req.body;
    
    const stmt = db.prepare('INSERT INTO bills (id, title, amount, dueDate, recurrence, isMutableAmount, addToCashBook, pdfPassword, pdfData, pdfName, invoicePdfData, invoicePdfName, receiptPdfData, receiptPdfName, isPaid, parentId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, title, amount, dueDate, recurrence, isMutableAmount ? 1 : 0, addToCashBook ? 1 : 0, pdfPassword, pdfData, pdfName, invoicePdfData, invoicePdfName, receiptPdfData, receiptPdfName, isPaid ? 1 : 0, parentId);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
});`
);

fs.writeFileSync('server.ts', code);
