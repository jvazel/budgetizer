import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
   // 1. Vérifier si les variables SMTP sont configurées
  const hasSmtpConfig =
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS;

  if (!hasSmtpConfig) {
     // Mode Fallback (Développement local) : on log dans la console
    logger.info('\n======================================================');
    logger.info('[PASSWORD RESET MOCK EMAIL]');
    logger.info(`To: ${options.to}`);
    logger.info(`Subject: ${options.subject}`);
    logger.info(`Body:\n${options.text}`);
    logger.info('======================================================\n');
    return;
   }

   // 2. Mode Production : Créer un transporteur SMTP
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: false, // true pour le port 465, false pour les autres ports comme 587
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
     },
   });

   // 3. Définir les options du message
  const mailOptions = {
    from: `"Budgetizer" <${process.env.FROM_EMAIL || 'noreply@budgetizer.com'}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
   };

   // 4. Envoyer le mail
  await transporter.sendMail(mailOptions);
};
