async function handler({
  search,
  filters = {},
  sort = "relevance",
  page = 1,
  limit = 20,
  job_id,
}) {
  try {
    console.log("Handler called with params:", {
      search,
      filters,
      sort,
      page,
      limit,
      job_id,
    });

    const offset = (page - 1) * limit;

    let whereConditions = ["1=1"];
    let queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereConditions.push(`(
        LOWER(c.first_name || ' ' || c.last_name) LIKE LOWER($${paramCount})
        OR LOWER(c.current_title) LIKE LOWER($${paramCount})
        OR LOWER(c.location) LIKE LOWER($${paramCount})
        OR EXISTS (
          SELECT 1 FROM candidate_skills cs 
          JOIN skills s ON cs.skill_id = s.id 
          WHERE cs.candidate_id = c.id 
          AND LOWER(s.name) LIKE LOWER($${paramCount})
        )
      )`);
      queryParams.push(`%${search}%`);
    }

    if (filters.min_experience || filters.experience_min) {
      paramCount++;
      whereConditions.push(`c.years_experience >= $${paramCount}`);
      queryParams.push(filters.min_experience || filters.experience_min);
    }

    if (filters.max_experience || filters.experience_max) {
      paramCount++;
      whereConditions.push(`c.years_experience <= $${paramCount}`);
      queryParams.push(filters.max_experience || filters.experience_max);
    }

    if (filters.location) {
      paramCount++;
      whereConditions.push(`LOWER(c.location) LIKE LOWER($${paramCount})`);
      queryParams.push(`%${filters.location}%`);
    }

    if (filters.availability) {
      paramCount++;
      whereConditions.push(`c.availability = $${paramCount}`);
      queryParams.push(filters.availability);
    }

    if (filters.remote_preference) {
      paramCount++;
      whereConditions.push(`c.remote_preference = $${paramCount}`);
      queryParams.push(filters.remote_preference);
    }

    if (filters.skills && filters.skills.length > 0) {
      const skillPlaceholders = filters.skills
        .map(() => {
          paramCount++;
          return `$${paramCount}`;
        })
        .join(",");
      whereConditions.push(`EXISTS (
        SELECT 1 FROM candidate_skills cs 
        JOIN skills s ON cs.skill_id = s.id 
        WHERE cs.candidate_id = c.id 
        AND LOWER(s.name) IN (${skillPlaceholders})
      )`);
      queryParams.push(...filters.skills.map((skill) => skill.toLowerCase()));
    }

    let orderBy = "c.created_at DESC";
    if (sort === "experience") {
      orderBy = "c.years_experience DESC NULLS LAST";
    } else if (sort === "name") {
      orderBy = "c.first_name ASC, c.last_name ASC";
    } else if (sort === "match_score" && job_id) {
      orderBy = "ai_match_score DESC NULLS LAST";
    }

    // Simplified query without complex joins for now
    paramCount++;
    const limitParam = paramCount;
    paramCount++;
    const offsetParam = paramCount;

    const baseQuery = `
      SELECT 
        c.*,
        co.name as current_company_name
      FROM candidates c
      LEFT JOIN companies co ON c.current_company_id = co.id
      WHERE ${whereConditions.join(" AND ")}
      ORDER BY ${orderBy}
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const finalParams = [...queryParams, limit, offset];

    console.log("Executing query:", baseQuery);
    console.log("With params:", finalParams);

    const candidates = await sql(baseQuery, finalParams);
    console.log("Query result:", candidates);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM candidates c
      WHERE ${whereConditions.join(" AND ")}
    `;

    const countResult = await sql(countQuery, queryParams);
    const total = parseInt(countResult[0].total);

    // Get skills for candidates
    const candidateIds = candidates.map((c) => c.id);
    let candidateSkills = [];

    if (candidateIds.length > 0) {
      const skillsPlaceholders = candidateIds
        .map((_, index) => `$${index + 1}`)
        .join(",");
      const skillsQuery = `
        SELECT 
          cs.candidate_id,
          s.name as skill_name,
          s.category as skill_category,
          cs.proficiency_level,
          cs.years_experience as skill_years
        FROM candidate_skills cs
        JOIN skills s ON cs.skill_id = s.id
        WHERE cs.candidate_id IN (${skillsPlaceholders})
        ORDER BY cs.proficiency_level DESC
      `;
      candidateSkills = await sql(skillsQuery, candidateIds);
    }

    const skillsMap = {};
    candidateSkills.forEach((skill) => {
      if (!skillsMap[skill.candidate_id]) {
        skillsMap[skill.candidate_id] = [];
      }
      skillsMap[skill.candidate_id].push({
        name: skill.skill_name,
        category: skill.skill_category,
        proficiency_level: skill.proficiency_level,
        years_experience: skill.skill_years,
      });
    });

    const enrichedCandidates = candidates.map((candidate) => ({
      ...candidate,
      skills: skillsMap[candidate.id] || [],
      full_name: `${candidate.first_name} ${candidate.last_name}`,
    }));

    const result = {
      candidates: enrichedCandidates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        total_pages: Math.ceil(total / limit),
        has_next: page * limit < total,
        has_prev: page > 1,
      },
      filters_applied: {
        search,
        ...filters,
        sort,
        job_id,
      },
    };

    console.log("Final result:", result);
    return result;
  } catch (error) {
    console.error("Error in candidates handler:", error);
    console.error("Error stack:", error.stack);
    return {
      candidates: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 0,
        has_next: false,
        has_prev: false,
      },
      filters_applied: {},
      error: error.message,
    };
  }
}
export async function POST(request) {
  return handler(await request.json());
}