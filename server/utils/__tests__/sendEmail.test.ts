import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import nodemailer from 'nodemailer';
import { sendEmail } from '../sendEmail';
import { logger } from '../logger';

vi.mock('nodemailer');
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('sendEmail utility', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('logs mock email content to logger when SMTP config is incomplete (fallback mode)', async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    await sendEmail({
      to: 'test@example.com',
      subject: 'Test Subject',
      text: 'Test Body Content',
    });

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('[PASSWORD RESET MOCK EMAIL]'));
    expect(logger.info).toHaveBeenCalledWith('To: test@example.com');
    expect(logger.info).toHaveBeenCalledWith('Subject: Test Subject');
  });

  it('uses nodemailer transporter and sends email when SMTP config is present', async () => {
    process.env.SMTP_HOST = 'smtp.mailtrap.io';
    process.env.SMTP_PORT = '2525';
    process.env.SMTP_USER = 'user123';
    process.env.SMTP_PASS = 'pass123';
    process.env.FROM_EMAIL = 'noreply@budgetizer.app';

    const sendMailMock = vi.fn().mockResolvedValue({ messageId: '12345' });
    (nodemailer.createTransport as any).mockReturnValue({
      sendMail: sendMailMock,
    });

    await sendEmail({
      to: 'user@domain.com',
      subject: 'Password Reset',
      text: 'Reset your password using this code',
      html: '<p>Reset your password using this code</p>',
    });

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.mailtrap.io',
      port: 2525,
      secure: false,
      auth: {
        user: 'user123',
        pass: 'pass123',
      },
    });

    expect(sendMailMock).toHaveBeenCalledWith({
      from: '"Budgetizer" <noreply@budgetizer.app>',
      to: 'user@domain.com',
      subject: 'Password Reset',
      text: 'Reset your password using this code',
      html: '<p>Reset your password using this code</p>',
    });
  });
});
