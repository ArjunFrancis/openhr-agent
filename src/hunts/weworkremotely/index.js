import { Hunt } from '../../engines/hunt/Hunt.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * We Work Remotely Hunt
 * 4.5M+ monthly visitors, one of the largest remote job boards
 */
export class WeWorkRemotelyHunt extends Hunt {
  name = 'weworkremotely-scanner';
  platform = 'weworkremotely';
  frequency = 'hourly';
  
  constructor(config) {
    super(config);
    this.baseUrl = 'https://weworkremotely.com';
  }

  async scan(skills = []) {
    console.log('🌍 Scanning We Work Remotely...');
    
    const categories = this.getCategoriesForSkills(skills);
    const jobs = [];
    
    for (const category of categories) {
      try {
        const categoryJobs = await this.scanCategory(category);
        jobs.push(...categoryJobs);
        await this.sleep(2000);
      } catch (error) {
        console.error(`Category scan failed: ${category}`, error.message);
      }
    }
    
    const unique = this.deduplicateJobs(jobs);
    console.log(`✅ Found ${unique.length} remote jobs`);
    
    return unique;
  }

  getCategoriesForSkills(skills) {
    const categories = new Set();
    
    skills.forEach(skill => {
      const name = skill.name.toLowerCase();
      
      if (['python', 'javascript', 'react', 'node', 'java'].some(t => name.includes(t))) {
        categories.add('programming');
      }
      if (['design', 'ui', 'ux', 'figma'].some(t => name.includes(t))) {
        categories.add('design');
      }
      if (['marketing', 'seo', 'content'].some(t => name.includes(t))) {
        categories.add('marketing');
      }
      if (['devops', 'aws', 'docker', 'kubernetes'].some(t => name.includes(t))) {
        categories.add('devops');
      }
    });
    
    return Array.from(categories);
  }

  async scanCategory(category) {
    const url = `${this.baseUrl}/categories/remote-${category}-jobs`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'OpenHR-Agent/1.0',
      },
    });
    
    const $ = cheerio.load(response.data);
    const jobs = [];
    
    $('li.feature').each((i, el) => {
      const job = {
        platform: 'weworkremotely',
        external_id: $(el).find('a').attr('href'),
        title: $(el).find('.title').text().trim(),
        company: $(el).find('.company').text().trim(),
        location: 'Remote (Worldwide)',
        url: this.baseUrl + $(el).find('a').attr('href'),
        description: $(el).find('.region').text().trim(),
        category,
        discovered_at: new Date(),
        metadata: {
          remote_type: 'remote',
          job_type: 'full-time',
        },
      };
      
      if (job.title) jobs.push(job);
    });
    
    return jobs;
  }

  async score(job, userSkills) {
    const skillMatch = this.calculateSkillMatch(job, userSkills);
    const remoteScore = 1.0; // All jobs are remote
    const categoryBonus = this.getCategoryBonus(job.category, userSkills);
    
    return Math.min(
      0.50 * skillMatch +
      0.30 * remoteScore +
      0.20 * categoryBonus,
      1.0
    );
  }

  getCategoryBonus(category, userSkills) {
    const relevantSkills = userSkills.filter(s =>
      s.category.toLowerCase() === category ||
      s.name.toLowerCase().includes(category)
    );
    
    return relevantSkills.length > 0 ? 1.0 : 0.5;
  }

  calculateSkillMatch(job, userSkills) {
    const jobText = `${job.title} ${job.description}`.toLowerCase();
    const matches = userSkills.filter(skill =>
      jobText.includes(skill.name.toLowerCase())
    );
    
    return userSkills.length > 0 ? matches.length / userSkills.length : 0.5;
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
}
