---
name: upwork-scanner
platform: upwork
frequency: hourly
autoApply: review-first
matchThreshold: 0.75
---

# Upwork Opportunity Scanner

Scans Upwork every hour for freelance gigs matching your skills.

## What It Does

1. **Authenticates** with Upwork API using your credentials
2. **Searches** for jobs matching your skills
3. **Scores** each opportunity based on:
   - Skill match (40%)
   - Pay rate vs your minimum (25%)
   - Client rating & history (20%)
   - Time requirement fit (10%)
   - Success probability (5%)
4. **Stores** opportunities in the database
5. **Notifies** you of high-match opportunities

## Requirements

### API Credentials
Get these from https://www.upwork.com/ab/account-security/api

- `UPWORK_API_KEY` - Your consumer key
- `UPWORK_API_SECRET` - Your consumer secret
- `UPWORK_ACCESS_TOKEN` - OAuth access token
- `UPWORK_ACCESS_SECRET` - OAuth token secret

### Configuration
```env
UPWORK_MIN_HOURLY_RATE=50
UPWORK_MAX_TIME_COMMITMENT=20  # hours/week
UPWORK_MIN_CLIENT_RATING=4.0
UPWORK_PREFERRED_JOB_TYPES=hourly,fixed
```

## Matching Logic

### Skill Matching
Uses vector embeddings to match your skills against job requirements:

```javascript
skillMatch = cosineSimilarity(
  embeddings(yourSkills),
  embeddings(jobRequirements)
)
```

### Pay Rate Scoring
```javascript
payScore = min(
  (jobRate - minRate) / (targetRate - minRate),
  1.0
)
```

### Client Quality Score
```javascript
clientScore = (
  0.5 * clientRating/5.0 +
  0.3 * (clientTotalSpent > 10000 ? 1.0 : 0.5) +
  0.2 * (clientHireRate > 0.8 ? 1.0 : 0.5)
)
```

## Example Output

```
UPWORK SCAN COMPLETE (2025-02-16 14:30 UTC)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found: 47 opportunities
High Match (>0.80): 5
Medium Match (0.65-0.80): 12
Low Match (<0.65): 30

TOP OPPORTUNITIES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1] 🔥 Python API Integration Specialist (Score: 0.89)
    Pay: $60-80/hr | Fixed: $500-1000
    Skills: Python, REST API, FastAPI, PostgreSQL
    Client: ⭐⭐⭐⭐⭐ | $150K+ spent | 90% hire rate
    Time: 10-20 hrs/week | Posted: 2 hours ago
    
[2] 🔥 Technical Content Writer - AI/ML Focus (Score: 0.85)
    Pay: $50-70/hr | Fixed: $500-800
    Skills: Technical Writing, AI/ML, Python
    Client: ⭐⭐⭐⭐ | $50K+ spent | 85% hire rate
    Time: 5-10 hrs/week | Posted: 4 hours ago

[3] 📊 Data Visualization Dashboard (Score: 0.82)
    Pay: Fixed $1200
    Skills: Python, Plotly, Data Viz, API Integration
    Client: ⭐⭐⭐⭐⭐ | $200K+ spent | 95% hire rate
    Time: One-time project | Posted: 6 hours ago

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Actions Available:
- Review opportunity: openhr apply review <number>
- Auto-apply to all: openhr apply auto --threshold 0.85
- See full list: openhr opportunities list --platform upwork
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Advanced Features

### Smart Filtering
- Excludes jobs you've already applied to
- Filters out low-quality clients (scammers)
- Prioritizes jobs with realistic budgets
- Adjusts scoring based on your success rate history

### Learning from Success
The Hunt learns from your results:
- Tracks which job types you win
- Adjusts scoring weights based on your wins/losses
- Identifies patterns in successful applications
- Suggests optimal times to apply (higher response rates)

### Rate Optimization
Recommends rate adjustments based on market data:
```
Your Python rate: $65/hr
Market average: $70/hr
Top 10% earners: $95/hr

💡 Suggestion: Increase rate to $75/hr - still competitive
   but you're leaving money on the table at $65.
```

## Troubleshooting

### API Rate Limits
Upwork limits: 120 requests/hour
- Hunt automatically throttles
- Caches job listings for 15 minutes
- Prioritizes high-match opportunities

### Authentication Issues
If auth fails:
1. Check your API credentials in `.env`
2. Regenerate tokens at upwork.com/ab/account-security/api
3. Ensure OAuth callback URL is configured
4. Run: `openhr hunt auth upwork --reauth`

### No Opportunities Found
Common causes:
- Skills profile too narrow → Add more skills
- Rate requirements too high → Lower min rate
- Client quality filter too strict → Relax filters
- Wrong job categories → Check Upwork category mapping

## Privacy & Ethics

- ✅ Uses official Upwork API (no scraping)
- ✅ Respects rate limits
- ✅ No spam or mass applications
- ✅ Transparent proposal generation
- ✅ Human approval required by default

## Future Enhancements

- [ ] Proposal templates per job type
- [ ] Client research automation
- [ ] Portfolio piece matching
- [ ] Optimal bid price recommendation
- [ ] Interview scheduling automation
- [ ] Contract negotiation assistance
