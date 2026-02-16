# 🧪 Testing OpenHR AI

Complete testing guide for developers and early users.

## Prerequisites

```bash
# Install PostgreSQL (if not installed)
brew install postgresql@14  # macOS
# or
sudo apt install postgresql  # Linux

# Start PostgreSQL
brew services start postgresql  # macOS
# or
sudo systemctl start postgresql  # Linux

# Clone the repo
git clone https://github.com/ArjunFrancis/openhr-agent.git
cd openhr-agent

# Install dependencies
npm install
```

## Setup

### 1. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env`:

```env
# REQUIRED
ANTHROPIC_API_KEY=sk-ant-your-key-here
DATABASE_URL=postgresql://postgres:password@localhost:5432/openhr

# OPTIONAL (for full testing)
GITHUB_TOKEN=ghp_your_token_here
UPWORK_API_KEY=your_key
UPWORK_API_SECRET=your_secret
```

**Get API Keys:**
- Anthropic: https://console.anthropic.com/
- GitHub: https://github.com/settings/tokens (select `public_repo` scope)
- Upwork: https://www.upwork.com/ab/account-security/api

### 2. Database Setup

```bash
# Create database
createdb openhr

# Or manually:
psql -U postgres -c "CREATE DATABASE openhr;"

# Initialize schema
psql -U postgres openhr < src/database/schema.sql

# Verify
psql -U postgres openhr -c "\dt"
```

Expected tables:
- user_profile
- skills
- opportunities
- applications
- earnings
- skills_demand
- hunt_logs

## Test Flow

### Test 1: Profile Setup ✅

```bash
npm start init
```

**Expected:**
```
🚀 Welcome to OpenHR AI!

✅ Database connected: 2025-02-16...

? What's your GitHub username? your-username
? Your email: you@example.com
? Minimum hourly rate ($): 50
? Available hours per week: 20

✅ Profile created!

Next steps:
  1. Run: openhr discover github
  2. Run: openhr hunt
  3. Run: openhr opportunities
```

**Verify in DB:**
```bash
psql -U postgres openhr -c "SELECT * FROM user_profile;"
```

### Test 2: Skills Discovery ✅

```bash
npm start discover github
```

**Expected:**
```
🔍 Analyzing your-username on GitHub...

✅ Skills discovered!

📊 Your Skills:

  • JavaScript (8/10)
    ████████ $70/hr market rate
  • Python (7/10)
    ███████ $75/hr market rate
  • TypeScript (7/10)
    ███████ $80/hr market rate

... and 12 more skills

Next: openhr hunt
```

**Verify in DB:**
```bash
psql -U postgres openhr -c "SELECT name, proficiency, avg_hourly_rate FROM skills ORDER BY proficiency DESC LIMIT 10;"
```

**Troubleshooting:**
- `403 Forbidden` → Add GITHUB_TOKEN to .env
- `404 Not Found` → Check GitHub username spelling
- No skills found → Make sure user has public repos

### Test 3: Opportunity Hunting ✅

```bash
npm start hunt
```

**Expected:**
```
🏹 Starting hunt with 15 skills...

⠋ Scanning Upwork...
✅ Upwork scan complete: 17 matches

💰 Found 17 opportunities
   High match (>0.80): 5
   Medium match (0.65-0.80): 12

Run: openhr opportunities
```

**Note:** Without real Upwork API keys, this will currently fail. The hunt will log the error but continue.

**Verify in DB:**
```bash
psql -U postgres openhr -c "SELECT COUNT(*) FROM opportunities;"
psql -U postgres openhr -c "SELECT * FROM hunt_logs ORDER BY started_at DESC LIMIT 5;"
```

### Test 4: View Opportunities ✅

```bash
npm start opportunities
```

**Expected:**
```
📊 Your Opportunities

[1] 🔥 Python API Integration (Score: 0.89)
    $60-80/hr | upwork | 2h ago
    Skills: Python, REST API, FastAPI, PostgreSQL
    Client: ⭐⭐⭐⭐⭐
    https://www.upwork.com/jobs/...

[2] 🔥 Technical Writer - AI/ML (Score: 0.85)
    $50-70/hr | upwork | 4h ago
    Skills: Technical Writing, AI/ML, Python
    Client: ⭐⭐⭐⭐
    https://www.upwork.com/jobs/...
```

**Filter by score:**
```bash
npm start opportunities --score 0.85 --limit 5
```

### Test 5: Generate Proposal ✅

```bash
npm start apply 1
```

**Expected:**
```
📝 Generating proposal for:

Python API Integration Specialist
Score: 0.89 | upwork

🤖 Generating proposal with AI...

━━━ YOUR PROPOSAL ━━━

Hi,

I noticed you're looking for Python API integration expertise. With 8/10 proficiency in Python and extensive experience building REST APIs...

[Professional, personalized 200-word proposal]

💡 Commands:
  • Get variations: openhr apply 1 --variations
  • Copy and paste into upwork
```

**Get multiple variations:**
```bash
npm start apply 1 --variations
```

**Expected:**
```
🤖 Generating 3 variations...

━━━ Variation 1: PROFESSIONAL ━━━
[Formal, corporate tone]

━━━ Variation 2: CASUAL ━━━
[Friendly, conversational tone]

━━━ Variation 3: TECHNICAL ━━━
[Detail-oriented, technical tone]

💡 Tip: Copy the one that fits your style best!
```

### Test 6: Profile Status ✅

```bash
npm start status
```

**Expected:**
```
👤 Your Profile

GitHub: your-username
Email: you@example.com
Min Rate: $50/hr
Availability: 20hrs/week

📊 Stats

Skills: 15
Opportunities Found: 17
This Month:
  Earnings: $0
  Gigs: 0
  Avg Rate: N/A
```

## Database Queries for Testing

```bash
# Skills by proficiency
psql -U postgres openhr -c "SELECT name, proficiency, avg_hourly_rate, source FROM skills ORDER BY proficiency DESC;"

# Opportunities by match score
psql -U postgres openhr -c "SELECT title, platform, match_score, pay_min, pay_max FROM opportunities ORDER BY match_score DESC LIMIT 10;"

# Hunt performance
psql -U postgres openhr -c "SELECT hunt_name, status, opportunities_found, execution_time_ms, started_at FROM hunt_logs ORDER BY started_at DESC LIMIT 10;"

# Skills performance view
psql -U postgres openhr -c "SELECT * FROM skills_performance;"

# Reset database (careful!)
psql -U postgres openhr -c "TRUNCATE skills, opportunities, hunt_logs, user_profile CASCADE;"
```

## Manual Testing Scenarios

### Scenario 1: New User Onboarding
1. `npm start init` → Create profile
2. `npm start discover github` → Discover skills
3. `npm start status` → Verify profile
4. Check DB: Skills should be populated

### Scenario 2: Daily Hunt
1. `npm start hunt` → Run hunt
2. `npm start opportunities` → View results
3. `npm start apply 1` → Generate proposal
4. Check DB: Opportunities and hunt logs

### Scenario 3: Multi-Platform
1. Add Freelancer credentials to .env
2. `npm start hunt --platform freelancer`
3. `npm start opportunities --platform freelancer`

## Known Issues & Workarounds

### Issue: Upwork API Not Connected
**Status:** Expected (needs real API keys)
**Workaround:** Hunt will log error but continue
**Fix:** Add real Upwork OAuth credentials

### Issue: GitHub Rate Limit
**Status:** 60 requests/hour without token
**Workaround:** Add GITHUB_TOKEN to .env
**Fix:** Increases limit to 5000/hour

### Issue: No Opportunities Found
**Cause:** No real Upwork connection yet
**Workaround:** Manually insert test data:
```sql
INSERT INTO opportunities (platform, title, description, url, pay_min, pay_max, pay_type, match_score)
VALUES ('upwork', 'Test Python Job', 'Build an API', 'https://upwork.com/test', 60, 80, 'hourly', 0.89);
```

## Performance Benchmarks

Expected timings:
- Profile init: < 1s
- GitHub discovery: 5-10s (30 repos)
- Upwork hunt: 10-15s (with API)
- Proposal generation: 2-4s
- DB queries: < 100ms

## Next Steps

Once core testing is complete:
1. Connect real Upwork API
2. Add Freelancer hunt
3. Build web dashboard
4. Add email notifications
5. Implement auto-apply with approval

## Report Issues

Found a bug? Create an issue:
https://github.com/ArjunFrancis/openhr-agent/issues

Include:
- Command run
- Error message
- Node version (`node -v`)
- PostgreSQL version (`psql --version`)
