export function createHandler(deliver) {
  const seen = new Set();
  return async function handle(event) {
    if (seen.has(event.id)) return;
    await deliver(event);
    seen.add(event.id);
  };
}
