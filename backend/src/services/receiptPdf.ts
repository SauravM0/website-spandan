import { config } from '../config';

function escapePdfText(value: unknown): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, '');
}

function formatMoney(value: unknown): string {
  const amount = Number(value || 0);
  return `Rs. ${amount.toFixed(2)}`;
}

export function buildReceiptPdf(details: Record<string, unknown>): Buffer {
  const lines = [
    config.receiptBrandName,
    'Payment Receipt',
    '',
    `Receipt No: ${details.receipt_number || '-'}`,
    `Transaction: ${details.merchant_transaction_id || '-'}`,
    `Payment Status: ${details.status || '-'}`,
    `Payment Method: ${details.payment_method || details.provider || 'PhonePe'}`,
    `Amount Paid: ${formatMoney(details.amount)}`,
    `Issued At: ${details.issued_at || details.generated_at || new Date().toISOString()}`,
    '',
    `Patient / Purchaser: ${details.patient_name || details.purchaser_name || '-'}`,
    `Phone: ${details.phone || '-'}`,
    `Email: ${details.email || '-'}`,
    details.appointment_number ? `Appointment: ${details.appointment_number}` : '',
    details.appointment_date ? `Date / Time: ${details.appointment_date} ${String(details.start_time || '').slice(0, 5)}` : '',
    details.order_number ? `Package Order: ${details.order_number}` : '',
    details.package_names ? `Package(s): ${details.package_names}` : '',
    '',
    'Clinic: Spandan Super Speciality Clinic, Garkheda, Chhatrapati Sambhajinagar.',
    'Please keep this receipt for clinic records.',
  ].filter(Boolean);

  const content = [
    'BT',
    '/F1 18 Tf',
    '72 760 Td',
    `(${escapePdfText(lines[0])}) Tj`,
    '/F1 11 Tf',
    ...lines.slice(1).flatMap((line) => ['0 -20 Td', `(${escapePdfText(line)}) Tj`]),
    'ET',
  ].join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}
