import nodemailer from 'nodemailer';
import { env } from '../config/environment.js';
import { logger } from '../utils/logger.js';

let transporter: nodemailer.Transporter | null = null;

function getEmailTransporter() {
  if (!transporter) {
    const host = env.SMTP_HOST;
    const port = env.SMTP_PORT;
    const user = env.SMTP_USER;
    const pass = env.SMTP_PASS;
    
    if (host && user && pass) {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });
      logger.info('📬 EMAIL SYSTEM: Nodemailer SMTP transporter initialized.');
    } else {
      logger.warn('📬 EMAIL SYSTEM: SMTP credentials not fully configured. Running in simulated fallback mode.');
    }
  }
  return transporter;
}

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const client = getEmailTransporter();
  const from = env.SMTP_FROM;
  
  if (client) {
    try {
      await client.sendMail({
        from,
        to,
        subject,
        html,
      });
      logger.info(`📬 EMAIL SYSTEM: Real email sent to ${to} (Subject: "${subject}")`);
    } catch (err) {
      logger.error(`❌ EMAIL SYSTEM: Error sending email to ${to}:`, err);
    }
  } else {
    logger.info(`[SIMULATED EMAIL DEPLOYED]
To: ${to}
Subject: ${subject}
Content:
${html.replace(/<[^>]*>/g, ' ').slice(0, 500)}...
    `);
  }
}

export async function sendRegistrationEmail(user: any) {
  const html = `
    <div style="font-family: sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #4f46e5; margin-bottom: 10px;">Welcome to IIT BHU Room Booking!</h2>
      <p>Hello <strong>${user.name}</strong>,</p>
      <p>Your academic account has been registered successfully on our modern room booking platform.</p>
      <p><strong>Account Details:</strong></p>
      <ul>
        <li><strong>Email:</strong> ${user.email}</li>
        <li><strong>Role:</strong> ${user.role === 'admin' ? 'Platform Admin' : 'User'}</li>
      </ul>
      <p>You can now browse rooms, schedule reservations, and check-in dynamically using QR codes.</p>
      <br />
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 11px; color: #64748b;">IIT BHU Smart Room Scheduler Admin Cell</p>
    </div>
  `;
  await sendEmail({
    to: user.email,
    subject: 'Welcome to IIT BHU Room Booking - Account Activated',
    html,
  });
}

export async function sendBookingConfirmationEmail(booking: any) {
  const html = `
    <div style="font-family: sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #4f46e5; margin-bottom: 10px;">Booking Confirmed! ✓</h2>
      <p>Hello <strong>${booking.creator_name || 'Academic Member'}</strong>,</p>
      <p>Your reservation for <strong>${booking.room_name}</strong> has been secured.</p>
      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <p style="margin: 0 0 8px 0;"><strong>Room Name:</strong> ${booking.room_name}</p>
        <p style="margin: 0 0 8px 0;"><strong>Date:</strong> ${new Date(booking.start_time).toLocaleDateString()}</p>
        <p style="margin: 0 0 8px 0;"><strong>Time:</strong> ${new Date(booking.start_time).toLocaleTimeString()} - ${new Date(booking.end_time).toLocaleTimeString()}</p>
        <p style="margin: 0 0 8px 0;"><strong>Purpose:</strong> ${booking.summary}</p>
        <p style="margin: 0;"><strong>Agenda:</strong> ${booking.agenda || 'N/A'}</p>
      </div>
      <p>Use your dashboard's <strong>QR Access Code</strong> to check in upon arrival at the classroom doorway sensor plaque.</p>
      <br />
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 11px; color: #64748b;">IIT BHU Smart Room Scheduler Admin Cell</p>
    </div>
  `;
  await sendEmail({
    to: booking.creator_email,
    subject: `Booking Confirmed: ${booking.room_name} - ${booking.summary}`,
    html,
  });
}

export async function sendBookingUpdateEmail(booking: any) {
  const html = `
    <div style="font-family: sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #3b82f6; margin-bottom: 10px;">Booking Updated! ✎</h2>
      <p>Hello <strong>${booking.creator_name || 'Academic Member'}</strong>,</p>
      <p>Your reservation details for <strong>${booking.room_name}</strong> have been updated.</p>
      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <p style="margin: 0 0 8px 0;"><strong>Room Name:</strong> ${booking.room_name}</p>
        <p style="margin: 0 0 8px 0;"><strong>Date:</strong> ${new Date(booking.start_time).toLocaleDateString()}</p>
        <p style="margin: 0 0 8px 0;"><strong>Time:</strong> ${new Date(booking.start_time).toLocaleTimeString()} - ${new Date(booking.end_time).toLocaleTimeString()}</p>
        <p style="margin: 0 0 8px 0;"><strong>Purpose:</strong> ${booking.summary}</p>
        <p style="margin: 0;"><strong>Agenda:</strong> ${booking.agenda || 'N/A'}</p>
      </div>
      <br />
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 11px; color: #64748b;">IIT BHU Smart Room Scheduler Admin Cell</p>
    </div>
  `;
  await sendEmail({
    to: booking.creator_email,
    subject: `Booking Updated: ${booking.room_name} - ${booking.summary}`,
    html,
  });
}

export async function sendBookingCancellationEmail(booking: any) {
  const html = `
    <div style="font-family: sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #ef4444; margin-bottom: 10px;">Booking Cancelled ✕</h2>
      <p>Hello <strong>${booking.creator_name || 'Academic Member'}</strong>,</p>
      <p>Your reservation for <strong>${booking.room_name}</strong> on ${new Date(booking.start_time).toLocaleDateString()} has been cancelled.</p>
      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <p style="margin: 0 0 8px 0;"><strong>Room Name:</strong> ${booking.room_name}</p>
        <p style="margin: 0 0 8px 0;"><strong>Purpose:</strong> ${booking.summary}</p>
        <p style="margin: 0;"><strong>Cancelled At:</strong> ${new Date().toLocaleString()}</p>
      </div>
      <br />
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 11px; color: #64748b;">IIT BHU Smart Room Scheduler Admin Cell</p>
    </div>
  `;
  await sendEmail({
    to: booking.creator_email,
    subject: `Booking Cancelled: ${booking.room_name} - ${booking.summary}`,
    html,
  });
}

export async function sendBookingReminderEmail(booking: any) {
  const html = `
    <div style="font-family: sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #f59e0b; margin-bottom: 10px;">Upcoming Booking Reminder (30 Minutes) ⏱</h2>
      <p>Hello <strong>${booking.creator_name || 'Academic Member'}</strong>,</p>
      <p>This is a friendly reminder that your booking for <strong>${booking.room_name}</strong> starts in 30 minutes.</p>
      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <p style="margin: 0 0 8px 0;"><strong>Room Name:</strong> ${booking.room_name}</p>
        <p style="margin: 0 0 8px 0;"><strong>Time:</strong> ${new Date(booking.start_time).toLocaleTimeString()} - ${new Date(booking.end_time).toLocaleTimeString()}</p>
        <p style="margin: 0;"><strong>Purpose:</strong> ${booking.summary}</p>
      </div>
      <p>Please make sure to check in at the classroom doorway using your QR Code to avoid automatic reservation release.</p>
      <br />
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 11px; color: #64748b;">IIT BHU Smart Room Scheduler Admin Cell</p>
    </div>
  `;
  await sendEmail({
    to: booking.creator_email,
    subject: `Booking Reminder: ${booking.room_name} starts in 30 minutes`,
    html,
  });
}

export async function sendCheckInEmail(booking: any) {
  const html = `
    <div style="font-family: sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #10b981; margin-bottom: 10px;">Check-In Successful! ⚡</h2>
      <p>Hello <strong>${booking.creator_name || 'Academic Member'}</strong>,</p>
      <p>Your QR check-in at <strong>${booking.room_name}</strong> has been processed successfully.</p>
      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <p style="margin: 0 0 8px 0;"><strong>Room Name:</strong> ${booking.room_name}</p>
        <p style="margin: 0 0 8px 0;"><strong>Check-In Time:</strong> ${new Date(booking.checked_in_at).toLocaleTimeString()}</p>
        <p style="margin: 0;"><strong>Purpose:</strong> ${booking.summary}</p>
      </div>
      <p>Your session is active and room occupancy status has been updated in the master registry.</p>
      <br />
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 11px; color: #64748b;">IIT BHU Smart Room Scheduler Admin Cell</p>
    </div>
  `;
  await sendEmail({
    to: booking.creator_email,
    subject: `Check-In Confirmed: ${booking.room_name}`,
    html,
  });
}
