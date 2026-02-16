# 🚀 Quick Start Guide

Get OpenHR AI running in 5 minutes.

## Prerequisites

- Node.js ≥ 22
- PostgreSQL (local or cloud)
- GitHub account
- Upwork account (for hunting)

## Installation

```bash
# Clone the repo
git clone https://github.com/ArjunFrancis/openhr-agent.git
cd openhr-agent

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your API keys

# Initialize database
psql -U postgres -c "CREATE DATABASE openhr;"
psql -U postgres openhr < src/database/schema.sql
```

## Configuration

Edit `.env`:

```env
# Required
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://user:pass@localhost:5432/openhr

# For Upwork hunting
UPWORK_API_KEY=your-key
UPWORK_API_SECRET=your-secret
UPWORK_ACCESS_TOKEN=your-token
UPWORK_ACCESS_SECRET=your-secret

# Your preferences
GITHUB_USERNAME=your-username
UPWORK_MIN_HOURLY_RATE=50
UPWORK_MAX_TIME_COMMITMENT=20
```

## First Run

### 1. Initialize Your Profile

```bash
npm start init
```

This will ask for:
- GitHub username
- Email
- Minimum hourly rate

### 2. Discover Your Skills

```bash
npm start discover github
```

This analyzes your GitHub:
- Repos and languages
- Commit patterns
- Popular libraries you use

Output:
```
✅ Skills discovered!

Your Skills:
  • Python (8/10) - $75/hr market rate
  • Technical Writing (7/10) - $50/hr
  • API Integration (6/10) - $60/hr
```

### 3. Start Hunting

```bash
npm start hunt
```

This scans:
- Upwork for matching gigs
- Scores each opportunity
- Saves to database

Output:
```
🏹 Starting upwork-scanner...
🔍 Scanning Upwork...
✅ Found 47 unique opportunities
✅ Hunt complete in 3452ms
   Found: 47 opportunities
   Matched: 17 above threshold

💰 Found 17 opportunities
   High match (>0.80): 5
   Medium match (0.65-0.80): 12
```

### 4. Review Opportunities

```bash
npm start opportunities
```

Output:
```
📊 Your Opportunities

[1] 🔥 Python API Integration (Score: 0.89)
    $60-80/hr | Upwork | Posted 2h ago
    Skills: Python, REST API, FastAPI, PostgreSQL
    Client: ⭐⭐⭐⭐⭐ | $150K+ spent

[2] 🔥 Technical Writer - AI/ML (Score: 0.85)
    $50-70/hr | Upwork | Posted 4h ago
    Skills: Technical Writing, AI/ML, Python
    Client: ⭐⭐⭐⭐ | $50K+ spent
```

## Development Mode

```bash
# Watch mode (auto-reload on changes)
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

## What's Next?

### Immediate (This Week)
- [ ] Connect to real Upwork API
- [ ] Build proposal generator
- [ ] Add email notifications
- [ ] Create web dashboard

### Phase 2 (Next Month)
- [ ] GitHub skills analyzer (real implementation)
- [ ] Freelancer.com hunt
- [ ] Auto-apply with approval
- [ ] Success rate tracking

### Phase 3 (Q2 2026)
- [ ] Portfolio auto-builder
- [ ] Rate optimization AI
- [ ] Multiple platform orchestration
- [ ] Mobile app

## Troubleshooting

### Database Connection Failed
```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT 1;"

# Recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS openhr;"
psql -U postgres -c "CREATE DATABASE openhr;"
psql -U postgres openhr < src/database/schema.sql
```

### No API Keys
Get your keys:
- **Anthropic**: https://console.anthropic.com/
- **Upwork**: https://www.upwork.com/ab/account-security/api
- **GitHub**: https://github.com/settings/tokens

### No Opportunities Found
Common issues:
- Skills profile empty → Run `npm start discover github`
- Min rate too high → Lower `UPWORK_MIN_HOURLY_RATE`
- Wrong GitHub username → Check `.env`

## Support

- **Issues**: https://github.com/ArjunFrancis/openhr-agent/issues
- **Discussions**: https://github.com/ArjunFrancis/openhr-agent/discussions
- **Email**: contact@arjunfrancis.com

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to:
- Build new Hunts
- Improve matching algorithms
- Add skills analyzers
- Report bugs

---

**Ready to start earning? Let's go!** 🚀
