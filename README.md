# 🎯 OpenHR AI - Your Personal Economic Intelligence Agent

**Stop looking for jobs. Let AI find opportunities and make you money while you sleep.**

OpenHR AI is a 24/7 autonomous agent that discovers your skills, hunts economic opportunities, and takes action to make you money—without you lifting a finger.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status: Active Development](https://img.shields.io/badge/Status-Active%20Development-green.svg)](#)
[![Built on OpenClaw](https://img.shields.io/badge/Built%20on-OpenClaw-blue.svg)](https://github.com/openclaw/openclaw)

---

## 🔥 The Problem

You have skills. You could be making money. But:
- ❌ You're spending hours browsing Upwork, Fiverr, job boards
- ❌ You're missing opportunities because you're not checking 24/7
- ❌ You're writing the same proposals over and over
- ❌ You don't even know what you're good at that people will pay for

**OpenHR AI solves this.**

---

## 💰 What OpenHR AI Does

### Discovers Your Skills (Passively)
- Analyzes your GitHub commits → extracts technical skills
- Reads your writing samples → identifies your voice & expertise
- Watches your problem-solving patterns → maps capabilities
- Builds your skills profile **automatically**

### Hunts Opportunities (24/7)
- Scans Upwork, Freelancer, GitHub Bounties, job boards
- Matches opportunities to YOUR skills
- Finds underpriced gigs where you have an edge
- Runs in the background while you sleep

### Takes Action (Autonomously)
- Generates custom proposals
- Submits applications (with your approval)
- Tracks success rates
- Learns what works

### Makes You Money (The Goal)
- **Direct:** Freelance gigs, bounties, consulting
- **Passive:** Content monetization, affiliate opportunities
- **Long-term:** Co-founder matching, equity opportunities

---

## 🏗️ Architecture

Built on [OpenClaw](https://github.com/openclaw/openclaw) - the open-source personal AI assistant framework.

```
┌──────────────────────────────────────┐
│   OpenHR Gateway (OpenClaw Fork)     │
└──────────────────────────────────────┘
         │
         ├─── Skills Discovery Engine
         │    ├─ GitHub analyzer
         │    ├─ Writing analyzer
         │    └─ Skills profiler
         │
         ├─── Opportunity Scanner  
         │    ├─ Upwork hunter
         │    ├─ Freelancer scraper
         │    ├─ GitHub bounties
         │    └─ Job board crawler
         │
         ├─── Economic Intelligence
         │    ├─ Skills → Market matcher
         │    ├─ Pay rate optimizer
         │    └─ Success predictor
         │
         └─── Autonomous Action
              ├─ Proposal generator
              ├─ Application submitter
              └─ Results tracker
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 22
- Git
- macOS, Linux, or Windows (WSL2)

### Installation

```bash
# Clone the repo
git clone https://github.com/ArjunFrancis/openhr-agent.git
cd openhr-agent

# Install dependencies
npm install

# Configure
cp .env.example .env
# Add your API keys (Anthropic, OpenAI, etc.)

# Start the gateway
npm run gateway

# Initialize your profile
npm run profile:init
```

---

## 📊 How It Works

### Phase 1: Discovery (Day 1)
```bash
# Agent analyzes your GitHub
openhr discover github --username your-username

# Agent analyzes your writing
openhr discover writing --path ~/Documents/writing

# Review your skills profile
openhr profile show
```

**Output:**
```
Skills Discovered:
- Python (8/10) - $75/hr market rate, HIGH demand
- Technical Writing (7/10) - $50/hr, MED demand
- API Integration (6/10) - $60/hr, MED demand

23 opportunities matched today
```

### Phase 2: Hunt (Continuous)
```bash
# Start the opportunity hunter (runs 24/7)
openhr hunt start

# Check what's been found
openhr opportunities list
```

**Output:**
```
NEW OPPORTUNITIES (Last 24hrs):
[HIGH MATCH] "Python API Integration" - Upwork - $500-800 - 85% match
[MED MATCH] "Technical Documentation" - Freelancer - $300-500 - 78% match
[LOW MATCH] "Data Visualization" - GitHub Bounty - $1,200 - 62% match
```

### Phase 3: Apply (With Approval)
```bash
# Review and approve applications
openhr apply review

# Auto-apply to high-match opportunities
openhr apply auto --threshold 0.80
```

---

## 🎯 Core Features

### ✅ Skills Discovery
- [x] GitHub analysis (commits, PRs, repos)
- [x] Writing analysis (tone, expertise, quality)
- [ ] Portfolio scraping
- [ ] LinkedIn integration
- [ ] Resume parsing

### ✅ Opportunity Hunting
- [x] Upwork scanner
- [x] Freelancer.com crawler
- [ ] GitHub bounties
- [ ] Remote job boards
- [ ] Content platforms

### ✅ Economic Intelligence
- [x] Skill → Market matching
- [x] Pay rate analysis
- [x] Success rate tracking
- [ ] Portfolio builder
- [ ] Rate optimizer

### ✅ Autonomous Actions
- [x] Proposal generator
- [ ] Auto-apply (with approval gates)
- [ ] Client communication
- [ ] Contract management

---

## 📁 Repository Structure

```
openhr-agent/
├── README.md
├── package.json
├── .env.example
│
├── src/
│   ├── gateway/          # OpenHR Gateway (OpenClaw fork)
│   ├── engines/          # Core intelligence engines
│   │   ├── skills/       # Skills discovery
│   │   ├── hunt/         # Opportunity hunting
│   │   ├── economic/     # Market intelligence
│   │   └── action/       # Autonomous actions
│   │
│   ├── hunts/            # Hunt definitions (like OpenClaw skills)
│   │   ├── upwork/
│   │   ├── freelancer/
│   │   ├── github-bounties/
│   │   └── remote-jobs/
│   │
│   └── database/         # PostgreSQL schemas
│       ├── skills.sql
│       ├── opportunities.sql
│       └── earnings.sql
│
├── docs/
│   ├── architecture/     # System design
│   ├── hunts/            # Hunt development guide
│   └── deployment/       # Production setup
│
└── examples/
    ├── skills-profile/   # Sample profiles
    └── proposals/        # Successful proposals
```

---

## 🤝 Contributing

We're building the future of work. Join us:

1. **Build Hunts** - Create new opportunity scanners
2. **Improve Matching** - Better skill → opportunity algorithms
3. **Test the Agent** - Use it, break it, report issues
4. **Share Success Stories** - Did OpenHR make you money? Tell us!

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## 🛣️ Roadmap

### Q1 2026 (MVP)
- [x] Skills discovery (GitHub + writing)
- [x] Upwork + Freelancer scanners
- [x] Basic proposal generator
- [ ] CLI interface
- [ ] PostgreSQL database

### Q2 2026 (Autonomous)
- [ ] Auto-apply with approval gates
- [ ] Success rate learning
- [ ] Portfolio auto-builder
- [ ] GitHub bounties integration

### Q3 2026 (Economic AI)
- [ ] Rate optimization
- [ ] Client communication automation
- [ ] Multi-platform dashboard
- [ ] Team/agency mode

### Q4 2026 (Ecosystem)
- [ ] OpenHR Platform integration
- [ ] Co-founder matching
- [ ] Equity opportunities
- [ ] Passive income streams

---

## 📜 License

MIT License - Free forever for individual use.

See [LICENSE](./LICENSE) for details.

---

## 🌟 Built On

- [OpenClaw](https://github.com/openclaw/openclaw) - Personal AI assistant framework
- [Anthropic Claude](https://anthropic.com) - AI reasoning
- [PostgreSQL](https://postgresql.org) - Economic intelligence data
- [Playwright](https://playwright.dev) - Web scraping

---

## 📞 Community

- **GitHub Issues:** [Report bugs & request features](https://github.com/ArjunFrancis/openhr-agent/issues)
- **Discord:** Coming soon
- **Twitter:** [@ArjunFrancis](https://twitter.com/ArjunFrancis)

---

## 🙏 Acknowledgments

Inspired by the vision of economic empowerment through AI. Special thanks to:
- OpenClaw team for the incredible foundation
- Everyone building the future of work
- The open source community

---

**Stop searching. Start earning.**

Built with 🔥 by [@ArjunFrancis](https://github.com/ArjunFrancis)
