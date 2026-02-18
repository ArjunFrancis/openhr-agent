/**
 * Client Vetting Engine
 * Predicts bad clients BEFORE you apply
 * 
 * UNIQUE FEATURE - Save yourself from nightmare clients!
 */
export class ClientVetter {
  constructor(db) {
    this.db = db;
  }

  /**
   * Vet a client before applying
   */
  async vetClient(clientInfo, opportunity) {
    console.log(`\n🔍 Vetting client: ${clientInfo.name}...\n`);
    
    const redFlags = [];
    const greenFlags = [];
    let riskScore = 0; // 0-100, higher = more risky
    
    // Check payment history
    if (clientInfo.payment_verified) {
      greenFlags.push('Payment method verified');
    } else {
      redFlags.push('⚠️  Payment method not verified');
      riskScore += 15;
    }
    
    // Check rating
    if (clientInfo.rating) {
      if (clientInfo.rating >= 4.5) {
        greenFlags.push(`Excellent rating (${clientInfo.rating}/5)`);
      } else if (clientInfo.rating < 3.5) {
        redFlags.push(`⚠️  Low rating (${clientInfo.rating}/5)`);
        riskScore += 25;
      }
    } else {
      redFlags.push('⚠️  No rating history');
      riskScore += 10;
    }
    
    // Check project history
    if (clientInfo.projects_completed) {
      if (clientInfo.projects_completed < 3) {
        redFlags.push('⚠️  New client (< 3 projects)');
        riskScore += 10;
      } else {
        greenFlags.push(`Experienced (${clientInfo.projects_completed} projects)`);
      }
    }
    
    // Check budget realism
    if (opportunity.pay_max && opportunity.pay_min) {
      const avg = (opportunity.pay_max + opportunity.pay_min) / 2;
      if (avg < 20) {
        redFlags.push('⚠️  Suspiciously low budget');
        riskScore += 20;
      }
    }
    
    // Check description quality
    if (opportunity.description) {
      const wordCount = opportunity.description.split(/\s+/).length;
      if (wordCount < 50) {
        redFlags.push('⚠️  Vague description (low effort)');
        riskScore += 15;
      } else if (wordCount > 200) {
        greenFlags.push('Detailed description (serious client)');
      }
    }
    
    // Red flag keywords in description
    const badKeywords = ['asap', 'urgent', 'cheap', 'quick', 'simple', 'easy'];
    const desc = (opportunity.description || '').toLowerCase();
    const foundBadKeywords = badKeywords.filter(kw => desc.includes(kw));
    
    if (foundBadKeywords.length >= 3) {
      redFlags.push(`⚠️  Red flag keywords: ${foundBadKeywords.join(', ')}`);
      riskScore += 20;
    }
    
    // Assess overall risk
    let recommendation = 'PROCEED WITH CAUTION';
    if (riskScore < 20) {
      recommendation = 'LOW RISK - APPLY';
    } else if (riskScore < 40) {
      recommendation = 'MODERATE RISK - APPLY WITH DETAILED PROPOSAL';
    } else if (riskScore < 60) {
      recommendation = 'HIGH RISK - REQUEST MILESTONE PAYMENTS';
    } else {
      recommendation = 'VERY HIGH RISK - CONSIDER SKIPPING';
    }
    
    return {
      client_name: clientInfo.name,
      risk_score: riskScore,
      recommendation,
      red_flags: redFlags,
      green_flags: greenFlags,
      protective_measures: this.getProtectiveMeasures(riskScore),
    };
  }

  /**
   * Get protective measures based on risk
   */
  getProtectiveMeasures(riskScore) {
    const measures = [];
    
    if (riskScore >= 40) {
      measures.push('Require 50% upfront payment');
      measures.push('Use escrow/platform protection');
    }
    
    if (riskScore >= 60) {
      measures.push('Request milestone payments (weekly)');
      measures.push('Get detailed scope in writing');
      measures.push('Set clear revision limits');
    }
    
    if (riskScore >= 70) {
      measures.push('Consider requiring full payment upfront');
      measures.push('Have termination clause in contract');
    }
    
    return measures;
  }
}
