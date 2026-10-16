/**
 * Hidden inputs carrying the workbench queue context (back/next) through
 * server action forms so save redirects return to the same queue position.
 */
export function AdminQueueFields({ back, next }: { back?: string; next?: string }) {
  return (
    <>
      <input type="hidden" name="back" value={back || ''} />
      <input type="hidden" name="next" value={next || ''} />
    </>
  );
}