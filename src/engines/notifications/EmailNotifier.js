import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Email Notification System
 */
export class EmailNotifier {
  constructor() {
    this.enabled = process.env.EMAIL_NOTIFICATIONS === 'true';
    this.to = process.env.NOTIFICATION_EMAIL;
    
    if (this.enabled && this.to) {
      this.transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
    }
  }

  async notifyOpportunities(opportunities) {
    if (!this.enabled) return;
    
    const highValue = opportunities.filter(o => o.match_score >= 0.80);
    if (highValue.length === 0) return;
    
    const subject = `🔥 ${highValue.length} High-Match Opportunities!`;
    const html = `
      <h1>OpenHR AI Found ${highValue.length} Opportunities</h1>
      ${highValue.map(o => `
        <div style="margin: 20px 0; padding: 15px; background: #f5f5f5;">
          <h3>${o.title}</h3>
          <p>Score: ${(o.match_score * 100).toFixed(0)}%</p>
          <p>Pay: $${o.pay_min}-${o.pay_max}</p>
          <a href="${o.url}">View →</a>
        </div>
      `).join('')}
    `;
    
    await this.send(subject, html);
  }

  async send(subject, html) {
    if (!this.enabled) return;
    
    await this.transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: this.to,
      subject,
      html,
    });
  }
}
