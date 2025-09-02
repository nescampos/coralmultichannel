import nodemailer from 'nodemailer';

// Definir el tipo para los datos del mensaje de correo
export interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: any[];
}

export const CHANNEL_TYPE = 'email';

// Configuración del transporte SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Normalizar el ID de usuario de correo electrónico
function normalizeEmailId(email: string): string {
  return email.trim().toLowerCase();
}

// Formatear para correo electrónico (puede incluir nombre y dirección)
function formatEmailAddress(email: string, name?: string): string {
  return name ? `"${name}" <${email}>` : email;
}

export async function parseEmailMessage(body: any) {
  try {
    // El cuerpo puede ser un objeto con los campos del correo o un string JSON
    let emailData: EmailMessage;
    if (typeof body === 'string') {
      emailData = JSON.parse(body);
    } else {
      emailData = body;
    }

    // Extraer información relevante del correo
    const from = emailData.from;
    const to = emailData.to;
    const subject = emailData.subject || '';
    const text = emailData.text || '';

    // Verificar si hay archivos adjuntos
    const hasAttachments = emailData.attachments && emailData.attachments.length > 0;

    return {
      from: normalizeEmailId(from),
      to: normalizeEmailId(to),
      subject,
      text,
      provider: 'email',
      isAudio: false, // Por defecto, a menos que se implemente detección de audio
      hasAttachments,
      // Incluir datos adicionales específicos del correo
      originalMessage: emailData,
    };
  } catch (error) {
    console.error('Error parsing email message:', error);
    throw new Error('Invalid email message format');
  }
}

export async function sendEmailMessage(to: string, text: string, subject: string = 'Mensaje del asistente', reply?: any) {
  try {
    // Configurar opciones del correo
    const mailOptions = {
      from: formatEmailAddress(
        process.env.SMTP_FROM_EMAIL || '',
        process.env.SMTP_FROM_NAME || ''
      ),
      to: to,
      subject: subject,
      text: text,
      // Opcional: incluir HTML si está disponible en reply
      html: reply?.html || undefined,
      // Opcional: incluir adjuntos si están disponibles en reply
      attachments: reply?.attachments || [],
    };

    // Enviar el correo
    const info = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error(`Failed to send email: ${error}`);
  }
}

// Función para verificar la conexión SMTP
export async function verifySMTPConnection() {
  try {
    await transporter.verify();
    console.log('SMTP server is ready to take our messages');
    return true;
  } catch (error) {
    console.error('SMTP connection error:', error);
    return false;
  }
}
