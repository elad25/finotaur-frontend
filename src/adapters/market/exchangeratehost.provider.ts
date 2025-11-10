export async function getRates(base: string) {
  // Placeholder – hard-coded few rates
  return {
    base,
    rates: { EUR: 0.92, ILS: 3.75, JPY: 150.1 },
    ts: Date.now(),
  };
}
