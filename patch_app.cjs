const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
`  const handleSaveCashBookEntry = async (entry: CashBookEntry) => {
    const entryDate = new Date(entry.date);`,
`  const handleSaveCashBookEntry = async (entry: CashBookEntry) => {
    try {
      const entryDate = new Date(entry.date);`
);

code = code.replace(
`    await loadData();
    setIsCashBookFormOpen(false);
    setEditingCashBookEntry(null);
  };`,
`    await loadData();
    setIsCashBookFormOpen(false);
    setEditingCashBookEntry(null);
    } catch (e: any) { alert("Erro ao salvar: " + e.message); }
  };`
);

fs.writeFileSync('src/App.tsx', code);
