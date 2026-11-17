import fs from 'node:fs';
import path from 'node:path';

const [sourcePath, rewritePath, auditPath] = process.argv.slice(2);
if (!sourcePath || !rewritePath || !auditPath) {
  throw new Error('Usage: node audit-eventpage-rewrite-batch.mjs <source-archive.json> <rewrites.md> <audit.json>');
}

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8').replace(/^\uFEFF/, ''));
const markdown = fs.readFileSync(rewritePath, 'utf8').replace(/^\uFEFF/, '');
const headers = [...markdown.matchAll(/^## (\d+)\. ([^\r\n]+)\r?\n/gm)];
const entries = headers.map((header, index) => {
  const bodyStart = header.index + header[0].length;
  const bodyEnd = headers[index + 1]?.index ?? markdown.length;
  return [header[0], header[1], header[2], markdown.slice(bodyStart, bodyEnd)];
});

function plainText(value) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalize(value) {
  return plainText(value).toLocaleLowerCase('ru-RU').replace(/[ё]/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

const report = entries.map((match, index) => {
  const number = Number(match[1]);
  if (number !== index + 1) throw new Error(`Unexpected entry numbering at ${number}`);
  const page = source.pages[number - 1];
  if (!page) throw new Error(`Missing source page for entry ${number}`);
  const body = match[3];
  const sections = body.split(/^### Практическая информация\s*$/m);
  if (sections.length !== 2) throw new Error(`Entry ${number} must have exactly one practical information section`);
  const main = sections[0];
  const practical = sections[1];
  const paragraphs = main.split(/\r?\n\s*\r?\n/).map(plainText).filter((s) => s.length > 60 && !/^\d+[.)]?$/.test(s));
  const mainLength = plainText(main).length;
  const originalLength = Math.max(...page.events.map((event) => plainText(event.description ?? '').length));
  const activeSlots = page.events.flatMap((event) => event.sessions ?? []).filter((session) => session.isActive && !session.cancelledAt && !session.archivedAt).length;
  const activeOffers = page.events.flatMap((event) => event.offers ?? []).filter((offer) => offer.active).length;
  const bodyText = normalize(main);
  return {
    position: number,
    pageId: page.id,
    slug: page.slug,
    title: page.title,
    eventIds: [...new Set(page.events.map((event) => event.eventId))],
    originalChars: originalLength,
    rewriteChars: mainLength,
    substantiveParagraphs: paragraphs.length,
    practicalInfoPresent: plainText(practical).length > 0,
    futureSaleableSlotsAtCapture: page.future_saleable_slots,
    activeOffersAtCapture: activeOffers,
    lengthPass: mainLength >= originalLength,
    paragraphPass: paragraphs.length >= 2,
    exactDuplicateMain: false,
    editorialStatus: 'PREPARED_NOT_APPLIED',
    _normalizedMain: bodyText,
  };
});

for (let i = 0; i < report.length; i += 1) {
  for (let j = 0; j < i; j += 1) {
    if (report[i]._normalizedMain && report[i]._normalizedMain === report[j]._normalizedMain) {
      report[i].exactDuplicateMain = true;
      report[j].exactDuplicateMain = true;
    }
  }
}

const allIds = report.flatMap((item) => item.eventIds);
const repeatedIds = [...new Set(allIds.filter((id, index) => allIds.indexOf(id) !== index))];
const audit = {
  generatedAt: new Date().toISOString(),
  sourceArchive: path.resolve(sourcePath),
  rewriteFile: path.resolve(rewritePath),
  textRuChecked: false,
  internalChecksOnly: true,
  entryCount: report.length,
  uniqueEventPageIds: new Set(report.map((item) => item.pageId)).size,
  uniqueEventIds: new Set(allIds).size,
  repeatedEventIds: repeatedIds,
  allPass: report.length === 30 && report.every((item) => item.lengthPass && item.paragraphPass && item.practicalInfoPresent && !item.exactDuplicateMain) && repeatedIds.length === 0,
  entries: report.map(({ _normalizedMain, ...item }) => item),
};

fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  entryCount: audit.entryCount,
  uniqueEventPageIds: audit.uniqueEventPageIds,
  uniqueEventIds: audit.uniqueEventIds,
  repeatedEventIds: audit.repeatedEventIds.length,
  lengthFails: audit.entries.filter((item) => !item.lengthPass).map((item) => item.position),
  paragraphFails: audit.entries.filter((item) => !item.paragraphPass).map((item) => item.position),
  practicalInfoFails: audit.entries.filter((item) => !item.practicalInfoPresent).map((item) => item.position),
  allPass: audit.allPass,
}, null, 2));
