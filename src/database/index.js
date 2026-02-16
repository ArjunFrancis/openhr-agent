import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

/**
 * Database connection and operations
 */
export class Database {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    this.pool.on('error', (err) => {
      console.error('Unexpected database error:', err);
    });
  }

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      const result = await this.pool.query('SELECT NOW()');
      console.log('✅ Database connected:', result.rows[0].now);
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
  }

  /**
   * Save or update user profile
   */
  async saveProfile(profile) {
    const query = `
      INSERT INTO user_profile (
        github_username, email, bio, timezone,
        availability_hours_per_week, min_hourly_rate
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        github_username = EXCLUDED.github_username,
        email = EXCLUDED.email,
        bio = EXCLUDED.bio,
        updated_at = NOW()
      RETURNING *
    `;
    
    const values = [
      profile.github_username,
      profile.email,
      profile.bio,
      profile.timezone,
      profile.availability_hours_per_week,
      profile.min_hourly_rate,
    ];
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get user profile
   */
  async getProfile() {
    const result = await this.pool.query(
      'SELECT * FROM user_profile ORDER BY created_at DESC LIMIT 1'
    );
    return result.rows[0] || null;
  }

  /**
   * Save a skill
   */
  async saveSkill(skill) {
    const query = `
      INSERT INTO skills (
        name, proficiency, category, evidence,
        market_demand, avg_hourly_rate, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (name) DO UPDATE SET
        proficiency = EXCLUDED.proficiency,
        evidence = EXCLUDED.evidence,
        market_demand = EXCLUDED.market_demand,
        avg_hourly_rate = EXCLUDED.avg_hourly_rate,
        last_validated = NOW()
      RETURNING *
    `;
    
    const values = [
      skill.name,
      skill.proficiency,
      skill.category,
      JSON.stringify(skill.evidence),
      skill.market_demand,
      skill.avg_hourly_rate,
      skill.source,
    ];
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get all skills
   */
  async getSkills() {
    const result = await this.pool.query(
      'SELECT * FROM skills ORDER BY proficiency DESC, market_demand DESC'
    );
    return result.rows;
  }

  /**
   * Save an opportunity
   */
  async saveOpportunity(opp) {
    const query = `
      INSERT INTO opportunities (
        platform, external_id, title, description, url,
        pay_min, pay_max, pay_type, required_skills,
        match_score, status, discovered_at, expires_at,
        client_info, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (url) DO UPDATE SET
        match_score = EXCLUDED.match_score,
        status = EXCLUDED.status
      RETURNING *
    `;
    
    const values = [
      opp.platform,
      opp.external_id,
      opp.title,
      opp.description,
      opp.url,
      opp.pay_min,
      opp.pay_max,
      opp.pay_type,
      opp.required_skills,
      opp.match_score,
      opp.status || 'new',
      opp.discovered_at || new Date(),
      opp.expires_at,
      JSON.stringify(opp.client_info),
      JSON.stringify(opp.metadata),
    ];
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get opportunities
   */
  async getOpportunities(filters = {}) {
    let query = 'SELECT * FROM opportunities WHERE 1=1';
    const values = [];
    let paramCount = 1;
    
    if (filters.status) {
      query += ` AND status = $${paramCount}`;
      values.push(filters.status);
      paramCount++;
    }
    
    if (filters.minScore) {
      query += ` AND match_score >= $${paramCount}`;
      values.push(filters.minScore);
      paramCount++;
    }
    
    if (filters.platform) {
      query += ` AND platform = $${paramCount}`;
      values.push(filters.platform);
      paramCount++;
    }
    
    query += ' ORDER BY match_score DESC, discovered_at DESC';
    
    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
    }
    
    const result = await this.pool.query(query, values);
    return result.rows;
  }

  /**
   * Log hunt execution
   */
  async logHunt(log) {
    const query = `
      INSERT INTO hunt_logs (
        hunt_name, started_at, completed_at,
        opportunities_found, status, error_message,
        execution_time_ms
      ) VALUES ($1, NOW(), $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      log.hunt_name,
      log.completed_at || new Date(),
      log.opportunities_found || 0,
      log.status,
      log.error_message,
      log.execution_time_ms,
    ];
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get recent hunt logs
   */
  async getHuntLogs(limit = 10) {
    const result = await this.pool.query(
      'SELECT * FROM hunt_logs ORDER BY started_at DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  }

  /**
   * Save earnings
   */
  async saveEarning(earning) {
    const query = `
      INSERT INTO earnings (
        application_id, amount, currency, skills_used,
        hours_invested, hourly_rate, client_rating,
        platform, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      earning.application_id,
      earning.amount,
      earning.currency || 'USD',
      earning.skills_used,
      earning.hours_invested,
      earning.hourly_rate,
      earning.client_rating,
      earning.platform,
      earning.notes,
    ];
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get earnings summary
   */
  async getEarningsSummary(period = 'month') {
    let dateFilter = '';
    
    if (period === 'week') {
      dateFilter = "AND completed_at >= NOW() - INTERVAL '7 days'";
    } else if (period === 'month') {
      dateFilter = "AND completed_at >= NOW() - INTERVAL '30 days'";
    } else if (period === 'year') {
      dateFilter = "AND completed_at >= NOW() - INTERVAL '1 year'";
    }
    
    const query = `
      SELECT 
        COUNT(*) as total_gigs,
        SUM(amount) as total_earned,
        AVG(amount) as avg_per_gig,
        AVG(hourly_rate) as avg_hourly_rate,
        AVG(client_rating) as avg_rating,
        SUM(hours_invested) as total_hours
      FROM earnings
      WHERE 1=1 ${dateFilter}
    `;
    
    const result = await this.pool.query(query);
    return result.rows[0];
  }

  /**
   * Close database connection
   */
  async close() {
    await this.pool.end();
  }
}

// Singleton instance
let dbInstance = null;

export function getDatabase() {
  if (!dbInstance) {
    dbInstance = new Database();
  }
  return dbInstance;
}
