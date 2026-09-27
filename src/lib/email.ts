import { Resend } from 'resend'
import { logger } from './logger'

const MAX_EMAIL_BATCH_SIZE = 50

interface EmailParams {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string | string[]
}

function normalizeRecipients(input: string | string[]): string[] {
  if (Array.isArray(input)) {
    return input.map((value) => value.trim()).filter(Boolean)
  }

  const trimmed = input.trim()
  return trimmed ? [trimmed] : []
}

function chunkRecipients(recipients: string[]): string[][] {
  const chunks: string[][] = []

  for (let index = 0; index < recipients.length; index += MAX_EMAIL_BATCH_SIZE) {
    chunks.push(recipients.slice(index, index + MAX_EMAIL_BATCH_SIZE))
  }

  return chunks
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function sendEmail({
  to,
  subject,
  html,
  from,
  replyTo,
}: EmailParams): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY
  const sender = from || process.env.RESEND_FROM_EMAIL || 'noreply@vidhyabharthi.com'
  const recipients = normalizeRecipients(to)
  const logRecipients = Array.isArray(to) ? recipients : recipients[0]

  if (recipients.length === 0) {
    return true
  }

  if (!resendApiKey) {
    logger.info(
      {
        to: logRecipients,
        subject,
        from: sender,
      },
      '[Email] Mock send'
    )
    return true
  }

  try {
    const resend = new Resend(resendApiKey)
    const batches = chunkRecipients(recipients)

    for (const batch of batches) {
      await resend.emails.send({
        from: sender,
        to: !Array.isArray(to) && batch.length === 1 ? batch[0] : batch,
        subject,
        html,
        replyTo,
      })
    }
    return true
  } catch (error) {
    logger.error({ error, to: logRecipients, subject }, 'Failed to send email')
    return false
  }
}

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Reset Your Password - Vidhya Bharthi High School',
    html: `
      <p>Hello,</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  })
}

export async function sendNotificationEmail(
  email: string,
  title: string,
  message: string
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: title,
    html: `<p>${message}</p>`,
  })
}

interface PublicContactEmailParams {
  to: string
  schoolName: string
  senderName: string
  senderEmail: string
  senderPhone: string
  subject: string
  message: string
}

export async function sendPublicContactEmail({
  to,
  schoolName,
  senderName,
  senderEmail,
  senderPhone,
  subject,
  message,
}: PublicContactEmailParams): Promise<boolean> {
  const escapedSchoolName = escapeHtml(schoolName)
  const escapedSenderName = escapeHtml(senderName)
  const escapedSenderEmail = escapeHtml(senderEmail)
  const escapedSenderPhone = escapeHtml(senderPhone)
  const escapedSubject = escapeHtml(subject)
  const escapedMessage = escapeHtml(message).replace(/\r?\n/g, '<br />')

  return sendEmail({
    to,
    subject: `[Website Inquiry] ${subject}`,
    replyTo: senderEmail,
    html: `
      <h2>New website contact enquiry for ${escapedSchoolName}</h2>
      <div><strong>Name:</strong> ${escapedSenderName}</div>
      <div><strong>Email:</strong> ${escapedSenderEmail}</div>
      <div><strong>Phone:</strong> ${escapedSenderPhone}</div>
      <div><strong>Subject:</strong> ${escapedSubject}</div>
      <div><strong>Message:</strong><br />${escapedMessage}</div>
    `,
  })
}

interface SchoolOnboardingEmailParams {
  to: string
  schoolName: string
  principalEmail: string
  temporaryPassword: string
  loginUrl: string
}

export async function sendSchoolOnboardingEmail({
  to,
  schoolName,
  principalEmail,
  temporaryPassword,
  loginUrl,
}: SchoolOnboardingEmailParams): Promise<boolean> {
  return sendEmail({
    to,
    subject: `Welcome to SchoolOS - ${schoolName}`,
    html: `
      <h2>${schoolName} is ready on SchoolOS</h2>
      <p>Your principal account has been created successfully.</p>
      <p><strong>Login email:</strong> ${principalEmail}</p>
      <p><strong>Temporary password:</strong> ${temporaryPassword}</p>
      <p>
        <a href="${loginUrl}">Open login</a>
      </p>
      <p>Please sign in and change the password after your first login.</p>
    `,
  })
}
