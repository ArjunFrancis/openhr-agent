import { Hunt } from '../../engines/hunt/Hunt.js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * AngelList (Wellfound) Hunt
 * Finds startup jobs and equity opportunities
 */
export class AngelListHunt extends Hunt {
  name = 'angellist-scanner';
  platform = 'angellist';
  frequency = 'daily';
  
  constructor(config) {
    super(config);
    this.apiKey = process.env.ANGELLIST_API_KEY;
    this.baseURL = 'https://api.wellfound.com/v1';
  }

  async scan(skills = []) {
    console.log('🚀 Scanning AngelList/Wellfound for startup opportunities...');
    
    const opportunities = [];
    
    // Search by role types
    const roleTypes = this.mapSkillsToRoles(skills);
    
    for (const role of roleTypes) {
      try {
        const results = await this.searchByRole(role, skills);
        opportunities.push(...results);
      } catch (error) {
        console.error(`Role search failed: ${role}`, error.message);
      }
      
      await this.sleep(1500);
    }
    
    const unique = this.deduplicateOpportunities(opportunities);
    console.log(`✅ Found ${unique.length} startup opportunities`);
    
    return unique;
  }

  mapSkillsToRoles(skills) {
    const roles = new Set();
    
    skills.forEach(skill => {
      const skillName = skill.name.toLowerCase();
      
      if (['python', 'javascript', 'react', 'node'].some(s => skillName.includes(s))) {
        roles.add('engineer');
        roles.add('full-stack');
      }
      
      if (['product', 'pm', 'management'].some(s => skillName.includes(s))) {
        roles.add('product-manager');
      }
      
      if (['design', 'ux', 'ui'].some(s => skillName.includes(s))) {
        roles.add('designer');
      }
      
      if (['sales', 'business development'].some(s => skillName.includes(s))) {
        roles.add('sales');
      }
      
      if (['marketing', 'growth'].some(s => skillName.includes(s))) {
        roles.add('marketing');
      }
    });
    
    return Array.from(roles);
  }

  async searchByRole(role, skills) {
    const response = await axios.get(`${this.baseURL}/jobs`, {
      params: {
        role: role,
        remote: process.env.ANGELLIST_REMOTE_ONLY || true,
        equity: true, // Always prioritize equity opportunities
      },
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });
    
    return response.data.jobs.map(job => this.parseOpportunity(job));
  }

  parseOpportunity(job) {
    return {
      platform: 'angellist',
      external_id: job.id.toString(),
      title: job.title,
      company: job.startup?.name,
      description: job.description,
      url: `https://wellfound.com/company/${job.startup?.slug}/jobs/${job.id}`,
      
      // Startup-specific data
      startup_info: {
        name: job.startup?.name,
        stage: job.startup?.stage, // seed, series-a, series-b, etc.
        size: job.startup?.company_size,
        funding: job.startup?.total_funding,
        investors: job.startup?.investors,
        location: job.startup?.location,
        markets: job.startup?.markets, // tech sectors
      },
      
      // Compensation
      pay_min: job.salary_min,
      pay_max: job.salary_max,
      pay_type: 'annual',
      equity_min: job.equity_min, // Equity % offered
      equity_max: job.equity_max,
      
      // Requirements
      required_skills: job.skills || [],
      experience_required: job.min_experience,
      
      discovered_at: new Date(),
      expires_at: job.application_deadline,
      
      // Metadata
      metadata: {
        remote: job.remote_ok,
        visa_sponsor: job.visa_sponsored,
        relocate_assistance: job.relocate_assistance,
        benefits: job.benefits,
        culture: job.startup?.culture_tags,
      },
    };
  }

  async score(opportunity, userSkills) {
    const skillMatch = this.calculateSkillMatch(
      opportunity.required_skills,
      userSkills
    );
    
    const equityScore = this.calculateEquityScore(
      opportunity.equity_min,
      opportunity.equity_max,
      opportunity.startup_info.stage
    );
    
    const startupScore = this.calculateStartupScore(
      opportunity.startup_info
    );
    
    const salaryScore = this.calculateSalaryScore(
      opportunity.pay_min,
      opportunity.pay_max
    );
    
    // Weight equity heavily for startups
    return (
      0.35 * skillMatch +
      0.30 * equityScore +
      0.20 * startupScore +
      0.15 * salaryScore
    );
  }

  calculateSkillMatch(requiredSkills, userSkills) {
    if (!requiredSkills || requiredSkills.length === 0) return 0.6;
    
    const matches = requiredSkills.filter(req =>
      userSkills.some(skill =>
        skill.name.toLowerCase().includes(req.toLowerCase()) ||
        req.toLowerCase().includes(skill.name.toLowerCase())
      )
    );
    
    return matches.length / requiredSkills.length;
  }

  calculateEquityScore(equityMin, equityMax, stage) {
    // Equity score based on percentage and startup stage
    const equity = equityMax || equityMin || 0;
    
    // Stage multipliers (earlier = riskier but potentially higher return)
    const stageMultipliers = {
      'seed': 1.5,
      'series-a': 1.3,
      'series-b': 1.1,
      'series-c': 1.0,
      'series-d': 0.9,
    };
    
    const multiplier = stageMultipliers[stage] || 1.0;
    
    // 0.5% equity = 0.5 score, 1% = 1.0 score (capped)
    const rawScore = equity / 0.5;
    
    return Math.min(rawScore * multiplier, 1.0);
  }

  calculateStartupScore(startupInfo) {
    let score = 0.5; // Base score
    
    // Has funding
    if (startupInfo.funding > 1000000) score += 0.2;
    if (startupInfo.funding > 10000000) score += 0.1;
    
    // Has notable investors
    if (startupInfo.investors && startupInfo.investors.length > 0) {
      score += 0.1;
    }
    
    // Later stage = more stable
    const stageScores = {
      'seed': 0.0,
      'series-a': 0.1,
      'series-b': 0.2,
      'series-c': 0.3,
    };
    
    score += stageScores[startupInfo.stage] || 0.0;
    
    return Math.min(score, 1.0);
  }

  calculateSalaryScore(minSalary, maxSalary) {
    const userMin = parseInt(process.env.ANGELLIST_MIN_SALARY || '80000');
    const userTarget = userMin * 1.3;
    
    const salary = maxSalary || minSalary || userMin;
    
    if (salary < userMin) return 0.3; // Some penalty but equity matters more
    if (salary >= userTarget) return 1.0;
    
    return 0.5 + (salary - userMin) / (userTarget - userMin) * 0.5;
  }

  deduplicateOpportunities(opportunities) {
    const seen = new Set();
    return opportunities.filter(opp => {
      if (seen.has(opp.external_id)) return false;
      seen.add(opp.external_id);
      return true;
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get startup stage recommendations based on user profile
   */
  getStageRecommendation(userProfile) {
    const yearsExperience = userProfile.years_experience || 0;
    const riskTolerance = userProfile.risk_tolerance || 'medium';
    
    if (yearsExperience < 3 || riskTolerance === 'low') {
      return ['series-b', 'series-c', 'series-d']; // More established
    } else if (yearsExperience >= 7 && riskTolerance === 'high') {
      return ['seed', 'series-a']; // High risk, high reward
    } else {
      return ['series-a', 'series-b']; // Balanced
    }
  }
}
