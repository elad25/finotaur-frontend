
export function buildFilingUrl(cik: string, accessionNumber: string, primaryDocument: string) {
  const cikNoZeros = String(cik).replace(/^0+/, '') || '0';
  const accNoDashes = String(accessionNumber).replace(/-/g, '');
  return `https://www.sec.gov/Archives/edgar/data/${cikNoZeros}/${accNoDashes}/${primaryDocument}`;
}
