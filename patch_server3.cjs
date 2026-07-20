const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
`app.put('/api/bills/:id', (req, res) => {
  const { title = '', amount = 0, dueDate = '', recurrence = 'none', isMutableAmount = false, addToCashBook = false, pdfPassword = null, pdfData = null, pdfName = null, invoicePdfData = null, invoicePdfName = null, receiptPdfData = null, receiptPdfName = null, isPaid = false, parentId = null } = req.body;
  
  const stmt = db.prepare('UPDATE bills SET title = ?, amount = ?, dueDate = ?, recurrence = ?, isMutableAmount = ?, addToCashBook = ?, pdfPassword = ?, pdfData = ?, pdfName = ?, invoicePdfData = ?, invoicePdfName = ?, receiptPdfData = ?, receiptPdfName = ?, isPaid = ?, parentId = ? WHERE id = ?');
  stmt.run(title, amount, dueDate, recurrence, isMutableAmount ? 1 : 0, addToCashBook ? 1 : 0, pdfPassword, pdfData, pdfName, invoicePdfData, invoicePdfName, receiptPdfData, receiptPdfName, isPaid ? 1 : 0, parentId, req.params.id);
  
  res.json({ success: true });
});`,
`app.put('/api/bills/:id', (req, res) => {
  try {
    const { title = '', amount = 0, dueDate = '', recurrence = 'none', isMutableAmount = false, addToCashBook = false, pdfPassword = null, pdfData = null, pdfName = null, invoicePdfData = null, invoicePdfName = null, receiptPdfData = null, receiptPdfName = null, isPaid = false, parentId = null } = req.body;
    
    const stmt = db.prepare('UPDATE bills SET title = ?, amount = ?, dueDate = ?, recurrence = ?, isMutableAmount = ?, addToCashBook = ?, pdfPassword = ?, pdfData = ?, pdfName = ?, invoicePdfData = ?, invoicePdfName = ?, receiptPdfData = ?, receiptPdfName = ?, isPaid = ?, parentId = ? WHERE id = ?');
    stmt.run(title, amount, dueDate, recurrence, isMutableAmount ? 1 : 0, addToCashBook ? 1 : 0, pdfPassword, pdfData, pdfName, invoicePdfData, invoicePdfName, receiptPdfData, receiptPdfName, isPaid ? 1 : 0, parentId, req.params.id);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
});`
);

fs.writeFileSync('server.ts', code);
