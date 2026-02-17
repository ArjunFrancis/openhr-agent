import axios from 'axios';
import { ProposalGenerator } from '../action/ProposalGenerator.js';

/**
 * Co-Founder Matching Engine
 * Finds complementary skill matches for entrepreneurship
 */
export class CoFounderMatcher {
  constructor(db) {
    this.db = db;
    this.proposalGen = new ProposalGenerator();
  }

  /**
   * Find potential co-founders based on skill complementarity
   */
  async findMatches(userProfile, userSkills) {
    console.log('\n🤝 Searching for co-founder matches...\n');
    
    const sources = [
      this.searchYCombinator(),
      this.searchAngelList(),
      this.searchIndieHackers(),
      this.searchTwitter(),
    ];
    
    const allCandidates = await Promise.all(sources);
    const candidates = allCandidates.flat();
    
    const scored = await Promise.all(
      candidates.map(async c => ({
        ...c,
        score: await this.calculateCompatibility(userProfile, userSkills, c),
      }))
    );
    
    const matches = scored
      .filter(c => c.score >= 0.70)
      .sort((a, b) => b.score - a.score);
    
    console.log(`✅ Found ${matches.length} potential co-founders\n`);
    
    return matches;
  }

  /**
   * Search Y Combinator co-founder matching
   */
  async searchYCombinator() {
    try {
      // YC has a co-founder matching platform
      const response = await axios.get('https://www.ycombinator.com/cofounder-matching/api/matches');
      return response.data.map(p => this.parseYCProfile(p));
    } catch (error) {
      console.log('YC co-founder matching unavailable');
      return [];
    }
  }

  /**
   * Search AngelList talent
   */
  async searchAngelList() {
    try {
      const response = await axios.get('https://angel.co/api/talent', {
        params: {
          roles: 'cofounder',
          looking_for: 'cofounder',
        },
      });
      return response.data.map(p => this.parseAngelProfile(p));
    } catch (error) {
      console.log('AngelList search unavailable');
      return [];
    }
  }

  /**
   * Search Indie Hackers
   */
  async searchIndieHackers() {
    // Indie Hackers forums for co-founder search
    return []; // Implement scraping if needed
  }

  /**
   * Search Twitter #lookingforcofounder
   */
  async searchTwitter() {
    // Twitter API search for co-founder posts
    return []; // Implement with Twitter API
  }

  /**
   * Calculate compatibility score
   */
  async calculateCompatibility(userProfile, userSkills, candidate) {
    const skillComp = this.calculateSkillComplementarity(userSkills, candidate.skills);
    const visionAlign = this.calculateVisionAlignment(userProfile, candidate);
    const commitLevel = this.calculateCommitmentLevel(candidate);
    const personalityFit = this.calculatePersonalityFit(userProfile, candidate);
    const networkValue = this.calculateNetworkValue(candidate);
    
    return (
      0.35 * skillComp +
      0.25 * visionAlign +
      0.20 * commitLevel +
      0.15 * personalityFit +
      0.05 * networkValue
    );
  }

  /**
   * Calculate skill complementarity (not similarity!)
   */
  calculateSkillComplementarity(userSkills, candidateSkills) {
    // HIGH score = complementary (different but synergistic)
    // LOW score = too similar or too different
    
    const userCategories = this.categorizeSkills(userSkills);
    const candCategories = this.categorizeSkills(candidateSkills);
    
    // Ideal pairings:
    // Technical + Business = 1.0
    // Designer + Developer = 0.95
    // Sales + Product = 0.90
    
    if (userCategories.has('technical') && candCategories.has('business')) return 1.0;
    if (userCategories.has('business') && candCategories.has('technical')) return 1.0;
    if (userCategories.has('design') && candCategories.has('technical')) return 0.95;
    if (userCategories.has('sales') && candCategories.has('product')) return 0.90;
    
    // Some overlap is good (can work together)
    const overlap = this.calculateOverlap(userSkills, candidateSkills);
    
    if (overlap > 0.8) return 0.3; // Too similar
    if (overlap < 0.2) return 0.4; // Too different
    
    return 0.7; // Moderate complementarity
  }

  /**
   * Categorize skills
   */
  categorizeSkills(skills) {
    const categories = new Set();
    
    skills.forEach(skill => {
      if (['Python', 'JavaScript', 'React', 'AWS', 'Docker'].includes(skill.name)) {
        categories.add('technical');
      }
      if (['Sales', 'Marketing', 'Business Development'].includes(skill.name)) {
        categories.add('business');
      }
      if (['Product Management', 'UX'].includes(skill.name)) {
        categories.add('product');
      }
      if (['Design', 'UI/UX', 'Branding'].includes(skill.name)) {
        categories.add('design');
      }
    });
    
    return categories;
  }

  /**
   * Calculate vision alignment
   */
  calculateVisionAlignment(userProfile, candidate) {
    // Compare:
    // - Industry interests
    // - Stage preference (early vs late stage)
    // - Mission (social impact, profit, growth)
    // - Work style (remote, in-person, hybrid)
    
    let score = 0.5; // Default
    
    if (userProfile.industry === candidate.industry) score += 0.3;
    if (userProfile.mission === candidate.mission) score += 0.2;
    
    return Math.min(score, 1.0);
  }

  /**
   * Calculate commitment level
   */
  calculateCommitmentLevel(candidate) {
    // Factors:
    // - Full-time vs part-time
    // - Has quit job vs still employed
    // - Has savings vs needs income
    // - Previous startup experience
    
    let score = 0.5;
    
    if (candidate.commitment === 'full-time') score += 0.3;
    if (candidate.has_savings) score += 0.2;
    if (candidate.startup_experience) score += 0.2;
    
    return Math.min(score, 1.0);
  }

  /**
   * Calculate personality fit
   */
  calculatePersonalityFit(userProfile, candidate) {
    // This would ideally use personality test results
    // For now, basic heuristics
    
    return 0.7; // Moderate default
  }

  /**
   * Calculate network value
   */
  calculateNetworkValue(candidate) {
    // Factors:
    // - LinkedIn connections
    // - Twitter followers
    // - GitHub stars
    // - Previous company prestige
    
    let score = 0.5;
    
    if (candidate.linkedin_connections > 500) score += 0.2;
    if (candidate.github_stars > 100) score += 0.1;
    if (candidate.previous_companies?.includes('FAANG')) score += 0.2;
    
    return Math.min(score, 1.0);
  }

  /**
   * Calculate skill overlap
   */
  calculateOverlap(skills1, skills2) {
    const names1 = new Set(skills1.map(s => s.name));
    const names2 = new Set(skills2.map(s => s.name));
    
    const intersection = [...names1].filter(x => names2.has(x));
    const union = new Set([...names1, ...names2]);
    
    return intersection.length / union.size;
  }

  /**
   * Generate introduction message
   */
  async generateIntroduction(userProfile, candidate, match) {
    const prompt = `
Generate a personalized co-founder introduction message.

My Profile:
- Name: ${userProfile.name}
- Skills: ${userProfile.skills.map(s => s.name).join(', ')}
- Looking for: ${userProfile.looking_for}

Their Profile:
- Name: ${candidate.name}
- Skills: ${candidate.skills.map(s => s.name).join(', ')}
- Looking for: ${candidate.looking_for}

Match Score: ${(match.score * 100).toFixed(0)}%
Complementarity: ${match.skill_complementarity}

Write a warm, professional introduction message (150 words) that:
1. Introduces yourself
2. Explains why you think you'd be great co-founders
3. Suggests a specific next step (coffee chat, video call)
4. Shows you've read their profile
`;
    
    const introduction = await this.proposalGen.generate({
      description: prompt,
    }, userProfile, userProfile.skills);
    
    return introduction.proposal;
  }

  /**
   * Parse YC profile
   */
  parseYCProfile(data) {
    return {
      name: data.name,
      skills: data.skills || [],
      industry: data.industry,
      commitment: data.commitment_level,
      linkedin: data.linkedin_url,
      twitter: data.twitter_handle,
      bio: data.bio,
      looking_for: data.looking_for,
      source: 'yc',
    };
  }

  /**
   * Parse AngelList profile
   */
  parseAngelProfile(data) {
    return {
      name: data.name,
      skills: data.skills || [],
      previous_companies: data.past_experience,
      startup_experience: data.startup_experience_years,
      linkedin: data.linkedin_url,
      bio: data.bio,
      source: 'angellist',
    };
  }

  /**
   * Get recommended co-founder archetypes
   */
  getRecommendedArchetypes(userSkills) {
    const categories = this.categorizeSkills(userSkills);
    const recommendations = [];
    
    if (categories.has('technical')) {
      recommendations.push({
        archetype: 'Business Co-Founder',
        why: 'You have technical skills - find someone who can sell, market, and handle business development',
        ideal_skills: ['Sales', 'Marketing', 'Business Development', 'Fundraising'],
        examples: 'Steve Jobs (Apple), Jack Dorsey (Twitter)',
      });
    }
    
    if (categories.has('business')) {
      recommendations.push({
        archetype: 'Technical Co-Founder',
        why: 'You have business skills - find someone who can build the product',
        ideal_skills: ['Software Engineering', 'Architecture', 'DevOps'],
        examples: 'Steve Wozniak (Apple), Evan Williams (Twitter)',
      });
    }
    
    if (categories.has('product')) {
      recommendations.push({
        archetype: 'Technical or Growth Co-Founder',
        why: 'You have product vision - find someone who can build OR grow',
        ideal_skills: ['Full-stack Development', 'Growth Marketing', 'Sales'],
        examples: 'Brian Chesky + Joe Gebbia (Airbnb)',
      });
    }
    
    return recommendations;
  }
}
