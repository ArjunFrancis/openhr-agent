import axios from 'axios';

/**
 * Passive Income Scanner
 * Discovers passive income opportunities based on your skills
 */
export class PassiveIncomeScanner {
  constructor(db) {
    this.db = db;
  }

  /**
   * Scan for all passive income opportunities
   */
  async scan(userSkills, userProfile) {
    console.log('\n💰 Scanning for passive income opportunities...\n');
    
    const opportunities = [];
    
    // Scan different passive income channels
    opportunities.push(...await this.scanOnlineCourses(userSkills));
    opportunities.push(...await this.scanAffiliatePrograms(userSkills));
    opportunities.push(...await this.scanDigitalProducts(userSkills));
    opportunities.push(...await this.scanContentMonetization(userSkills));
    opportunities.push(...await this.scanAPIProducts(userSkills));
    opportunities.push(...await this.scanConsultingPackages(userSkills));
    
    // Score and rank
    const scored = opportunities.map(opp => ({
      ...opp,
      score: this.scoreOpportunity(opp, userSkills, userProfile),
    }));
    
    const ranked = scored
      .filter(o => o.score >= 0.60)
      .sort((a, b) => b.score - a.score);
    
    console.log(`✅ Found ${ranked.length} passive income opportunities\n`);
    
    return ranked;
  }

  /**
   * Scan for online course opportunities
   */
  async scanOnlineCourses(userSkills) {
    const opportunities = [];
    
    // Platforms: Udemy, Teachable, Gumroad, Skillshare
    const highValueSkills = userSkills
      .filter(s => s.proficiency >= 7)
      .filter(s => this.isTeachable(s.name));
    
    highValueSkills.forEach(skill => {
      opportunities.push({
        type: 'online-course',
        platform: 'udemy',
        title: `Create "${skill.name}" Online Course`,
        description: `Build a comprehensive course teaching ${skill.name}`,
        potential_monthly: this.estimateCourseRevenue(skill),
        time_investment: '40-80 hours upfront',
        ongoing_effort: '2-5 hours/month',
        skills_required: [skill.name, 'Teaching', 'Content Creation'],
        difficulty: 'Medium',
        upside: 'High ($500-5000/month potential)',
        examples: [
          `"Master ${skill.name} in 30 Days" - $2000/month`,
          `"${skill.name} for Beginners" - $800/month`,
        ],
      });
    });
    
    return opportunities;
  }

  /**
   * Scan for affiliate program opportunities
   */
  async scanAffiliatePrograms(userSkills) {
    const opportunities = [];
    
    // Technical skills → software affiliate programs
    const techSkills = userSkills.filter(s => s.category === 'technical');
    
    if (techSkills.length > 0) {
      opportunities.push({
        type: 'affiliate',
        platform: 'software-affiliates',
        title: 'Software Tool Affiliate Marketing',
        description: 'Promote tools you already use and earn commissions',
        potential_monthly: '$200-2000',
        time_investment: '10-20 hours upfront',
        ongoing_effort: '5-10 hours/month',
        programs: [
          'AWS Partner - 10% commission',
          'DigitalOcean - $25 per signup',
          'Notion - $10 per paid user',
          'Webflow - 50% first year',
        ],
        strategy: 'Blog posts, YouTube tutorials, comparison guides',
      });
    }
    
    return opportunities;
  }

  /**
   * Scan for digital product opportunities
   */
  async scanDigitalProducts(userSkills) {
    const opportunities = [];
    
    // Code skills → templates, boilerplates
    const codingSkills = userSkills.filter(s =>
      ['JavaScript', 'Python', 'React', 'Node.js'].includes(s.name)
    );
    
    if (codingSkills.length > 0) {
      opportunities.push({
        type: 'digital-product',
        platform: 'gumroad',
        title: 'SaaS Boilerplate / Starter Template',
        description: 'Package your best code as a reusable template',
        potential_monthly: '$300-1500',
        time_investment: '20-40 hours',
        ongoing_effort: '2-5 hours/month (support)',
        examples: [
          'Next.js SaaS Starter - $49 → $1000/month',
          'React Admin Dashboard - $29 → $600/month',
          'Python API Boilerplate - $39 → $500/month',
        ],
        platforms: ['Gumroad', 'LemonSqueezy', 'GitHub Sponsors'],
      });
    }
    
    // Design skills → templates
    const designSkills = userSkills.filter(s =>
      ['Design', 'UI/UX', 'Figma'].includes(s.name)
    );
    
    if (designSkills.length > 0) {
      opportunities.push({
        type: 'digital-product',
        platform: 'creative-market',
        title: 'Design Templates & UI Kits',
        description: 'Sell your best designs as templates',
        potential_monthly: '$200-1000',
        time_investment: '15-30 hours',
        ongoing_effort: '1-3 hours/month',
        examples: [
          'Figma UI Kit - $29 → $800/month',
          'Landing Page Templates - $19 → $400/month',
        ],
      });
    }
    
    return opportunities;
  }

  /**
   * Scan for content monetization opportunities
   */
  async scanContentMonetization(userSkills) {
    const opportunities = [];
    
    // Any skill → YouTube tutorials
    if (userSkills.length > 0) {
      opportunities.push({
        type: 'content-monetization',
        platform: 'youtube',
        title: 'YouTube Tutorial Channel',
        description: 'Create tutorial videos about your expertise',
        potential_monthly: '$100-3000+ (scales with subscribers)',
        time_investment: '2-4 hours per video',
        ongoing_effort: '8-16 hours/month (2-4 videos)',
        revenue_streams: [
          'Ad revenue ($2-5 per 1000 views)',
          'Sponsorships ($500-5000 per video at 10k+ subs)',
          'Course sales (funnel to your courses)',
          'Affiliate links',
        ],
        growth_timeline: [
          '3 months: 1,000 subscribers → $100/month',
          '6 months: 5,000 subscribers → $500/month',
          '12 months: 20,000 subscribers → $2000/month',
        ],
      });
    }
    
    // Technical writing skills → blog + newsletter
    if (userSkills.some(s => ['Writing', 'Technical Writing'].includes(s.name))) {
      opportunities.push({
        type: 'content-monetization',
        platform: 'substack',
        title: 'Paid Newsletter / Blog',
        description: 'Write about your expertise and monetize readers',
        potential_monthly: '$200-5000+',
        time_investment: '5-10 hours per post',
        ongoing_effort: '20-40 hours/month (weekly posts)',
        models: [
          'Free + sponsored posts → $500-2000/month',
          'Paid subscription → $5-10/month per subscriber',
          'Both → maximize revenue',
        ],
      });
    }
    
    return opportunities;
  }

  /**
   * Scan for API/SaaS product opportunities
   */
  async scanAPIProducts(userSkills) {
    const opportunities = [];
    
    const developerSkills = userSkills.filter(s =>
      s.category === 'technical' && s.proficiency >= 7
    );
    
    if (developerSkills.length > 0) {
      opportunities.push({
        type: 'api-product',
        platform: 'rapidapi',
        title: 'Build & Sell an API Product',
        description: 'Package your expertise as an API service',
        potential_monthly: '$100-10000+',
        time_investment: '40-80 hours',
        ongoing_effort: '5-15 hours/month (maintenance)',
        examples: [
          'Image processing API → $500/month',
          'Data enrichment API → $2000/month',
          'AI model API → $5000/month',
        ],
        pricing: [
          'Freemium: 100 requests/month free',
          'Starter: $9/month for 1000 requests',
          'Pro: $49/month for 10000 requests',
        ],
      });
      
      opportunities.push({
        type: 'micro-saas',
        platform: 'indie-hackers',
        title: 'Micro-SaaS Product',
        description: 'Build a small focused SaaS solving one problem',
        potential_monthly: '$500-10000+',
        time_investment: '100-200 hours',
        ongoing_effort: '10-20 hours/month',
        examples: [
          'Tweet scheduler → $3000/month',
          'Invoice generator → $1500/month',
          'Form builder → $5000/month',
        ],
        strategy: 'Solve a problem you have, validate with 10 customers, then scale',
      });
    }
    
    return opportunities;
  }

  /**
   * Scan for consulting package opportunities
   */
  async scanConsultingPackages(userSkills) {
    const opportunities = [];
    
    const expertSkills = userSkills.filter(s => s.proficiency >= 8);
    
    if (expertSkills.length > 0) {
      opportunities.push({
        type: 'consulting-package',
        platform: 'clarity',
        title: 'Packaged Consulting Services',
        description: 'Sell your expertise as fixed-price packages',
        potential_monthly: '$1000-5000',
        time_investment: '5-10 hours (setup)',
        ongoing_effort: '10-20 hours/month (delivery)',
        models: [
          'Strategy call - $200/hour → 5 calls/month = $1000',
          'Code review - $500 fixed → 4 reviews/month = $2000',
          'Architecture design - $2000 fixed → 1-2/month = $3000',
        ],
        platforms: ['Clarity', 'Intro', 'Superpeer', 'Your website'],
      });
    }
    
    return opportunities;
  }

  /**
   * Check if skill is teachable
   */
  isTeachable(skillName) {
    const teachableSkills = [
      'Python', 'JavaScript', 'React', 'Node.js', 'Data Science',
      'Machine Learning', 'AWS', 'Docker', 'Photography', 'Design',
      'Marketing', 'Sales', 'Writing', 'Video Editing',
    ];
    
    return teachableSkills.some(t =>
      skillName.toLowerCase().includes(t.toLowerCase())
    );
  }

  /**
   * Estimate course revenue potential
   */
  estimateCourseRevenue(skill) {
    const demandMultiplier = skill.market_demand || 0.7;
    const rateMultiplier = (skill.avg_hourly_rate || 65) / 65;
    
    const baseRevenue = 500; // $500/month baseline
    const potential = baseRevenue * demandMultiplier * rateMultiplier;
    
    return `$${Math.round(potential)}-${Math.round(potential * 3)}/month`;
  }

  /**
   * Score opportunity fit
   */
  scoreOpportunity(opportunity, userSkills, userProfile) {
    let score = 0.5; // Base score
    
    // High upside = higher score
    if (opportunity.potential_monthly.includes('5000+')) score += 0.2;
    else if (opportunity.potential_monthly.includes('2000+')) score += 0.15;
    else if (opportunity.potential_monthly.includes('1000+')) score += 0.10;
    
    // Less ongoing effort = higher score
    const effortHours = parseInt(opportunity.ongoing_effort) || 10;
    if (effortHours < 5) score += 0.2;
    else if (effortHours < 10) score += 0.1;
    
    // Match to user's skills
    if (opportunity.skills_required) {
      const matchCount = opportunity.skills_required.filter(req =>
        userSkills.some(s => s.name === req)
      ).length;
      
      score += (matchCount / opportunity.skills_required.length) * 0.3;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Generate action plan for opportunity
   */
  generateActionPlan(opportunity) {
    const plans = {
      'online-course': [
        '1. Outline course curriculum (8 hours)',
        '2. Record video lessons (24 hours)',
        '3. Create exercises and resources (8 hours)',
        '4. Upload to Udemy and optimize listing',
        '5. Market via social media and email list',
        '6. Update monthly based on feedback',
      ],
      'affiliate': [
        '1. Sign up for affiliate programs',
        '2. Create comparison/tutorial content',
        '3. Build email list',
        '4. Promote via blog/YouTube/Twitter',
        '5. Track conversions and optimize',
      ],
      'digital-product': [
        '1. Identify your best reusable code/design',
        '2. Clean it up and generalize',
        '3. Create documentation and examples',
        '4. Set up Gumroad store',
        '5. Launch on Twitter/Product Hunt',
        '6. Provide email support',
      ],
      'content-monetization': [
        '1. Choose your niche and format',
        '2. Create first 5-10 pieces of content',
        '3. Publish consistently (weekly)',
        '4. Grow audience for 3-6 months',
        '5. Monetize (ads, sponsors, paid tier)',
        '6. Scale content production',
      ],
      'api-product': [
        '1. Identify underserved API need',
        '2. Build MVP with basic endpoints',
        '3. Create developer docs',
        '4. List on RapidAPI marketplace',
        '5. Market to developers (dev.to, Reddit)',
        '6. Scale infrastructure as you grow',
      ],
      'micro-saas': [
        '1. Validate idea with 10 potential customers',
        '2. Build MVP in 4-6 weeks',
        '3. Get first 10 paying customers',
        '4. Iterate based on feedback',
        '5. Market via content and community',
        '6. Reach $1k MRR, then scale',
      ],
    };
    
    return plans[opportunity.type] || [];
  }
}
