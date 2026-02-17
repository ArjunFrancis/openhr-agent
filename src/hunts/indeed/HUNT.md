---
name: indeed-scanner
platform: indeed
frequency: hourly
autoApply: review-first
matchThreshold: 0.70
---

# Indeed Job Scanner

Scans Indeed.com for full-time jobs, contracts, and remote opportunities matching your skills.

## What It Does

1. **Searches** Indeed globally
2. **Filters** by salary, remote, company rating
3. **Scores** based on skill match + salary + company quality
4. **Tracks** applications and responses
5. **Notifies** you of high-value matches

## Configuration
```env
INDEED_PUBLISHER_KEY=your-key
INDEED_MIN_SALARY=60000
INDEED_REMOTE_ONLY=false
INDEED_LOCATION=remote
```

## Matching Algorithm
- Skill match: 40%
- Salary fit: 30%
- Company rating: 15%
- Location/remote: 10%
- Benefits: 5%

## Job Types
- Full-time (with benefits)
- Contract (W2/1099)
- Part-time (flexible)
- Temporary (quick cash)
