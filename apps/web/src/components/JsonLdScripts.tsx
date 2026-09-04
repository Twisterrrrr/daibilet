/** Server-only JSON-LD script tags for View Source / crawlers. */
export function JsonLdScripts({
  blocks,
  idPrefix = 'jsonld',
}: {
  blocks: Array<Record<string, unknown>>;
  idPrefix?: string;
}) {
  return (
    <>
      {blocks.map((block, index) => (
        <script
          key={`${idPrefix}-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(block).replace(/</g, '\\u003c'),
          }}
        />
      ))}
    </>
  );
}
