/**
 * notificationService.js
 * Serviço centralizado de notificações
 * Suporta: E-mail automático + WhatsApp (estruturado para integração futura)
 * Compatível com LGPD - verifica consentimentos do usuário
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// ═══════════════════════════════════════════════════════════════════════════
// 1. CONFIGURAÇÃO DO NODEMAILER
// ═══════════════════════════════════════════════════════════════════════════

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Verificar conexão ao iniciar
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Erro ao conectar com serviço de e-mail:', error);
  } else {
    console.log('✅ Serviço de e-mail configurado e pronto');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. TEMPLATES DE E-MAIL
// ═══════════════════════════════════════════════════════════════════════════

const emailTemplates = {
  /**
   * Template: Candidatura recebida pela empresa
   */
  applicationReceived: (candidateName, jobTitle) => ({
    subject: `✅ Sua candidatura foi recebida - ${jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Candidatura Recebida! 🎉</h2>
        <p>Oi <strong>${candidateName}</strong>,</p>
        <p>Sua candidatura para a vaga de <strong>${jobTitle}</strong> foi recebida com sucesso pela empresa.</p>
        <p>Você será notificado sobre o status assim que houver atualizações.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 12px;">
          CurrículoJá - Sua carreira em boas mãos
        </p>
      </div>
    `,
  }),

  /**
   * Template: Candidatura em revisão
   */
  applicationUnderReview: (candidateName, jobTitle, companyName) => ({
    subject: `📋 Sua candidatura está em revisão - ${jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2196F3;">Candidatura em Revisão</h2>
        <p>Oi <strong>${candidateName}</strong>,</p>
        <p>A empresa <strong>${companyName}</strong> está analisando sua candidatura para a vaga de <strong>${jobTitle}</strong>.</p>
        <p>Entraremos em contato assim que houver novidades!</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 12px;">
          CurrículoJá - Sua carreira em boas mãos
        </p>
      </div>
    `,
  }),

  /**
   * Template: Candidatura aprovada/Entrevista marcada
   */
  applicationApproved: (candidateName, jobTitle, companyName, interviewDate = null) => ({
    subject: `🎯 Você foi aprovado! - ${jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Parabéns! 🎉</h2>
        <p>Oi <strong>${candidateName}</strong>,</p>
        <p>Ótimas notícias! A empresa <strong>${companyName}</strong> ficou interessada em sua candidatura para <strong>${jobTitle}</strong>.</p>
        ${interviewDate ? `<p><strong>Data da entrevista:</strong> ${new Date(interviewDate).toLocaleDateString('pt-BR')}</p>` : ''}
        <p>Fique atento para mais informações!</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 12px;">
          CurrículoJá - Sua carreira em boas mãos
        </p>
      </div>
    `,
  }),

  /**
   * Template: Candidatura rejeitada
   */
  applicationRejected: (candidateName, jobTitle, companyName, feedback = '') => ({
    subject: `📌 Atualização sobre sua candidatura - ${jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #FF9800;">Status da Sua Candidatura</h2>
        <p>Oi <strong>${candidateName}</strong>,</p>
        <p>A empresa <strong>${companyName}</strong> informou que sua candidatura para <strong>${jobTitle}</strong> não foi selecionada nesta etapa.</p>
        ${feedback ? `<p><strong>Feedback:</strong> ${feedback}</p>` : ''}
        <p>Continue buscando oportunidades! Acreditamos em você! 💪</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 12px;">
          CurrículoJá - Sua carreira em boas mãos
        </p>
      </div>
    `,
  }),

  /**
   * Template: Nova vaga com alto matching
   */
  newJobAlert: (candidateName, jobTitle, companyName, matchingScore, jobUrl = '') => ({
    subject: `🚀 Nova oportunidade com ${matchingScore}% de compatibilidade!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Encontramos uma vaga perfeita para você!</h2>
        <p>Oi <strong>${candidateName}</strong>,</p>
        <p>Uma nova vaga foi publicada que combina bastante com seu perfil:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>${jobTitle}</strong></p>
          <p>Empresa: ${companyName}</p>
          <p>Compatibilidade: <strong style="color: #4CAF50;">${matchingScore}%</strong> 🎯</p>
        </div>
        ${jobUrl ? `<p><a href="${jobUrl}" style="display: inline-block; background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver Vaga</a></p>` : ''}
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 12px;">
          CurrículoJá - Sua carreira em boas mãos
        </p>
      </div>
    `,
  }),

  /**
   * Template: Confirmação de consentimento
   */
  consentConfirmation: (candidateName) => ({
    subject: '📋 Suas preferências de comunicação foram atualizadas',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2196F3;">Preferências de Comunicação</h2>
        <p>Oi <strong>${candidateName}</strong>,</p>
        <p>Suas preferências de comunicação foram atualizadas com sucesso.</p>
        <p>Você pode gerenciar suas preferências a qualquer momento no painel de configurações.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 12px;">
          CurrículoJá - Sua carreira em boas mãos
        </p>
      </div>
    `,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. FUNÇÕES PRINCIPAIS DE NOTIFICAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Envia e-mail genérico
 * @param {string} to - E-mail destinatário
 * @param {string} subject - Assunto do e-mail
 * @param {string} html - Conteúdo HTML
 * @returns {Promise<Object>} Resultado do envio
 */
export async function sendEmail(to, subject, html) {
  try {
    if (!to || !subject || !html) {
      throw new Error('to, subject e html são obrigatórios');
    }

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@curriculoja.com',
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ E-mail enviado para ${to}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Erro ao enviar e-mail para ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Notifica quando candidatura muda de status
 * @param {Object} params
 * @param {string} params.candidateEmail - E-mail do candidato
 * @param {string} params.candidateName - Nome do candidato
 * @param {string} params.jobTitle - Título da vaga
 * @param {string} params.companyName - Nome da empresa
 * @param {string} params.newStatus - Novo status (received, reviewing, interested, interview, approved, rejected)
 * @param {Object} params.user - Objeto do usuário (para verificar consentimentos)
 * @param {string} params.feedback - Feedback opcional
 * @param {Date} params.interviewDate - Data da entrevista (se houver)
 */
export async function notifyApplicationStatusChange({
  candidateEmail,
  candidateName,
  jobTitle,
  companyName,
  newStatus,
  user = null,
  feedback = '',
  interviewDate = null,
}) {
  try {
    // Verificar se usuário consentiu com e-mails
    if (user && !user.consent_privacy_policy) {
      console.log(`⚠️ Usuário ${candidateEmail} não consentiu com comunicações`);
      return { success: false, reason: 'No consent' };
    }

    let emailTemplate;

    switch (newStatus) {
      case 'pending':
      case 'received':
        emailTemplate = emailTemplates.applicationReceived(candidateName, jobTitle);
        break;
      case 'reviewing':
      case 'interested':
        emailTemplate = emailTemplates.applicationUnderReview(candidateName, jobTitle, companyName);
        break;
      case 'interview':
      case 'approved':
        emailTemplate = emailTemplates.applicationApproved(
          candidateName,
          jobTitle,
          companyName,
          interviewDate
        );
        break;
      case 'rejected':
        emailTemplate = emailTemplates.applicationRejected(
          candidateName,
          jobTitle,
          companyName,
          feedback
        );
        break;
      default:
        emailTemplate = {
          subject: `Atualização sobre sua candidatura - ${jobTitle}`,
          html: `<p>Sua candidatura foi atualizada. Novo status: ${newStatus}</p>`,
        };
    }

    return await sendEmail(candidateEmail, emailTemplate.subject, emailTemplate.html);
  } catch (error) {
    console.error('❌ Erro ao notificar mudança de status:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Notifica sobre nova vaga com alto matching
 * @param {Object} params
 * @param {string} params.candidateEmail - E-mail do candidato
 * @param {string} params.candidateName - Nome do candidato
 * @param {string} params.jobTitle - Título da vaga
 * @param {string} params.companyName - Nome da empresa
 * @param {number} params.matchingScore - Score de compatibilidade (0-100)
 * @param {Object} params.user - Objeto do usuário (para verificar consentimentos)
 * @param {string} params.jobUrl - URL da vaga
 */
export async function notifyNewJobAlert({
  candidateEmail,
  candidateName,
  jobTitle,
  companyName,
  matchingScore,
  user = null,
  jobUrl = '',
}) {
  try {
    // Verificar se usuário consentiu
    if (user && !user.consent_privacy_policy) {
      console.log(`⚠️ Usuário ${candidateEmail} não consentiu com job alerts`);
      return { success: false, reason: 'No consent' };
    }

    const emailTemplate = emailTemplates.newJobAlert(
      candidateName,
      jobTitle,
      companyName,
      matchingScore,
      jobUrl
    );

    return await sendEmail(candidateEmail, emailTemplate.subject, emailTemplate.html);
  } catch (error) {
    console.error('❌ Erro ao notificar nova vaga:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Notifica sobre atualização de consentimentos
 * @param {string} candidateEmail - E-mail do candidato
 * @param {string} candidateName - Nome do candidato
 */
export async function notifyConsentUpdate(candidateEmail, candidateName) {
  try {
    const emailTemplate = emailTemplates.consentConfirmation(candidateName);
    return await sendEmail(candidateEmail, emailTemplate.subject, emailTemplate.html);
  } catch (error) {
    console.error('❌ Erro ao notificar atualização de consentimento:', error.message);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. WHATSAPP - ESTRUTURADO PARA INTEGRAÇÃO FUTURA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Envia mensagem via WhatsApp (ESTRUTURADO - não implementa API real ainda)
 * Esta função é um intermediário que pode ser facilmente integrado com:
 * - Evolution API
 * - Z-API
 * - Twilio
 * - Ou qualquer outro provedor
 *
 * @param {string} to - Número WhatsApp (formato: 5585987654321)
 * @param {string} text - Texto da mensagem
 * @param {Object} options - Opções adicionais (media, buttons, etc)
 * @returns {Promise<Object>} Resultado do envio
 */
export async function sendWhatsAppMessage(to, text, options = {}) {
  try {
    if (!to || !text) {
      throw new Error('to (número) e text (mensagem) são obrigatórios');
    }

    // Verificar se WhatsApp está configurado
    const whatsappProvider = process.env.WHATSAPP_PROVIDER || null;

    if (!whatsappProvider) {
      console.log(
        `⚠️ WhatsApp não configurado. Mensagem seria enviada para ${to}: ${text}`
      );
      return {
        success: false,
        reason: 'WhatsApp provider not configured',
        messageId: null,
      };
    }

    // Estrutura padronizada que será usada por qualquer provedor
    const whatsappPayload = {
      to: normalizePhoneNumber(to), // Garantir formato correto
      text,
      mediaUrl: options.mediaUrl || null, // Para imagens/docs
      buttons: options.buttons || null, // Para botões interativos
      templateName: options.templateName || null, // Para templates pré-aprovados
      timestamp: new Date().toISOString(),
    };

    // Aqui seria integrada a lógica específica do provedor
    // Por enquanto, apenas registramos a estrutura
    console.log('📱 Estrutura WhatsApp preparada (pronto para integração):', {
      provider: whatsappProvider,
      payload: whatsappPayload,
    });

    // TODO: Implementar integração real conforme provedor escolhido
    // if (whatsappProvider === 'evolution') {
    //   return await sendViaEvolution(whatsappPayload);
    // } else if (whatsappProvider === 'zapi') {
    //   return await sendViaZAPI(whatsappPayload);
    // }

    return {
      success: true,
      messageId: `wa_${Date.now()}`,
      method: 'structured',
      message: 'WhatsApp message structure ready for integration',
    };
  } catch (error) {
    console.error(`❌ Erro ao processar WhatsApp para ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Normaliza número de telefone para padrão WhatsApp (formato: 5585987654321)
 * @param {string} phone - Número bruto
 * @returns {string} Número normalizado
 */
function normalizePhoneNumber(phone) {
  // Remove caracteres especiais
  const cleaned = phone.replace(/\D/g, '');

  // Se começar com 55, é BR completo
  if (cleaned.startsWith('55')) {
    return cleaned;
  }

  // Se começar com 0, remove (é 0-algo BR)
  if (cleaned.startsWith('0')) {
    return '55' + cleaned.substring(1);
  }

  // Senão, assume BR e adiciona código
  return '55' + cleaned;
}

/**
 * Template de mensagem WhatsApp para notificações
 * Será usado nos integradores de WhatsApp
 */
export const whatsappTemplates = {
  applicationReceived: (candidateName, jobTitle) =>
    `Oi ${candidateName}! 👋\n\nSua candidatura para *${jobTitle}* foi recebida com sucesso! 🎉\n\nVocê será notificado sobre o status. Boa sorte!`,

  applicationUnderReview: (candidateName, jobTitle, companyName) =>
    `Oi ${candidateName}! 📋\n\n${companyName} está analisando sua candidatura para *${jobTitle}*.\n\nFique atento para nossas atualizações!`,

  applicationApproved: (candidateName, jobTitle) =>
    `Parabéns ${candidateName}! 🎉\n\nVocê foi aprovado para a próxima etapa em *${jobTitle}*!\n\nEntraremos em contato em breve.`,

  jobAlert: (jobTitle, matchingScore) =>
    `Achamos uma oportunidade perfeita para você! 🚀\n\n*${jobTitle}*\n\nCompatibilidade: ${matchingScore}%\n\nClique para ver a vaga completa.`,
};

// ═══════════════════════════════════════════════════════════════════════════
// 5. FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Envia notificação multi-canal (e-mail + WhatsApp se consentido)
 * @param {Object} params - Parâmetros com dados do candidato
 */
export async function notifyMultiChannel(params) {
  const { candidateEmail, candidatePhone, user } = params;

  const results = {
    email: null,
    whatsapp: null,
  };

  // E-mail (sempre se consentiu)
  if (candidateEmail) {
    results.email = await notifyApplicationStatusChange({
      candidateEmail,
      candidateName: user.name,
      jobTitle: params.jobTitle,
      companyName: params.companyName,
      newStatus: params.newStatus,
      user,
    });
  }

  // WhatsApp (se consentiu e tem número)
  if (candidatePhone && user.consent_whatsapp) {
    results.whatsapp = await sendWhatsAppMessage(
      candidatePhone,
      whatsappTemplates.applicationUnderReview(user.name, params.jobTitle, params.companyName)
    );
  }

  return results;
}

export default {
  sendEmail,
  notifyApplicationStatusChange,
  notifyNewJobAlert,
  notifyConsentUpdate,
  sendWhatsAppMessage,
  whatsappTemplates,
  notifyMultiChannel,
};
