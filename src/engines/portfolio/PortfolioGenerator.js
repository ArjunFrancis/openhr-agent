/**
 * Portfolio Auto-Generator
 * Automatically creates professional portfolios from GitHub/work history
 * 
 * UNIQUE FEATURE - No manual portfolio building!
 */
export class PortfolioGenerator {
  constructor(db) {
    this.db = db;
  }

  /**
   * Generate complete portfolio from user data
   */
  async generate(userProfile, userSkills, projects = []) {
    console.log('\n🎨 Generating your professional portfolio...\n');
    
    const portfolio = {
      meta: this.generateMeta(userProfile),
      hero: this.generateHero(userProfile, userSkills),
      about: this.generateAbout(userProfile, userSkills),
      skills: this.organizeSkills(userSkills),
      projects: await this.generateProjects(projects),
      experience: this.generateExperience(userProfile.work_history || []),
      testimonials: this.generateTestimonials(userProfile.reviews || []),
      contact: this.generateContact(userProfile),
      theme: this.selectTheme(userProfile.industry),
    };
    
    // Generate HTML
    const html = this.generateHTML(portfolio);
    
    console.log(`✅ Portfolio generated! 🎉\n`);
    return { portfolio, html };
  }

  /**
   * Generate meta tags
   */
  generateMeta(profile) {
    return {
      title: `${profile.name} - ${this.generateTagline(profile)}`,
      description: `Professional portfolio of ${profile.name}, specializing in ${profile.top_skills?.slice(0, 3).join(', ')}`,
      keywords: profile.top_skills?.join(', '),
      author: profile.name,
    };
  }

  /**
   * Generate hero section
   */
  generateHero(profile, skills) {
    const topSkills = skills
      .sort((a, b) => b.proficiency - a.proficiency)
      .slice(0, 3)
      .map(s => s.name);
    
    return {
      name: profile.name,
      tagline: this.generateTagline(profile),
      subtitle: `Expert in ${topSkills.join(', ')}`,
      cta_primary: 'View My Work',
      cta_secondary: 'Get In Touch',
      background_image: this.selectHeroImage(profile.industry),
    };
  }

  /**
   * Generate tagline
   */
  generateTagline(profile) {
    const templates = {
      software: 'Full-Stack Developer Building Scalable Solutions',
      design: 'Creative Designer Crafting Beautiful Experiences',
      marketing: 'Growth Marketer Driving Results',
      product: 'Product Manager Shipping User-Loved Features',
      data: 'Data Scientist Turning Data Into Insights',
    };
    
    return templates[profile.industry] || 'Professional Creating Impact';
  }

  /**
   * Generate about section
   */
  generateAbout(profile, skills) {
    const experience_years = this.calculateYearsExperience(profile);
    const topSkill = skills.sort((a, b) => b.proficiency - a.proficiency)[0];
    
    return {
      headline: `${experience_years}+ years of professional experience`,
      paragraphs: [
        `I'm a ${profile.title || 'professional'} with ${experience_years} years of experience specializing in ${topSkill.name}.`,
        `My work focuses on delivering high-quality solutions that drive business results. I've successfully completed ${profile.projects_completed || 50}+ projects.`,
        `I'm passionate about ${this.generatePassions(skills)} and constantly learning new technologies to stay ahead.`,
      ],
      stats: [
        { label: 'Years Experience', value: experience_years },
        { label: 'Projects Completed', value: profile.projects_completed || 50 },
        { label: 'Client Rating', value: `${profile.rating || 4.9}/5` },
        { label: 'Success Rate', value: '98%' },
      ],
    };
  }

  /**
   * Calculate years of experience
   */
  calculateYearsExperience(profile) {
    if (profile.years_experience) return profile.years_experience;
    if (profile.work_history && profile.work_history.length > 0) {
      const earliest = Math.min(...profile.work_history.map(w => new Date(w.start_date).getFullYear()));
      return new Date().getFullYear() - earliest;
    }
    return 5; // Default
  }

  /**
   * Generate passions
   */
  generatePassions(skills) {
    const categories = {};
    skills.forEach(s => {
      if (!categories[s.category]) categories[s.category] = [];
      categories[s.category].push(s.name);
    });
    
    return Object.keys(categories).slice(0, 2).join(' and ');
  }

  /**
   * Organize skills by category
   */
  organizeSkills(skills) {
    const organized = {
      technical: [],
      tools: [],
      soft: [],
      languages: [],
    };
    
    skills.forEach(skill => {
      if (skill.category === 'technical') {
        organized.technical.push(skill);
      } else if (skill.category === 'soft') {
        organized.soft.push(skill);
      } else {
        organized.tools.push(skill);
      }
    });
    
    return organized;
  }

  /**
   * Generate projects showcase
   */
  async generateProjects(projects) {
    const showcaseProjects = projects.slice(0, 6).map(project => ({
      title: project.name || 'Untitled Project',
      description: this.generateProjectDescription(project),
      image: this.selectProjectImage(project),
      technologies: project.languages || [],
      links: {
        github: project.url,
        live: project.homepage,
      },
      stats: {
        stars: project.stars || 0,
        forks: project.forks || 0,
      },
      highlights: this.generateProjectHighlights(project),
    }));
    
    return showcaseProjects;
  }

  /**
   * Generate project description
   */
  generateProjectDescription(project) {
    if (project.description) return project.description;
    
    return `A ${project.languages?.[0] || 'software'} project demonstrating expertise in modern development practices.`;
  }

  /**
   * Generate project highlights
   */
  generateProjectHighlights(project) {
    const highlights = [];
    
    if (project.stars > 100) {
      highlights.push(`${project.stars}+ GitHub stars`);
    }
    
    if (project.languages && project.languages.length > 0) {
      highlights.push(`Built with ${project.languages.join(', ')}`);
    }
    
    return highlights;
  }

  /**
   * Select project image
   */
  selectProjectImage(project) {
    // In production, would generate screenshots or use Open Graph images
    return `/assets/projects/${project.name}.png`;
  }

  /**
   * Generate experience section
   */
  generateExperience(workHistory) {
    return workHistory.map(job => ({
      company: job.company,
      title: job.title,
      duration: `${job.start_date} - ${job.end_date || 'Present'}`,
      description: job.description,
      achievements: job.achievements || [
        'Led cross-functional teams to deliver projects on time',
        'Improved system performance by 40%',
        'Mentored junior developers',
      ],
    }));
  }

  /**
   * Generate testimonials
   */
  generateTestimonials(reviews) {
    return reviews.slice(0, 3).map(review => ({
      name: review.client_name,
      title: review.client_title || 'Client',
      text: review.feedback,
      rating: review.rating,
      project: review.project_name,
    }));
  }

  /**
   * Generate contact section
   */
  generateContact(profile) {
    return {
      email: profile.email,
      linkedin: profile.linkedin_url,
      github: profile.github_username,
      twitter: profile.twitter_handle,
      location: profile.location,
      availability: profile.availability || 'Available for new projects',
    };
  }

  /**
   * Select theme based on industry
   */
  selectTheme(industry) {
    const themes = {
      software: { primary: '#2563eb', secondary: '#1e40af', accent: '#3b82f6' },
      design: { primary: '#8b5cf6', secondary: '#7c3aed', accent: '#a78bfa' },
      marketing: { primary: '#ec4899', secondary: '#db2777', accent: '#f472b6' },
      default: { primary: '#059669', secondary: '#047857', accent: '#10b981' },
    };
    
    return themes[industry] || themes.default;
  }

  /**
   * Generate HTML
   */
  generateHTML(portfolio) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${portfolio.meta.title}</title>
    <meta name="description" content="${portfolio.meta.description}">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        
        /* Hero Section */
        .hero {
            background: linear-gradient(135deg, ${portfolio.theme.primary} 0%, ${portfolio.theme.secondary} 100%);
            color: white;
            padding: 100px 20px;
            text-align: center;
        }
        .hero h1 { font-size: 3rem; margin-bottom: 1rem; }
        .hero p { font-size: 1.5rem; opacity: 0.9; }
        
        /* Skills Section */
        .skills { padding: 80px 20px; max-width: 1200px; margin: 0 auto; }
        .skill-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .skill-card {
            padding: 20px;
            background: #f3f4f6;
            border-radius: 8px;
            text-align: center;
        }
        
        /* Projects Section */
        .projects { padding: 80px 20px; background: #f9fafb; }
        .project-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; max-width: 1200px; margin: 0 auto; }
        .project-card {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .project-card img { width: 100%; height: 200px; object-fit: cover; }
        .project-info { padding: 20px; }
        
        /* Contact Section */
        .contact { padding: 80px 20px; text-align: center; }
        .contact-links { display: flex; justify-content: center; gap: 20px; margin-top: 30px; }
        .contact-link {
            display: inline-block;
            padding: 12px 24px;
            background: ${portfolio.theme.primary};
            color: white;
            text-decoration: none;
            border-radius: 6px;
        }
    </style>
</head>
<body>
    <!-- Hero -->
    <section class="hero">
        <h1>${portfolio.hero.name}</h1>
        <p>${portfolio.hero.tagline}</p>
        <p>${portfolio.hero.subtitle}</p>
    </section>
    
    <!-- Skills -->
    <section class="skills">
        <h2>Skills & Expertise</h2>
        <div class="skill-grid">
            ${portfolio.skills.technical.slice(0, 8).map(skill => `
                <div class="skill-card">
                    <h3>${skill.name}</h3>
                    <p>${skill.proficiency}/10</p>
                </div>
            `).join('')}
        </div>
    </section>
    
    <!-- Projects -->
    <section class="projects">
        <h2>Featured Projects</h2>
        <div class="project-grid">
            ${portfolio.projects.map(project => `
                <div class="project-card">
                    <div class="project-info">
                        <h3>${project.title}</h3>
                        <p>${project.description}</p>
                        <p><strong>Tech:</strong> ${project.technologies.join(', ')}</p>
                    </div>
                </div>
            `).join('')}
        </div>
    </section>
    
    <!-- Contact -->
    <section class="contact">
        <h2>Let's Work Together</h2>
        <p>${portfolio.contact.availability}</p>
        <div class="contact-links">
            <a href="mailto:${portfolio.contact.email}" class="contact-link">Email Me</a>
            <a href="${portfolio.contact.linkedin}" class="contact-link">LinkedIn</a>
            <a href="${portfolio.contact.github}" class="contact-link">GitHub</a>
        </div>
    </section>
</body>
</html>
    `;
  }

  /**
   * Select hero image
   */
  selectHeroImage(industry) {
    const images = {
      software: '/assets/hero-tech.jpg',
      design: '/assets/hero-design.jpg',
      marketing: '/assets/hero-marketing.jpg',
    };
    
    return images[industry] || '/assets/hero-default.jpg';
  }
}
