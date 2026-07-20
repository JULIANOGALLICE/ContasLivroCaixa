const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
`app.post('/api/cashbook', (req, res) => {
  const { id, date = '', description = '', inflow = 0, outflow = 0, esp = '' } = req.body;
  const stmt = db.prepare('INSERT INTO cashbook (id, date, description, inflow, outflow, esp) VALUES (?, ?, ?, ?, ?, ?)');
  stmt.run(id, date, description, inflow, outflow, esp);
  res.json({ success: true });
});`,
`app.post('/api/cashbook', (req, res) => {
  try {
    const { id, date = '', description = '', inflow = 0, outflow = 0, esp = '' } = req.body;
    const stmt = db.prepare('INSERT INTO cashbook (id, date, description, inflow, outflow, esp) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(id, date, description, inflow, outflow, esp);
    res.json({ success: true });
  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
});`
);

code = code.replace(
`app.post('/api/cashbook/bulk', (req, res) => {
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
});`,
`app.post('/api/cashbook/bulk', (req, res) => {
  try {
    const entries = req.body || [];
    const insertStmt = db.prepare('INSERT INTO cashbook (id, date, description, inflow, outflow, esp) VALUES (?, ?, ?, ?, ?, ?)');
    
    const transaction = db.transaction((entries: any[]) => {
      for (const entry of entries) {
        const { id, date = '', description = '', inflow = 0, outflow = 0, esp = '' } = entry;
        insertStmt.run(id, date, description, inflow, outflow, esp);
      }
    });
    
    transaction(entries);
    res.json({ success: true });
  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
});`
);

fs.writeFileSync('server.ts', code);
