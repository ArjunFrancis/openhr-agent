import { Hunt } from '../../engines/hunt/Hunt.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class IndeedHunt extends Hunt {
  name = 'indeed-scanner';
  platform = 'indeed';
  frequency = 'hourly';
  
  constructor(config) {
    super(config);
    this.publisherKey = process.env.INDEED_PUBLISHER_KEY;
    this.location = process.env.INDEED_LOCATION || 'remote';
    this.minSalary = parseInt(process.env.INDEED_MIN_SALARY || '60000');
  }

  async scan(skills = []) {
    console.log('🔍 Scanning Indeed.com...');
    
    const jobs = [];
    const searchQueries = this.buildSearchQueries(skills);
    
    for (const query of searchQueries) {
      try {
        const results = this.publisherKey 
          ? await this.searchViaAPI(query)
          : await this.searchViaScraping(query);
        
        jobs.push(...results);
        await this.sleep(2000); // Rate limiting
      } catch (error) {
        console.error(`Search failed for: ${query}`, error.message);
      }
    }
    
    const unique = this.deduplicateJobs(jobs);
    console.log(`✅ Found ${unique.length} unique jobs`);
    
    return unique;
  }

  buildSearchQueries(skills) {
    const topSkills = skills
      .filter(s => s.proficiency >= 7)
      .slice(0, 5)
      .map(s => s.name);
    
    return topSkills.map(skill => ({
      query: skill,
      jobType: 'fulltime,contract,parttime',
      location: this.location,
    }));
  }

  async searchViaAPI(searchParams) {
    const url = 'http://api.indeed.com/ads/apisearch';
    
    const response = await axios.get(url, {
      params: {
        publisher: this.publisherKey,
        q: searchParams.query,
        l: searchParams.location,
        jt: searchParams.jobType,
        limit: 25,
        format: 'json',
        v: '2',
      },
    });
    
    return response.data.results.map(job => this.parseJob(job));
  }

  async searchViaScraping(searchParams) {
    // Respectful scraping with rate limiting
    const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(searchParams.query)}&l=${encodeURIComponent(searchParams.location)}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'OpenHR-Agent/1.0 (Economic Empowerment Bot)',
      },
    });
    
    const $ = cheerio.load(response.data);
    const jobs = [];
    
    $('.job_seen_beacon').each((i, el) => {
      const job = {
        title: $(el).find('.jobTitle').text().trim(),
        company: $(el).find('.companyName').text().trim(),
        location: $(el).find('.companyLocation').text().trim(),
        salary: $(el).find('.salary-snippet').text().trim(),
        snippet: $(el).find('.job-snippet').text().trim(),
        url: 'https://www.indeed.com' + $(el).find('a').attr('href'),
      };
      
      if (job.title) jobs.push(this.parseJob(job));
    });
    
    return jobs;
  }

  parseJob(job) {
    return {
      platform: 'indeed',
      external_id: job.jobkey || this.generateId(job),
      title: job.jobtitle || job.title,
      description: job.snippet,
      url: job.url,
      pay_min: this.parseSalary(job.formattedSalary || job.salary).min,
      pay_max: this.parseSalary(job.formattedSalary || job.salary).max,
      pay_type: 'yearly',
      required_skills: this.extractSkills(job.snippet || ''),
      discovered_at: new Date(),
      client_info: {
        name: job.company,
        rating: job.companyRating,
        location: job.formattedLocation || job.location,
      },
      metadata: {
        job_type: job.jobType,
        remote_type: this.detectRemoteType(job),
        posted_date: job.date,
      },
    };
  }

  parseSalary(salaryText) {
    if (!salaryText) return { min: this.minSalary, max: this.minSalary * 1.5 };
    
    const numbers = salaryText.match(/\$?[\d,]+/g);
    if (!numbers || numbers.length === 0) {
      return { min: this.minSalary, max: this.minSalary * 1.5 };
    }
    
    const values = numbers.map(n => parseInt(n.replace(/[,$]/g, '')));
    
    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }

  extractSkills(description) {
    const skillPatterns = [
      'Python', 'JavaScript', 'Java', 'React', 'Node.js', 'AWS',
      'Docker', 'Kubernetes', 'SQL', 'MongoDB', 'PostgreSQL',
      'TypeScript', 'Go', 'Rust', 'Machine Learning', 'AI',
      'Data Science', 'DevOps', 'Agile', 'Scrum',
    ];
    
    return skillPatterns.filter(skill =>
      description.toLowerCase().includes(skill.toLowerCase())
    );
  }

  detectRemoteType(job) {
    const text = `${job.snippet || ''} ${job.formattedLocation || job.location || ''}`.toLowerCase();
    
    if (text.includes('remote') || text.includes('work from home')) {
      if (text.includes('hybrid')) return 'hybrid';
      return 'remote';
    }
    
    return 'onsite';
  }

  async score(job, userSkills) {
    const skillMatch = this.calculateSkillMatch(job.required_skills, userSkills);
    const salaryScore = this.calculateSalaryScore(job.pay_min, job.pay_max);
    const companyScore = this.calculateCompanyScore(job.client_info);
    const locationScore = this.calculateLocationScore(job.metadata);
    const benefitsScore = 0.5; // Default
    
    return (
      0.40 * skillMatch +
      0.30 * salaryScore +
      0.15 * companyScore +
      0.10 * locationScore +
      0.05 * benefitsScore
    );
  }

  calculateSkillMatch(required, userSkills) {
    if (!required || required.length === 0) return 0.5;
    
    const matches = required.filter(req =>
      userSkills.some(skill =>
        skill.name.toLowerCase() === req.toLowerCase()
      )
    );
    
    return matches.length / required.length;
  }

  calculateSalaryScore(min, max) {
    const avg = (min + max) / 2;
    const target = this.minSalary * 2; // Target is 2x minimum
    
    if (avg < this.minSalary) return 0.0;
    if (avg >= target) return 1.0;
    
    return (avg - this.minSalary) / (target - this.minSalary);
  }

  calculateCompanyScore(clientInfo) {
    if (!clientInfo.rating) return 0.5;
    return clientInfo.rating / 5.0;
  }

  calculateLocationScore(metadata) {
    const remoteType = metadata.remote_type;
    const preference = process.env.INDEED_REMOTE_ONLY === 'true';
    
    if (preference) {
      return remoteType === 'remote' ? 1.0 : 0.0;
    }
    
    if (remoteType === 'remote') return 1.0;
    if (remoteType === 'hybrid') return 0.7;
    return 0.5;
  }

  deduplicateJobs(jobs) {
    const seen = new Set();
    return jobs.filter(job => {
      if (seen.has(job.external_id)) return false;
      seen.add(job.external_id);
      return true;
    });
  }

  generateId(job) {
    return `${job.title}-${job.company}`.toLowerCase().replace(/\s+/g, '-');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
