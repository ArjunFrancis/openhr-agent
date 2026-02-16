import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Slack Notification System
 */
export class SlackNotifier {
  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL;
    this.enabled = !!this.webhookUrl;
  }

  async notifyOpportunities(opportunities) {
    if (!this.enabled) return;
    
    const highValue = opportunities.filter(o => o.match_score >= 0.80);
    if (highValue.length === 0) return;
    
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🔥 ${highValue.length} High-Match Opportunities Found!`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Your OpenHR AI agent found *${highValue.length}* opportunities with >80% match`,
        },
      },
      { type: 'divider' },
    ];

    highValue.slice(0, 5).forEach((opp, i) => {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${i + 1}. ${opp.title}*\n` +
                `Score: ${(opp.match_score * 100).toFixed(0)}% | ` +
                `Pay: $${opp.pay_min}-${opp.pay_max} | ` +
                `${opp.platform}`,
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View →',
          },
          url: opp.url,
        },
      });
    });

    await this.send({ blocks });
  }

  async send(message) {
    if (!this.enabled) return;
    
    await axios.post(this.webhookUrl, message);
  }
}
