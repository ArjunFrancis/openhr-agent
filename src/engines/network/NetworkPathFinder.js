/**
 * Network Path Intelligence Engine
 * Finds WHO can refer you and HOW to reach them
 * 
 * BREAKTHROUGH FEATURE - Goes beyond "who works there" to actual referral paths
 */
export class NetworkPathFinder {
  constructor(db) {
    this.db = db;
  }

  /**
   * Find referral paths to a company
   */
  async findPaths(targetCompany, userProfile) {
    console.log(`\n🔗 Finding referral paths to ${targetCompany}...\n`);
    
    const paths = [];
    
    // Direct connections (1st degree)
    const direct = await this.findDirectConnections(targetCompany, userProfile);
    paths.push(...direct);
    
    // 2nd degree (friend of friend)
    const secondDegree = await this.find2ndDegreeConnections(targetCompany, userProfile);
    paths.push(...secondDegree);
    
    // Alumni connections
    const alumni = await this.findAlumniConnections(targetCompany, userProfile);
    paths.push(...alumni);
    
    // Community connections (GitHub, Twitter, etc)
    const community = await this.findCommunityConnections(targetCompany, userProfile);
    paths.push(...community);
    
    // Score and rank paths
    const scored = paths.map(path => ({
      ...path,
      score: this.scorePath(path),
      action_plan: this.generateActionPlan(path),
    }));
    
    const ranked = scored.sort((a, b) => b.score - a.score);
    
    console.log(`✅ Found ${ranked.length} referral paths\n`);
    return ranked;
  }

  /**
   * Find direct LinkedIn connections
   */
  async findDirectConnections(company, profile) {
    // Would integrate with LinkedIn API
    // For now, simulate
    return [
      {
        type: 'direct',
        degree: 1,
        contact: {
          name: 'Sarah Chen',
          title: 'Senior Engineer at ' + company,
          connection_strength: 'strong', // Based on interactions
          last_interaction: '2 weeks ago',
        },
        confidence: 0.95,
      },
    ];
  }

  /**
   * Find 2nd degree connections
   */
  async find2ndDegreeConnections(company, profile) {
    return [
      {
        type: '2nd_degree',
        degree: 2,
        contact: {
          name: 'Mike Johnson',
          title: 'Engineering Manager at ' + company,
          mutual_connection: 'John Smith',
          connection_strength: 'moderate',
        },
        confidence: 0.75,
      },
    ];
  }

  /**
   * Find alumni connections
   */
  async findAlumniConnections(company, profile) {
    if (!profile.education) return [];
    
    return [
      {
        type: 'alumni',
        degree: 1,
        contact: {
          name: 'Emily Davis',
          title: 'Tech Lead at ' + company,
          school: profile.education.school,
          graduation_year: profile.education.year,
        },
        confidence: 0.85,
      },
    ];
  }

  /**
   * Find GitHub/community connections
   */
  async findCommunityConnections(company, profile) {
    return [
      {
        type: 'community',
        degree: 2,
        contact: {
          name: 'Alex Kumar',
          title: 'Staff Engineer at ' + company,
          connection_type: 'GitHub collaborator',
          shared_repos: 3,
        },
        confidence: 0.70,
      },
    ];
  }

  /**
   * Score referral path quality
   */
  scorePath(path) {
    let score = path.confidence;
    
    // Degree matters (closer = better)
    if (path.degree === 1) score += 0.2;
    else if (path.degree === 2) score += 0.1;
    
    // Connection strength
    if (path.contact.connection_strength === 'strong') score += 0.15;
    else if (path.contact.connection_strength === 'moderate') score += 0.08;
    
    // Recent interaction
    if (path.contact.last_interaction === 'this week') score += 0.10;
    else if (path.contact.last_interaction === '2 weeks ago') score += 0.05;
    
    // Alumni bonus
    if (path.type === 'alumni') score += 0.10;
    
    return Math.min(score, 1.0);
  }

  /**
   * Generate action plan to reach contact
   */
  generateActionPlan(path) {
    const plans = {
      direct: [
        `Message ${path.contact.name} on LinkedIn`,
        `Mention your shared connection/interest`,
        `Ask about their experience at the company`,
        `Request 15-min informational chat`,
        `After chat, ask about referral process`,
      ],
      '2nd_degree': [
        `Ask ${path.contact.mutual_connection} for introduction`,
        `Message: "I noticed you know ${path.contact.name} at [company]. Would you be comfortable making an introduction?"`,
        `If yes, have intro call`,
        `Follow up with referral request`,
      ],
      alumni: [
        `Connect via alumni network`,
        `Message: "Fellow [school] alum here! Would love to hear about your experience at [company]"`,
        `Leverage shared school experience`,
        `Ask about culture and team`,
        `Request referral after building rapport`,
      ],
      community: [
        `Engage with their GitHub/content`,
        `Comment on recent projects`,
        `Build relationship over 2-3 weeks`,
        `Then reach out for advice`,
        `Ask about opportunities`,
      ],
    };
    
    return plans[path.type] || plans.direct;
  }

  /**
   * Generate outreach message
   */
  generateMessage(path, jobTitle) {
    const templates = {
      direct: `Hi ${path.contact.name},

I hope this message finds you well! I noticed you're a ${path.contact.title}, and I'm very interested in the ${jobTitle} position at [company].

I'd love to learn more about your experience there and the team culture. Would you be open to a brief 15-minute call this week?

Thanks for considering!`,
      
      alumni: `Hi ${path.contact.name},

Fellow ${path.contact.school} alum here! I saw you're at [company] as a ${path.contact.title}.

I'm exploring opportunities there and would really value hearing about your experience. Would you have 15 minutes for a quick call?

Go [mascot]!`,
    };
    
    return templates[path.type] || templates.direct;
  }
}
