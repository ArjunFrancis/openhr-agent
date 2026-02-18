/**
 * Interview Success Predictor
 * Predicts interview performance BEFORE you apply
 * 
 * REVOLUTIONARY - No competitor has this!
 */
export class InterviewPredictor {
  constructor(db) {
    this.db = db;
  }

  /**
   * Predict interview success probability
   */
  async predict(opportunity, userSkills, userHistory = []) {
    console.log(`\n🎯 Predicting interview success...\n`);
    
    const skillMatch = this.analyzeSkillMatch(opportunity, userSkills);
    const expMatch = this.analyzeExperienceMatch(opportunity, userHistory);
    const questionDiff = this.predictQuestionDifficulty(opportunity);
    
    const successProb = this.calculateSuccessProb(skillMatch, expMatch, questionDiff);
    const confidence = this.calculateConfidence(userHistory);
    
    return {
      success_probability: successProb,
      confidence,
      strengths: this.identifyStrengths(skillMatch, opportunity),
      weaknesses: this.identifyWeaknesses(skillMatch, opportunity),
      preparation_time_needed: this.estimatePrepTime(skillMatch),
      recommended_prep: this.generatePrepPlan(skillMatch, questionDiff),
      expected_questions: this.predictQuestions(opportunity),
      difficulty_level: questionDiff >= 8 ? 'Very Hard' : questionDiff >= 6 ? 'Hard' : 'Medium',
    };
  }

  analyzeSkillMatch(opportunity, userSkills) {
    const required = opportunity.required_skills || [];
    const userSkillNames = userSkills.map(s => s.name.toLowerCase());
    
    const matches = required.filter(req =>
      userSkillNames.some(user => user.includes(req.toLowerCase()))
    );
    
    return {
      match_rate: required.length > 0 ? matches.length / required.length : 0.5,
      missing_skills: required.filter(req => !matches.includes(req)),
      strong_skills: matches.filter(req => {
        const skill = userSkills.find(s => s.name.toLowerCase().includes(req.toLowerCase()));
        return skill && skill.proficiency >= 8;
      }),
    };
  }

  analyzeExperienceMatch(opportunity, history) {
    if (history.length === 0) return { has_similar_exp: false, similar_projects: 0 };
    
    const similar = history.filter(h =>
      h.title?.toLowerCase().includes(opportunity.title.toLowerCase())
    );
    
    return {
      has_similar_exp: similar.length > 0,
      similar_projects: similar.length,
    };
  }

  predictQuestionDifficulty(opportunity) {
    let difficulty = 5;
    
    if (opportunity.title.toLowerCase().includes('senior')) difficulty += 2;
    if (opportunity.title.toLowerCase().includes('lead')) difficulty += 2;
    if (opportunity.title.toLowerCase().includes('architect')) difficulty += 3;
    
    return Math.min(difficulty, 10);
  }

  calculateSuccessProb(skillMatch, expMatch, questionDiff) {
    let prob = 0.5;
    
    prob += (skillMatch.match_rate * 0.4);
    
    if (expMatch.has_similar_exp) prob += 0.30;
    else if (expMatch.similar_projects >= 3) prob += 0.20;
    
    if (questionDiff >= 8) prob -= 0.15;
    else if (questionDiff >= 6) prob -= 0.05;
    
    return Math.max(0.1, Math.min(prob, 0.95));
  }

  calculateConfidence(history) {
    if (history.length === 0) return 0.5;
    if (history.length < 5) return 0.6;
    if (history.length < 10) return 0.75;
    return 0.90;
  }

  identifyStrengths(skillMatch, opportunity) {
    const strengths = [];
    if (skillMatch.strong_skills.length > 0) {
      strengths.push(`Expert in: ${skillMatch.strong_skills.join(', ')}`);
    }
    if (skillMatch.match_rate >= 0.80) {
      strengths.push('Excellent skill match (80%+)');
    }
    return strengths;
  }

  identifyWeaknesses(skillMatch, opportunity) {
    const weaknesses = [];
    if (skillMatch.missing_skills.length > 0) {
      weaknesses.push(`Missing: ${skillMatch.missing_skills.join(', ')}`);
    }
    return weaknesses;
  }

  estimatePrepTime(skillMatch) {
    const missing = skillMatch.missing_skills.length;
    if (missing === 0) return '2-3 hours (review only)';
    if (missing <= 2) return '5-8 hours';
    if (missing <= 4) return '10-15 hours';
    return '20+ hours';
  }

  generatePrepPlan(skillMatch, questionDiff) {
    const plan = [
      'Review company website and recent news',
      'Prepare STAR stories for behavioral questions',
    ];
    
    skillMatch.missing_skills.forEach(skill => {
      plan.push(`Study ${skill} fundamentals (2-3 hours)`);
    });
    
    if (questionDiff >= 8) {
      plan.push('Practice 10+ coding problems');
      plan.push('Do 5+ mock interviews');
    }
    
    return plan;
  }

  predictQuestions(opportunity) {
    return [
      { type: 'behavioral', question: 'Tell me about a difficult challenge', difficulty: 'Medium' },
      { type: 'technical', question: 'Design a scalable system', difficulty: 'Hard' },
    ];
  }
}
