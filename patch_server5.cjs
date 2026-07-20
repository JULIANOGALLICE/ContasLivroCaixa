const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
`app.post('/api/fixed-items', (req, res) => {
  const { id, name = '', unitPrice = 0, esp = '' } = req.body;
  const stmt = db.prepare('INSERT INTO fixedItems (id, name, unitPrice, esp) VALUES (?, ?, ?, ?)');
  stmt.run(id, name, unitPrice, esp);
  res.json({ success: true });
});`,
`app.post('/api/fixed-items', (req, res) => {
  try {
    const { id, name = '', unitPrice = 0, esp = '' } = req.body;
    const stmt = db.prepare('INSERT INTO fixedItems (id, name, unitPrice, esp) VALUES (?, ?, ?, ?)');
    stmt.run(id, name, unitPrice, esp);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});`
);

code = code.replace(
`app.post('/api/fixed-items/bulk', (req, res) => {
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
});`,
`app.post('/api/fixed-items/bulk', (req, res) => {
  try {
    const items = req.body || [];
    const deleteStmt = db.prepare('DELETE FROM fixedItems');
    const insertStmt = db.prepare('INSERT INTO fixedItems (id, name, unitPrice, esp) VALUES (?, ?, ?, ?)');
    
    const transaction = db.transaction((items: any[]) => {
      deleteStmt.run();
      for (const item of items) {
        const { id, name = '', unitPrice = 0, esp = '' } = item;
        insertStmt.run(id, name, unitPrice, esp);
      }
    });
    
    transaction(items);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});`
);

fs.writeFileSync('server.ts', code);
