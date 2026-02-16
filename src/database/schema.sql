-- OpenHR AI Database Schema

-- Skills table: Your discovered capabilities
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  proficiency INT CHECK (proficiency BETWEEN 1 AND 10),
  category VARCHAR(50), -- 'technical', 'creative', 'domain', 'soft'
  evidence JSONB, -- GitHub URLs, writing samples, project links
  market_demand FLOAT, -- 0.0 to 1.0
  avg_hourly_rate DECIMAL(10, 2),
  discovered_at TIMESTAMP DEFAULT NOW(),
  last_validated TIMESTAMP DEFAULT NOW(),
  source VARCHAR(50), -- 'github', 'writing', 'manual'
  UNIQUE(name)
);

CREATE INDEX idx_skills_proficiency ON skills(proficiency DESC);
CREATE INDEX idx_skills_market_demand ON skills(market_demand DESC);
CREATE INDEX idx_skills_category ON skills(category);

-- Opportunities table: Found money-making opportunities
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL, -- 'upwork', 'freelancer', 'github', etc.
  external_id VARCHAR(255), -- Platform's ID
  title TEXT NOT NULL,
  description TEXT,
  url TEXT UNIQUE NOT NULL,
  pay_min DECIMAL(10, 2),
  pay_max DECIMAL(10, 2),
  pay_type VARCHAR(20), -- 'hourly', 'fixed', 'equity'
  required_skills TEXT[],
  match_score FLOAT, -- 0.0 to 1.0
  status VARCHAR(20) DEFAULT 'new', -- 'new', 'reviewing', 'applied', 'rejected', 'accepted', 'completed'
  discovered_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  client_info JSONB,
  metadata JSONB
);

CREATE INDEX idx_opportunities_match_score ON opportunities(match_score DESC);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_platform ON opportunities(platform);
CREATE INDEX idx_opportunities_discovered ON opportunities(discovered_at DESC);

-- Applications table: Your submitted applications
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES opportunities(id),
  proposal_text TEXT NOT NULL,
  proposal_generated_by VARCHAR(20), -- 'ai', 'manual'
  submitted_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  response_received_at TIMESTAMP,
  client_feedback TEXT,
  success BOOLEAN,
  skills_used TEXT[]
);

CREATE INDEX idx_applications_opportunity ON applications(opportunity_id);
CREATE INDEX idx_applications_status ON applications(status);

-- Earnings table: Money you've made
CREATE TABLE IF NOT EXISTS earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  skills_used TEXT[],
  hours_invested FLOAT,
  hourly_rate DECIMAL(10, 2),
  client_rating INT CHECK (client_rating BETWEEN 1 AND 5),
  completed_at TIMESTAMP DEFAULT NOW(),
  platform VARCHAR(50),
  notes TEXT
);

CREATE INDEX idx_earnings_completed ON earnings(completed_at DESC);
CREATE INDEX idx_earnings_amount ON earnings(amount DESC);

-- Skills demand tracking: Market intelligence
CREATE TABLE IF NOT EXISTS skills_demand (
  skill_name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  opportunity_count INT,
  avg_pay_rate DECIMAL(10, 2),
  demand_score FLOAT, -- 0.0 to 1.0
  platform VARCHAR(50),
  PRIMARY KEY (skill_name, date, platform)
);

CREATE INDEX idx_demand_date ON skills_demand(date DESC);
CREATE INDEX idx_demand_score ON skills_demand(demand_score DESC);

-- User profile: Your economic identity
CREATE TABLE IF NOT EXISTS user_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_username VARCHAR(255),
  email VARCHAR(255),
  bio TEXT,
  portfolio_urls TEXT[],
  timezone VARCHAR(50),
  availability_hours_per_week INT,
  min_hourly_rate DECIMAL(10, 2),
  preferred_payment_methods TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Hunt logs: Track what the agent is doing
CREATE TABLE IF NOT EXISTS hunt_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hunt_name VARCHAR(100) NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  opportunities_found INT DEFAULT 0,
  status VARCHAR(20), -- 'running', 'completed', 'failed'
  error_message TEXT,
  execution_time_ms INT
);

CREATE INDEX idx_hunt_logs_started ON hunt_logs(started_at DESC);

-- Views for analytics
CREATE OR REPLACE VIEW skills_performance AS
SELECT 
  s.name as skill_name,
  s.proficiency,
  s.avg_hourly_rate,
  COUNT(DISTINCT e.id) as earnings_count,
  SUM(e.amount) as total_earned,
  AVG(e.hourly_rate) as actual_avg_rate,
  AVG(e.client_rating) as avg_rating
FROM skills s
LEFT JOIN earnings e ON s.name = ANY(e.skills_used)
GROUP BY s.id, s.name, s.proficiency, s.avg_hourly_rate;

CREATE OR REPLACE VIEW opportunity_pipeline AS
SELECT 
  DATE(discovered_at) as date,
  platform,
  COUNT(*) as total_found,
  AVG(match_score) as avg_score,
  COUNT(*) FILTER (WHERE status = 'applied') as applied_count,
  COUNT(*) FILTER (WHERE status = 'accepted') as accepted_count
FROM opportunities
GROUP BY DATE(discovered_at), platform
ORDER BY date DESC;

-- Triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profile_updated_at
  BEFORE UPDATE ON user_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
