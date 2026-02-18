import { ProposalGenerator } from '../action/ProposalGenerator.js';

/**
 * Salary Negotiation Coach
 * Real-time AI guidance during salary negotiations
 * 
 * BREAKTHROUGH - Live negotiation coaching!
 */
export class SalaryNegotiator {
  constructor(db) {
    this.db = db;
    this.proposalGen = new ProposalGenerator();
  }

  /**
   * Analyze offer and generate negotiation strategy
   */
  async analyzeOffer(offer, userProfile, marketData) {
    console.log('\n💵 Analyzing offer...\n');
    
    const analysis = {
      offer_value: this.calculateTotalValue(offer),
      market_comparison: this.compareToMarket(offer, marketData),
      negotiation_leverage: this.assessLeverage(offer, userProfile),
      recommended_ask: null,
      negotiation_strategy: null,
      talking_points: [],
      red_flags: [],
    };
    
    analysis.recommended_ask = this.calculateOptimalAsk(analysis);
    analysis.negotiation_strategy = this.generateStrategy(analysis);
    analysis.talking_points = this.generateTalkingPoints(analysis);
    analysis.red_flags = this.identifyRedFlags(offer);
    
    return analysis;
  }

  /**
   * Calculate total compensation value
   */
  calculateTotalValue(offer) {
    const base = offer.base_salary || 0;
    const bonus = offer.bonus || 0;
    const equity = this.estimateEquityValue(offer.equity);
    const benefits = this.estimateBenefitsValue(offer.benefits);
    
    return {
      base_salary: base,
      annual_bonus: bonus,
      equity_value: equity,
      benefits_value: benefits,
      total_compensation: base + bonus + equity + benefits,
    };
  }

  /**
   * Estimate equity value
   */
  estimateEquityValue(equity) {
    if (!equity) return 0;
    
    // RSUs: Pretty straightforward
    if (equity.type === 'rsu') {
      return equity.amount * equity.current_price;
    }
    
    // Options: More complex
    if (equity.type === 'options') {
      const spread = equity.current_fmv - equity.strike_price;
      return equity.shares * spread * 0.7; // Discount for risk
    }
    
    return 0;
  }

  /**
   * Estimate benefits value
   */
  estimateBenefitsValue(benefits) {
    if (!benefits) return 0;
    
    let value = 0;
    
    // Health insurance: $12K/year average
    if (benefits.health_insurance) value += 12000;
    
    // 401k match: ~5% of salary
    if (benefits.retirement_match) value += benefits.base_salary * 0.05;
    
    // PTO: Convert to cash value
    if (benefits.pto_days) {
      const daily_rate = benefits.base_salary / 260;
      value += benefits.pto_days * daily_rate;
    }
    
    return value;
  }

  /**
   * Compare to market rates
   */
  compareToMarket(offer, marketData) {
    const offeredBase = offer.base_salary;
    const marketMedian = marketData.median_salary;
    const marketP75 = marketData.p75_salary;
    const marketP90 = marketData.p90_salary;
    
    const percentile = this.calculatePercentile(offeredBase, marketData);
    
    let assessment = '';
    if (percentile >= 75) assessment = 'Excellent offer (top 25%)';
    else if (percentile >= 50) assessment = 'Fair offer (above median)';
    else if (percentile >= 25) assessment = 'Below average (25th-50th percentile)';
    else assessment = 'Low offer (bottom 25%)';
    
    return {
      percentile,
      assessment,
      gap_to_median: marketMedian - offeredBase,
      gap_to_p75: marketP75 - offeredBase,
      gap_to_p90: marketP90 - offeredBase,
    };
  }

  /**
   * Calculate salary percentile
   */
  calculatePercentile(salary, marketData) {
    if (salary >= marketData.p90_salary) return 90;
    if (salary >= marketData.p75_salary) return 75;
    if (salary >= marketData.median_salary) return 50;
    if (salary >= marketData.p25_salary) return 25;
    return 10;
  }

  /**
   * Assess negotiation leverage
   */
  assessLeverage(offer, userProfile) {
    let leverage = 0.5; // Base
    
    // Multiple offers = high leverage
    if (userProfile.other_offers >= 2) leverage += 0.3;
    else if (userProfile.other_offers === 1) leverage += 0.2;
    
    // Unique skills = leverage
    if (userProfile.rare_skills > 0) leverage += 0.15;
    
    // They reached out first = leverage
    if (offer.sourced_by === 'recruiter') leverage += 0.10;
    
    // Currently employed = leverage
    if (userProfile.currently_employed) leverage += 0.10;
    
    return Math.min(leverage, 0.95);
  }

  /**
   * Calculate optimal ask
   */
  calculateOptimalAsk(analysis) {
    const current = analysis.offer_value.base_salary;
    const leverage = analysis.negotiation_leverage;
    const marketGap = analysis.market_comparison.gap_to_p75;
    
    // High leverage: aim for P75 or higher
    if (leverage >= 0.75) {
      return {
        base_salary: current + marketGap,
        reasoning: 'Strong leverage - aim for 75th percentile',
        confidence: 0.85,
      };
    }
    
    // Moderate leverage: aim for 10-15% increase
    if (leverage >= 0.50) {
      return {
        base_salary: Math.round(current * 1.15),
        reasoning: 'Moderate leverage - 15% increase is reasonable',
        confidence: 0.70,
      };
    }
    
    // Low leverage: 5-10% increase
    return {
      base_salary: Math.round(current * 1.08),
      reasoning: 'Limited leverage - 8% increase is realistic',
      confidence: 0.60,
    };
  }

  /**
   * Generate negotiation strategy
   */
  generateStrategy(analysis) {
    const leverage = analysis.negotiation_leverage;
    
    if (leverage >= 0.75) {
      return {
        approach: 'aggressive',
        first_ask: analysis.recommended_ask.base_salary * 1.05, // Ask 5% higher
        walk_away_point: analysis.offer_value.base_salary * 1.10,
        tactics: [
          'Lead with competing offers',
          'Emphasize unique value',
          'Request accelerated review timeline',
          'Negotiate equity AND salary',
        ],
      };
    } else if (leverage >= 0.50) {
      return {
        approach: 'balanced',
        first_ask: analysis.recommended_ask.base_salary,
        walk_away_point: analysis.offer_value.base_salary * 1.05,
        tactics: [
          'Focus on market data',
          'Highlight specific skills',
          'Be open to creative comp packages',
          'Consider sign-on bonus',
        ],
      };
    } else {
      return {
        approach: 'conservative',
        first_ask: analysis.recommended_ask.base_salary,
        walk_away_point: analysis.offer_value.base_salary,
        tactics: [
          'Express enthusiasm first',
          'Ask politely for market rate',
          'Focus on growth potential',
          'Consider accepting with review milestone',
        ],
      };
    }
  }

  /**
   * Generate talking points
   */
  generateTalkingPoints(analysis) {
    const points = [];
    
    // Market data point
    if (analysis.market_comparison.gap_to_median > 0) {
      points.push(
        `Market research shows the median salary for this role is $${analysis.market_comparison.gap_to_median + analysis.offer_value.base_salary}`
      );
    }
    
    // Unique value
    points.push('My expertise in [top skill] is particularly valuable for [specific project/goal]');
    
    // Competing offers (if applicable)
    if (analysis.negotiation_leverage >= 0.70) {
      points.push('I have other offers I\'m considering, but I\'m most excited about this opportunity');
    }
    
    // Growth mindset
    points.push('I\'m committed to growing with the company and exceeding expectations');
    
    return points;
  }

  /**
   * Identify red flags in offer
   */
  identifyRedFlags(offer) {
    const flags = [];
    
    // No equity at startup
    if (offer.company_stage === 'startup' && !offer.equity) {
      flags.push('⚠️  No equity offer at startup (unusual)');
    }
    
    // Below market
    if (offer.base_salary < offer.market_median * 0.85) {
      flags.push('⚠️  Offer is 15%+ below market');
    }
    
    // Vague terms
    if (!offer.written_offer) {
      flags.push('⚠️  No written offer yet (verbal only)');
    }
    
    // Long vesting
    if (offer.equity?.vesting_years > 5) {
      flags.push('⚠️  Unusually long vesting period');
    }
    
    return flags;
  }

  /**
   * Generate counter-offer script
   */
  generateCounterScript(analysis) {
    const ask = analysis.recommended_ask;
    
    return `
Thank you so much for the offer! I'm very excited about the opportunity to join [Company] as a [Role].

After careful consideration and researching market rates for similar positions, I was hoping we could discuss the compensation package.

Based on my [X years] of experience and expertise in [key skills], along with market data showing comparable roles at $${ask.base_salary}, I was hoping for a base salary closer to that range.

I'm confident I can deliver significant value in [specific area], and I'm committed to exceeding expectations in this role.

Is there flexibility in the compensation to bridge this gap?

I'm happy to discuss this further and find a package that works for both of us.
`;
  }

  /**
   * Real-time coaching during call
   */
  async coachDuringCall(scenario, userMessage) {
    // User describes what recruiter just said
    // AI provides real-time response suggestion
    
    const prompt = `
Scenario: ${scenario}
Recruiter said: "${userMessage}"

Provide a strong, confident response that:
1. Maintains enthusiasm
2. Stands firm on value
3. Keeps negotiation moving forward

Response:
`;
    
    const response = await this.proposalGen.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });
    
    return response.content[0].text;
  }
}
