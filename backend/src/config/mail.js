import nodemailer from 'nodemailer';

const emailUser = process.env.GMAIL_USER;
const emailAppPassword = process.env.GMAIL_APP_PASSWORD;
const defaultFrom = process.env.MAIL_FROM || emailUser;

let transporter;

function ensureMailConfig() {
  if (!emailUser || !emailAppPassword) {
    throw new Error('Configuração de e-mail ausente. Defina GMAIL_USER e GMAIL_APP_PASSWORD.');
  }
}

function getTransporter() {
  ensureMailConfig();

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailAppPassword
      }
    });
  }

  return transporter;
}

export async function sendPasswordResetEmail({ to, username, resetUrl }) {
  const mailer = getTransporter();

  await mailer.sendMail({
    from: defaultFrom,
    to,
    subject: 'Redefinicao de senha - La Dispensa',
    text: [
      `Ola, ${username || 'usuario'}.`,
      '',
      'Recebemos uma solicitacao para redefinir sua senha.',
      `Abra este link para cadastrar uma nova senha: ${resetUrl}`,
      '',
      'Se voce nao solicitou essa alteracao, ignore este e-mail.'
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #2d1b00;">
        <p>Ola, <strong>${username || 'usuario'}</strong>.</p>
        <p>Recebemos uma solicitacao para redefinir sua senha no La Dispensa.</p>
        <p>
          <a
            href="${resetUrl}"
            style="display: inline-block; padding: 12px 18px; background: #4A7C2F; color: #ffffff; text-decoration: none; border-radius: 6px;"
          >
            Redefinir senha
          </a>
        </p>
        <p>Se preferir, copie e cole este link no navegador:</p>
        <p>${resetUrl}</p>
        <p>Se voce nao solicitou essa alteracao, ignore este e-mail.</p>
      </div>
    `
  });
}
