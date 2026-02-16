import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * GitHub Skills Analyzer
 * Discovers technical skills from GitHub activity
 */
export class GitHubAnalyzer {
  constructor(username) {
    this.username = username;
    this.token = process.env.GITHUB_TOKEN;
    this.baseURL = 'https://api.github.com';
  }

  /**
   * Analyze GitHub profile and extract skills
   */
  async analyze() {
    console.log(`\n🔍 Analyzing GitHub profile: ${this.username}\n`);
    
    try {
      const [repos, languages, contributions] = await Promise.all([
        this.getRepos(),
        this.getLanguages(),
        this.getContributions(),
      ]);
      
      const skills = this.extractSkills(repos, languages, contributions);
      
      console.log(`✅ Found ${skills.length} skills\n`);
      return skills;
    } catch (error) {
      console.error('❌ GitHub analysis failed:', error.message);
      throw error;
    }
  }

  /**
   * Get user's repositories
   */
  async getRepos() {
    const response = await this.makeRequest(
      `/users/${this.username}/repos`,
      { sort: 'updated', per_page: 100 }
    );
    
    return response.data;
  }

  /**
   * Get language statistics across all repos
   */
  async getLanguages() {
    const repos = await this.getRepos();
    const languageStats = {};
    
    for (const repo of repos.slice(0, 30)) { // Top 30 repos
      try {
        const langs = await this.makeRequest(`/repos/${this.username}/${repo.name}/languages`);
        
        for (const [lang, bytes] of Object.entries(langs.data)) {
          languageStats[lang] = (languageStats[lang] || 0) + bytes;
        }
      } catch (error) {
        // Skip if repo languages fail
      }
    }
    
    return languageStats;
  }

  /**
   * Get contribution activity
   */
  async getContributions() {
    try {
      const events = await this.makeRequest(
        `/users/${this.username}/events/public`,
        { per_page: 100 }
      );
      
      return this.parseContributions(events.data);
    } catch (error) {
      return { commits: 0, prs: 0, issues: 0 };
    }
  }

  /**
   * Parse contribution events
   */
  parseContributions(events) {
    const stats = { commits: 0, prs: 0, issues: 0 };
    
    events.forEach(event => {
      if (event.type === 'PushEvent') {
        stats.commits += event.payload.size || 0;
      } else if (event.type === 'PullRequestEvent') {
        stats.prs++;
      } else if (event.type === 'IssuesEvent') {
        stats.issues++;
      }
    });
    
    return stats;
  }

  /**
   * Extract skills from GitHub data
   */
  extractSkills(repos, languages, contributions) {
    const skills = [];
    
    // Language skills
    const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0);
    
    for (const [lang, bytes] of Object.entries(languages)) {
      const percentage = (bytes / totalBytes) * 100;
      
      if (percentage > 5) { // At least 5% usage
        const proficiency = this.calculateProficiency(
          percentage,
          repos.filter(r => r.language === lang).length,
          contributions.commits
        );
        
        skills.push({
          name: lang,
          proficiency,
          category: 'technical',
          evidence: {
            repos: repos.filter(r => r.language === lang).map(r => r.html_url),
            percentage: percentage.toFixed(1),
            bytes,
          },
          market_demand: this.getMarketDemand(lang),
          avg_hourly_rate: this.getMarketRate(lang),
          source: 'github',
        });
      }
    }
    
    // Framework/library skills from repo descriptions and topics
    const frameworks = this.extractFrameworks(repos);
    skills.push(...frameworks);
    
    return skills.sort((a, b) => b.proficiency - a.proficiency);
  }

  /**
   * Calculate skill proficiency (1-10 scale)
   */
  calculateProficiency(percentage, repoCount, totalCommits) {
    // Base score from usage percentage
    let score = Math.min(percentage / 10, 6);
    
    // Bonus for multiple repos
    score += Math.min(repoCount / 5, 2);
    
    // Bonus for high activity
    if (totalCommits > 100) score += 1;
    if (totalCommits > 500) score += 1;
    
    return Math.min(Math.round(score), 10);
  }

  /**
   * Extract framework/library skills from repos
   */
  extractFrameworks(repos) {
    const frameworkKeywords = {
      'React': { category: 'technical', rate: 75 },
      'Vue': { category: 'technical', rate: 70 },
      'Angular': { category: 'technical', rate: 75 },
      'Node.js': { category: 'technical', rate: 70 },
      'Express': { category: 'technical', rate: 65 },
      'FastAPI': { category: 'technical', rate: 70 },
      'Django': { category: 'technical', rate: 75 },
      'Flask': { category: 'technical', rate: 65 },
      'PostgreSQL': { category: 'technical', rate: 70 },
      'MongoDB': { category: 'technical', rate: 65 },
      'Docker': { category: 'technical', rate: 75 },
      'Kubernetes': { category: 'technical', rate: 90 },
      'AWS': { category: 'technical', rate: 85 },
      'Machine Learning': { category: 'technical', rate: 90 },
      'Data Science': { category: 'technical', rate: 85 },
      'API': { category: 'technical', rate: 70 },
      'REST': { category: 'technical', rate: 65 },
      'GraphQL': { category: 'technical', rate: 80 },
    };
    
    const found = {};
    
    repos.forEach(repo => {
      const text = `${repo.name} ${repo.description || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();
      
      for (const [framework, info] of Object.entries(frameworkKeywords)) {
        if (text.includes(framework.toLowerCase())) {
          found[framework] = (found[framework] || 0) + 1;
        }
      }
    });
    
    return Object.entries(found).map(([name, count]) => ({
      name,
      proficiency: Math.min(5 + Math.floor(count / 2), 9),
      category: frameworkKeywords[name].category,
      evidence: {
        repos: repos.filter(r => 
          `${r.name} ${r.description}`.toLowerCase().includes(name.toLowerCase())
        ).map(r => r.html_url),
        mentions: count,
      },
      market_demand: 0.8,
      avg_hourly_rate: frameworkKeywords[name].rate,
      source: 'github',
    }));
  }

  /**
   * Get market demand for a skill (0.0 to 1.0)
   */
  getMarketDemand(skill) {
    const demandMap = {
      'JavaScript': 0.95,
      'TypeScript': 0.90,
      'Python': 0.95,
      'Java': 0.85,
      'Go': 0.80,
      'Rust': 0.75,
      'C++': 0.70,
      'PHP': 0.65,
      'Ruby': 0.60,
      'Swift': 0.70,
      'Kotlin': 0.75,
    };
    
    return demandMap[skill] || 0.60;
  }

  /**
   * Get average market rate for a skill
   */
  getMarketRate(skill) {
    const rateMap = {
      'JavaScript': 70,
      'TypeScript': 80,
      'Python': 75,
      'Java': 80,
      'Go': 90,
      'Rust': 95,
      'C++': 85,
      'PHP': 60,
      'Ruby': 75,
      'Swift': 80,
      'Kotlin': 85,
    };
    
    return rateMap[skill] || 65;
  }

  /**
   * Make authenticated GitHub API request
   */
  async makeRequest(endpoint, params = {}) {
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
    };
    
    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }
    
    return axios.get(`${this.baseURL}${endpoint}`, {
      params,
      headers,
    });
  }
}
