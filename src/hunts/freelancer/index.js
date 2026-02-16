import { Hunt } from '../../engines/hunt/Hunt.js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Freelancer.com Opportunity Scanner
 * Finds freelance projects matching your skills
 */
export class FreelancerHunt extends Hunt {
  name = 'freelancer-scanner';
  platform = 'freelancer';
  frequency = 'hourly';
  
  constructor(config) {
    super(config);
    this.apiKey = process.env.FREELANCER_API_KEY;
    this.baseURL = 'https://www.freelancer.com/api';
    
    if (!this.apiKey) {
      throw new Error('Freelancer API key missing');
    }
  }

  /**
   * Scan Freelancer for projects
   */
  async scan(skills = []) {
    console.log('🔍 Scanning Freelancer.com...');
    
    const projects = [];
    const searchQueries = this.buildSearchQueries(skills);
    
    for (const query of searchQueries) {
      try {
        const results = await this.searchProjects(query);
        projects.push(...results);
      } catch (error) {
        console.error(`Search failed for: ${query}`, error.message);
      }
      
      // Rate limiting: 200 requests/hour = 18 seconds between requests
      await this.sleep(1000);
    }
    
    // Deduplicate by project ID
    const unique = this.deduplicateProjects(projects);
    
    console.log(`✅ Found ${unique.length} unique projects`);
    return unique;
  }

  /**
   * Build search queries from skills
   */
  buildSearchQueries(skills) {
    const queries = [];
    
    // Top skills
    const topSkills = skills
      .filter(s => s.proficiency >= 7)
      .slice(0, 5);
    
    topSkills.forEach(skill => {
      queries.push({
        query: skill.name,
        jobs: this.mapSkillToJobId(skill.name),
      });
    });
    
    // Skill combinations
    if (topSkills.length >= 2) {
      queries.push({
        query: `${topSkills[0].name} ${topSkills[1].name}`,
        jobs: [
          this.mapSkillToJobId(topSkills[0].name),
          this.mapSkillToJobId(topSkills[1].name),
        ].filter(Boolean),
      });
    }
    
    return queries;
  }

  /**
   * Map skill name to Freelancer job ID
   */
  mapSkillToJobId(skill) {
    const jobMap = {
      'Python': 3,
      'JavaScript': 17,
      'PHP': 4,
      'Java': 1,
      'C++': 2,
      'Ruby': 7,
      'Go': 237,
      'Rust': 372,
      'React': 124,
      'Node.js': 124,
      'Vue': 341,
      'Angular': 341,
      'Django': 3,
      'FastAPI': 3,
      'PostgreSQL': 8,
      'MongoDB': 286,
      'Docker': 329,
      'AWS': 262,
      'Machine Learning': 132,
      'Data Science': 132,
      'Technical Writing': 12,
      'Content Writing': 11,
      'API': 149,
      'Web Scraping': 141,
    };
    
    return jobMap[skill];
  }

  /**
   * Search Freelancer projects API
   */
  async searchProjects(searchParams) {
    const endpoint = `${this.baseURL}/projects/0.1/projects/active/`;
    
    const params = {
      query: searchParams.query,
      jobs: searchParams.jobs?.join(','),
      min_avg_price: process.env.FREELANCER_MIN_BUDGET || 200,
      project_types: 'fixed,hourly',
      compact: true,
      limit: 50,
    };
    
    const response = await this.makeRequest(endpoint, params);
    
    if (!response.result?.projects) {
      return [];
    }
    
    return response.result.projects.map(project => this.parseProject(project));
  }

  /**
   * Parse Freelancer project into our Opportunity format
   */
  parseProject(project) {
    return {
      platform: 'freelancer',
      external_id: project.id.toString(),
      title: project.title,
      description: project.description || '',
      url: `https://www.freelancer.com/projects/${project.seo_url}`,
      pay_min: project.budget?.minimum,
      pay_max: project.budget?.maximum,
      pay_type: project.type === 'fixed' ? 'fixed' : 'hourly',
      required_skills: project.jobs?.map(j => j.name) || [],
      discovered_at: new Date(),
      expires_at: project.time_submitted 
        ? new Date(project.time_submitted * 1000 + 30 * 24 * 60 * 60 * 1000)
        : null,
      client_info: {
        rating: project.owner_reputation?.entire_history?.overall,
        projects_completed: project.owner_reputation?.entire_history?.complete,
        verified: project.owner?.status?.payment_verified,
        location: project.owner?.location?.country?.name,
        member_since: project.owner?.registration_date,
      },
      metadata: {
        bid_count: project.bid_stats?.bid_count || 0,
        avg_bid: project.bid_stats?.bid_avg,
        currency: project.currency?.code || 'USD',
        posted_on: project.time_submitted,
        upgrades: project.upgrades,
        featured: project.featured,
      },
    };
  }

  /**
   * Calculate match score for a project
   */
  async score(project, userSkills) {
    const skillMatch = this.calculateSkillMatch(
      project.required_skills,
      userSkills
    );
    
    const budgetScore = this.calculateBudgetScore(
      project.pay_min,
      project.pay_max,
      userSkills
    );
    
    const clientScore = this.calculateClientScore(
      project.client_info
    );
    
    const competitionScore = this.calculateCompetitionScore(
      project.metadata?.bid_count
    );
    
    const scopeScore = this.calculateScopeScore(
      project.description
    );
    
    // Weighted average
    const score = (
      0.40 * skillMatch +
      0.25 * budgetScore +
      0.20 * clientScore +
      0.10 * competitionScore +
      0.05 * scopeScore
    );
    
    return Math.min(score, 1.0);
  }

  /**
   * Calculate skill match score
   */
  calculateSkillMatch(requiredSkills, userSkills) {
    if (!requiredSkills || requiredSkills.length === 0) {
      return 0.5;
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
   * Calculate budget score
   */
  calculateBudgetScore(minBudget, maxBudget, userSkills) {
    const minRate = parseFloat(process.env.FREELANCER_MIN_BUDGET || 200);
    const targetBudget = parseFloat(process.env.FREELANCER_TARGET_BUDGET || 1000);
    
    const budget = maxBudget || minBudget || 0;
    
    if (budget < minRate) {
      return 0.0;
    }
    
    if (budget >= targetBudget) {
      return 1.0;
    }
    
    return (budget - minRate) / (targetBudget - minRate);
  }

  /**
   * Calculate client quality score
   */
  calculateClientScore(clientInfo) {
    if (!clientInfo) return 0.5;
    
    const ratingScore = (clientInfo.rating || 0) / 5.0;
    const experienceScore = (clientInfo.projects_completed || 0) > 10 ? 1.0 : 0.5;
    const verifiedScore = clientInfo.verified ? 1.0 : 0.5;
    
    return 0.5 * ratingScore + 0.3 * experienceScore + 0.2 * verifiedScore;
  }

  /**
   * Calculate competition score (lower competition = higher score)
   */
  calculateCompetitionScore(bidCount) {
    if (!bidCount) return 1.0;
    
    const maxCompetition = parseFloat(process.env.FREELANCER_MAX_COMPETITION || 20);
    
    if (bidCount === 0) return 1.0;
    if (bidCount >= maxCompetition * 2) return 0.0;
    
    return 1.0 - (bidCount / (maxCompetition * 2));
  }

  /**
   * Calculate project scope score
   */
  calculateScopeScore(description) {
    if (!description) return 0.5;
    
    // Detailed descriptions score higher
    const wordCount = description.split(/\s+/).length;
    
    if (wordCount < 50) return 0.3;  // Too vague
    if (wordCount > 500) return 0.7; // Might be too complex
    
    // Sweet spot: 50-500 words
    return 0.9;
  }

  /**
   * Make authenticated request to Freelancer API
   */
  async makeRequest(endpoint, params = {}) {
    return axios.get(endpoint, {
      params,
      headers: {
        'Freelancer-Developer-Key': this.apiKey,
        'Accept': 'application/json',
      },
    }).then(res => res.data);
  }

  /**
   * Deduplicate projects by ID
   */
  deduplicateProjects(projects) {
    const seen = new Set();
    return projects.filter(project => {
      if (seen.has(project.external_id)) return false;
      seen.add(project.external_id);
      return true;
    });
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get bid strategy recommendation
   */
  getBidStrategy(project) {
    const bidCount = project.metadata?.bid_count || 0;
    const budget = project.pay_max || project.pay_min;
    
    if (bidCount <= 5) {
      return {
        level: 'low',
        recommendation: `Bid 80-90% of ${budget}`,
        confidence: 'high',
        tip: 'Premium positioning - you can win with quality',
      };
    } else if (bidCount <= 15) {
      return {
        level: 'medium',
        recommendation: `Bid 70-80% of ${budget}`,
        confidence: 'medium',
        tip: 'Competitive but emphasize quality and speed',
      };
    } else {
      return {
        level: 'high',
        recommendation: `Consider skipping or bid 60-70% of ${budget}`,
        confidence: 'low',
        tip: 'High competition - only bid if perfect match',
      };
    }
  }
}
