import { config } from '../config';

export interface WhatsAppEnquiryNotification {
  enquiryId: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string | null;
  packageName?: string | null;
  doctorName?: string | null;
  message?: string | null;
  preferredDate?: string | null;
  preferredTimeWindow?: string | null;
  createdAt?: string | Date | null;
}

function buildMessage(data: WhatsAppEnquiryNotification): string {
  const lines = [
    'New Spandan Clinic enquiry',
    `Ref: ${data.enquiryId}`,
    `Patient: ${data.patientName}`,
    `Phone: ${data.patientPhone}`,
  ];

  if (data.patientEmail) lines.push(`Email: ${data.patientEmail}`);
  if (data.packageName) lines.push(`Package: ${data.packageName}`);
  if (data.doctorName) lines.push(`Doctor: ${data.doctorName}`);
  if (data.preferredDate) lines.push(`Preferred date: ${data.preferredDate}`);
  if (data.preferredTimeWindow) lines.push(`Preferred time: ${data.preferredTimeWindow}`);
  if (data.message) lines.push(`Message: ${data.message}`);

  lines.push(`${config.corsOrigin}/admin/leads/${data.enquiryId}`);
  return lines.join('\n');
}

function withTimeout(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms).unref();
  return controller.signal;
}

async function postJson(url: string, body: unknown, token?: string): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal: withTimeout(config.whatsapp.timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`WhatsApp request failed with HTTP ${response.status}: ${await response.text()}`);
  }
}

async function sendWebhook(data: WhatsAppEnquiryNotification, text: string): Promise<void> {
  await postJson(config.whatsapp.webhookUrl, {
    channel: 'whatsapp',
    text,
    enquiry: data,
  }, config.whatsapp.webhookToken);
}

async function sendMeta(text: string): Promise<void> {
  await postJson(config.whatsapp.apiUrl, {
    messaging_product: 'whatsapp',
    to: config.whatsapp.to,
    type: 'text',
    text: {
      preview_url: false,
      body: text,
    },
  }, config.whatsapp.apiToken);
}

async function sendTwilio(text: string): Promise<void> {
  const credentials = Buffer.from(`${config.whatsapp.accountSid}:${config.whatsapp.authToken}`).toString('base64');
  const form = new URLSearchParams({
    To: config.whatsapp.to,
    From: config.whatsapp.from,
    Body: text,
  });

  const response = await fetch(config.whatsapp.apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
    signal: withTimeout(config.whatsapp.timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`WhatsApp request failed with HTTP ${response.status}: ${await response.text()}`);
  }
}

export function isWhatsAppConfigured(): boolean {
  if (!config.whatsapp.enabled) return false;
  if (config.whatsapp.webhookUrl) return true;
  if (config.whatsapp.provider === 'meta') {
    return Boolean(config.whatsapp.apiUrl && config.whatsapp.apiToken && config.whatsapp.to);
  }
  if (config.whatsapp.provider === 'twilio') {
    return Boolean(
      config.whatsapp.apiUrl &&
      config.whatsapp.accountSid &&
      config.whatsapp.authToken &&
      config.whatsapp.from &&
      config.whatsapp.to
    );
  }
  return false;
}

export async function sendWhatsAppEnquiryNotification(data: WhatsAppEnquiryNotification): Promise<void> {
  if (!isWhatsAppConfigured()) {
    console.log('WhatsApp not configured - skipping notification');
    return;
  }

  const text = buildMessage(data);
  if (config.whatsapp.webhookUrl) {
    await sendWebhook(data, text);
    return;
  }
  if (config.whatsapp.provider === 'twilio') {
    await sendTwilio(text);
    return;
  }
  await sendMeta(text);
}
