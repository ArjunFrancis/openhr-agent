import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

/**
 * AI Proposal Generator
 * Uses Claude to generate custom proposals for opportunities
 */
export class ProposalGenerator {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Generate a proposal for an opportunity
   */
  async generate(opportunity, userProfile, userSkills) {
    const prompt = this.buildPrompt(opportunity, userProfile, userSkills);
    
    console.log('\n🤖 Generating proposal with AI...\n');
    
    try {
      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });
      
      const proposal = message.content[0].text;
      
      return {
        proposal,
        generated_at: new Date(),
        opportunity_id: opportunity.id,
        model: 'claude-sonnet-4-20250514',
      };
    } catch (error) {
      console.error('❌ Proposal generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Build the prompt for proposal generation
   */
  buildPrompt(opportunity, profile, skills) {
    const skillsList = skills
      .filter(s => s.proficiency >= 6)
      .slice(0, 10)
      .map(s => `${s.name} (${s.proficiency}/10 proficiency)`)
      .join('\n');
    
    return `You are a freelance proposal writer. Write a compelling, personalized proposal for this opportunity.

OPPORTUNITY:
Title: ${opportunity.title}
Description: ${opportunity.description}
Pay: $${opportunity.pay_min}-${opportunity.pay_max}${opportunity.pay_type === 'hourly' ? '/hr' : ''}
Required Skills: ${opportunity.required_skills?.join(', ') || 'Not specified'}
Platform: ${opportunity.platform}

MY PROFILE:
GitHub: ${profile.github_username}
Email: ${profile.email}
Minimum Rate: $${profile.min_hourly_rate}/hr
Availability: ${profile.availability_hours_per_week} hours/week

MY TOP SKILLS:
${skillsList}

REQUIREMENTS:
1. Be professional but personable
2. Highlight 2-3 most relevant skills from my profile
3. Show I understand their specific need
4. Be concise (150-250 words)
5. End with a clear call-to-action
6. Don't mention AI or being an agent
7. Write in first person as if I'm writing it
8. Don't use overly salesy language

Write the proposal now:`;
  }

  /**
   * Generate multiple proposal variations
   */
  async generateVariations(opportunity, profile, skills, count = 3) {
    const variations = [];
    
    for (let i = 0; i < count; i++) {
      const tone = ['professional', 'casual', 'technical'][i];
      const proposal = await this.generateWithTone(opportunity, profile, skills, tone);
      
      variations.push({
        ...proposal,
        tone,
        variation: i + 1,
      });
    }
    
    return variations;
  }

  /**
   * Generate proposal with specific tone
   */
  async generateWithTone(opportunity, profile, skills, tone) {
    const basePrompt = this.buildPrompt(opportunity, profile, skills);
    const toneInstruction = {
      'professional': 'Use formal, corporate tone',
      'casual': 'Use friendly, conversational tone',
      'technical': 'Use technical, detail-oriented tone',
    };
    
    const prompt = `${basePrompt}\n\nTone: ${toneInstruction[tone]}`;
    
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });
    
    return {
      proposal: message.content[0].text,
      generated_at: new Date(),
      opportunity_id: opportunity.id,
      tone,
    };
  }

  /**
   * Improve an existing proposal
   */
  async improve(existingProposal, feedback) {
    const prompt = `Improve this freelance proposal based on the feedback:

ORIGINAL PROPOSAL:
${existingProposal}

FEEDBACK:
${feedback}

Requirements:
- Keep the same length (150-250 words)
- Maintain professional tone
- Address the specific feedback
- Keep it personalized

Write the improved proposal:`;
    
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });
    
    return message.content[0].text;
  }

  /**
   * Score a proposal (1-10)
   */
  async scoreProposal(proposal, opportunity) {
    const prompt = `Score this freelance proposal on a scale of 1-10.

OPPORTUNITY:
${opportunity.title}
Required: ${opportunity.required_skills?.join(', ')}

PROPOSAL:
${proposal}

Criteria:
- Relevance to requirements (30%)
- Professionalism (25%)
- Clarity and conciseness (25%)
- Call-to-action (20%)

Respond with ONLY a number between 1-10, no explanation.`;
    
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });
    
    const score = parseInt(message.content[0].text.trim());
    return isNaN(score) ? 5 : score;
  }
}
