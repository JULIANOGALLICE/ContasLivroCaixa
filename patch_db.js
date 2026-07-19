const fs = require('fs');
let code = fs.readFileSync('src/db.ts', 'utf-8');

const helper = `
async function fetchWithCheck(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    alert('Erro na API (' + res.status + '): ' + errText);
    throw new Error('API Error: ' + res.status + ' ' + errText);
  }
  return res;
}
`;

code = code.replace("const API_BASE = '/api';", "const API_BASE = '/api';\n" + helper);
code = code.replace(/await fetch\(/g, "await fetchWithCheck(");

fs.writeFileSync('src/db.ts', code);
