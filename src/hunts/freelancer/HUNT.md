---
name: freelancer-scanner
platform: freelancer
frequency: hourly
autoApply: review-first
matchThreshold: 0.70
---

# Freelancer.com Opportunity Scanner

Scans Freelancer.com every hour for projects matching your skills.

## What It Does

1. **Authenticates** with Freelancer API
2. **Searches** for projects matching your skills
3. **Scores** each opportunity:
   - Skill match (40%)
   - Budget vs your rate (25%)
   - Client reputation (20%)
   - Competition level (10%)
   - Project scope fit (5%)
4. **Stores** in database with match scores
5. **Notifies** you of high-value projects

## Requirements

### API Credentials
Get from https://www.freelancer.com/api/settings

- `FREELANCER_API_KEY` - Your OAuth token
- `FREELANCER_API_SECRET` - OAuth secret

### Configuration
```env
FREELANCER_MIN_BUDGET=200
FREELANCER_MAX_COMPETITION=20  # max bidders
FREELANCER_MIN_CLIENT_RATING=4.0
FREELANCER_PREFERRED_PROJECT_TYPES=fixed,hourly
FREELANCER_EXCLUDE_COUNTRIES=  # comma-separated if needed
```

## Matching Logic

### Budget Scoring
Freelancer uses project budgets (not hourly rates):
```javascript
budgetScore = (projectBudget / expectedEarnings) >= 0.8 ? 1.0 : 0.5
```

### Competition Scoring
Lower competition = higher chance of winning:
```javascript
competitionScore = 1.0 - (currentBids / 50)  // Max 50 bidders
```

### Client Quality
```javascript
clientScore = (
  0.5 * (clientRating / 5.0) +
  0.3 * (projectsCompleted > 10 ? 1.0 : 0.5) +
  0.2 * (verified ? 1.0 : 0.5)
)
```

## API Endpoints Used

- `/projects/0.1/projects/active/` - Search active projects
- `/projects/0.1/projects/{id}/` - Project details
- `/projects/0.1/users/{id}/` - Client reputation

## Example Output

```
FREELANCER SCAN COMPLETE (2025-02-16 15:30 UTC)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found: 34 projects
High Match (>0.75): 8
Medium Match (0.60-0.75): 14
Low Match (<0.60): 12

TOP PROJECTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1] 🔥 Build Python Data Scraper (Score: 0.88)
    Budget: $500-1000 | Fixed Price
    Skills: Python, Web Scraping, BeautifulSoup
    Client: ⭐⭐⭐⭐⭐ | 50+ projects | Verified
    Competition: 5 bids | Posted: 1h ago
    
[2] 🔥 FastAPI Backend Developer (Score: 0.84)
    Budget: $800-1500 | Fixed Price
    Skills: Python, FastAPI, PostgreSQL, Docker
    Client: ⭐⭐⭐⭐ | 25+ projects | Payment verified
    Competition: 8 bids | Posted: 3h ago

[3] 📊 Technical Documentation Writer (Score: 0.79)
    Budget: $300-600 | Fixed Price
    Skills: Technical Writing, API Docs, Markdown
    Client: ⭐⭐⭐⭐⭐ | 100+ projects | Verified
    Competition: 12 bids | Posted: 5h ago

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Key Differences from Upwork

1. **Fixed Price Focus** - Most projects are fixed budget
2. **More Competition** - Typically more bidders per project
3. **Global Reach** - More international clients
4. **Lower Barriers** - Easier to get started
5. **Contest System** - Some projects use design contests

## Smart Filtering

### Auto-Exclude
- Projects with 30+ bids (too competitive)
- Clients with <3 star rating
- Suspicious project descriptions (scam detection)
- Budgets below your minimum

### Priority Boost
- Verified payment method (+0.1 to score)
- Returning clients (+0.1)
- Detailed project descriptions (+0.05)
- Posted in last 6 hours (+0.05)

## Bid Strategy Recommendations

Based on competition level:
```
Low competition (0-5 bids):
  → Bid 80-90% of max budget
  → Premium positioning

Medium competition (6-15 bids):
  → Bid 70-80% of max budget
  → Competitive but quality

High competition (16+ bids):
  → Consider skipping unless perfect match
  → Or bid aggressively at 60-70%
```

## Proposal Generation Tips

Freelancer clients prefer:
- **Specific approach** - How you'll solve their problem
- **Timeline commitment** - When you can start/finish
- **Portfolio samples** - Relevant previous work
- **Questions** - Show you read the description
- **Competitive pricing** - But not the lowest

## Success Metrics

Track performance:
- **Bid-to-hire rate** - Aim for 10%+
- **Average time to first response** - Under 12 hours
- **Client satisfaction** - Maintain 4.8+ stars
- **Repeat clients** - Build relationships

## Privacy & Ethics

- ✅ Official API (no scraping)
- ✅ Respects rate limits (200 requests/hour)
- ✅ No spam bidding
- ✅ Transparent proposals
- ✅ Human approval by default

## Future Enhancements

- [ ] Contest participation automation
- [ ] Skill test integration
- [ ] Bid price optimization ML
- [ ] Client research automation
- [ ] Milestone tracking
- [ ] Escrow monitoring
