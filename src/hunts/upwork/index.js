import { Hunt } from '../../engines/hunt/Hunt.js';
import axios from 'axios';
import { createHash, createHmac } from 'crypto';

/**
 * Upwork Opportunity Scanner
 * Finds freelance gigs matching your skills on Upwork
 */
export class UpworkHunt extends Hunt {
  name = 'upwork-scanner';
  platform = 'upwork';
  frequency = 'hourly';
  
  constructor(config) {
    super(config);
    this.apiKey = process.env.UPWORK_API_KEY;
    this.apiSecret = process.env.UPWORK_API_SECRET;
    this.accessToken = process.env.UPWORK_ACCESS_TOKEN;
    this.accessSecret = process.env.UPWORK_ACCESS_SECRET;
    
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Upwork API credentials missing');
    }
  }

  /**
   * Scan Upwork for opportunities
   */
  async scan(skills = []) {
    console.log('🔍 Scanning Upwork...');
    
    const opportunities = [];
    const searchQueries = this.buildSearchQueries(skills);
    
    for (const query of searchQueries) {
      try {
        const jobs = await this.searchJobs(query);
        opportunities.push(...jobs);
      } catch (error) {
        console.error(`Search failed for query: ${query}`, error.message);
      }
      
      // Rate limiting: wait 500ms between requests
      await this.sleep(500);
    }
    
    // Deduplicate by job ID
    const unique = this.deduplicateJobs(opportunities);
    
    console.log(`✅ Found ${unique.length} unique opportunities`);
    return unique;
  }

  /**
   * Build search queries from skills
   */
  buildSearchQueries(skills) {
    const queries = [];
    
    // Primary skills (high proficiency)
    const primarySkills = skills
      .filter(s => s.proficiency >= 7)
      .slice(0, 5); // Top 5 skills
    
    primarySkills.forEach(skill => {
      queries.push(skill.name);
    });
    
    // Skill combinations
    if (primarySkills.length >= 2) {
      queries.push(
        `${primarySkills[0].name} ${primarySkills[1].name}`
      );
    }
    
    return queries.length > 0 ? queries : ['freelance'];
  }

  /**
   * Search Upwork jobs API
   */
  async searchJobs(query) {
    const endpoint = 'https://www.upwork.com/api/profiles/v2/search/jobs.json';
    
    const params = {
      q: query,
      sort: 'recency',
      paging: '0;50', // First 50 results
      budget: `${process.env.UPWORK_MIN_HOURLY_RATE || 50}-`,
    };
    
    const response = await this.makeRequest(endpoint, params);
    
    if (!response.jobs) {
      return [];
    }
    
    return response.jobs.map(job => this.parseJob(job));
  }

  /**
   * Parse Upwork job into our Opportunity format
   */
  parseJob(job) {
    return {
      platform: 'upwork',
      external_id: job.id,
      title: job.title,
      description: job.description,
      url: `https://www.upwork.com/jobs/${job.id}`,
      pay_min: this.extractPayMin(job),
      pay_max: this.extractPayMax(job),
      pay_type: job.job_type, // 'Hourly' or 'Fixed'
      required_skills: job.skills || [],
      discovered_at: new Date(),
      expires_at: job.date_posted ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
      client_info: {
        rating: job.client?.feedback,
        total_spent: job.client?.total_spent,
        hire_rate: job.client?.hire_rate,
        location: job.client?.location,
        payment_verified: job.client?.payment_verified,
      },
      metadata: {
        duration: job.duration,
        workload: job.workload,
        posted_on: job.date_created,
        proposals: job.proposals,
      },
    };
  }

  /**
   * Extract minimum pay rate
   */
  extractPayMin(job) {
    if (job.job_type === 'Hourly' && job.hourly_rate_min) {
      return parseFloat(job.hourly_rate_min);
    }
    if (job.job_type === 'Fixed' && job.budget) {
      return parseFloat(job.budget);
    }
    return null;
  }

  /**
   * Extract maximum pay rate
   */
  extractPayMax(job) {
    if (job.job_type === 'Hourly' && job.hourly_rate_max) {
      return parseFloat(job.hourly_rate_max);
    }
    if (job.job_type === 'Fixed' && job.budget) {
      return parseFloat(job.budget);
    }
    return null;
  }

  /**
   * Calculate match score for an opportunity
   */
  async score(opportunity, userSkills) {
    const skillMatch = this.calculateSkillMatch(
      opportunity.required_skills,
      userSkills
    );
    
    const payScore = this.calculatePayScore(
      opportunity.pay_min,
      userSkills
    );
    
    const clientScore = this.calculateClientScore(
      opportunity.client_info
    );
    
    const timeScore = this.calculateTimeScore(
      opportunity.metadata?.workload
    );
    
    // Weighted average
    const score = (
      0.40 * skillMatch +
      0.25 * payScore +
      0.20 * clientScore +
      0.10 * timeScore +
      0.05 * 0.75 // Base success probability
    );
    
    return Math.min(score, 1.0);
  }

  /**
   * Calculate skill match score
   */
  calculateSkillMatch(requiredSkills, userSkills) {
    if (!requiredSkills || requiredSkills.length === 0) {
      return 0.5; // Neutral if no skills listed
    }
    
    const matches = requiredSkills.filter(req =>
      userSkills.some(skill =>
        skill.name.toLowerCase().includes(req.toLowerCase()) ||
        req.toLowerCase().includes(skill.name.toLowerCase())
      )
    );
    
    return matches.length / requiredSkills.length;
  }

  /**
   * Calculate pay score
   */
  calculatePayScore(payMin, userSkills) {
    const minRate = parseFloat(process.env.UPWORK_MIN_HOURLY_RATE || 50);
    const targetRate = parseFloat(process.env.UPWORK_TARGET_HOURLY_RATE || 100);
    
    if (!payMin || payMin < minRate) {
      return 0.0;
    }
    
    if (payMin >= targetRate) {
      return 1.0;
    }
    
    return (payMin - minRate) / (targetRate - minRate);
  }

  /**
   * Calculate client quality score
   */
  calculateClientScore(clientInfo) {
    if (!clientInfo) return 0.5;
    
    const ratingScore = (clientInfo.rating || 0) / 5.0;
    const spendScore = (clientInfo.total_spent || 0) > 10000 ? 1.0 : 0.5;
    const hireScore = (clientInfo.hire_rate || 0) > 0.8 ? 1.0 : 0.5;
    
    return 0.5 * ratingScore + 0.3 * spendScore + 0.2 * hireScore;
  }

  /**
   * Calculate time commitment score
   */
  calculateTimeScore(workload) {
    const maxHoursPerWeek = parseFloat(process.env.UPWORK_MAX_TIME_COMMITMENT || 20);
    
    if (!workload) return 0.75;
    
    // Parse workload strings like "Less than 10 hrs/week"
    const hours = parseInt(workload.match(/\d+/)?.[0] || '10');
    
    if (hours <= maxHoursPerWeek) return 1.0;
    if (hours > maxHoursPerWeek * 2) return 0.0;
    
    return 1.0 - ((hours - maxHoursPerWeek) / maxHoursPerWeek);
  }

  /**
   * Make authenticated request to Upwork API
   */
  async makeRequest(endpoint, params) {
    // OAuth 1.0 signature generation
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = createHash('md5').update(timestamp.toString()).digest('hex');
    
    const oauthParams = {
      oauth_consumer_key: this.apiKey,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_token: this.accessToken,
      oauth_version: '1.0',
    };
    
    // Build signature
    const allParams = { ...oauthParams, ...params };
    const signature = this.generateSignature('GET', endpoint, allParams);
    oauthParams.oauth_signature = signature;
    
    // Make request
    const response = await axios.get(endpoint, {
      params,
      headers: {
        Authorization: this.buildAuthHeader(oauthParams),
      },
    });
    
    return response.data;
  }

  /**
   * Generate OAuth signature
   */
  generateSignature(method, url, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
    const signingKey = `${encodeURIComponent(this.apiSecret)}&${encodeURIComponent(this.accessSecret)}`;
    
    return createHmac('sha1', signingKey)
      .update(baseString)
      .digest('base64');
  }

  /**
   * Build OAuth Authorization header
   */
  buildAuthHeader(oauthParams) {
    const params = Object.keys(oauthParams)
      .map(key => `${key}="${encodeURIComponent(oauthParams[key])}"`)
      .join(', ');
    
    return `OAuth ${params}`;
  }

  /**
   * Deduplicate jobs by ID
   */
  deduplicateJobs(jobs) {
    const seen = new Set();
    return jobs.filter(job => {
      if (seen.has(job.external_id)) return false;
      seen.add(job.external_id);
      return true;
    });
  }

  /**
   * Sleep for ms milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
