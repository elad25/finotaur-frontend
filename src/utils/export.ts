export function downloadCSV(rows: any[][], filename: string) {
  const csv = rows.map(r => r.map(cell => {
    if (cell == null) return '';
    const s = String(cell).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  }).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printElementAsPDF(elementId: string) {
  const el = document.getElementById(elementId);
  if (!el) return window.print();
  const win = window.open('', 'printWindow');
  if (!win) return;
  win.document.write(`<html><head><title>Financials</title>
    <style>
      body{background:#000;color:#eee;font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}
      table{width:100%;border-collapse:collapse;font-size:12px;}
      th,td{border:1px solid #333;padding:6px;}
      thead th{position:sticky;top:0;background:#111;}
    </style></head><body>${el.outerHTML}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
  win.close();
}
