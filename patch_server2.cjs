const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
`app.put('/api/cashbook/:id', (req, res) => {
  const { date = '', description = '', inflow = 0, outflow = 0, esp = '' } = req.body;
  const stmt = db.prepare('UPDATE cashbook SET date = ?, description = ?, inflow = ?, outflow = ?, esp = ? WHERE id = ?');
  stmt.run(date, description, inflow, outflow, esp, req.params.id);
  res.json({ success: true });
});`,
`app.put('/api/cashbook/:id', (req, res) => {
  try {
    const { date = '', description = '', inflow = 0, outflow = 0, esp = '' } = req.body;
    const stmt = db.prepare('UPDATE cashbook SET date = ?, description = ?, inflow = ?, outflow = ?, esp = ? WHERE id = ?');
    stmt.run(date, description, inflow, outflow, esp, req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
});`
);

fs.writeFileSync('server.ts', code);
