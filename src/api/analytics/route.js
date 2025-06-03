async function handler({
  type,
  timeframe = "30d",
  jobRequisitionId,
  campaignId,
  location,
  skills,
}) {
  const timeframeMap = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "1y": 365,
  };

  const days = timeframeMap[timeframe] || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  if (type === "dashboard") {
    const [
      newCandidatesResult,
      outreachStatsResult,
      talentHotspotsResult,
      timeSavedResult,
    ] = await sql.transaction([
      sql`
        SELECT COUNT(*) as count 
        FROM candidates 
        WHERE created_at >= ${startDate}
      `,
      sql`
        SELECT 
          COUNT(*) as total_sent,
          COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as opened,
          COUNT(CASE WHEN replied_at IS NOT NULL THEN 1 END) as replied
        FROM outreach_messages 
        WHERE sent_at >= ${startDate}
      `,
      sql`
        SELECT 
          location,
          COUNT(*) as candidate_count
        FROM candidates 
        WHERE location IS NOT NULL 
          AND created_at >= ${startDate}
        GROUP BY location 
        ORDER BY candidate_count DESC 
        LIMIT 10
      `,
      sql`
        SELECT COUNT(*) as searches_count
        FROM searches 
        WHERE created_at >= ${startDate}
      `,
    ]);

    const outreachStats = outreachStatsResult[0];
    const openRate =
      outreachStats.total_sent > 0
        ? ((outreachStats.opened / outreachStats.total_sent) * 100).toFixed(1)
        : 0;
    const replyRate =
      outreachStats.total_sent > 0
        ? ((outreachStats.replied / outreachStats.total_sent) * 100).toFixed(1)
        : 0;

    return {
      newCandidates: parseInt(newCandidatesResult[0].count),
      outreachSuccess: {
        totalSent: parseInt(outreachStats.total_sent),
        openRate: parseFloat(openRate),
        replyRate: parseFloat(replyRate),
      },
      timeSaved: {
        searchesPerformed: parseInt(timeSavedResult[0].searches_count),
        estimatedHoursSaved: parseInt(timeSavedResult[0].searches_count) * 2,
      },
      talentHotspots: talentHotspotsResult.map((row) => ({
        location: row.location,
        candidateCount: parseInt(row.candidate_count),
      })),
    };
  }

  if (type === "skills") {
    const skillsAnalysis = await sql`
      SELECT 
        s.name,
        s.category,
        COUNT(cs.id) as candidate_count,
        COUNT(jrs.id) as job_demand,
        AVG(cs.years_experience) as avg_experience
      FROM skills s
      LEFT JOIN candidate_skills cs ON s.id = cs.skill_id
      LEFT JOIN job_requisition_skills jrs ON s.id = jrs.skill_id
      WHERE cs.created_at >= ${startDate} OR jrs.created_at >= ${startDate}
      GROUP BY s.id, s.name, s.category
      ORDER BY job_demand DESC, candidate_count DESC
      LIMIT 20
    `;

    return {
      skills: skillsAnalysis.map((row) => ({
        name: row.name,
        category: row.category,
        candidateCount: parseInt(row.candidate_count) || 0,
        jobDemand: parseInt(row.job_demand) || 0,
        avgExperience: parseFloat(row.avg_experience) || 0,
        supplyDemandRatio:
          row.job_demand > 0
            ? (row.candidate_count / row.job_demand).toFixed(2)
            : "N/A",
      })),
    };
  }

  if (type === "locations") {
    const locationAnalysis = await sql`
      SELECT 
        location,
        COUNT(*) as candidate_count,
        AVG(years_experience) as avg_experience,
        AVG(salary_expectation_min) as avg_salary_min,
        AVG(salary_expectation_max) as avg_salary_max,
        COUNT(CASE WHEN availability = 'open' THEN 1 END) as available_count
      FROM candidates 
      WHERE location IS NOT NULL 
        AND created_at >= ${startDate}
      GROUP BY location 
      ORDER BY candidate_count DESC
      LIMIT 15
    `;

    return {
      locations: locationAnalysis.map((row) => ({
        location: row.location,
        candidateCount: parseInt(row.candidate_count),
        avgExperience: parseFloat(row.avg_experience) || 0,
        avgSalaryRange: {
          min: parseInt(row.avg_salary_min) || 0,
          max: parseInt(row.avg_salary_max) || 0,
        },
        availableCount: parseInt(row.available_count),
      })),
    };
  }

  if (type === "funnel" && jobRequisitionId) {
    const funnelData = await sql`
      SELECT 
        stage,
        COUNT(*) as candidate_count,
        AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - entered_at))/86400) as avg_days_in_stage
      FROM pipeline_stages 
      WHERE job_requisition_id = ${jobRequisitionId}
        AND entered_at >= ${startDate}
      GROUP BY stage 
      ORDER BY stage_order
    `;

    return {
      funnel: funnelData.map((row) => ({
        stage: row.stage,
        candidateCount: parseInt(row.candidate_count),
        avgDaysInStage: parseFloat(row.avg_days_in_stage) || 0,
      })),
    };
  }

  if (type === "search_performance") {
    const searchMetrics = await sql`
      SELECT 
        AVG(results_count) as avg_results,
        COUNT(*) as total_searches,
        COUNT(CASE WHEN saved = true THEN 1 END) as saved_searches,
        AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at))/60) as avg_search_time
      FROM searches 
      WHERE created_at >= ${startDate}
    `;

    const topQueries = await sql`
      SELECT 
        query_text,
        COUNT(*) as frequency,
        AVG(results_count) as avg_results
      FROM searches 
      WHERE created_at >= ${startDate}
      GROUP BY query_text 
      ORDER BY frequency DESC 
      LIMIT 10
    `;

    return {
      searchMetrics: {
        totalSearches: parseInt(searchMetrics[0].total_searches) || 0,
        avgResults: parseFloat(searchMetrics[0].avg_results) || 0,
        savedSearches: parseInt(searchMetrics[0].saved_searches) || 0,
        avgSearchTime: parseFloat(searchMetrics[0].avg_search_time) || 0,
      },
      topQueries: topQueries.map((row) => ({
        query: row.query_text,
        frequency: parseInt(row.frequency),
        avgResults: parseFloat(row.avg_results) || 0,
      })),
    };
  }

  if (type === "outreach" && campaignId) {
    const campaignMetrics = await sql`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(CASE WHEN sent_at IS NOT NULL THEN 1 END) as sent_count,
        COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as opened_count,
        COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as clicked_count,
        COUNT(CASE WHEN replied_at IS NOT NULL THEN 1 END) as replied_count,
        AVG(EXTRACT(EPOCH FROM (opened_at - sent_at))/3600) as avg_open_time_hours
      FROM outreach_messages 
      WHERE campaign_id = ${campaignId}
        AND created_at >= ${startDate}
    `;

    const metrics = campaignMetrics[0];
    return {
      campaignMetrics: {
        totalMessages: parseInt(metrics.total_messages),
        sentCount: parseInt(metrics.sent_count),
        openRate:
          metrics.sent_count > 0
            ? ((metrics.opened_count / metrics.sent_count) * 100).toFixed(1)
            : 0,
        clickRate:
          metrics.sent_count > 0
            ? ((metrics.clicked_count / metrics.sent_count) * 100).toFixed(1)
            : 0,
        replyRate:
          metrics.sent_count > 0
            ? ((metrics.replied_count / metrics.sent_count) * 100).toFixed(1)
            : 0,
        avgOpenTimeHours: parseFloat(metrics.avg_open_time_hours) || 0,
      },
    };
  }

  if (type === "trends") {
    const weeklyTrends = await sql`
      SELECT 
        DATE_TRUNC('week', created_at) as week,
        COUNT(*) as candidate_count
      FROM candidates 
      WHERE created_at >= ${startDate}
      GROUP BY week 
      ORDER BY week
    `;

    const outreachTrends = await sql`
      SELECT 
        DATE_TRUNC('week', sent_at) as week,
        COUNT(*) as messages_sent,
        COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as messages_opened
      FROM outreach_messages 
      WHERE sent_at >= ${startDate}
      GROUP BY week 
      ORDER BY week
    `;

    return {
      candidateTrends: weeklyTrends.map((row) => ({
        week: row.week,
        candidateCount: parseInt(row.candidate_count),
      })),
      outreachTrends: outreachTrends.map((row) => ({
        week: row.week,
        messagesSent: parseInt(row.messages_sent),
        messagesOpened: parseInt(row.messages_opened),
        openRate:
          row.messages_sent > 0
            ? ((row.messages_opened / row.messages_sent) * 100).toFixed(1)
            : 0,
      })),
    };
  }

  return { error: "Invalid analytics type specified" };
}
export async function POST(request) {
  return handler(await request.json());
}