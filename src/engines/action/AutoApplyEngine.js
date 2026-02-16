import { ProposalGenerator } from './ProposalGenerator.js';
import { EmailNotifier } from '../notifications/EmailNotifier.js';
import { SlackNotifier } from '../notifications/SlackNotifier.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Auto-Apply Engine
 * Autonomous application submission with approval gates
 */
export class AutoApplyEngine {
  constructor(db) {
    this.db = db;
    this.proposalGenerator = new ProposalGenerator();
    this.emailNotifier = new EmailNotifier();
    this.slackNotifier = new SlackNotifier();
    
    // Configuration
    this.enabled = process.env.AUTO_APPLY_ENABLED === 'true';
    this.threshold = parseFloat(process.env.AUTO_APPLY_THRESHOLD || 0.80);
    this.mode = process.env.APPROVAL_MODE || 'review-first';
    this.lowStakesLimit = parseFloat(process.env.LOW_STAKES_LIMIT || 500);
  }

  /**
   * Process opportunities and auto-apply based on rules
   */
  async processOpportunities() {
    if (!this.enabled) {
      console.log('⚠️  Auto-apply disabled');
      return [];
    }
    
    console.log('\n🤖 Auto-Apply Engine starting...\n');
    
    // Get high-scoring unapplied opportunities
    const opportunities = await this.db.getOpportunities({
      status: 'new',
      minScore: this.threshold,
      limit: 20,
    });
    
    if (opportunities.length === 0) {
      console.log('No qualifying opportunities found');
      return [];
    }
    
    console.log(`Found ${opportunities.length} opportunities above threshold`);
    
    const profile = await this.db.getProfile();
    const skills = await this.db.getSkills();
    
    const results = [];
    
    for (const opp of opportunities) {
      try {
        const result = await this.processOpportunity(opp, profile, skills);
        results.push(result);
      } catch (error) {
        console.error(`Failed to process ${opp.title}:`, error.message);
      }
    }
    
    return results;
  }

  /**
   * Process a single opportunity
   */
  async processOpportunity(opportunity, profile, skills) {
    const decision = this.shouldAutoApply(opportunity);
    
    console.log(`\n📋 ${opportunity.title}`);
    console.log(`   Score: ${(opportunity.match_score * 100).toFixed(0)}%`);
    console.log(`   Decision: ${decision.action}`);
    
    if (decision.action === 'skip') {
      return { opportunity, action: 'skip', reason: decision.reason };
    }
    
    // Generate proposal
    console.log('   🤖 Generating proposal...');
    const proposal = await this.proposalGenerator.generate(
      opportunity,
      profile,
      skills
    );
    
    if (decision.action === 'auto-apply') {
      // Auto-submit (low-stakes, high-confidence)
      console.log('   ✅ Auto-applying...');
      
      await this.submitApplication(opportunity, proposal);
      
      await this.emailNotifier.send(
        `✅ Auto-Applied: ${opportunity.title}`,
        `<p>OpenHR AI automatically applied to this opportunity:</p>
         <h3>${opportunity.title}</h3>
         <p>Score: ${(opportunity.match_score * 100).toFixed(0)}%</p>
         <p>Your proposal:</p>
         <blockquote>${proposal.proposal}</blockquote>`
      );
      
      return { opportunity, action: 'auto-applied', proposal };
    }
    
    if (decision.action === 'request-approval') {
      // Generate and save, but request approval
      console.log('   ⏳ Approval required');
      
      await this.requestApproval(opportunity, proposal);
      
      return { opportunity, action: 'pending-approval', proposal };
    }
  }

  /**
   * Decide if we should auto-apply to an opportunity
   */
  shouldAutoApply(opportunity) {
    // Mode: review-first
    if (this.mode === 'review-first') {
      return {
        action: 'request-approval',
        reason: 'Review-first mode enabled',
      };
    }
    
    // Mode: auto-low-stakes
    if (this.mode === 'auto-low-stakes') {
      const isLowStakes = (opportunity.pay_max || opportunity.pay_min || 0) < this.lowStakesLimit;
      const isHighConfidence = opportunity.match_score >= 0.85;
      
      if (isLowStakes && isHighConfidence) {
        return {
          action: 'auto-apply',
          reason: 'Low stakes + high confidence',
        };
      }
      
      return {
        action: 'request-approval',
        reason: isLowStakes ? 'Confidence too low' : 'Stakes too high',
      };
    }
    
    // Mode: full-auto
    if (this.mode === 'full-auto') {
      return {
        action: 'auto-apply',
        reason: 'Full auto mode',
      };
    }
    
    return { action: 'skip', reason: 'Unknown mode' };
  }

  /**
   * Submit application to platform
   */
  async submitApplication(opportunity, proposal) {
    // Save to applications table
    const application = {
      opportunity_id: opportunity.id,
      proposal_text: proposal.proposal,
      proposal_generated_by: 'ai',
      status: 'pending',
      skills_used: opportunity.required_skills,
    };
    
    // TODO: Actually submit via platform API
    // For now, just save to database
    const query = `
      INSERT INTO applications (
        opportunity_id, proposal_text, proposal_generated_by, 
        submitted_at, status, skills_used
      ) VALUES ($1, $2, $3, NOW(), $4, $5)
      RETURNING *
    `;
    
    const result = await this.db.pool.query(query, [
      application.opportunity_id,
      application.proposal_text,
      application.proposal_generated_by,
      application.status,
      application.skills_used,
    ]);
    
    // Update opportunity status
    await this.db.pool.query(
      'UPDATE opportunities SET status = $1 WHERE id = $2',
      ['applied', opportunity.id]
    );
    
    console.log('   💾 Application saved to database');
    
    return result.rows[0];
  }

  /**
   * Request approval from user
   */
  async requestApproval(opportunity, proposal) {
    // Save as draft
    await this.db.pool.query(
      `INSERT INTO applications (
        opportunity_id, proposal_text, proposal_generated_by,
        status, skills_used
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        opportunity.id,
        proposal.proposal,
        'ai',
        'draft',
        opportunity.required_skills,
      ]
    );
    
    // Update opportunity to reviewing
    await this.db.pool.query(
      'UPDATE opportunities SET status = $1 WHERE id = $2',
      ['reviewing', opportunity.id]
    );
    
    // Send approval request
    await this.emailNotifier.send(
      `⏳ Approval Needed: ${opportunity.title}`,
      `
        <h2>High-Value Opportunity Needs Your Approval</h2>
        <h3>${opportunity.title}</h3>
        <p><strong>Score:</strong> ${(opportunity.match_score * 100).toFixed(0)}%</p>
        <p><strong>Pay:</strong> $${opportunity.pay_min}-${opportunity.pay_max}</p>
        <p><strong>Platform:</strong> ${opportunity.platform}</p>
        
        <h4>Generated Proposal:</h4>
        <blockquote style="background: #f5f5f5; padding: 15px; border-left: 4px solid #667eea;">
          ${proposal.proposal}
        </blockquote>
        
        <div style="margin: 30px 0;">
          <a href="http://localhost:3000/apply/${opportunity.id}/approve" 
             style="display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; margin-right: 10px;">
            ✅ Approve & Apply
          </a>
          <a href="http://localhost:3000/apply/${opportunity.id}/edit"
             style="display: inline-block; padding: 12px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 8px; margin-right: 10px;">
            ✏️ Edit Proposal
          </a>
          <a href="http://localhost:3000/apply/${opportunity.id}/reject"
             style="display: inline-block; padding: 12px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 8px;">
            ❌ Reject
          </a>
        </div>
        
        <p><small>View in dashboard: <a href="http://localhost:3000/opportunities">http://localhost:3000/opportunities</a></small></p>
      `
    );
    
    console.log('   📧 Approval request sent');
  }

  /**
   * Get stats on auto-apply performance
   */
  async getStats(period = 'month') {
    let dateFilter = '';
    
    if (period === 'week') {
      dateFilter = "AND submitted_at >= NOW() - INTERVAL '7 days'";
    } else if (period === 'month') {
      dateFilter = "AND submitted_at >= NOW() - INTERVAL '30 days'";
    }
    
    const query = `
      SELECT 
        COUNT(*) as total_applications,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE proposal_generated_by = 'ai') as ai_generated,
        AVG(CASE WHEN status = 'accepted' THEN 1.0 ELSE 0.0 END) as success_rate
      FROM applications
      WHERE 1=1 ${dateFilter}
    `;
    
    const result = await this.db.pool.query(query);
    return result.rows[0];
  }
}
