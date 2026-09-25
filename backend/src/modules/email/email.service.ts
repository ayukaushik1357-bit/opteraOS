import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  provider: 'Resend' | 'SMTP' | 'SendGrid' | null;
  error?: string;
  errorCode?: 'EMAIL_PROVIDER_NOT_CONFIGURED' | 'EMAIL_SEND_FAILED' | 'INVALID_RECIPIENT';
  deliveredAt?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private config: ConfigService) {}

  getProviderStatus(): { configured: boolean; provider: 'Resend' | 'SMTP' | 'SendGrid' | null } {
    if (this.config.get<string>('RESEND_API_KEY')) return { configured: true, provider: 'Resend' };
    if (this.config.get<string>('SENDGRID_API_KEY')) return { configured: true, provider: 'SendGrid' };
    if (this.config.get<string>('SMTP_HOST') && this.config.get<string>('SMTP_USER')) return { configured: true, provider: 'SMTP' };
    return { configured: false, provider: null };
  }

  async send(payload: EmailPayload): Promise<EmailSendResult> {
    const { configured, provider } = this.getProviderStatus();

    if (!configured || !provider) {
      return {
        success: false,
        provider: null,
        errorCode: 'EMAIL_PROVIDER_NOT_CONFIGURED',
        error: 'EMAIL_PROVIDER_NOT_CONFIGURED: No external email provider found in environment. Please define RESEND_API_KEY, SENDGRID_API_KEY, or SMTP_HOST in .env.',
      };
    }

    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
    const fromAddress = payload.from || this.config.get<string>('EMAIL_FROM') || 'opteraOS <notifications@opteraos.com>';

    try {
      if (provider === 'Resend') {
        const apiKey = this.config.get<string>('RESEND_API_KEY');
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            from: fromAddress,
            to: recipients,
            subject: payload.subject,
            html: payload.html,
            text: payload.text,
            reply_to: payload.replyTo,
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error((errBody as any)?.message || `Resend Error HTTP ${res.status}`);
        }

        const data = await res.json();
        return {
          success: true,
          provider: 'Resend',
          messageId: data.id,
          deliveredAt: new Date().toISOString(),
        };
      }

      if (provider === 'SendGrid') {
        const apiKey = this.config.get<string>('SENDGRID_API_KEY');
        const rawEmail = fromAddress.includes('<')
          ? fromAddress.split('<')[1]?.replace('>', '').trim() || fromAddress
          : fromAddress;

        const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            personalizations: [{ to: recipients.map((r) => ({ email: r })) }],
            from: { email: rawEmail, name: 'opteraOS' },
            subject: payload.subject,
            content: [{ type: 'text/html', value: payload.html }],
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`SendGrid Error HTTP ${res.status}: ${errText}`);
        }

        return {
          success: true,
          provider: 'SendGrid',
          messageId: res.headers.get('x-message-id') || `sg_${Date.now()}`,
          deliveredAt: new Date().toISOString(),
        };
      }

      // SMTP Fallback
      return {
        success: false,
        provider: 'SMTP',
        errorCode: 'EMAIL_PROVIDER_NOT_CONFIGURED',
        error: 'SMTP configuration is incomplete.',
      };
    } catch (err: any) {
      this.logger.error(`Email delivery failure via ${provider}: ${err.message}`);
      return {
        success: false,
        provider,
        errorCode: 'EMAIL_SEND_FAILED',
        error: err.message,
      };
    }
  }
}
