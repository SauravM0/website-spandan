import nodemailer from 'nodemailer';
import type { SendMailOptions, Transporter } from 'nodemailer';
import { config } from '../config';
import { query } from '../config/database';
import { requireApprovedVendor } from '../security/vendorGate';

function getTransporter() {
  if (!config.smtp.enabled) {
    return null;
  }
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
}

export interface EnquiryNotification {
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  packageName?: string;
  doctorName?: string;
  message?: string;
  enquiryId: string;
  preferredDate?: string;
  preferredTimeWindow?: string;
}

async function sendWithRetry(
  transporter: Transporter,
  mailOptions: SendMailOptions,
  enquiryId: string | null,
  retries = 3,
  backoffMs = 1000
): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await transporter.sendMail(mailOptions);
      console.log(`Notification email sent (attempt ${attempt})`);

      await query(
        `INSERT INTO notification_log (appointment_request_id, channel, status, attempt)
         VALUES ($1, 'email', 'sent', $2)`,
        [enquiryId, attempt]
      ).catch(() => {});

      return true;
    } catch (err) {
      console.error(`Email notification attempt ${attempt}/${retries} failed:`, err);
      await query(
        `INSERT INTO notification_log (appointment_request_id, channel, status, attempt, error_message)
         VALUES ($1, 'email', 'failed', $2, $3)`,
        [enquiryId, attempt, (err as Error).message]
      ).catch(() => {});

      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffMs * attempt));
      }
    }
  }
  return false;
}

export async function sendEnquiryNotification(data: EnquiryNotification): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    console.log('Email not configured — skipping notification');
    return false;
  }
  await requireApprovedVendor('SMTP provider');

  let packageName = data.packageName;
  const doctorName = data.doctorName;

  if (!packageName && data.enquiryId) {
    try {
      const result = await query(
        `SELECT p.name FROM packages p
         INNER JOIN appointment_requests ar ON ar.package_id = p.id
         WHERE ar.id = $1`,
        [data.enquiryId]
      );
      if (result.rows[0]) packageName = result.rows[0].name;
    } catch {}
  }

  const html = `
    <h2>New Appointment Enquiry</h2>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Patient</td><td style="padding:8px;border:1px solid #ddd">${data.patientName}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Phone</td><td style="padding:8px;border:1px solid #ddd">${data.patientPhone}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Email</td><td style="padding:8px;border:1px solid #ddd">${data.patientEmail || '—'}</td></tr>
      ${packageName ? `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Package</td><td style="padding:8px;border:1px solid #ddd">${packageName}</td></tr>` : ''}
      ${data.preferredDate ? `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Preferred Date</td><td style="padding:8px;border:1px solid #ddd">${data.preferredDate}</td></tr>` : ''}
      ${data.preferredTimeWindow ? `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Preferred Time</td><td style="padding:8px;border:1px solid #ddd">${data.preferredTimeWindow}</td></tr>` : ''}
    </table>
    <p><a href="${config.corsOrigin}/admin/leads/${data.enquiryId}" style="display:inline-block;padding:10px 20px;background:#1F3A5F;color:#fff;text-decoration:none;border-radius:4px">View Lead Details</a></p>
  `;

  return sendWithRetry(
    transporter,
    {
      from: `"Spandan Clinic" <${config.smtp.user}>`,
      to: config.notificationEmail,
      subject: `New Enquiry from ${data.patientName}`,
      html,
    },
    data.enquiryId
  );
}
