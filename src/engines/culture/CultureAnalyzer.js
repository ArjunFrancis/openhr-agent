import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Company Culture Analyzer
 * Predicts culture fit BEFORE you apply
 * 
 * UNIQUE: Prevents wasting time on companies you won't like
 */
export class CultureAnalyzer {
  constructor(db) {
    this.db = db;
  }

  /**
   * Analyze company culture
   */
  async analyze(companyName, userPreferences) {
    console.log(`\n🏢 Analyzing culture at ${companyName}...\n`);
    
    const cultureData = await this.gatherCultureData(companyName);
    const fitScore = this.calculateFitScore(cultureData, userPreferences);
    const insights = this.generateInsights(cultureData, fitScore);
    
    console.log(`✅ Culture fit: ${(fitScore.overall * 100).toFixed(0)}%\n`);
    
    return {
      company: companyName,
      culture_data: cultureData,
      fit_score: fitScore,
      insights,
      recommendation: this.generateRecommendation(fitScore.overall),
    };
  }

  /**
   * Gather culture data from multiple sources
   */
  async gatherCultureData(companyName) {
    const sources = await Promise.all([
      this.scrapGlassdoor(companyName),
      this.scrapLinkedIn(companyName),
      this.scrapComparably(companyName),
      this.analyzeJobPostings(companyName),
    ]);
    
    return this.aggregateData(sources);
  }

  /**
   * Scrap Glassdoor reviews
   */
  async scrapGlassdoor(companyName) {
    // In production, would use Glassdoor API or respectful scraping
    // For now, simulating structure
    
    return {
      overall_rating: 4.2,
      culture_rating: 4.3,
      work_life_balance: 3.8,
      compensation: 4.1,
      career_opportunities: 4.0,
      senior_management: 3.5,
      pros: [
        'Great benefits and compensation',
        'Smart and talented colleagues',
        'Good work-life balance',
      ],
      cons: [
        'Slow decision making',
        'Too many meetings',
        'Limited growth opportunities',
      ],
      review_count: 1247,
    };
  }

  /**
   * Scrap LinkedIn company page
   */
  async scrapLinkedIn(companyName) {
    return {
      size: '1,001-5,000 employees',
      industry: 'Technology',
      founded: 2010,
      specialties: ['Software', 'AI', 'Cloud'],
      employee_growth: 0.15, // 15% growth
      values: ['Innovation', 'Collaboration', 'Customer Focus'],
    };
  }

  /**
   * Scrap Comparably
   */
  async scrapComparably(companyName) {
    return {
      happiness_score: 72,
      nps_score: 45,
      perks: ['Remote work', 'Unlimited PTO', 'Learning budget'],
      culture_score: {
        innovation: 8.2,
        collaboration: 7.8,
        autonomy: 7.5,
        diversity: 6.9,
      },
    };
  }

  /**
   * Analyze job postings for culture signals
   */
  async analyzeJobPostings(companyName) {
    // Analyze language in job postings
    return {
      keywords: ['fast-paced', 'dynamic', 'collaborative', 'innovative'],
      benefits_mentioned: ['health insurance', 'stock options', 'remote'],
      red_flags: [], // 'rockstar', 'ninja', 'work hard play hard'
      remote_friendly: true,
    };
  }

  /**
   * Aggregate data from all sources
   */
  aggregateData(sources) {
    const [glassdoor, linkedin, comparably, jobPostings] = sources;
    
    return {
      ratings: {
        overall: glassdoor.overall_rating,
        culture: glassdoor.culture_rating,
        work_life_balance: glassdoor.work_life_balance,
        compensation: glassdoor.compensation,
        happiness: comparably.happiness_score / 10,
      },
      company_info: {
        size: linkedin.size,
        industry: linkedin.industry,
        growth: linkedin.employee_growth,
        founded: linkedin.founded,
      },
      culture_attributes: {
        innovation: comparably.culture_score.innovation,
        collaboration: comparably.culture_score.collaboration,
        autonomy: comparably.culture_score.autonomy,
        diversity: comparably.culture_score.diversity,
      },
      perks: comparably.perks,
      pros: glassdoor.pros,
      cons: glassdoor.cons,
      remote_friendly: jobPostings.remote_friendly,
      red_flags: jobPostings.red_flags,
    };
  }

  /**
   * Calculate fit score
   */
  calculateFitScore(cultureData, userPreferences) {
    const scores = {
      work_life_balance: 0,
      growth_opportunities: 0,
      compensation: 0,
      culture_match: 0,
      values_alignment: 0,
      overall: 0,
    };
    
    // Work-life balance
    if (userPreferences.work_life_balance === 'high_priority') {
      scores.work_life_balance = cultureData.ratings.work_life_balance / 5.0;
    } else {
      scores.work_life_balance = 0.80; // Not a factor
    }
    
    // Growth
    scores.growth_opportunities = cultureData.company_info.growth;
    
    // Compensation
    scores.compensation = cultureData.ratings.compensation / 5.0;
    
    // Culture attributes match
    const cultureMatch = this.calculateCultureMatch(
      cultureData.culture_attributes,
      userPreferences.culture_preferences
    );
    scores.culture_match = cultureMatch;
    
    // Values alignment
    scores.values_alignment = this.calculateValuesAlignment(
      cultureData.pros,
      cultureData.cons,
      userPreferences.deal_breakers
    );
    
    // Overall weighted score
    scores.overall = (
      scores.work_life_balance * 0.25 +
      scores.growth_opportunities * 0.20 +
      scores.compensation * 0.20 +
      scores.culture_match * 0.20 +
      scores.values_alignment * 0.15
    );
    
    // Penalize for red flags
    if (cultureData.red_flags.length > 0) {
      scores.overall *= 0.85;
    }
    
    return scores;
  }

  /**
   * Calculate culture attribute match
   */
  calculateCultureMatch(companyAttributes, userPreferences) {
    if (!userPreferences) return 0.70;
    
    let score = 0;
    let count = 0;
    
    Object.keys(companyAttributes).forEach(attr => {
      if (userPreferences[attr]) {
        const importance = userPreferences[attr]; // 0-10
        const companyScore = companyAttributes[attr]; // 0-10
        
        // Higher importance = more weight
        score += (companyScore / 10) * (importance / 10);
        count++;
      }
    });
    
    return count > 0 ? score / count : 0.70;
  }

  /**
   * Calculate values alignment
   */
  calculateValuesAlignment(pros, cons, dealBreakers) {
    let score = 0.75; // Base
    
    // Check deal breakers in cons
    if (dealBreakers) {
      const hasDealBreaker = dealBreakers.some(breaker =>
        cons.some(con => con.toLowerCase().includes(breaker.toLowerCase()))
      );
      
      if (hasDealBreaker) {
        score = 0.20; // Major penalty
      }
    }
    
    return score;
  }

  /**
   * Generate insights
   */
  generateInsights(cultureData, fitScore) {
    const insights = {
      highlights: [],
      concerns: [],
      culture_description: '',
      best_for: [],
      not_for: [],
    };
    
    // Highlights
    if (cultureData.ratings.work_life_balance >= 4.0) {
      insights.highlights.push('✓ Excellent work-life balance');
    }
    
    if (cultureData.ratings.compensation >= 4.0) {
      insights.highlights.push('✓ Competitive compensation');
    }
    
    if (cultureData.remote_friendly) {
      insights.highlights.push('✓ Remote-friendly culture');
    }
    
    // Concerns
    if (cultureData.ratings.work_life_balance < 3.5) {
      insights.concerns.push('⚠️ Poor work-life balance reported');
    }
    
    if (cultureData.cons.some(c => c.toLowerCase().includes('management'))) {
      insights.concerns.push('⚠️ Management issues mentioned in reviews');
    }
    
    if (cultureData.red_flags.length > 0) {
      insights.concerns.push(`⚠️ Red flags in job postings: ${cultureData.red_flags.join(', ')}`);
    }
    
    // Culture description
    insights.culture_description = this.generateCultureDescription(cultureData);
    
    // Best for / Not for
    insights.best_for = this.generateBestFor(cultureData);
    insights.not_for = this.generateNotFor(cultureData);
    
    return insights;
  }

  /**
   * Generate culture description
   */
  generateCultureDescription(cultureData) {
    const attrs = cultureData.culture_attributes;
    const topAttr = Object.entries(attrs)
      .sort((a, b) => b[1] - a[1])[0][0];
    
    const descriptions = {
      innovation: 'fast-paced and innovative',
      collaboration: 'collaborative and team-oriented',
      autonomy: 'autonomous with freedom to execute',
      diversity: 'diverse and inclusive',
    };
    
    const wlb = cultureData.ratings.work_life_balance;
    const wlbDesc = wlb >= 4.0 ? 'strong work-life balance' :
                    wlb >= 3.5 ? 'moderate work-life balance' :
                    'demanding with long hours';
    
    return `${descriptions[topAttr] || 'professional'} environment with ${wlbDesc}`;
  }

  /**
   * Generate "Best for" list
   */
  generateBestFor(cultureData) {
    const bestFor = [];
    
    if (cultureData.culture_attributes.innovation >= 8.0) {
      bestFor.push('People who love cutting-edge tech');
    }
    
    if (cultureData.ratings.work_life_balance >= 4.0) {
      bestFor.push('Those prioritizing work-life balance');
    }
    
    if (cultureData.company_info.growth >= 0.15) {
      bestFor.push('Fast-track career growth seekers');
    }
    
    if (cultureData.remote_friendly) {
      bestFor.push('Remote work advocates');
    }
    
    return bestFor;
  }

  /**
   * Generate "Not for" list
   */
  generateNotFor(cultureData) {
    const notFor = [];
    
    if (cultureData.ratings.work_life_balance < 3.5) {
      notFor.push('Those needing strong work-life balance');
    }
    
    if (cultureData.cons.some(c => c.toLowerCase().includes('slow'))) {
      notFor.push('People wanting fast-paced innovation');
    }
    
    if (cultureData.cons.some(c => c.toLowerCase().includes('bureaucratic'))) {
      notFor.push('Those who dislike corporate bureaucracy');
    }
    
    return notFor;
  }

  /**
   * Generate recommendation
   */
  generateRecommendation(fitScore) {
    if (fitScore >= 0.85) {
      return {
        verdict: 'EXCELLENT FIT',
        action: 'Apply with confidence!',
        confidence: 'high',
      };
    } else if (fitScore >= 0.70) {
      return {
        verdict: 'GOOD FIT',
        action: 'Worth applying, but dig deeper in interview',
        confidence: 'moderate',
      };
    } else if (fitScore >= 0.55) {
      return {
        verdict: 'MODERATE FIT',
        action: 'Proceed with caution - address concerns in interview',
        confidence: 'low',
      };
    } else {
      return {
        verdict: 'POOR FIT',
        action: 'Consider skipping - culture mismatch likely',
        confidence: 'high',
      };
    }
  }

  /**
   * Generate comparison between companies
   */
  async compareCompanies(companies, userPreferences) {
    const analyses = await Promise.all(
      companies.map(company => this.analyze(company, userPreferences))
    );
    
    const ranked = analyses.sort((a, b) => b.fit_score.overall - a.fit_score.overall);
    
    return {
      ranked_companies: ranked,
      best_match: ranked[0],
      comparison_matrix: this.generateComparisonMatrix(ranked),
    };
  }

  /**
   * Generate comparison matrix
   */
  generateComparisonMatrix(analyses) {
    return {
      work_life_balance: analyses.map(a => ({
        company: a.company,
        score: a.fit_score.work_life_balance,
      })),
      growth: analyses.map(a => ({
        company: a.company,
        score: a.fit_score.growth_opportunities,
      })),
      compensation: analyses.map(a => ({
        company: a.company,
        score: a.fit_score.compensation,
      })),
    };
  }
}
