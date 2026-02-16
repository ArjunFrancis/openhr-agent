#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { getDatabase } from './database/index.js';
import { GitHubAnalyzer } from './engines/skills/GitHubAnalyzer.js';
import { UpworkHunt } from './hunts/upwork/index.js';
import { FreelancerHunt } from './hunts/freelancer/index.js';
import { ProposalGenerator } from './engines/action/ProposalGenerator.js';
import { AutoApplyEngine } from './engines/action/AutoApplyEngine.js';

console.log(chalk.bold.cyan(`
╔═══════════════════════════════════════╗
║                                       ║
║     🎯 OpenHR AI - Economic Agent     ║
║                                       ║
║   Stop looking. Start earning.        ║
║                                       ║
╚═══════════════════════════════════════╝
`));

program
  .name('openhr')
  .description('Personal AI agent for economic empowerment')
  .version('0.1.0');

// Initialize profile
program
  .command('init')
  .description('Initialize your OpenHR profile')
  .action(async () => {
    console.log(chalk.yellow('\n🚀 Welcome to OpenHR AI!\n'));
    
    const db = getDatabase();
    
    // Test database connection
    const connected = await db.testConnection();
    if (!connected) {
      console.log(chalk.red('\n❌ Database connection failed'));
      console.log(chalk.gray('Check your DATABASE_URL in .env\n'));
      process.exit(1);
    }
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'github',
        message: 'What\'s your GitHub username?',
        validate: (input) => input.length > 0 || 'GitHub username required',
      },
      {
        type: 'input',
        name: 'email',
        message: 'Your email:',
        validate: (input) => input.includes('@') || 'Valid email required',
      },
      {
        type: 'number',
        name: 'minRate',
        message: 'Minimum hourly rate ($):',
        default: 50,
      },
      {
        type: 'number',
        name: 'hoursPerWeek',
        message: 'Available hours per week:',
        default: 20,
      },
    ]);
    
    const spinner = ora('Creating profile...').start();
    
    try {
      await db.saveProfile({
        github_username: answers.github,
        email: answers.email,
        min_hourly_rate: answers.minRate,
        availability_hours_per_week: answers.hoursPerWeek,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      
      spinner.succeed('Profile created!');
      
      console.log(chalk.green('\n✅ Setup complete!'));
      console.log(chalk.gray('\nNext steps:'));
      console.log(chalk.gray('  1. Run: openhr discover github'));
      console.log(chalk.gray('  2. Run: openhr hunt'));
      console.log(chalk.gray('  3. Run: openhr opportunities\n'));
    } catch (error) {
      spinner.fail('Profile creation failed');
      console.error(chalk.red(error.message));
    }
  });

// Discover skills
program
  .command('discover')
  .argument('[source]', 'Source: github, writing, linkedin', 'github')
  .description('Discover your skills from various sources')
  .action(async (source) => {
    const db = getDatabase();
    const profile = await db.getProfile();
    
    if (!profile) {
      console.log(chalk.red('\n❌ No profile found'));
      console.log(chalk.gray('Run: openhr init\n'));
      process.exit(1);
    }
    
    if (source === 'github') {
      const spinner = ora(`Analyzing ${profile.github_username} on GitHub...`).start();
      
      try {
        const analyzer = new GitHubAnalyzer(profile.github_username);
        const skills = await analyzer.analyze();
        
        // Save to database
        for (const skill of skills) {
          await db.saveSkill(skill);
        }
        
        spinner.succeed('Skills discovered!');
        
        console.log(chalk.cyan('\n📊 Your Skills:\n'));
        
        const topSkills = skills.slice(0, 10);
        for (const skill of topSkills) {
          const profBar = '█'.repeat(skill.proficiency);
          console.log(
            `  ${chalk.green('•')} ${chalk.bold(skill.name)} ${chalk.gray(`(${skill.proficiency}/10)`)}`
          );
          console.log(
            `    ${chalk.gray(profBar)} ${chalk.yellow(`$${skill.avg_hourly_rate}/hr market rate`)}`
          );
        }
        
        console.log(chalk.gray(`\n... and ${skills.length - 10} more skills`));
        console.log(chalk.gray('\nNext: openhr hunt\n'));
      } catch (error) {
        spinner.fail('Skills discovery failed');
        console.error(chalk.red(error.message));
        
        if (error.message.includes('403')) {
          console.log(chalk.gray('\nTip: Add GITHUB_TOKEN to .env for higher rate limits\n'));
        }
      }
    } else {
      console.log(chalk.yellow(`\n📝 ${source} analyzer coming soon!\n`));
    }
  });

// Start hunting
program
  .command('hunt')
  .description('Start hunting for opportunities')
  .option('-p, --platform <name>', 'Specific platform (upwork, freelancer)', 'all')
  .action(async (options) => {
    const db = getDatabase();
    const skills = await db.getSkills();
    
    if (skills.length === 0) {
      console.log(chalk.red('\n❌ No skills found'));
      console.log(chalk.gray('Run: openhr discover github\n'));
      process.exit(1);
    }
    
    console.log(chalk.cyan(`\n🏹 Starting hunt with ${skills.length} skills...\n`));
    
    const hunts = [];
    
    if (options.platform === 'all' || options.platform === 'upwork') {
      hunts.push({ name: 'Upwork', hunt: new UpworkHunt() });
    }
    
    if (options.platform === 'all' || options.platform === 'freelancer') {
      hunts.push({ name: 'Freelancer', hunt: new FreelancerHunt() });
    }
    
    for (const { name, hunt } of hunts) {
      const spinner = ora(`Scanning ${name}...`).start();
      
      try {
        const results = await hunt.run(skills, db);
        
        spinner.succeed(`${name} scan complete: ${results.length} matches`);
      } catch (error) {
        spinner.fail(`${name} scan failed: ${error.message}`);
      }
    }
    
    const opportunities = await db.getOpportunities({ minScore: 0.65, limit: 50 });
    
    console.log(chalk.green(`\n💰 Found ${opportunities.length} opportunities`));
    
    const highMatch = opportunities.filter(o => o.match_score >= 0.80).length;
    const medMatch = opportunities.filter(o => o.match_score >= 0.65 && o.match_score < 0.80).length;
    
    console.log(`   ${chalk.green('High match')} (>0.80): ${highMatch}`);
    console.log(`   ${chalk.yellow('Medium match')} (0.65-0.80): ${medMatch}`);
    console.log(chalk.gray('\nRun: openhr opportunities\n'));
  });

// List opportunities
program
  .command('opportunities')
  .description('List discovered opportunities')
  .option('-s, --score <min>', 'Minimum match score', '0.75')
  .option('-l, --limit <num>', 'Max results', '10')
  .action(async (options) => {
    const db = getDatabase();
    const opportunities = await db.getOpportunities({
      minScore: parseFloat(options.score),
      limit: parseInt(options.limit),
    });
    
    if (opportunities.length === 0) {
      console.log(chalk.yellow('\n📭 No opportunities found'));
      console.log(chalk.gray('Run: openhr hunt\n'));
      return;
    }
    
    console.log(chalk.bold.cyan('\n📊 Your Opportunities\n'));
    
    opportunities.forEach((opp, i) => {
      const scoreColor = opp.match_score >= 0.85 ? chalk.green : chalk.yellow;
      const emoji = opp.match_score >= 0.85 ? '🔥' : '📊';
      
      console.log(scoreColor(`[${i + 1}] ${emoji} ${opp.title} (Score: ${opp.match_score.toFixed(2)})`));
      
      const payRange = opp.pay_min && opp.pay_max 
        ? `$${opp.pay_min}-${opp.pay_max}${opp.pay_type === 'hourly' ? '/hr' : ''}`
        : opp.pay_min 
        ? `$${opp.pay_min}${opp.pay_type === 'hourly' ? '/hr' : ''}`
        : 'Rate not listed';
      
      console.log(`    ${payRange} | ${opp.platform} | ${chalk.gray(timeAgo(opp.discovered_at))}`);
      
      if (opp.required_skills && opp.required_skills.length > 0) {
        console.log(`    Skills: ${opp.required_skills.slice(0, 4).join(', ')}`);
      }
      
      if (opp.client_info && opp.client_info.rating) {
        const stars = '⭐'.repeat(Math.round(opp.client_info.rating));
        console.log(`    Client: ${stars}`);
      }
      
      console.log(chalk.gray(`    ${opp.url}\n`));
    });
    
    console.log(chalk.gray('Actions:'));
    console.log(chalk.gray('  • View in browser: copy URL above'));
    console.log(chalk.gray('  • Apply: openhr apply <number> (coming soon)'));
    console.log(chalk.gray('  • Filter: openhr opportunities --score 0.85\n'));
  });

// Profile status
program
  .command('status')
  .description('Show your profile and stats')
  .action(async () => {
    const db = getDatabase();
    const profile = await db.getProfile();
    const skills = await db.getSkills();
    const opportunities = await db.getOpportunities({ limit: 100 });
    const earnings = await db.getEarningsSummary('month');
    
    console.log(chalk.bold.cyan('\n👤 Your Profile\n'));
    
    if (profile) {
      console.log(`GitHub: ${chalk.green(profile.github_username)}`);
      console.log(`Email: ${profile.email}`);
      console.log(`Min Rate: ${chalk.yellow(`$${profile.min_hourly_rate}/hr`)}`);
      console.log(`Availability: ${profile.availability_hours_per_week}hrs/week`);
    }
    
    console.log(chalk.bold.cyan('\n📊 Stats\n'));
    console.log(`Skills: ${chalk.green(skills.length)}`);
    console.log(`Opportunities Found: ${chalk.green(opportunities.length)}`);
    console.log(`This Month:`);
    console.log(`  Earnings: ${chalk.green(`$${earnings.total_earned || 0}`)}`);
    console.log(`  Gigs: ${earnings.total_gigs || 0}`);
    console.log(`  Avg Rate: ${earnings.avg_hourly_rate ? `$${earnings.avg_hourly_rate}/hr` : 'N/A'}\n`);
  });

// Generate proposal for an opportunity
program
  .command('apply')
  .argument('<number>', 'Opportunity number from list')
  .description('Generate a proposal for an opportunity')
  .option('-v, --variations', 'Generate 3 variations with different tones')
  .action(async (num, options) => {
    const db = getDatabase();
    const profile = await db.getProfile();
    const skills = await db.getSkills();
    const opportunities = await db.getOpportunities({ minScore: 0.65, limit: 50 });
    
    const index = parseInt(num) - 1;
    
    if (index < 0 || index >= opportunities.length) {
      console.log(chalk.red('\n❌ Invalid opportunity number\n'));
      return;
    }
    
    const opportunity = opportunities[index];
    
    console.log(chalk.cyan(`\n📝 Generating proposal for:\n`));
    console.log(chalk.bold(opportunity.title));
    console.log(chalk.gray(`Score: ${opportunity.match_score.toFixed(2)} | ${opportunity.platform}\n`));
    
    const generator = new ProposalGenerator();
    
    try {
      if (options.variations) {
        const spinner = ora('Generating 3 variations...').start();
        const variations = await generator.generateVariations(opportunity, profile, skills);
        spinner.succeed('Variations generated!');
        
        variations.forEach((v, i) => {
          console.log(chalk.cyan(`\n━━━ Variation ${i + 1}: ${v.tone.toUpperCase()} ━━━\n`));
          console.log(v.proposal);
        });
        
        console.log(chalk.gray('\n💡 Tip: Copy the one that fits your style best!\n'));
      } else {
        const spinner = ora('Generating proposal...').start();
        const result = await generator.generate(opportunity, profile, skills);
        spinner.succeed('Proposal generated!');
        
        console.log(chalk.cyan('\n━━━ YOUR PROPOSAL ━━━\n'));
        console.log(result.proposal);
        
        console.log(chalk.gray('\n💡 Commands:'));
        console.log(chalk.gray('  • Get variations: openhr apply ' + num + ' --variations'));
        console.log(chalk.gray('  • Copy and paste into ' + opportunity.platform + '\n'));
      }
    } catch (error) {
      console.error(chalk.red('\n❌ Failed to generate proposal'));
      console.error(chalk.gray(error.message + '\n'));
    }
  });

// Auto-apply to opportunities
program
  .command('auto-apply')
  .description('Run the auto-apply engine')
  .option('--dry-run', 'Show what would happen without actually applying')
  .action(async (options) => {
    const db = getDatabase();
    const engine = new AutoApplyEngine(db);
    
    if (!engine.enabled && !options.dryRun) {
      console.log(chalk.yellow('\n⚠️  Auto-apply is disabled\n'));
      console.log(chalk.gray('To enable:'));
      console.log(chalk.gray('  Set AUTO_APPLY_ENABLED=true in .env'));
      console.log(chalk.gray('  Set APPROVAL_MODE (review-first, auto-low-stakes, full-auto)'));
      console.log(chalk.gray('\nRun with --dry-run to see what would happen\n'));
      return;
    }
    
    if (options.dryRun) {
      console.log(chalk.cyan('\n🔍 DRY RUN MODE - No applications will be submitted\n'));
    }
    
    const spinner = ora('Processing opportunities...').start();
    
    try {
      const results = await engine.processOpportunities();
      
      spinner.succeed('Processing complete!');
      
      const autoApplied = results.filter(r => r.action === 'auto-applied').length;
      const pendingApproval = results.filter(r => r.action === 'pending-approval').length;
      const skipped = results.filter(r => r.action === 'skip').length;
      
      console.log(chalk.green(`\n✅ Results:\n`));
      console.log(`   Auto-applied: ${chalk.green(autoApplied)}`);
      console.log(`   Pending approval: ${chalk.yellow(pendingApproval)}`);
      console.log(`   Skipped: ${chalk.gray(skipped)}`);
      
      if (pendingApproval > 0) {
        console.log(chalk.yellow('\n📧 Check your email for approval requests\n'));
      }
      
      // Show stats
      const stats = await engine.getStats('month');
      
      console.log(chalk.cyan('\n📊 This Month:\n'));
      console.log(`   Total applications: ${stats.total_applications}`);
      console.log(`   Accepted: ${chalk.green(stats.accepted)}`);
      console.log(`   Pending: ${chalk.yellow(stats.pending)}`);
      console.log(`   Success rate: ${((stats.success_rate || 0) * 100).toFixed(1)}%\n`);
      
    } catch (error) {
      spinner.fail('Auto-apply failed');
      console.error(chalk.red(error.message));
    }
  });

// Helper: time ago
function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

program.parse();
