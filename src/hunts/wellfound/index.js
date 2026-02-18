import { Hunt } from '../../engines/hunt/Hunt.js';
import axios from 'axios';

/**
 * Wellfound (AngelList) Hunt
 * Startup jobs with equity compensation
 * 
 * UNIQUE VALUE: Equity-focused opportunities
 */
export class WellfoundHunt extends Hunt {
  name = 'wellfound-scanner';
  platform = 'wellfound';
  frequency = 'daily';
  
  constructor(config) {
    super(config);
    this.apiKey = process.env.WELLFOUND_API_KEY;
    this.baseUrl = 'https://api.wellfound.com/v1';
  }

  async scan(skills = []) {
    console.log('🚀 Scanning Wellfound (AngelList) for startup opportunities...');
    
    const jobs = [];
    const roles = this.mapSkillsToRoles(skills);
    
    for (const role of roles) {
      try {
        const roleJobs = await this.searchRole(role);
        jobs.push(...roleJobs);
        await this.sleep(1000);
      } catch (error) {
        console.error(`Role search failed: ${role}`, error.message);
      }
    }
    
    const unique = this.deduplicateJobs(jobs);
    console.log(`✅ Found ${unique.length} startup opportunities`);
    
    return unique;
  }

  mapSkillsToRoles(skills) {
    const roles = new Set();
    
    skills.forEach(skill => {
      const name = skill.name.toLowerCase();
      
      if (['python', 'javascript', 'react', 'node'].some(t => name.includes(t))) {
        roles.add('software-engineer');
      }
      if (['product', 'pm'].some(t => name.includes(t))) {
        roles.add('product-manager');
      }
      if (['design', 'ui', 'ux'].some(t => name.includes(t))) {
        roles.add('designer');
      }
      if (['marketing', 'growth'].some(t => name.includes(t))) {
        roles.add('marketing');
      }
      if (['sales', 'business development'].some(t => name.includes(t))) {
        roles.add('sales');
      }
    });
    
    return Array.from(roles);
  }

  async searchRole(role) {
    // In production, use actual Wellfound API
    // For now, simulating the structure
    
    const jobs = this.simulateWellfoundJobs(role);
    return jobs.map(job => this.parseJob(job));
  }

  simulateWellfoundJobs(role) {
    // Placeholder - in production would call real API
    return [
      {
        id: `wf-${role}-1`,
        title: `Senior ${role.replace('-', ' ')}`,
        company: {
          name: 'TechStartup',
          stage: 'Series A',
          funding: '$10M',
          size: '20-50',
        },
        salary: {
          min: 80000,
          max: 150000,
          equity: '0.1-0.5%',
        },
        remote: true,
        description: `Join our fast-growing startup as a ${role}`,
      },
    ];
  }

  parseJob(job) {
    return {
      platform: 'wellfound',
      external_id: job.id,
      title: job.title,
      description: job.description,
      url: `https://wellfound.com/jobs/${job.id}`,
      pay_min: job.salary?.min || 0,
      pay_max: job.salary?.max || 0,
      pay_type: 'yearly',
      equity: job.salary?.equity,
      discovered_at: new Date(),
      client_info: {
        name: job.company.name,
        stage: job.company.stage,
        funding: job.company.funding,
        size: job.company.size,
      },
      metadata: {
        remote_type: job.remote ? 'remote' : 'onsite',
        job_type: 'full-time',
        equity_available: true,
      },
    };
  }

  async score(job, userSkills) {
    const skillMatch = this.calculateSkillMatch(job, userSkills);
    const equityScore = this.calculateEquityScore(job);
    const stageScore = this.calculateStageScore(job);
    const salaryScore = this.calculateSalaryScore(job);
    
    return Math.min(
      0.35 * skillMatch +
      0.25 * equityScore +
      0.20 * stageScore +
      0.20 * salaryScore,
      1.0
    );
  }

  calculateSkillMatch(job, userSkills) {
    const jobText = `${job.title} ${job.description}`.toLowerCase();
    const matches = userSkills.filter(skill =>
      jobText.includes(skill.name.toLowerCase())
    );
    
    return userSkills.length > 0 ? matches.length / userSkills.length : 0.5;
  }

  calculateEquityScore(job) {
    if (!job.equity) return 0.3;
    
    // Parse equity range (e.g., "0.1-0.5%")
    const match = job.equity.match(/([\d.]+)/);
    if (!match) return 0.5;
    
    const equityPercent = parseFloat(match[1]);
    
    // More equity = higher score
    if (equityPercent >= 1.0) return 1.0;
    if (equityPercent >= 0.5) return 0.85;
    if (equityPercent >= 0.25) return 0.70;
    if (equityPercent >= 0.1) return 0.60;
    return 0.50;
  }

  calculateStageScore(job) {
    const stage = job.client_info?.stage?.toLowerCase() || '';
    
    // Different stages have different risk/reward
    if (stage.includes('series a')) return 0.85; // Good balance
    if (stage.includes('series b')) return 0.75; // More stable
    if (stage.includes('seed')) return 0.90; // Higher equity potential
    if (stage.includes('series c+')) return 0.60; // Lower equity
    
    return 0.70;
  }

  calculateSalaryScore(job) {
    const avg = (job.pay_min + job.pay_max) / 2;
    
    // Startup salaries are often lower, adjust expectations
    if (avg >= 150000) return 1.0;
    if (avg >= 120000) return 0.85;
    if (avg >= 100000) return 0.75;
    if (avg >= 80000) return 0.65;
    return 0.50;
  }

  deduplicateJobs(jobs) {
    const seen = new Set();
    return jobs.filter(job => {
      if (seen.has(job.external_id)) return false;
      seen.add(job.external_id);
      return true;
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Special: Calculate total comp including equity
   */
  calculateTotalCompensation(job, years = 4) {
    const baseSalary = (job.pay_min + job.pay_max) / 2;
    
    if (!job.equity) return baseSalary;
    
    // Estimate equity value
    const equityMatch = job.equity.match(/([\d.]+)/);
    if (!equityMatch) return baseSalary;
    
    const equityPercent = parseFloat(equityMatch[1]) / 100;
    
    // Rough valuation based on stage
    const valuations = {
      'seed': 5000000,
      'series a': 20000000,
      'series b': 75000000,
      'series c+': 300000000,
    };
    
    const stage = job.client_info?.stage?.toLowerCase() || 'seed';
    const stageKey = Object.keys(valuations).find(k => stage.includes(k)) || 'seed';
    const valuation = valuations[stageKey];
    
    const equityValue = valuation * equityPercent;
    const annualEquityValue = equityValue / years; // Vesting period
    
    return {
      base_salary: baseSalary,
      equity_annual_value: annualEquityValue,
      total_annual: baseSalary + annualEquityValue,
      equity_total_value: equityValue,
    };
  }
}
