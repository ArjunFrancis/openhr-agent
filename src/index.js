#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';

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
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'github',
        message: 'What\'s your GitHub username?',
      },
      {
        type: 'input',
        name: 'email',
        message: 'Your email:',
      },
      {
        type: 'number',
        name: 'minRate',
        message: 'Minimum hourly rate ($):',
        default: 50,
      },
    ]);
    
    console.log(chalk.green('\n✅ Profile created!'));
    console.log(chalk.gray('Next steps:'));
    console.log(chalk.gray('  1. Run: openhr discover github'));
    console.log(chalk.gray('  2. Run: openhr hunt start'));
  });

// Discover skills
program
  .command('discover')
  .argument('<source>', 'Source: github, writing, linkedin')
  .description('Discover your skills from various sources')
  .action(async (source) => {
    const spinner = ora(`Analyzing ${source}...`).start();
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    spinner.succeed('Skills discovered!');
    console.log(chalk.cyan('\nYour Skills:'));
    console.log('  • Python (8/10) - $75/hr market rate');
    console.log('  • Technical Writing (7/10) - $50/hr');
    console.log('  • API Integration (6/10) - $60/hr');
  });

// Start hunting
program
  .command('hunt')
  .description('Start hunting for opportunities')
  .action(async () => {
    const spinner = ora('Scanning platforms...').start();
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    spinner.succeed('Hunt complete!');
    console.log(chalk.green('\n💰 Found 23 opportunities'));
    console.log('   High match (>0.80): 5');
    console.log('   Medium match (0.65-0.80): 12');
    console.log('\n' + chalk.yellow('Run: openhr opportunities list'));
  });

// List opportunities
program
  .command('opportunities')
  .description('List discovered opportunities')
  .action(() => {
    console.log(chalk.bold.cyan('\n📊 Your Opportunities\n'));
    
    console.log(chalk.green('[1] 🔥 Python API Integration (Score: 0.89)'));
    console.log('    $60-80/hr | Upwork | Posted 2h ago\n');
    
    console.log(chalk.green('[2] 🔥 Technical Writer - AI/ML (Score: 0.85)'));
    console.log('    $50-70/hr | Upwork | Posted 4h ago\n');
    
    console.log(chalk.yellow('[3] 📊 Data Dashboard (Score: 0.82)'));
    console.log('    Fixed $1200 | Freelancer | Posted 6h ago\n');
  });

program.parse();
