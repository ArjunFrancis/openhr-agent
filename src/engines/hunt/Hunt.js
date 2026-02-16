/**
 * Base Hunt class
 * All Hunts extend this and implement scan() and score()
 */
export class Hunt {
  constructor(config = {}) {
    this.config = config;
    this.name = 'base-hunt';
    this.platform = 'unknown';
    this.frequency = 'hourly'; // 'hourly', 'daily', 'weekly'
  }

  /**
   * Scan for opportunities
   * @param {Array} skills - User's skills
   * @returns {Promise<Array>} - Array of opportunities
   */
  async scan(skills) {
    throw new Error('scan() must be implemented by subclass');
  }

  /**
   * Score an opportunity based on user profile
   * @param {Object} opportunity - The opportunity to score
   * @param {Array} userSkills - User's skills
   * @returns {Promise<number>} - Score between 0.0 and 1.0
   */
  async score(opportunity, userSkills) {
    throw new Error('score() must be implemented by subclass');
  }

  /**
   * Match opportunities to user skills
   */
  async match(opportunities, userSkills) {
    const matched = [];
    
    for (const opp of opportunities) {
      const score = await this.score(opp, userSkills);
      
      if (score >= (this.config.matchThreshold || 0.65)) {
        matched.push({
          ...opp,
          match_score: score,
        });
      }
    }
    
    // Sort by score descending
    return matched.sort((a, b) => b.match_score - a.match_score);
  }

  /**
   * Run the complete hunt cycle
   */
  async run(userSkills, db) {
    const startTime = Date.now();
    console.log(`\n🏹 Starting ${this.name}...`);
    
    try {
      // Scan for opportunities
      const opportunities = await this.scan(userSkills);
      
      // Match and score
      const matched = await this.match(opportunities, userSkills);
      
      // Save to database
      for (const opp of matched) {
        await db.saveOpportunity(opp);
      }
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ Hunt complete in ${duration}ms`);
      console.log(`   Found: ${opportunities.length} opportunities`);
      console.log(`   Matched: ${matched.length} above threshold`);
      
      // Log to hunt_logs table
      await db.logHunt({
        hunt_name: this.name,
        status: 'completed',
        opportunities_found: opportunities.length,
        execution_time_ms: duration,
      });
      
      return matched;
    } catch (error) {
      console.error(`❌ Hunt failed: ${error.message}`);
      
      await db.logHunt({
        hunt_name: this.name,
        status: 'failed',
        error_message: error.message,
        execution_time_ms: Date.now() - startTime,
      });
      
      throw error;
    }
  }
}
