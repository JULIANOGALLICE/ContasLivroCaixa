const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const methodRegex = /app\.(get|post|put|delete)\('(\/api\/[^']+)',\s*(upload\.single\('[^']+'\),\s*)?\(req, res\) => {/g;

// Instead of regex, let's just use sed or manually replace
