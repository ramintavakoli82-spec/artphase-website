import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const paths = {
  article: join(root, 'src/content/engineering-notes/one-motor-fault-another-at-risk.mdx'),
  video: join(root, 'public/images/engineering-notes/one-motor-fault-another-at-risk.mp4'),
  poster: join(root, 'public/images/engineering-notes/one-motor-fault-another-at-risk.webp'),
  social: join(root, 'public/images/engineering-notes/one-motor-fault-another-at-risk-social.png'),
  page: join(root, 'dist/engineering-notes/one-motor-fault-another-at-risk/index.html'),
  listing: join(root, 'dist/engineering-notes/index.html'),
  sitemap: join(root, 'dist/sitemap-0.xml'),
  rss: join(root, 'dist/rss.xml'),
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const [article, video, poster, social, page, listing, sitemap, rss, videoStats] = await Promise.all([
  readFile(paths.article, 'utf8'),
  readFile(paths.video),
  readFile(paths.poster),
  readFile(paths.social),
  readFile(paths.page, 'utf8'),
  readFile(paths.listing, 'utf8'),
  readFile(paths.sitemap, 'utf8'),
  readFile(paths.rss, 'utf8'),
  stat(paths.video),
]);

const sha256 = createHash('sha256').update(video).digest('hex').toUpperCase();
assert(sha256 === '94A975AA210AA0AE28BBFCB96945896B8DCA839FF4C16B6CF08FD51F116B3323', 'Approved MP4 hash mismatch');
assert(videoStats.size === 857946, `Unexpected MP4 size: ${videoStats.size}`);
assert(video.subarray(4, 8).toString('ascii') === 'ftyp', 'Video is not an ISO base media file');
assert(video.includes(Buffer.from('avc1')), 'MP4 does not advertise an H.264/AVC video sample entry');
assert(poster.subarray(0, 4).toString('ascii') === 'RIFF' && poster.subarray(8, 12).toString('ascii') === 'WEBP', 'Poster is not a WebP image');
assert(social.subarray(1, 4).toString('ascii') === 'PNG', 'Social preview is not a PNG image');

const requiredArticleSnippets = [
  'noteNumber: 21',
  'publicationDate: 2026-11-28',
  'category: MCC & Control Panels',
  'coverDisplay: false',
  'duration: PT14S',
  'one-motor-fault-another-at-risk.mp4',
  '480 V',
  '277.13',
  '73.2',
  '0.157',
  'Equipment bonding',
  'failure will occur, or when it might occur',
  '/engineering-notes/the-hidden-sccr-trap/',
];
for (const snippet of requiredArticleSnippets) {
  assert(article.includes(snippet), `Article is missing required text: ${snippet}`);
}

const requiredReferences = [
  'eaton.com/content/dam/eaton/products/design-guides---consultant-audience',
  'benderinc.com/know-how/technology/ungrounded-system/ungrounded-systems-as-reflected-in-the-standards/',
  'electrical-installation.org/enwiki/IT_system_-_Practical_aspects',
  'benderinc.com/know-how/technology/ungrounded-system/ground-fault-monitoring/',
  'benderinc.com/know-how/technology/ungrounded-system/ground-fault-location/',
];
for (const reference of requiredReferences) {
  assert(article.includes(reference), `Article is missing reference: ${reference}`);
}

const slug = 'one-motor-fault-another-at-risk';
for (const [name, content] of Object.entries({ listing, sitemap, rss })) {
  assert(content.includes(slug), `${name} does not include Engineering Note #21`);
}

const requiredGeneratedSnippets = [
  '<title>One Motor Fault. Another at Risk? | ARTPHASE</title>',
  `https://artphase.ca/engineering-notes/${slug}/`,
  'property="og:site_name" content="ARTPHASE"',
  'property="og:title" content="One Motor Fault. Another at Risk?"',
  'property="og:type" content="article"',
  'one-motor-fault-another-at-risk-social.png',
  '"@type":"TechArticle"',
  '"@type":"VideoObject"',
  '"duration":"PT14S"',
  'data-engineering-video',
  'prefers-reduced-motion: reduce',
  'note21-animation-caption',
];
for (const snippet of requiredGeneratedSnippets) {
  assert(page.includes(snippet), `Generated page is missing: ${snippet}`);
}

console.log(`Verified Engineering Note #21: approved MP4 ${sha256.slice(0, 12)}…, ${videoStats.size} bytes; poster, social image, article metadata, ${requiredReferences.length} references, listing, sitemap, RSS, TechArticle and VideoObject are present.`);
