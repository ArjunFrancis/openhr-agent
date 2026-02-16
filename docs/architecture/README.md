# OpenHR AI Architecture

## System Overview

OpenHR AI is built on [OpenClaw](https://github.com/openclaw/openclaw) and extends it with economic intelligence capabilities.

## Core Components

### 1. Gateway (OpenClaw Foundation)
- WebSocket control plane
- Session management
- Tool orchestration
- Message routing

### 2. Skills Discovery Engine
**Purpose:** Automatically discover what you're good at

**Components:**
- `GitHubAnalyzer` - Analyzes commits, PRs, languages, repos
- `WritingAnalyzer` - Extracts tone, expertise, quality from writing samples
- `SkillsProfiler` - Builds and maintains your skills inventory

**Data Model:**
```sql
CREATE TABLE skills (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  proficiency INT CHECK (proficiency BETWEEN 1 AND 10),
  evidence JSONB,  -- GitHub URLs, writing samples, etc.
  market_demand FLOAT,
  avg_hourly_rate DECIMAL,
  discovered_at TIMESTAMP,
  last_validated TIMESTAMP
);
```

### 3. Opportunity Scanner (Hunt Engine)
**Purpose:** Find money-making opportunities 24/7

**Hunt Types:**
- `UpworkHunt` - Scans Upwork for matching gigs
- `FreelancerHunt` - Crawls Freelancer.com
- `GitHubBountiesHunt` - Monitors GitHub bounty programs
- `RemoteJobsHunt` - Tracks remote job boards

**Hunt Interface:**
```javascript
class Hunt {
  name: string;
  frequency: 'hourly' | 'daily' | 'weekly';
  
  async scan(): Promise<Opportunity[]>;
  async match(skills: Skill[]): Promise<MatchedOpportunity[]>;
  async score(opportunity: Opportunity, profile: Profile): Promise<number>;
}
```

**Data Model:**
```sql
CREATE TABLE opportunities (
  id UUID PRIMARY KEY,
  platform VARCHAR(50),  -- 'upwork', 'freelancer', etc.
  title TEXT,
  description TEXT,
  url TEXT UNIQUE,
  pay_min DECIMAL,
  pay_max DECIMAL,
  pay_type VARCHAR(20),  -- 'hourly', 'fixed', 'equity'
  required_skills TEXT[],
  match_score FLOAT,  -- 0.0 to 1.0
  status VARCHAR(20),  -- 'new', 'applied', 'rejected', 'accepted'
  discovered_at TIMESTAMP,
  expires_at TIMESTAMP
);
```

### 4. Economic Intelligence
**Purpose:** Match skills to opportunities and optimize earning potential

**Algorithms:**
- **Semantic Matching:** Vector embeddings for skill matching
- **Pay Rate Analysis:** Market rate tracking per skill
- **Success Prediction:** ML model trained on application outcomes
- **Opportunity Scoring:** Multi-factor scoring algorithm

**Scoring Formula:**
```
match_score = (
  0.40 * skill_match +
  0.25 * pay_rate_fit +
  0.20 * success_probability +
  0.10 * time_investment_fit +
  0.05 * platform_reputation
)
```

### 5. Autonomous Action Engine
**Purpose:** Take action to make you money

**Actions:**
- **Proposal Generation:** Custom proposals using LLM
- **Application Submission:** Auto-apply with approval gates
- **Client Communication:** Draft responses to clients
- **Contract Management:** Track active contracts

**Approval Modes:**
- `review-first` - Show proposal, wait for approval
- `auto-low-stakes` - Auto-apply if < $500 and score > 0.85
- `full-auto` - Apply to everything above threshold (risky!)

## Data Flow

```
┌─────────────────┐
│ Skills Discovery│ → Continuously analyzes your work
└────────┬────────┘
         │
         ↓ Updates
┌─────────────────┐
│ Skills Profile  │ → Your economic capabilities
└────────┬────────┘
         │
         ↓ Feeds into
┌─────────────────┐
│ Opportunity     │ → Hunts run 24/7
│ Scanner         │
└────────┬────────┘
         │
         ↓ Produces
┌─────────────────┐
│ Matched         │ → Scored opportunities
│ Opportunities   │
└────────┬────────┘
         │
         ↓ Triggers
┌─────────────────┐
│ Autonomous      │ → Generates proposals
│ Actions         │ → Submits applications
└────────┬────────┘
         │
         ↓ Results in
┌─────────────────┐
│ Earnings        │ → Money in your pocket
└─────────────────┘
```

## Hunt Development Guide

### Creating a New Hunt

1. Create a new directory in `src/hunts/`
2. Add a `HUNT.md` manifest
3. Implement the Hunt interface
4. Add to the Hunt registry

**Example: UpworkHunt**

`src/hunts/upwork/HUNT.md`:
```yaml
---
name: upwork-scanner
platform: upwork
frequency: hourly
autoApply: review-first
---

# Upwork Opportunity Scanner

Scans Upwork every hour for freelance gigs matching your skills.

## Requirements
- Upwork API credentials
- Active Upwork account

## Matching Logic
- Semantic skill matching (vector embeddings)
- Pay rate filtering
- Client rating requirements
- Success rate prediction
```

`src/hunts/upwork/index.js`:
```javascript
import { Hunt } from '../../engines/hunt/Hunt.js';

export class UpworkHunt extends Hunt {
  name = 'upwork-scanner';
  frequency = 'hourly';
  
  async scan() {
    // Hit Upwork API
    // Parse job listings
    // Return Opportunity[]
  }
  
  async match(skills) {
    // Vector similarity between skills and requirements
    // Return scored matches
  }
}
```

## Database Schema

See `src/database/schema.sql` for complete schema.

**Core Tables:**
- `skills` - Your capabilities
- `opportunities` - Found opportunities
- `applications` - Submitted applications
- `earnings` - Money made
- `skills_demand` - Market intelligence data

## Configuration

See `.env.example` for all configuration options.

**Key Settings:**
- `AUTO_APPLY_THRESHOLD` - Minimum score to auto-apply
- `AUTO_APPLY_ENABLED` - Master switch for autonomous mode
- `SCAN_INTERVAL_MINUTES` - How often to hunt
- `APPROVAL_MODE` - Control level (review-first, auto-low-stakes, full-auto)

## Security & Privacy

- All data stored locally (PostgreSQL)
- API keys encrypted at rest
- No data sent to OpenHR servers
- You own your profile and earnings data

## Integration with OpenClaw

OpenHR AI extends OpenClaw's tool system:
- Uses OpenClaw's gateway for control
- Adds Hunt skills (like SKILL.md but for hunting)
- Integrates with OpenClaw's session management
- Can be controlled via chat (WhatsApp, Telegram, etc.)

**Example Chat Commands:**
```
/hunt status               # Check what's running
/opportunities list        # Show today's opportunities
/apply review 123         # Review opportunity #123
/earnings this-month      # Show earnings summary
/skills update            # Re-analyze GitHub/writing
```

## Performance

**Designed for efficiency:**
- Hunts run in background workers
- Database queries optimized with indexes
- Rate-limited API calls
- Cached market intelligence data
- Incremental skills analysis (not full re-scan)

## Extensibility

**Add your own Hunts:**
1. Implement the Hunt interface
2. Drop in `src/hunts/your-hunt/`
3. Register in `src/engines/hunt/registry.js`
4. OpenHR automatically picks it up

**Add your own Skills analyzers:**
1. Implement SkillsAnalyzer interface
2. Add to `src/engines/skills/analyzers/`
3. Register in skills engine

---

**Next Steps:**
- Read `docs/hunts/upwork-guide.md` for first Hunt setup
- See `docs/deployment/` for production deployment
- Check `examples/` for sample profiles and proposals
