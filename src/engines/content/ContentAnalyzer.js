import axios from 'axios';
import * as cheerio from 'cheerio';
import { ProposalGenerator } from '../action/ProposalGenerator.js';

/**
 * Content Skills Analyzer
 * Discovers skills from blog posts, tweets, videos, podcasts
 */
export class ContentAnalyzer {
  constructor() {
    this.proposalGen = new ProposalGenerator();
  }

  /**
   * Analyze all content sources
   */
  async analyze(sources) {
    console.log('\n📝 Analyzing your content for hidden skills...\n');
    
    const allSkills = [];
    
    if (sources.blog_url) {
      allSkills.push(...await this.analyzeBlog(sources.blog_url));
    }
    
    if (sources.twitter_handle) {
      allSkills.push(...await this.analyzeTwitter(sources.twitter_handle));
    }
    
    if (sources.youtube_channel) {
      allSkills.push(...await this.analyzeYouTube(sources.youtube_channel));
    }
    
    if (sources.medium_username) {
      allSkills.push(...await this.analyzeMedium(sources.medium_username));
    }
    
    if (sources.substack_url) {
      allSkills.push(...await this.analyzeSubstack(sources.substack_url));
    }
    
    // Deduplicate and merge
    const skills = this.consolidateSkills(allSkills);
    
    console.log(`✅ Discovered ${skills.length} skills from your content\n`);
    
    return skills;
  }

  /**
   * Analyze personal blog
   */
  async analyzeBlog(blogUrl) {
    console.log(`  📄 Analyzing blog: ${blogUrl}`);
    
    try {
      const response = await axios.get(blogUrl);
      const $ = cheerio.load(response.data);
      
      // Extract all blog post links
      const postLinks = [];
      $('a').each((i, el) => {
        const href = $(el).attr('href');
        if (href && this.isPostLink(href, blogUrl)) {
          postLinks.push(href);
        }
      });
      
      // Analyze top 10 recent posts
      const posts = await Promise.all(
        postLinks.slice(0, 10).map(link => this.fetchPostContent(link))
      );
      
      // Extract skills from content
      return this.extractSkillsFromText(posts.join('\n\n'), 'blog');
    } catch (error) {
      console.error(`  ❌ Blog analysis failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Analyze Twitter content
   */
  async analyzeTwitter(handle) {
    console.log(`  🐦 Analyzing Twitter: @${handle}`);
    
    // Would use Twitter API here
    // For now, return placeholder
    return [];
  }

  /**
   * Analyze YouTube channel
   */
  async analyzeYouTube(channelUrl) {
    console.log(`  📺 Analyzing YouTube: ${channelUrl}`);
    
    try {
      // Would use YouTube Data API here
      // Extract video titles, descriptions, transcripts
      return [];
    } catch (error) {
      console.error(`  ❌ YouTube analysis failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Analyze Medium articles
   */
  async analyzeMedium(username) {
    console.log(`  📰 Analyzing Medium: @${username}`);
    
    try {
      const response = await axios.get(`https://medium.com/@${username}`);
      const $ = cheerio.load(response.data);
      
      // Extract article titles and snippets
      const articles = [];
      $('article').each((i, el) => {
        const title = $(el).find('h2').text();
        const snippet = $(el).find('p').first().text();
        articles.push(`${title}\n${snippet}`);
      });
      
      return this.extractSkillsFromText(articles.join('\n\n'), 'medium');
    } catch (error) {
      console.error(`  ❌ Medium analysis failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Analyze Substack newsletter
   */
  async analyzeSubstack(substackUrl) {
    console.log(`  📧 Analyzing Substack: ${substackUrl}`);
    
    try {
      const response = await axios.get(substackUrl);
      const $ = cheerio.load(response.data);
      
      // Extract post titles and previews
      const posts = [];
      $('.post-preview').each((i, el) => {
        const title = $(el).find('h2').text();
        const preview = $(el).find('.post-preview-description').text();
        posts.push(`${title}\n${preview}`);
      });
      
      return this.extractSkillsFromText(posts.join('\n\n'), 'substack');
    } catch (error) {
      console.error(`  ❌ Substack analysis failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract skills from text using AI
   */
  async extractSkillsFromText(text, source) {
    // Use Claude AI to extract skills from content
    const prompt = `
Analyze this content and extract professional skills demonstrated.

Content:
${text.slice(0, 8000)} // Limit to fit context

Extract:
1. Technical skills (programming languages, tools, frameworks)
2. Domain expertise (industries, specializations)
3. Soft skills (communication, teaching, analysis)
4. Hidden talents (things author does well but might not realize)

For each skill, provide:
- Skill name
- Evidence (quote from content showing this skill)
- Estimated proficiency (1-10)
- Marketability (high/medium/low)

Return as JSON array.
`;
    
    try {
      const response = await this.proposalGen.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          { role: 'user', content: prompt },
        ],
      });
      
      const result = response.content[0].text;
      const skills = JSON.parse(result);
      
      return skills.map(skill => ({
        name: skill.name,
        proficiency: skill.proficiency,
        category: this.categorizeSkill(skill.name),
        evidence: {
          source,
          quote: skill.evidence,
          marketability: skill.marketability,
        },
        market_demand: this.estimateMarketDemand(skill.name),
        avg_hourly_rate: this.estimateMarketRate(skill.name),
        source: `content-${source}`,
      }));
    } catch (error) {
      console.error(`  ❌ AI extraction failed: ${error.message}`);
      return this.fallbackSkillExtraction(text, source);
    }
  }

  /**
   * Fallback: keyword-based skill extraction
   */
  fallbackSkillExtraction(text, source) {
    const skillKeywords = {
      // Technical
      'Python': { category: 'technical', rate: 75 },
      'JavaScript': { category: 'technical', rate: 70 },
      'React': { category: 'technical', rate: 75 },
      'Node.js': { category: 'technical', rate: 75 },
      'AWS': { category: 'technical', rate: 85 },
      'Machine Learning': { category: 'technical', rate: 95 },
      'Data Science': { category: 'technical', rate: 95 },
      
      // Domain
      'Product Management': { category: 'domain', rate: 85 },
      'Marketing': { category: 'domain', rate: 65 },
      'Sales': { category: 'domain', rate: 60 },
      'Design': { category: 'creative', rate: 70 },
      
      // Soft
      'Writing': { category: 'creative', rate: 50 },
      'Teaching': { category: 'soft', rate: 60 },
      'Analysis': { category: 'analytical', rate: 70 },
    };
    
    const found = [];
    const lowerText = text.toLowerCase();
    
    Object.entries(skillKeywords).forEach(([skill, info]) => {
      const count = (lowerText.match(new RegExp(skill.toLowerCase(), 'g')) || []).length;
      
      if (count >= 3) { // Mentioned at least 3 times
        found.push({
          name: skill,
          proficiency: Math.min(5 + count, 8), // 5-8 based on mentions
          category: info.category,
          evidence: {
            source,
            mention_count: count,
          },
          market_demand: 0.70,
          avg_hourly_rate: info.rate,
          source: `content-${source}`,
        });
      }
    });
    
    return found;
  }

  /**
   * Check if link is a blog post
   */
  isPostLink(href, baseUrl) {
    if (!href.startsWith('http')) {
      href = new URL(href, baseUrl).href;
    }
    
    // Common blog post patterns
    return (
      href.includes('/post/') ||
      href.includes('/blog/') ||
      href.includes('/article/') ||
      /\d{4}\/\d{2}\//.test(href) // Date-based URLs
    );
  }

  /**
   * Fetch post content
   */
  async fetchPostContent(url) {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      
      // Extract main content (try common selectors)
      const content = 
        $('article').text() ||
        $('.post-content').text() ||
        $('.entry-content').text() ||
        $('main').text();
      
      return content.slice(0, 2000); // Limit per post
    } catch (error) {
      return '';
    }
  }

  /**
   * Consolidate skills from multiple sources
   */
  consolidateSkills(allSkills) {
    const skillMap = new Map();
    
    allSkills.forEach(skill => {
      const key = skill.name.toLowerCase();
      
      if (!skillMap.has(key)) {
        skillMap.set(key, skill);
      } else {
        // Merge: take highest proficiency, combine evidence
        const existing = skillMap.get(key);
        existing.proficiency = Math.max(existing.proficiency, skill.proficiency);
        existing.evidence = {
          ...existing.evidence,
          [`${skill.source}`]: skill.evidence,
        };
        existing.source = `${existing.source},${skill.source}`;
      }
    });
    
    return Array.from(skillMap.values());
  }

  /**
   * Categorize skill
   */
  categorizeSkill(skillName) {
    const technical = ['programming', 'code', 'software', 'data', 'ai', 'ml'];
    const creative = ['design', 'writing', 'content', 'video', 'marketing'];
    const domain = ['product', 'business', 'finance', 'sales', 'operations'];
    
    const lower = skillName.toLowerCase();
    
    if (technical.some(t => lower.includes(t))) return 'technical';
    if (creative.some(c => lower.includes(c))) return 'creative';
    if (domain.some(d => lower.includes(d))) return 'domain';
    
    return 'soft';
  }

  /**
   * Estimate market demand
   */
  estimateMarketDemand(skillName) {
    const highDemand = ['ai', 'ml', 'python', 'aws', 'react', 'data'];
    const mediumDemand = ['javascript', 'design', 'product', 'marketing'];
    
    const lower = skillName.toLowerCase();
    
    if (highDemand.some(s => lower.includes(s))) return 0.90;
    if (mediumDemand.some(s => lower.includes(s))) return 0.75;
    
    return 0.60;
  }

  /**
   * Estimate market rate
   */
  estimateMarketRate(skillName) {
    const rateMap = {
      'ai': 100,
      'machine learning': 95,
      'data science': 95,
      'aws': 85,
      'python': 75,
      'react': 75,
      'javascript': 70,
      'design': 70,
      'product': 85,
      'marketing': 65,
      'writing': 50,
    };
    
    const lower = skillName.toLowerCase();
    
    for (const [key, rate] of Object.entries(rateMap)) {
      if (lower.includes(key)) return rate;
    }
    
    return 65; // Default
  }

  /**
   * Generate content portfolio summary
   */
  generatePortfolioSummary(skills, sources) {
    const categories = {};
    
    skills.forEach(skill => {
      if (!categories[skill.category]) {
        categories[skill.category] = [];
      }
      categories[skill.category].push(skill);
    });
    
    return {
      total_skills: skills.length,
      by_category: Object.keys(categories).map(cat => ({
        category: cat,
        count: categories[cat].length,
        top_skills: categories[cat]
          .sort((a, b) => b.proficiency - a.proficiency)
          .slice(0, 3)
          .map(s => s.name),
      })),
      content_sources: Object.keys(sources).length,
      estimated_value: skills.reduce((sum, s) => sum + (s.avg_hourly_rate || 0), 0) / skills.length,
    };
  }
}
