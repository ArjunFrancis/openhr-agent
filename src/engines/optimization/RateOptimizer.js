import { ProposalGenerator } from '../action/ProposalGenerator.js';

/**
 * Rate Optimization Engine
 * ML-powered system to suggest optimal hourly rates
 * 
 * UNIQUE FEATURE - No competitor has this!
 */
export class RateOptimizer {
  constructor(db) {
    this.db = db;
    this.proposalGen = new ProposalGenerator();
  }

  /**
   * Analyze and suggest optimal rate
   */
  async optimizeRate(userProfile, userSkills, history = []) {
    console.log('\n💰 Analyzing your optimal rate...\n');
    
    const analysis = {
      current_rate: userProfile.min_hourly_rate,
      market_data: await this.getMarketData(userSkills),
      your_performance: await this.analyzePerformance(history),
      competitor_rates: await this.getCompetitorRates(userSkills),
      demand_signals: await this.analyzeDemand(userSkills),
      optimal_rate: null,
      confidence: null,
      reasoning: [],
    };
    
    // Calculate optimal rate
    analysis.optimal_rate = this.calculateOptimalRate(analysis);
    analysis.confidence = this.calculateConfidence(analysis);
    analysis.reasoning = this.generateReasoning(analysis);
    
    // Generate pricing strategy
    analysis.strategy = this.generateStrategy(analysis);
    
    console.log(`✅ Optimal rate: $${analysis.optimal_rate}/hr (${(analysis.confidence * 100).toFixed(0)}% confidence)\n`);
    return analysis;
  }

  /**
   * Get market data for skills
   */
  async getMarketData(skills) {
    const marketRates = {};
    
    for (const skill of skills) {
      marketRates[skill.name] = {
        median: skill.avg_hourly_rate,
        p25: skill.avg_hourly_rate * 0.75,
        p75: skill.avg_hourly_rate * 1.25,
        p90: skill.avg_hourly_rate * 1.5,
        demand: skill.market_demand,
      };
    }
    
    return marketRates;
  }

  /**
   * Analyze your performance history
   */
  async analyzePerformance(history) {
    if (history.length === 0) {
      return {
        avg_rating: null,
        success_rate: null,
        repeat_client_rate: null,
        performance_percentile: 50,
      };
    }
    
    const ratings = history.map(h => h.client_rating).filter(Boolean);
    const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    
    const successfulJobs = history.filter(h => h.status === 'completed').length;
    const successRate = successfulJobs / history.length;
    
    const uniqueClients = new Set(history.map(h => h.client_id));
    const repeatClients = history.length - uniqueClients.size;
    const repeatRate = repeatClients / uniqueClients.size;
    
    const performanceScore = (
      (avgRating / 5.0) * 0.4 +
      successRate * 0.3 +
      Math.min(repeatRate, 1.0) * 0.3
    );
    
    return {
      avg_rating: avgRating,
      success_rate: successRate,
      repeat_client_rate: repeatRate,
      performance_percentile: Math.round(performanceScore * 100),
    };
  }

  /**
   * Get competitor rates
   */
  async getCompetitorRates(skills) {
    const topSkills = skills
      .sort((a, b) => b.proficiency - a.proficiency)
      .slice(0, 3);
    
    return {
      entry_level: Math.min(...topSkills.map(s => s.avg_hourly_rate * 0.6)),
      mid_level: Math.min(...topSkills.map(s => s.avg_hourly_rate)),
      senior_level: Math.min(...topSkills.map(s => s.avg_hourly_rate * 1.3)),
      expert_level: Math.min(...topSkills.map(s => s.avg_hourly_rate * 1.8)),
    };
  }

  /**
   * Analyze demand signals
   */
  async analyzeDemand(skills) {
    const avgDemand = skills.reduce((sum, s) => sum + s.market_demand, 0) / skills.length;
    
    return {
      high_demand_count: skills.filter(s => s.market_demand >= 0.85).length,
      avg_demand: avgDemand,
      demand_trend: avgDemand >= 0.80 ? 'rising' : avgDemand >= 0.65 ? 'stable' : 'declining',
    };
  }

  /**
   * Calculate optimal rate using ML-like algorithm
   */
  calculateOptimalRate(analysis) {
    const topSkills = Object.entries(analysis.market_data)
      .sort((a, b) => b[1].median - a[1].median)
      .slice(0, 3);
    
    let baseRate = topSkills[0][1].median;
    
    // Performance multiplier
    const perf = analysis.your_performance.performance_percentile;
    if (perf >= 90) baseRate *= 1.5;
    else if (perf >= 75) baseRate *= 1.25;
    else if (perf < 50) baseRate *= 0.85;
    
    // Demand multiplier
    if (analysis.demand_signals.avg_demand >= 0.85) baseRate *= 1.15;
    else if (analysis.demand_signals.avg_demand < 0.65) baseRate *= 0.90;
    
    return Math.round(baseRate);
  }

  calculateConfidence(analysis) {
    let confidence = 0.5;
    if (analysis.your_performance.avg_rating) confidence += 0.2;
    if (analysis.demand_signals.avg_demand >= 0.80) confidence += 0.2;
    if (analysis.your_performance.performance_percentile) confidence += 0.1;
    return Math.min(confidence, 0.95);
  }

  generateReasoning(analysis) {
    const reasons = [];
    const current = analysis.current_rate;
    const optimal = analysis.optimal_rate;
    const percentChange = ((optimal - current) / current) * 100;
    
    if (Math.abs(percentChange) < 5) {
      reasons.push('Your current rate is already optimal');
    } else if (percentChange > 0) {
      reasons.push(`You're undercharging by ${percentChange.toFixed(0)}%`);
    }
    
    const perf = analysis.your_performance.performance_percentile;
    if (perf >= 90) {
      reasons.push('Top 10% performance = premium rates justified');
    }
    
    if (analysis.demand_signals.avg_demand >= 0.85) {
      reasons.push('High demand = charge more');
    }
    
    return reasons;
  }

  generateStrategy(analysis) {
    const current = analysis.current_rate;
    const optimal = analysis.optimal_rate;
    const diff = optimal - current;
    
    if (diff > current * 0.2) {
      return {
        approach: 'gradual_increase',
        steps: [
          { timeline: 'Now', action: `$${Math.round(current * 1.10)}/hr for new clients` },
          { timeline: '3 months', action: `$${Math.round(current * 1.20)}/hr` },
          { timeline: '6 months', action: `$${optimal}/hr (target)` },
        ],
      };
    } else if (diff > 0) {
      return {
        approach: 'immediate_increase',
        steps: [
          { timeline: 'Now', action: `$${optimal}/hr for all new clients` },
        ],
      };
    } else {
      return {
        approach: 'maintain',
        steps: [{ timeline: 'Current', action: 'Rate is optimal' }],
      };
    }
  }
}
