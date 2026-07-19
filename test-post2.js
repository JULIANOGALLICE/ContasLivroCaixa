fetch('http://127.0.0.1:3000/api/bills', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'test-fetch',
    title: 'Test Fetch',
    amount: 100,
    dueDate: '2026-07-20',
    recurrence: 'none'
  })
}).then(res => res.text()).then(console.log).catch(console.error);
