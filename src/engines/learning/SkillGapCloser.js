import axios from 'axios';

/**
 * Skill Gap Auto-Closer
 * Automatically identifies skill gaps and enrolls you in learning
 * 
 * BREAKTHROUGH FEATURE - Learn exactly what you need, when you need it
 */
export class SkillGapCloser {
  constructor(db) {
    this.db = db;
  }

  /**
   * Analyze skill gaps for target opportunities
   */
  async analyzeGaps(userSkills, targetOpportunities) {
    console.log('\n📚 Analyzing skill gaps...\n');
    
    const allRequiredSkills = this.extractRequiredSkills(targetOpportunities);
    const gaps = this.identifyGaps(userSkills, allRequiredSkills);
    const prioritized = this.prioritizeGaps(gaps, targetOpportunities);
    
    console.log(`✅ Found ${prioritized.length} skill gaps to close\n`);
    return prioritized;
  }

  /**
   * Extract all required skills from opportunities
   */
  extractRequiredSkills(opportunities) {
    const skillFrequency = new Map();
    
    opportunities.forEach(opp => {
      (opp.required_skills || []).forEach(skill => {
        const key = skill.toLowerCase();
        skillFrequency.set(key, (skillFrequency.get(key) || 0) + 1);
      });
    });
    
    return Array.from(skillFrequency.entries()).map(([skill, count]) => ({
      name: skill,
      frequency: count,
      demand_score: count / opportunities.length,
    }));
  }

  /**
   * Identify what user is missing
   */
  identifyGaps(userSkills, requiredSkills) {
    const userSkillNames = userSkills.map(s => s.name.toLowerCase());
    
    return requiredSkills.filter(required =>
      !userSkillNames.some(user => user.includes(required.name) || required.name.includes(user))
    );
  }

  /**
   * Prioritize gaps by impact
   */
  prioritizeGaps(gaps, opportunities) {
    return gaps
      .map(gap => ({
        ...gap,
        impact_score: this.calculateImpact(gap, opportunities),
        learning_time: this.estimateLearningTime(gap.name),
      }))
      .sort((a, b) => b.impact_score - a.impact_score);
  }

  /**
   * Calculate impact of learning this skill
   */
  calculateImpact(gap, opportunities) {
    // How many opportunities would this unlock?
    const unlocked = opportunities.filter(opp =>
      (opp.required_skills || []).some(skill =>
        skill.toLowerCase() === gap.name
      )
    ).length;
    
    return (unlocked / opportunities.length) * gap.demand_score;
  }

  /**
   * Estimate time to learn
   */
  estimateLearningTime(skillName) {
    const timeEstimates = {
      // Programming languages
      'python': 40,
      'javascript': 40,
      'typescript': 20,
      'java': 50,
      'go': 30,
      
      // Frameworks
      'react': 30,
      'vue': 25,
      'angular': 35,
      'node.js': 25,
      
      // Tools
      'docker': 15,
      'kubernetes': 25,
      'aws': 40,
      'git': 10,
      
      // Concepts
      'machine learning': 60,
      'data structures': 30,
      'algorithms': 40,
    };
    
    const skill = skillName.toLowerCase();
    
    for (const [key, hours] of Object.entries(timeEstimates)) {
      if (skill.includes(key)) return hours;
    }
    
    return 20; // Default
  }

  /**
   * Find best courses for each gap
   */
  async findCourses(gap) {
    console.log(`\n🔍 Finding courses for: ${gap.name}...\n`);
    
    const courses = [];
    
    // Search Udemy
    const udemyCourses = await this.searchUdemy(gap.name);
    courses.push(...udemyCourses);
    
    // Search Coursera
    const courseraCourses = await this.searchCoursera(gap.name);
    courses.push(...courseraCourses);
    
    // Search YouTube (free)
    const youtubeCourses = await this.searchYouTube(gap.name);
    courses.push(...youtubeCourses);
    
    // Rank by quality and relevance
    const ranked = this.rankCourses(courses, gap);
    
    return ranked.slice(0, 3); // Top 3
  }

  async searchUdemy(skill) {
    // Would use Udemy API in production
    return [
      {
        platform: 'udemy',
        title: `Complete ${skill} Masterclass`,
        url: `https://www.udemy.com/course/${skill}-masterclass`,
        price: 49.99,
        rating: 4.6,
        students: 50000,
        duration_hours: 20,
        level: 'beginner',
      },
    ];
  }

  async searchCoursera(skill) {
    return [
      {
        platform: 'coursera',
        title: `${skill} Specialization`,
        url: `https://www.coursera.org/specializations/${skill}`,
        price: 49,
        rating: 4.7,
        students: 30000,
        duration_hours: 30,
        level: 'intermediate',
      },
    ];
  }

  async searchYouTube(skill) {
    return [
      {
        platform: 'youtube',
        title: `${skill} Complete Tutorial - Free`,
        url: `https://www.youtube.com/results?search_query=${skill}+tutorial`,
        price: 0,
        rating: 4.5,
        views: 1000000,
        duration_hours: 10,
        level: 'beginner',
      },
    ];
  }

  /**
   * Rank courses by value
   */
  rankCourses(courses, gap) {
    return courses
      .map(course => ({
        ...course,
        value_score: this.calculateCourseValue(course, gap),
      }))
      .sort((a, b) => b.value_score - a.value_score);
  }

  calculateCourseValue(course, gap) {
    let score = course.rating * 0.4; // Quality
    
    // Free is good
    if (course.price === 0) score += 1.0;
    else score += (100 - course.price) / 100;
    
    // Match to learning time estimate
    const timeMatch = 1 - Math.abs(course.duration_hours - gap.learning_time) / gap.learning_time;
    score += timeMatch * 0.3;
    
    return score;
  }

  /**
   * Auto-enroll in course (with user approval)
   */
  async autoEnroll(course, gap) {
    console.log(`\n✅ Enrolling in: ${course.title}\n`);
    
    // In production, would:
    // 1. Request user approval (if not in auto mode)
    // 2. Purchase course (if paid)
    // 3. Add to calendar
    // 4. Set up reminders
    // 5. Track progress
    
    return {
      enrolled: true,
      course_id: course.url,
      skill: gap.name,
      estimated_completion: new Date(Date.now() + gap.learning_time * 3600000),
      calendar_events: this.generateStudySchedule(gap.learning_time),
    };
  }

  /**
   * Generate study schedule
   */
  generateStudySchedule(totalHours) {
    const hoursPerDay = 1; // 1 hour daily
    const days = Math.ceil(totalHours / hoursPerDay);
    
    const schedule = [];
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      schedule.push({
        date: date.toISOString().split('T')[0],
        time: '19:00', // 7 PM
        duration_hours: hoursPerDay,
        topic: `Study session ${i + 1}/${days}`,
      });
    }
    
    return schedule;
  }

  /**
   * Track learning progress
   */
  async trackProgress(enrollment, completion_percent) {
    await this.db.updateEnrollment(enrollment.course_id, {
      completion_percent,
      last_studied: new Date(),
    });
    
    // Celebrate milestones
    if (completion_percent >= 100) {
      return {
        completed: true,
        message: `🎉 Congratulations! You've mastered ${enrollment.skill}!`,
        next_action: 'Update your profile with this new skill',
      };
    } else if (completion_percent >= 50) {
      return {
        message: `Halfway there! Keep going with ${enrollment.skill}`,
      };
    }
    
    return { message: `Progress: ${completion_percent}%` };
  }

  /**
   * Generate complete learning path
   */
  async generateLearningPath(targetRole, currentSkills) {
    console.log(`\n🎯 Generating learning path for: ${targetRole}...\n`);
    
    const roleRequirements = this.getRoleRequirements(targetRole);
    const gaps = this.identifyGaps(currentSkills, roleRequirements);
    const path = [];
    
    // Group by dependencies
    const prerequisites = gaps.filter(g => this.isPrerequisite(g.name));
    const advanced = gaps.filter(g => !this.isPrerequisite(g.name));
    
    // Learn prerequisites first
    for (const gap of prerequisites) {
      const courses = await this.findCourses(gap);
      path.push({
        phase: 'Foundation',
        skill: gap.name,
        course: courses[0],
        estimated_weeks: Math.ceil(gap.learning_time / 7),
      });
    }
    
    // Then advanced skills
    for (const gap of advanced) {
      const courses = await this.findCourses(gap);
      path.push({
        phase: 'Advanced',
        skill: gap.name,
        course: courses[0],
        estimated_weeks: Math.ceil(gap.learning_time / 7),
      });
    }
    
    const totalWeeks = path.reduce((sum, p) => sum + p.estimated_weeks, 0);
    
    return {
      target_role: targetRole,
      total_weeks: totalWeeks,
      total_cost: path.reduce((sum, p) => sum + p.course.price, 0),
      path,
      completion_date: new Date(Date.now() + totalWeeks * 7 * 24 * 3600000),
    };
  }

  getRoleRequirements(role) {
    const requirements = {
      'Full Stack Developer': [
        { name: 'React', demand_score: 0.9 },
        { name: 'Node.js', demand_score: 0.9 },
        { name: 'PostgreSQL', demand_score: 0.8 },
        { name: 'Docker', demand_score: 0.7 },
        { name: 'AWS', demand_score: 0.8 },
      ],
      'Data Scientist': [
        { name: 'Python', demand_score: 1.0 },
        { name: 'Machine Learning', demand_score: 0.95 },
        { name: 'SQL', demand_score: 0.9 },
        { name: 'Statistics', demand_score: 0.85 },
        { name: 'Pandas', demand_score: 0.8 },
      ],
    };
    
    return requirements[role] || [];
  }

  isPrerequisite(skillName) {
    const prerequisites = ['python', 'javascript', 'git', 'html', 'css', 'sql'];
    return prerequisites.some(pre => skillName.toLowerCase().includes(pre));
  }
}
