/**
 * Career Path Predictor
 * Predicts future career paths and earnings potential
 * 
 * REVOLUTIONARY - See your future before making decisions
 */
export class CareerPathPredictor {
  constructor(db) {
    this.db = db;
  }

  /**
   * Predict possible career paths
   */
  async predictPaths(currentRole, userSkills, yearsExperience) {
    console.log(`\n🔮 Predicting career paths from ${currentRole}...\n`);
    
    const paths = this.generatePaths(currentRole, userSkills, yearsExperience);
    const analyzed = await Promise.all(
      paths.map(path => this.analyzePath(path, userSkills))
    );
    
    const ranked = analyzed.sort((a, b) => b.overall_score - a.overall_score);
    
    console.log(`✅ Found ${ranked.length} potential career paths\n`);
    return ranked;
  }

  /**
   * Generate possible paths
   */
  generatePaths(currentRole, skills, experience) {
    const paths = [];
    
    // Path 1: Senior IC (Individual Contributor)
    paths.push({
      name: 'Senior IC Track',
      roles: this.generateICTrack(currentRole, experience),
      focus: 'deep_technical_expertise',
    });
    
    // Path 2: Management Track
    paths.push({
      name: 'Management Track',
      roles: this.generateManagementTrack(currentRole, experience),
      focus: 'leadership_people',
    });
    
    // Path 3: Specialist Track
    if (this.hasSpecialistPotential(skills)) {
      paths.push({
        name: 'Specialist Track',
        roles: this.generateSpecialistTrack(currentRole, skills),
        focus: 'niche_expertise',
      });
    }
    
    // Path 4: Entrepreneurship
    paths.push({
      name: 'Entrepreneurship',
      roles: this.generateEntrepreneurshipTrack(currentRole, skills),
      focus: 'building_own_company',
    });
    
    return paths;
  }

  /**
   * Generate IC (Individual Contributor) track
   */
  generateICTrack(currentRole, experience) {
    const ladder = [
      { title: 'Junior', years: 0, salary: 70000 },
      { title: 'Mid-Level', years: 2, salary: 100000 },
      { title: 'Senior', years: 5, salary: 140000 },
      { title: 'Staff', years: 8, salary: 180000 },
      { title: 'Principal', years: 12, salary: 230000 },
      { title: 'Distinguished', years: 15, salary: 300000 },
    ];
    
    // Find current position
    const currentIndex = ladder.findIndex(l => l.years <= experience);
    
    // Return future roles
    return ladder.slice(currentIndex + 1).map((role, i) => ({
      title: `${role.title} ${currentRole}`,
      years_from_now: role.years - experience,
      salary_range: { min: role.salary * 0.85, max: role.salary * 1.15 },
      probability: this.calculateTransitionProbability(i, 'ic'),
    }));
  }

  /**
   * Generate management track
   */
  generateManagementTrack(currentRole, experience) {
    const ladder = [
      { title: 'Tech Lead', years: 5, salary: 150000 },
      { title: 'Engineering Manager', years: 7, salary: 170000 },
      { title: 'Senior EM', years: 10, salary: 200000 },
      { title: 'Director', years: 12, salary: 250000 },
      { title: 'VP Engineering', years: 15, salary: 350000 },
      { title: 'CTO', years: 18, salary: 500000 },
    ];
    
    const currentIndex = ladder.findIndex(l => l.years <= experience);
    
    return ladder.slice(Math.max(0, currentIndex)).map((role, i) => ({
      title: role.title,
      years_from_now: Math.max(0, role.years - experience),
      salary_range: { min: role.salary * 0.8, max: role.salary * 1.3 },
      probability: this.calculateTransitionProbability(i, 'management'),
    }));
  }

  /**
   * Generate specialist track
   */
  generateSpecialistTrack(currentRole, skills) {
    const specializations = this.identifySpecializations(skills);
    
    return specializations.map((spec, i) => ({
      title: `${spec} Specialist`,
      years_from_now: 1 + i,
      salary_range: { min: 130000, max: 200000 },
      probability: 0.70 - (i * 0.1),
      required_skills: [spec],
    }));
  }

  /**
   * Generate entrepreneurship track
   */
  generateEntrepreneurshipTrack(currentRole, skills) {
    return [
      {
        title: 'Solo Founder / Freelancer',
        years_from_now: 0,
        salary_range: { min: 50000, max: 200000 },
        probability: 0.60,
        notes: 'High variance, full control',
      },
      {
        title: 'Startup Co-Founder',
        years_from_now: 1,
        salary_range: { min: 80000, max: 500000 },
        probability: 0.40,
        notes: 'Equity upside, high risk',
      },
      {
        title: 'Serial Entrepreneur',
        years_from_now: 5,
        salary_range: { min: 0, max: 10000000 },
        probability: 0.15,
        notes: 'Multiple exits, wealth creation',
      },
    ];
  }

  /**
   * Analyze a career path
   */
  async analyzePath(path, userSkills) {
    const analysis = {
      name: path.name,
      roles: path.roles,
      total_earning_potential: this.calculateTotalEarnings(path.roles),
      time_to_peak: this.calculateTimeToPeak(path.roles),
      skill_gaps: this.identifyPathSkillGaps(path, userSkills),
      lifestyle_impact: this.assessLifestyleImpact(path.focus),
      risk_level: this.assessRisk(path.focus),
      overall_score: 0,
    };
    
    analysis.overall_score = this.calculateOverallScore(analysis);
    
    return analysis;
  }

  /**
   * Calculate total earnings over 10 years
   */
  calculateTotalEarnings(roles) {
    let total = 0;
    let currentYear = 0;
    
    roles.forEach(role => {
      const years = role.years_from_now - currentYear;
      const avgSalary = (role.salary_range.min + role.salary_range.max) / 2;
      total += avgSalary * years;
      currentYear = role.years_from_now;
    });
    
    return total;
  }

  calculateTimeToPeak(roles) {
    if (roles.length === 0) return 0;
    return roles[roles.length - 1].years_from_now;
  }

  identifyPathSkillGaps(path, userSkills) {
    const requiredSkills = new Set();
    
    path.roles.forEach(role => {
      (role.required_skills || []).forEach(skill => requiredSkills.add(skill));
    });
    
    if (path.focus === 'leadership_people') {
      requiredSkills.add('Leadership');
      requiredSkills.add('Communication');
      requiredSkills.add('Strategy');
    } else if (path.focus === 'deep_technical_expertise') {
      requiredSkills.add('System Design');
      requiredSkills.add('Architecture');
    }
    
    const userSkillNames = userSkills.map(s => s.name.toLowerCase());
    const gaps = Array.from(requiredSkills).filter(req =>
      !userSkillNames.some(user => user.includes(req.toLowerCase()))
    );
    
    return gaps;
  }

  assessLifestyleImpact(focus) {
    const impacts = {
      deep_technical_expertise: {
        work_life_balance: 'good',
        flexibility: 'high',
        stress_level: 'moderate',
      },
      leadership_people: {
        work_life_balance: 'moderate',
        flexibility: 'moderate',
        stress_level: 'high',
      },
      niche_expertise: {
        work_life_balance: 'excellent',
        flexibility: 'very_high',
        stress_level: 'low',
      },
      building_own_company: {
        work_life_balance: 'poor',
        flexibility: 'total',
        stress_level: 'very_high',
      },
    };
    
    return impacts[focus] || impacts.deep_technical_expertise;
  }

  assessRisk(focus) {
    const risks = {
      deep_technical_expertise: 0.3, // Low risk
      leadership_people: 0.5, // Moderate
      niche_expertise: 0.4,
      building_own_company: 0.9, // Very high
    };
    
    return risks[focus] || 0.5;
  }

  calculateOverallScore(analysis) {
    const earningsScore = Math.min(analysis.total_earning_potential / 2000000, 1.0);
    const skillFitScore = 1 - (analysis.skill_gaps.length / 10);
    const riskScore = 1 - analysis.risk_level;
    
    return (
      0.40 * earningsScore +
      0.35 * skillFitScore +
      0.25 * riskScore
    );
  }

  calculateTransitionProbability(stepIndex, track) {
    const baseProb = {
      ic: 0.75,
      management: 0.60,
      specialist: 0.70,
    };
    
    const decay = 0.08; // Each step reduces probability
    return Math.max(0.20, baseProb[track] - (stepIndex * decay));
  }

  hasSpecialistPotential(skills) {
    // Has deep expertise in specific area
    return skills.some(s => s.proficiency >= 8);
  }

  identifySpecializations(skills) {
    return skills
      .filter(s => s.proficiency >= 8)
      .map(s => s.name)
      .slice(0, 3);
  }

  /**
   * Generate action plan for chosen path
   */
  generateActionPlan(path, timeline = '1-year') {
    const plan = [];
    const nextRole = path.roles[0];
    
    if (!nextRole) return [];
    
    // Immediate (0-3 months)
    plan.push({
      phase: 'Immediate (0-3 months)',
      actions: [
        'Update LinkedIn with current achievements',
        'Start building relationships with seniors in target role',
        `Close skill gaps: ${path.skill_gaps.slice(0, 2).join(', ')}`,
        'Document your impact and results',
      ],
    });
    
    // Short-term (3-6 months)
    plan.push({
      phase: 'Short-term (3-6 months)',
      actions: [
        'Take on projects that demonstrate next-level capabilities',
        'Seek mentorship from someone in target role',
        'Build your public presence (blog, talks, open source)',
        `Master remaining skills: ${path.skill_gaps.slice(2).join(', ')}`,
      ],
    });
    
    // Medium-term (6-12 months)
    plan.push({
      phase: 'Medium-term (6-12 months)',
      actions: [
        'Express interest in target role to manager',
        'Apply for internal promotion or external positions',
        'Negotiate based on new skills and market value',
        'Celebrate your transition!',
      ],
    });
    
    return plan;
  }
}
