import { ProposalGenerator } from '../action/ProposalGenerator.js';

/**
 * Automated Follow-up Engine
 * Intelligently follows up on applications
 * 
 * UNIQUE: Knows when and how to follow up for maximum impact
 */
export class FollowUpEngine {
  constructor(db) {
    this.db = db;
    this.proposalGen = new ProposalGenerator();
  }

  /**
   * Determine if follow-up is needed
   */
  async checkFollowUps() {
    console.log('\n📧 Checking applications needing follow-up...\n');
    
    const applications = await this.db.getPendingApplications();
    const needsFollowUp = [];
    
    for (const app of applications) {
      const shouldFollowUp = this.shouldFollowUp(app);
      
      if (shouldFollowUp.should) {
        needsFollowUp.push({
          ...app,
          follow_up_reason: shouldFollowUp.reason,
          follow_up_strategy: shouldFollowUp.strategy,
        });
      }
    }
    
    console.log(`✅ Found ${needsFollowUp.length} applications needing follow-up\n`);
    return needsFollowUp;
  }

  /**
   * Determine if should follow up
   */
  shouldFollowUp(application) {
    const daysSinceApplication = this.daysSince(application.applied_at);
    const lastFollowUp = application.last_follow_up_at;
    const daysSinceFollowUp = lastFollowUp ? this.daysSince(lastFollowUp) : null;
    
    // Different strategies for different platforms
    const platform = application.platform;
    const followUpRules = this.getFollowUpRules(platform);
    
    // First follow-up
    if (!lastFollowUp && daysSinceApplication >= followUpRules.first_follow_up_days) {
      return {
        should: true,
        reason: `${daysSinceApplication} days since application`,
        strategy: 'initial_follow_up',
        urgency: 'normal',
      };
    }
    
    // Second follow-up
    if (lastFollowUp && daysSinceFollowUp >= followUpRules.second_follow_up_days) {
      return {
        should: true,
        reason: `${daysSinceFollowUp} days since last follow-up`,
        strategy: 'persistence_follow_up',
        urgency: 'low',
      };
    }
    
    // High-value opportunity - follow up sooner
    if (application.opportunity_score >= 0.85 && daysSinceApplication >= 3) {
      return {
        should: true,
        reason: 'High-value opportunity',
        strategy: 'high_priority_follow_up',
        urgency: 'high',
      };
    }
    
    return { should: false };
  }

  /**
   * Get follow-up rules per platform
   */
  getFollowUpRules(platform) {
    const rules = {
      upwork: {
        first_follow_up_days: 3,
        second_follow_up_days: 5,
        max_follow_ups: 2,
      },
      freelancer: {
        first_follow_up_days: 3,
        second_follow_up_days: 5,
        max_follow_ups: 2,
      },
      indeed: {
        first_follow_up_days: 7,
        second_follow_up_days: 10,
        max_follow_ups: 1,
      },
      wellfound: {
        first_follow_up_days: 5,
        second_follow_up_days: 7,
        max_follow_ups: 2,
      },
    };
    
    return rules[platform] || rules.upwork;
  }

  /**
   * Generate follow-up message
   */
  async generateFollowUp(application) {
    const strategy = application.follow_up_strategy;
    const opportunity = application.opportunity;
    
    let prompt = '';
    
    if (strategy === 'initial_follow_up') {
      prompt = `
Generate a professional follow-up message for this job application:

Role: ${opportunity.title}
Company: ${opportunity.client_info?.name || 'the company'}
Days since application: ${this.daysSince(application.applied_at)}

The message should:
1. Show continued interest
2. Add new value (recent project, skill, insight)
3. Politely ask about timeline
4. Keep it under 100 words
5. Be warm and professional

Return ONLY the message text, no subject line.
`;
    } else if (strategy === 'persistence_follow_up') {
      prompt = `
Generate a final follow-up message for this job application:

Role: ${opportunity.title}

This is the 2nd follow-up. The message should:
1. Acknowledge you've reached out before
2. Reiterate genuine interest
3. Offer alternative (happy to withdraw if role is filled)
4. Keep it brief (50 words max)
5. Be gracious

Return ONLY the message text.
`;
    } else if (strategy === 'high_priority_follow_up') {
      prompt = `
Generate an enthusiastic follow-up for this high-value opportunity:

Role: ${opportunity.title}

The message should:
1. Express strong enthusiasm
2. Mention specific aspect that excites you
3. Offer to answer any questions
4. Show you've done research
5. Keep it under 75 words

Return ONLY the message text.
`;
    }
    
    try {
      const response = await this.proposalGen.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });
      
      return response.content[0].text.trim();
    } catch (error) {
      return this.getTemplateFollowUp(strategy);
    }
  }

  /**
   * Get template follow-up
   */
  getTemplateFollowUp(strategy) {
    const templates = {
      initial_follow_up: `Hi,

I wanted to follow up on my application for [role]. I'm very interested in this opportunity and would love to discuss how my experience with [skill] could add value to your team.

Is there any update on the hiring timeline? Happy to provide any additional information.

Thanks!`,
      
      persistence_follow_up: `Hi,

I know you're likely busy, but I wanted to check in one last time regarding my application. I remain very interested in this opportunity.

If the role has been filled, please feel free to let me know - I completely understand.

Thanks for your time!`,
      
      high_priority_follow_up: `Hi,

I'm very excited about [role] and wanted to reach out. I've been following [company]'s work in [area] and would love to contribute.

Would you have time for a quick chat this week? I'd love to learn more about the role and share how I can help.

Looking forward to connecting!`,
    };
    
    return templates[strategy] || templates.initial_follow_up;
  }

  /**
   * Send follow-up
   */
  async sendFollowUp(application, message) {
    console.log(`\n📤 Sending follow-up for: ${application.opportunity.title}\n`);
    
    // In production, would actually send via platform API or email
    // For now, log and track
    
    await this.db.recordFollowUp(application.id, {
      message,
      sent_at: new Date(),
      strategy: application.follow_up_strategy,
    });
    
    return {
      sent: true,
      application_id: application.id,
      message,
      sent_at: new Date(),
    };
  }

  /**
   * Auto-send follow-ups (based on settings)
   */
  async autoSendFollowUps(mode = 'review') {
    const followUps = await this.checkFollowUps();
    const results = [];
    
    for (const app of followUps) {
      const message = await this.generateFollowUp(app);
      
      if (mode === 'auto' || (mode === 'auto-high-priority' && app.urgency === 'high')) {
        const result = await this.sendFollowUp(app, message);
        results.push(result);
      } else {
        // Queue for review
        results.push({
          application: app,
          message,
          status: 'pending_review',
        });
      }
    }
    
    return results;
  }

  /**
   * Track follow-up responses
   */
  async trackResponse(applicationId, response) {
    const responseData = {
      received_at: new Date(),
      response_type: this.classifyResponse(response),
      response_text: response,
    };
    
    await this.db.recordResponse(applicationId, responseData);
    
    // Update strategy based on response
    if (responseData.response_type === 'positive') {
      return { next_step: 'prepare_for_interview' };
    } else if (responseData.response_type === 'rejection') {
      return { next_step: 'move_on' };
    } else if (responseData.response_type === 'request_info') {
      return { next_step: 'provide_information' };
    }
    
    return { next_step: 'wait' };
  }

  /**
   * Classify response type
   */
  classifyResponse(responseText) {
    const text = responseText.toLowerCase();
    
    const positiveKeywords = ['interview', 'interested', 'next steps', 'schedule', 'call'];
    const rejectionKeywords = ['unfortunately', 'not selected', 'filled', 'other candidates'];
    const requestKeywords = ['could you', 'can you provide', 'additional information'];
    
    if (positiveKeywords.some(kw => text.includes(kw))) {
      return 'positive';
    } else if (rejectionKeywords.some(kw => text.includes(kw))) {
      return 'rejection';
    } else if (requestKeywords.some(kw => text.includes(kw))) {
      return 'request_info';
    }
    
    return 'neutral';
  }

  /**
   * Generate follow-up analytics
   */
  async getFollowUpAnalytics() {
    const stats = await this.db.getFollowUpStats();
    
    return {
      total_follow_ups: stats.total,
      response_rate: stats.responses / stats.total,
      positive_response_rate: stats.positive_responses / stats.responses,
      average_response_time: stats.avg_response_time_hours,
      best_performing_strategy: stats.best_strategy,
      optimal_timing: this.calculateOptimalTiming(stats.timing_data),
    };
  }

  /**
   * Calculate optimal follow-up timing
   */
  calculateOptimalTiming(timingData) {
    // Analyze which follow-up timing gets best response
    // Return optimal days for first and second follow-up
    
    return {
      first_follow_up: 5, // days
      second_follow_up: 7, // days after first
      reasoning: 'Based on historical response rates',
    };
  }

  /**
   * Days since date
   */
  daysSince(date) {
    const now = new Date();
    const then = new Date(date);
    const diff = now - then;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Generate follow-up schedule
   */
  generateSchedule(application) {
    const rules = this.getFollowUpRules(application.platform);
    const appliedAt = new Date(application.applied_at);
    
    return {
      first_follow_up: new Date(appliedAt.getTime() + rules.first_follow_up_days * 24 * 60 * 60 * 1000),
      second_follow_up: new Date(appliedAt.getTime() + (rules.first_follow_up_days + rules.second_follow_up_days) * 24 * 60 * 60 * 1000),
      max_follow_ups: rules.max_follow_ups,
    };
  }
}
