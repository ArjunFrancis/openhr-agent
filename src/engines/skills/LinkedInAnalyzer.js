import axios from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';

dotenv.config();

/**
 * LinkedIn Profile Analyzer
 * Extracts professional skills, experience, and credentials from LinkedIn
 */
export class LinkedInAnalyzer {
  constructor(profileUrl) {
    this.profileUrl = profileUrl;
    this.apiKey = process.env.LINKEDIN_API_KEY;
  }

  /**
   * Analyze LinkedIn profile and extract professional skills
   */
  async analyze() {
    console.log(`\n🔍 Analyzing LinkedIn profile...\n`);
    
    try {
      const profile = await this.fetchProfile();
      const skills = this.extractSkills(profile);
      
      console.log(`✅ Found ${skills.length} professional skills\n`);
      return skills;
    } catch (error) {
      console.error('❌ LinkedIn analysis failed:', error.message);
      throw error;
    }
  }

  /**
   * Fetch LinkedIn profile data
   */
  async fetchProfile() {
    // Method 1: Official LinkedIn API (requires auth)
    if (this.apiKey) {
      return this.fetchViaAPI();
    }
    
    // Method 2: Manual input (user provides profile data)
    return this.fetchViaManualInput();
  }

  /**
   * Fetch via LinkedIn API (official)
   */
  async fetchViaAPI() {
    // LinkedIn API requires OAuth 2.0
    const response = await axios.get(
      'https://api.linkedin.com/v2/me',
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );
    
    return response.data;
  }

  /**
   * Extract skills from profile data
   */
  extractSkills(profile) {
    const skills = [];
    
    // Extract from skills section
    if (profile.skills) {
      profile.skills.forEach(skill => {
        skills.push({
          name: skill.name,
          proficiency: this.estimateProficiency(skill),
          category: this.categorizeSkill(skill.name),
          evidence: {
            endorsements: skill.endorsements || 0,
            years_experience: this.calculateYears(profile, skill.name),
          },
          market_demand: this.getMarketDemand(skill.name),
          avg_hourly_rate: this.getMarketRate(skill.name),
          source: 'linkedin',
        });
      });
    }
    
    // Extract from experience (job titles, descriptions)
    if (profile.experience) {
      const experienceSkills = this.extractFromExperience(profile.experience);
      skills.push(...experienceSkills);
    }
    
    // Extract from certifications
    if (profile.certifications) {
      const certSkills = this.extractFromCertifications(profile.certifications);
      skills.push(...certSkills);
    }
    
    // Deduplicate and merge
    return this.deduplicateSkills(skills);
  }

  /**
   * Extract skills from work experience
   */
  extractFromExperience(experience) {
    const skills = [];
    const skillKeywords = {
      'Product Manager': { category: 'domain', rate: 85 },
      'Software Engineer': { category: 'technical', rate: 90 },
      'Data Scientist': { category: 'technical', rate: 95 },
      'Marketing Manager': { category: 'domain', rate: 70 },
      'Sales': { category: 'domain', rate: 60 },
      'Business Development': { category: 'domain', rate: 75 },
      'UX Designer': { category: 'creative', rate: 75 },
      'Content Writer': { category: 'creative', rate: 50 },
      'Project Manager': { category: 'domain', rate: 80 },
      'DevOps Engineer': { category: 'technical', rate: 95 },
    };
    
    experience.forEach(job => {
      const title = job.title.toLowerCase();
      
      Object.entries(skillKeywords).forEach(([keyword, info]) => {
        if (title.includes(keyword.toLowerCase())) {
          skills.push({
            name: keyword,
            proficiency: this.calculateProficiencyFromTenure(job.duration),
            category: info.category,
            evidence: {
              company: job.company,
              title: job.title,
              years: this.parseDuration(job.duration),
            },
            market_demand: 0.85,
            avg_hourly_rate: info.rate,
            source: 'linkedin-experience',
          });
        }
      });
    });
    
    return skills;
  }

  /**
   * Extract skills from certifications
   */
  extractFromCertifications(certifications) {
    const skills = [];
    
    certifications.forEach(cert => {
      // Map certifications to skills
      const skill = this.mapCertificationToSkill(cert.name);
      if (skill) {
        skills.push({
          ...skill,
          proficiency: 7, // Certified = at least 7/10
          evidence: {
            certification: cert.name,
            issuer: cert.issuing_organization,
            credential_id: cert.credential_id,
          },
          source: 'linkedin-certification',
        });
      }
    });
    
    return skills;
  }

  /**
   * Map certification to skill
   */
  mapCertificationToSkill(certName) {
    const certMap = {
      'AWS': { name: 'AWS', category: 'technical', rate: 85 },
      'Google Cloud': { name: 'Google Cloud', category: 'technical', rate: 85 },
      'Azure': { name: 'Azure', category: 'technical', rate: 80 },
      'PMP': { name: 'Project Management', category: 'domain', rate: 80 },
      'Scrum': { name: 'Agile/Scrum', category: 'domain', rate: 70 },
      'CFA': { name: 'Financial Analysis', category: 'domain', rate: 100 },
      'CPA': { name: 'Accounting', category: 'domain', rate: 90 },
    };
    
    for (const [key, skill] of Object.entries(certMap)) {
      if (certName.toLowerCase().includes(key.toLowerCase())) {
        return {
          name: skill.name,
          category: skill.category,
          market_demand: 0.80,
          avg_hourly_rate: skill.rate,
        };
      }
    }
    
    return null;
  }

  /**
   * Estimate proficiency based on endorsements and experience
   */
  estimateProficiency(skill) {
    const endorsements = skill.endorsements || 0;
    
    if (endorsements > 50) return 9;
    if (endorsements > 25) return 8;
    if (endorsements > 10) return 7;
    if (endorsements > 5) return 6;
    return 5;
  }

  /**
   * Calculate proficiency from job tenure
   */
  calculateProficiencyFromTenure(duration) {
    const years = this.parseDuration(duration);
    
    if (years >= 10) return 10;
    if (years >= 7) return 9;
    if (years >= 5) return 8;
    if (years >= 3) return 7;
    if (years >= 1) return 6;
    return 5;
  }

  /**
   * Parse duration string to years
   */
  parseDuration(duration) {
    // Parse strings like "3 years 6 months" or "2 yrs"
    const yearMatch = duration.match(/(\d+)\s*(year|yr)/i);
    const monthMatch = duration.match(/(\d+)\s*(month|mo)/i);
    
    const years = yearMatch ? parseInt(yearMatch[1]) : 0;
    const months = monthMatch ? parseInt(monthMatch[1]) / 12 : 0;
    
    return years + months;
  }

  /**
   * Categorize skill
   */
  categorizeSkill(skillName) {
    const technical = ['python', 'javascript', 'java', 'react', 'aws', 'docker', 'kubernetes'];
    const creative = ['design', 'writing', 'marketing', 'content', 'video', 'photography'];
    const domain = ['management', 'sales', 'finance', 'accounting', 'consulting'];
    
    const lower = skillName.toLowerCase();
    
    if (technical.some(t => lower.includes(t))) return 'technical';
    if (creative.some(c => lower.includes(c))) return 'creative';
    if (domain.some(d => lower.includes(d))) return 'domain';
    
    return 'soft';
  }

  /**
   * Get market demand for skill
   */
  getMarketDemand(skillName) {
    // Simplified market demand map
    const demandMap = {
      'AWS': 0.95,
      'Python': 0.95,
      'JavaScript': 0.90,
      'React': 0.90,
      'Product Management': 0.85,
      'Data Science': 0.90,
      'Machine Learning': 0.95,
    };
    
    return demandMap[skillName] || 0.70;
  }

  /**
   * Get average market rate
   */
  getMarketRate(skillName) {
    const rateMap = {
      'AWS': 90,
      'Python': 75,
      'JavaScript': 70,
      'React': 75,
      'Product Management': 85,
      'Data Science': 95,
      'Machine Learning': 100,
      'Sales': 60,
      'Marketing': 65,
      'Writing': 50,
    };
    
    return rateMap[skillName] || 65;
  }

  /**
   * Deduplicate skills by name
   */
  deduplicateSkills(skills) {
    const seen = new Map();
    
    skills.forEach(skill => {
      if (!seen.has(skill.name) || skill.proficiency > seen.get(skill.name).proficiency) {
        seen.set(skill.name, skill);
      }
    });
    
    return Array.from(seen.values());
  }

  /**
   * Manual input flow (when API not available)
   */
  async fetchViaManualInput() {
    console.log(chalk.yellow('\nLinkedIn API not configured.'));
    console.log(chalk.gray('Please provide your LinkedIn profile data:\n'));
    
    // This would be an interactive prompt in real implementation
    // For now, return empty structure
    return {
      skills: [],
      experience: [],
      certifications: [],
    };
  }

  /**
   * Calculate years of experience with a skill
   */
  calculateYears(profile, skillName) {
    if (!profile.experience) return 0;
    
    let totalYears = 0;
    
    profile.experience.forEach(job => {
      if (job.description && job.description.toLowerCase().includes(skillName.toLowerCase())) {
        totalYears += this.parseDuration(job.duration);
      }
    });
    
    return Math.round(totalYears);
  }
}
