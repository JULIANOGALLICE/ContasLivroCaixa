fetch('http://127.0.0.1:3000/api/bills', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    "id": "787bb7b6-1eb9-408a-b9c1-ebbc64b91cc9",
    "title": "Conta de Luz",
    "amount": 150.5,
    "dueDate": "2026-07-25",
    "recurrence": "none",
    "isMutableAmount": false,
    "addToCashBook": false,
    "pdfPassword": null,
    "isPaid": false,
    "parentId": null,
    "pdfData": undefined,
    "pdfName": undefined,
    "invoicePdfData": undefined,
    "invoicePdfName": undefined,
    "receiptPdfData": undefined,
    "receiptPdfName": undefined
  })
}).then(res => res.text().then(text => console.log(res.status, text))).catch(console.error);
