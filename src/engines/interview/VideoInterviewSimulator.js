import { ProposalGenerator } from '../action/ProposalGenerator.js';

/**
 * AI Video Interview Simulator
 * Real-time feedback on video interviews with body language, speech, and content analysis
 * 
 * BREAKTHROUGH: Integrated with OpenHR's opportunity system + Claude AI analysis
 */
export class VideoInterviewSimulator {
  constructor(db) {
    this.db = db;
    this.proposalGen = new ProposalGenerator();
  }

  /**
   * Start interview simulation
   */
  async startSimulation(opportunity, userProfile, userSkills) {
    console.log('\n🎥 Starting AI interview simulation...\n');
    
    const interviewConfig = {
      opportunity,
      questions: await this.generateQuestions(opportunity, userProfile),
      duration: 30, // minutes
      recording: true,
      analysis_enabled: true,
    };
    
    console.log(`✅ Interview simulation ready! ${interviewConfig.questions.length} questions generated.\n`);
    return interviewConfig;
  }

  /**
   * Generate interview questions based on opportunity
   */
  async generateQuestions(opportunity, userProfile) {
    const prompt = `
Generate 8 realistic interview questions for this role:

Role: ${opportunity.title}
Company: ${opportunity.client_info?.name || 'Tech Company'}
Description: ${opportunity.description}

Include a mix of:
- 2 behavioral questions (STAR method)
- 3 technical/role-specific questions
- 2 situation/problem-solving questions
- 1 closing question ("Do you have questions for us?")

Make them challenging but realistic. Return as JSON array.
`;
    
    try {
      const response = await this.proposalGen.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });
      
      const text = response.content[0].text;
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const questions = jsonMatch ? JSON.parse(jsonMatch[0]) : this.getDefaultQuestions();
      
      return questions.map((q, i) => ({
        id: i + 1,
        question: typeof q === 'string' ? q : q.question,
        type: this.categorizeQuestion(typeof q === 'string' ? q : q.question),
        time_limit: 120, // 2 minutes
        tips: this.generateQuestionTips(typeof q === 'string' ? q : q.question),
      }));
    } catch (error) {
      console.error('Question generation failed:', error.message);
      return this.getDefaultQuestions();
    }
  }

  /**
   * Categorize question type
   */
  categorizeQuestion(question) {
    const lower = question.toLowerCase();
    
    if (lower.includes('tell me about a time') || lower.includes('describe a situation')) {
      return 'behavioral';
    } else if (lower.includes('how would you') || lower.includes('what would you do')) {
      return 'situational';
    } else if (lower.includes('technical') || lower.includes('implement') || lower.includes('design')) {
      return 'technical';
    } else if (lower.includes('questions for')) {
      return 'closing';
    }
    
    return 'general';
  }

  /**
   * Generate tips for each question
   */
  generateQuestionTips(question) {
    const type = this.categorizeQuestion(question);
    
    const tips = {
      behavioral: [
        'Use STAR method (Situation, Task, Action, Result)',
        'Be specific with metrics and outcomes',
        'Show growth and learning',
      ],
      situational: [
        'Think out loud - show your process',
        'Consider multiple perspectives',
        'Explain trade-offs in your approach',
      ],
      technical: [
        'Start with clarifying questions',
        'Discuss scalability and edge cases',
        'Mention alternatives considered',
      ],
      closing: [
        'Ask about team culture and challenges',
        'Show genuine interest in the role',
        'Avoid asking about already-answered topics',
      ],
    };
    
    return tips[type] || ['Be concise and specific', 'Stay positive', 'Show enthusiasm'];
  }

  /**
   * Analyze video response in real-time
   */
  async analyzeResponse(videoData, question) {
    console.log('\n🔍 Analyzing your response...\n');
    
    const analysis = {
      content_score: 0,
      delivery_score: 0,
      body_language_score: 0,
      speech_score: 0,
      overall_score: 0,
      feedback: [],
      strengths: [],
      improvements: [],
      example_answer: '',
    };
    
    // Analyze content with Claude AI
    const contentAnalysis = await this.analyzeContent(videoData.transcript, question);
    analysis.content_score = contentAnalysis.score;
    analysis.feedback.push(...contentAnalysis.feedback);
    analysis.example_answer = contentAnalysis.example;
    
    // Analyze speech patterns
    const speechAnalysis = this.analyzeSpeech(videoData);
    analysis.speech_score = speechAnalysis.score;
    analysis.feedback.push(...speechAnalysis.feedback);
    
    // Analyze body language (simulated - would use computer vision)
    const bodyAnalysis = this.analyzeBodyLanguage(videoData);
    analysis.body_language_score = bodyAnalysis.score;
    analysis.feedback.push(...bodyAnalysis.feedback);
    
    // Calculate overall score
    analysis.overall_score = (
      analysis.content_score * 0.50 +
      analysis.delivery_score * 0.20 +
      analysis.body_language_score * 0.15 +
      analysis.speech_score * 0.15
    );
    
    // Identify strengths and improvements
    analysis.strengths = this.identifyStrengths(analysis);
    analysis.improvements = this.identifyImprovements(analysis);
    
    return analysis;
  }

  /**
   * Analyze content with Claude AI
   */
  async analyzeContent(transcript, question) {
    const prompt = `
Analyze this interview answer:

Question: ${question.question}
Answer: ${transcript}

Provide:
1. Score (0-10) based on:
   - Relevance to question
   - Use of specific examples
   - Clear structure (STAR for behavioral)
   - Quantifiable results
   
2. Specific feedback (2-3 points)
3. Example of excellent answer

Return as JSON: {score, feedback: [], example}
`;
    
    try {
      const response = await this.proposalGen.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      });
      
      const text = response.content[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { score: 7, feedback: [], example: '' };
      
      return result;
    } catch (error) {
      return { score: 7, feedback: ['Content analysis unavailable'], example: '' };
    }
  }

  /**
   * Analyze speech patterns
   */
  analyzeSpeech(videoData) {
    const transcript = videoData.transcript || '';
    const duration = videoData.duration || 60;
    
    const wordCount = transcript.split(/\s+/).length;
    const wpm = (wordCount / duration) * 60;
    
    const fillerWords = ['um', 'uh', 'like', 'you know', 'basically', 'actually'];
    const fillerCount = fillerWords.reduce((count, word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      return count + (transcript.match(regex) || []).length;
    }, 0);
    
    const feedback = [];
    let score = 8.0;
    
    // WPM analysis
    if (wpm < 120) {
      feedback.push('⚠️ Speaking too slowly - aim for 130-160 WPM');
      score -= 1.0;
    } else if (wpm > 180) {
      feedback.push('⚠️ Speaking too fast - slow down for clarity');
      score -= 1.0;
    } else {
      feedback.push('✓ Good speaking pace');
    }
    
    // Filler words
    const fillerRate = (fillerCount / wordCount) * 100;
    if (fillerRate > 5) {
      feedback.push(`⚠️ Too many filler words (${fillerCount}) - practice pausing instead`);
      score -= 1.5;
    } else if (fillerRate > 2) {
      feedback.push(`Moderate filler words (${fillerCount}) - can improve`);
      score -= 0.5;
    } else {
      feedback.push('✓ Minimal filler words');
    }
    
    return { score: Math.max(0, score), feedback };
  }

  /**
   * Analyze body language (simulated)
   */
  analyzeBodyLanguage(videoData) {
    // In production, would use computer vision API
    // For now, simulating common patterns
    
    const feedback = [];
    let score = 7.5;
    
    // Simulated metrics
    const eyeContact = videoData.eyeContact || 0.75;
    const posture = videoData.posture || 0.80;
    const gestures = videoData.gestures || 0.70;
    
    if (eyeContact < 0.60) {
      feedback.push('⚠️ Improve eye contact - look at camera more');
      score -= 1.5;
    } else if (eyeContact >= 0.80) {
      feedback.push('✓ Excellent eye contact');
    }
    
    if (posture < 0.70) {
      feedback.push('⚠️ Sit up straight - good posture shows confidence');
      score -= 1.0;
    } else {
      feedback.push('✓ Good posture');
    }
    
    if (gestures < 0.50) {
      feedback.push('Use natural hand gestures to emphasize points');
      score -= 0.5;
    } else if (gestures > 0.90) {
      feedback.push('⚠️ Too many gestures - can be distracting');
      score -= 0.5;
    }
    
    return { score: Math.max(0, score), feedback };
  }

  /**
   * Identify strengths
   */
  identifyStrengths(analysis) {
    const strengths = [];
    
    if (analysis.content_score >= 8) strengths.push('Excellent content and examples');
    if (analysis.speech_score >= 8) strengths.push('Clear and confident speaking');
    if (analysis.body_language_score >= 8) strengths.push('Professional presence');
    
    return strengths;
  }

  /**
   * Identify improvements
   */
  identifyImprovements(analysis) {
    const improvements = [];
    
    if (analysis.content_score < 7) improvements.push('Add more specific examples with metrics');
    if (analysis.speech_score < 7) improvements.push('Work on pacing and reducing filler words');
    if (analysis.body_language_score < 7) improvements.push('Practice maintaining eye contact');
    
    return improvements;
  }

  /**
   * Generate complete interview report
   */
  async generateReport(interviewSession) {
    const questionAnalyses = interviewSession.responses || [];
    
    const overallScore = questionAnalyses.reduce((sum, a) => sum + a.overall_score, 0) / questionAnalyses.length;
    
    const allStrengths = [...new Set(questionAnalyses.flatMap(a => a.strengths))];
    const allImprovements = [...new Set(questionAnalyses.flatMap(a => a.improvements))];
    
    return {
      overall_score: overallScore,
      grade: this.calculateGrade(overallScore),
      questions_answered: questionAnalyses.length,
      strengths: allStrengths.slice(0, 5),
      areas_to_improve: allImprovements.slice(0, 5),
      detailed_feedback: questionAnalyses,
      recommendation: this.generateRecommendation(overallScore),
      next_steps: this.generateNextSteps(overallScore, allImprovements),
    };
  }

  /**
   * Calculate letter grade
   */
  calculateGrade(score) {
    if (score >= 9.0) return 'A+';
    if (score >= 8.5) return 'A';
    if (score >= 8.0) return 'A-';
    if (score >= 7.5) return 'B+';
    if (score >= 7.0) return 'B';
    if (score >= 6.5) return 'B-';
    if (score >= 6.0) return 'C+';
    return 'C';
  }

  /**
   * Generate recommendation
   */
  generateRecommendation(score) {
    if (score >= 8.5) {
      return 'Excellent! You\'re interview-ready. Apply with confidence.';
    } else if (score >= 7.5) {
      return 'Good performance. Polish a few areas and you\'re ready.';
    } else if (score >= 6.5) {
      return 'Decent foundation. Practice your weak areas for 3-5 more sessions.';
    } else {
      return 'Needs work. Focus on fundamentals - do 10+ practice sessions.';
    }
  }

  /**
   * Generate next steps
   */
  generateNextSteps(score, improvements) {
    const steps = [
      'Review feedback for each question',
      'Practice answers using example responses',
    ];
    
    if (improvements.includes('Add more specific examples with metrics')) {
      steps.push('Prepare 5 STAR stories with quantifiable results');
    }
    
    if (improvements.includes('Work on pacing and reducing filler words')) {
      steps.push('Record yourself and count filler words - aim for <2%');
    }
    
    if (score < 7.5) {
      steps.push('Do 5 more practice sessions before real interview');
    } else if (score < 8.5) {
      steps.push('Do 2 more practice sessions to polish');
    }
    
    steps.push('Schedule real interview with confidence!');
    
    return steps;
  }

  /**
   * Get default questions
   */
  getDefaultQuestions() {
    return [
      {
        id: 1,
        question: 'Tell me about yourself and your background.',
        type: 'general',
        time_limit: 120,
        tips: ['Keep it under 2 minutes', 'Focus on relevant experience', 'End with why you\'re excited'],
      },
      {
        id: 2,
        question: 'Tell me about a time you faced a significant challenge at work. How did you handle it?',
        type: 'behavioral',
        time_limit: 120,
        tips: ['Use STAR method', 'Show problem-solving', 'Emphasize results'],
      },
    ];
  }
}
