import fs from 'fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node flatten-product-form.mjs <path>');
  process.exit(1);
}

let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  /\{\/\* Panel Body with Side Navigation \*\/\}[\s\S]*?\{\/\* Right Content Area \*\/\}\s*<div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">/,
  '<div className="flex-1 overflow-y-auto bg-[#F8F9FB] px-8 py-6">\n                    <div className="max-w-[920px] mx-auto space-y-8">',
);

c = c.replace(/\{activeTab === '[^']+' && \(\s*/g, '');
c = c.replace(/(\n\s*<\/div>)\s*\n\s*\)\}/g, '$1');

// Ensure max-w wrapper closes before panel footer
if (!c.includes('max-w-[920px] mx-auto space-y-8')) {
  console.error('Wrapper not applied');
  process.exit(1);
}

const footerMarker = '{/* Panel Footer */}';
const idx = c.indexOf(footerMarker);
if (idx === -1) {
  console.error('Footer not found');
  process.exit(1);
}

const beforeFooter = c.slice(0, idx);
const afterFooter = c.slice(idx);

if (!beforeFooter.includes('max-w-[920px]')) {
  process.exit(1);
}

// Count div balance near end - insert closing div if only one closes before footer
const panelBodyEnd = beforeFooter.lastIndexOf('</div>');
const snippet = beforeFooter.slice(panelBodyEnd - 200, panelBodyEnd + 50);
if (!snippet.includes('max-w-[920px]')) {
  // insert extra closing div
  c = c.replace(
    /(\n\s*<\/>\s*\)\}\s*\n\s*<\/div>\s*\n\s*<\/div>\s*\n\s*\{\/\* Panel Footer \*\/\})/,
    '\n                            </>\n                        )}\n                    </div>\n                </div>\n\n                {/* Panel Footer */}',
  );
}

fs.writeFileSync(file, c);
console.log('Flattened', file);
