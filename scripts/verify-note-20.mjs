import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const articlePath = join(root, 'src/content/engineering-notes/the-hidden-sccr-trap.mdx');
const gifPath = join(root, 'public/images/engineering-notes/the-hidden-sccr-trap.gif');
const posterPath = join(root, 'public/images/engineering-notes/the-hidden-sccr-trap-poster.png');

const [article, gif, poster] = await Promise.all([
  readFile(articlePath, 'utf8'),
  readFile(gifPath),
  readFile(posterPath),
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const sha256 = createHash('sha256').update(gif).digest('hex').toUpperCase();
assert(sha256 === 'A017B84244E56381A341FEE9AC031F364C035D73372D1CAA2F9DBD91078CE7FA', 'Approved GIF hash mismatch');
assert(gif.subarray(0, 6).toString('ascii').startsWith('GIF8'), 'Hero asset is not a GIF');
assert(gif.readUInt16LE(6) === 1080 && gif.readUInt16LE(8) === 1350, 'GIF dimensions must remain 1080×1350');

let frameCount = 0;
for (let index = 0; index < gif.length - 2; index += 1) {
  if (gif[index] === 0x21 && gif[index + 1] === 0xf9 && gif[index + 2] === 0x04) frameCount += 1;
}
assert(frameCount === 40, `Expected 40 GIF frames, found ${frameCount}`);
assert(poster.subarray(1, 4).toString('ascii') === 'PNG', 'Reduced-motion poster is not a PNG');

const requiredSnippets = [
  'noteNumber: 20',
  'seoTitle: The Hidden SCCR Trap | Reactors vs Passive Filters',
  'category: MCC & Control Panels',
  'coverDisplay: false',
  '/engineering-notes/available-fault-current-vs-sccr/',
  'do not automatically establish an SCCR exception for the complete harmonic filter',
  'The full controlled CSA text was not publicly available',
  'A high-interrupting-capacity fuse or breaker alone does not establish the final panel SCCR',
];
for (const snippet of requiredSnippets) {
  assert(article.includes(snippet), `Article is missing required text: ${snippet}`);
}

const requiredReferences = [
  'shopulstandards.com/ProductDetail.aspx?productId=UL508a',
  'store.csastandards.org/store/electrical/',
  'UL-508A-3rd-edition-and-how-it-ralates-to-MTE-Product-SCCR-Ratings-App-Note-rev.1.pdf',
  'MV1-TRM-E-Rev-02-1.pdf',
  'hammondpowersolutions.com/resources/faq/reactors/',
  'ul.com/resources/determining-short-circuit-current-rating-sccr-machinery',
  'eaton.com/us/en-us/products/controls-drives-automation-sensors/ul508a.html',
  'siemens.com/en-us/industries/industrial-machinery/control-panels/short-circuit-calculation/',
  'productinfo.se.com/8536db0901_motorcontrolsolutions_db/',
];
for (const reference of requiredReferences) {
  assert(article.includes(reference), `Article is missing reference: ${reference}`);
}

console.log(`Verified Engineering Note #20: approved GIF ${sha256.slice(0, 12)}…, ${frameCount} frames, 1080×1350, poster present, article metadata and ${requiredReferences.length} references present.`);
