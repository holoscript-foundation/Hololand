// Email service with template support
import nodemailer, { Transporter } from 'nodemailer';

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface EmailOptions {
  to: string;
  template: string;
  data: Record<string, any>;
}

export class EmailService {
  private static instance: EmailService | null = null;
  private transporter: Transporter;
  private templates: Map<string, EmailTemplate> = new Map();

  private constructor() {
    // Initialize Nodemailer with SendGrid or similar
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.registerTemplates();
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private registerTemplates(): void {
    // Welcome email
    this.templates.set('welcome', {
      subject: 'Welcome to Hololand! 🎮',
      text: 'Welcome to Hololand! Get started creating your first VR world.',
      html: `
        <h1>Welcome to Hololand!</h1>
        <p>Hi {{userName}},</p>
        <p>Your creator account is ready. You've been credited with <strong>$100</strong> to spend on your first worlds.</p>
        <p><a href="{{dashboardUrl}}" style="background: #4F46E5; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Go to Dashboard</a></p>
        <p>Questions? Check out our <a href="{{helpUrl}}">creator guide</a>.</p>
      `,
    });

    // Email verification
    this.templates.set('verify', {
      subject: 'Verify your Hololand email',
      text: 'Verify your email by clicking the link in your inbox.',
      html: `
        <h2>Verify Your Email</h2>
        <p>Click the link below to confirm your email address:</p>
        <p><a href="{{verifyUrl}}" style="background: #4F46E5; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Verify Email</a></p>
        <p>Link expires in 24 hours.</p>
      `,
    });

    // Password reset
    this.templates.set('reset', {
      subject: 'Reset your Hololand password',
      text: 'Reset your password by clicking the link in your inbox.',
      html: `
        <h2>Password Reset</h2>
        <p>Click the link below to create a new password:</p>
        <p><a href="{{resetUrl}}" style="background: #4F46E5; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Reset Password</a></p>
        <p>Link expires in 1 hour.</p>
        <p>If you didn't request this, ignore this email.</p>
      `,
    });

    // World published
    this.templates.set('world-published', {
      subject: '🚀 Your world "{{worldTitle}}" is live!',
      text: 'Your world has been published and is discoverable by visitors.',
      html: `
        <h2>Your World is Live! 🚀</h2>
        <p>Hi {{userName}},</p>
        <p>Congratulations! Your world <strong>{{worldTitle}}</strong> is now published and visible to all Hololand visitors.</p>
        <p>Share your world:</p>
        <p><a href="{{worldUrl}}" style="background: #4F46E5; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">View World</a></p>
        <p>Track visits and earnings in your <a href="{{analyticsUrl}}">analytics dashboard</a>.</p>
      `,
    });

    // Earnings summary
    this.templates.set('earnings-summary', {
      subject: 'Your Hololand earnings this week: ${{amount}}',
      text: 'You earned money this week! View your earnings details.',
      html: `
        <h2>Weekly Earnings Summary</h2>
        <p>Hi {{userName}},</p>
        <p>Great news! You earned <strong>\${{amount}}</strong> this week from your worlds.</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: #f3f4f6;">
            <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">World</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">Revenue</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">Visits</th>
          </tr>
          {{#worlds}}
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">{{title}}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">\${{revenue}}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">{{visits}}</td>
          </tr>
          {{/worlds}}
        </table>
        <p><a href="{{analyticsUrl}}">View Full Analytics</a></p>
        <p>Payout scheduled for {{payoutDate}}.</p>
      `,
    });

    // Review notification
    this.templates.set('world-review', {
      subject: '⭐ {{userName}} rated your world "{{worldTitle}}"',
      text: 'Someone left a review on your world.',
      html: `
        <h2>New Review!</h2>
        <p>{{reviewerName}} gave your world <strong>{{worldTitle}}</strong> a <strong>{{rating}}/5</strong> rating:</p>
        <blockquote style="border-left: 4px solid #4F46E5; padding-left: 16px; font-style: italic; margin: 16px 0;">
          "{{reviewText}}"
        </blockquote>
        <p><a href="{{worldUrl}}">View Your World</a></p>
      `,
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    const template = this.templates.get(options.template);
    if (!template) {
      throw new Error(`Template "${options.template}" not found`);
    }

    const subject = this.interpolate(template.subject, options.data);
    const html = this.interpolate(template.html, options.data);

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@hololand.io',
        to: options.to,
        subject,
        html,
        text: this.interpolate(template.text, options.data),
      });

      console.log(`Email sent to ${options.to} (template: ${options.template})`);
    } catch (error) {
      console.error(`Failed to send email to ${options.to}:`, error);
      throw error;
    }
  }

  private interpolate(text: string, data: Record<string, any>): string {
    // Simple template interpolation
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return String(data[key] || '');
    });
  }
}

export function getEmailService(): EmailService {
  return EmailService.getInstance();
}
