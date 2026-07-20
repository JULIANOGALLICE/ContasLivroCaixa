const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
`  const handleSaveMultipleCashBookEntries = async (entries: CashBookEntry[]) => {
    // Check for sealed months`,
`  const handleSaveMultipleCashBookEntries = async (entries: CashBookEntry[]) => {
    try {
    // Check for sealed months`
);

code = code.replace(
`    await db.addCashBookEntries(entries);
    await loadData();
    setIsDailyEntriesFormOpen(false);
  };`,
`    await db.addCashBookEntries(entries);
    await loadData();
    setIsDailyEntriesFormOpen(false);
    } catch (e: any) { alert("Erro ao salvar: " + e.message); }
  };`
);

fs.writeFileSync('src/App.tsx', code);
