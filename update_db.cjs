const fs = require('fs');
let code = fs.readFileSync('src/db.ts', 'utf-8');

// We want to add a helper function `async function fetchApi(url, options)` which checks response
const helper = `
async function fetchApi(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(\`Erro na API (\${res.status}): \${text}\`);
  }
  return res;
}
`;

code = code.replace("const API_BASE = '/api';", "const API_BASE = '/api';\n" + helper);
code = code.replaceAll("await fetch(", "await fetchApi(");
fs.writeFileSync('src/db.ts', code);
