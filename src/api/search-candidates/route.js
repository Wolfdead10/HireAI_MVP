async function handler({
  query,
  skills,
  location,
  experience,
  salaryRange,
  availability,
  remotePreference,
  userId,
  jobRequisitionId,
  limit = 20,
  offset = 0,
}) {
  try {
    let searchQuery = `
      SELECT DISTINCT
        c.id,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.location,
        c.current_title,
        c.years_experience,
        c.summary,
        c.avatar_url,
        c.availability,
        c.salary_expectation_min,
        c.salary_expectation_max,
        c.remote_preference,
        c.linkedin_url,
        c.portfolio_url,
        comp.name as current_company,
        COALESCE(
          ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL),
          ARRAY[]::text[]
        ) as skills,
        COALESCE(
          ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL),
          ARRAY[]::text[]
        ) as tags
      FROM candidates c
      LEFT JOIN companies comp ON c.current_company_id = comp.id
      LEFT JOIN candidate_skills cs ON c.id = cs.candidate_id
      LEFT JOIN skills s ON cs.skill_id = s.id
      LEFT JOIN candidate_tags ct ON c.id = ct.candidate_id
      LEFT JOIN tags t ON ct.tag_id = t.id
      WHERE 1=1
    `;

    const queryParams = [];
    let paramCount = 0;

    if (query) {
      paramCount++;
      searchQuery += ` AND (
        LOWER(c.first_name) LIKE LOWER($${paramCount})
        OR LOWER(c.last_name) LIKE LOWER($${paramCount})
        OR LOWER(c.current_title) LIKE LOWER($${paramCount})
        OR LOWER(c.summary) LIKE LOWER($${paramCount})
        OR LOWER(comp.name) LIKE LOWER($${paramCount})
      )`;
      queryParams.push(`%${query}%`);
    }

    if (location) {
      paramCount++;
      searchQuery += ` AND (
        LOWER(c.location) LIKE LOWER($${paramCount})
        OR $${paramCount} = ANY(LOWER(c.preferred_locations::text)::text[])
      )`;
      queryParams.push(`%${location}%`);
    }

    if (experience) {
      if (experience.min !== undefined) {
        paramCount++;
        searchQuery += ` AND c.years_experience >= $${paramCount}`;
        queryParams.push(experience.min);
      }
      if (experience.max !== undefined) {
        paramCount++;
        searchQuery += ` AND c.years_experience <= $${paramCount}`;
        queryParams.push(experience.max);
      }
    }

    if (salaryRange) {
      if (salaryRange.min !== undefined) {
        paramCount++;
        searchQuery += ` AND (c.salary_expectation_max IS NULL OR c.salary_expectation_max >= $${paramCount})`;
        queryParams.push(salaryRange.min);
      }
      if (salaryRange.max !== undefined) {
        paramCount++;
        searchQuery += ` AND (c.salary_expectation_min IS NULL OR c.salary_expectation_min <= $${paramCount})`;
        queryParams.push(salaryRange.max);
      }
    }

    if (availability) {
      paramCount++;
      searchQuery += ` AND c.availability = $${paramCount}`;
      queryParams.push(availability);
    }

    if (remotePreference) {
      paramCount++;
      searchQuery += ` AND c.remote_preference = $${paramCount}`;
      queryParams.push(remotePreference);
    }

    if (skills && skills.length > 0) {
      paramCount++;
      searchQuery += ` AND EXISTS (
        SELECT 1 FROM candidate_skills cs2
        JOIN skills s2 ON cs2.skill_id = s2.id
        WHERE cs2.candidate_id = c.id
        AND LOWER(s2.name) = ANY($${paramCount})
      )`;
      queryParams.push(skills.map((skill) => skill.toLowerCase()));
    }

    searchQuery += `
      GROUP BY c.id, c.first_name, c.last_name, c.email, c.phone, c.location,
               c.current_title, c.years_experience, c.summary, c.avatar_url,
               c.availability, c.salary_expectation_min, c.salary_expectation_max,
               c.remote_preference, c.linkedin_url, c.portfolio_url, comp.name
      ORDER BY c.updated_at DESC
    `;

    paramCount++;
    searchQuery += ` LIMIT $${paramCount}`;
    queryParams.push(limit);

    paramCount++;
    searchQuery += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    const candidates = await sql(searchQuery, queryParams);

    const candidatesWithScores = candidates.map((candidate) => {
      let matchScore = 50;
      const matchReasons = [];

      if (query) {
        const queryLower = query.toLowerCase();
        if (candidate.current_title?.toLowerCase().includes(queryLower)) {
          matchScore += 20;
          matchReasons.push("Title matches search query");
        }
        if (candidate.summary?.toLowerCase().includes(queryLower)) {
          matchScore += 15;
          matchReasons.push("Summary contains relevant keywords");
        }
        if (candidate.current_company?.toLowerCase().includes(queryLower)) {
          matchScore += 10;
          matchReasons.push("Company matches search criteria");
        }
      }

      if (skills && skills.length > 0) {
        const candidateSkills = candidate.skills || [];
        const matchingSkills = skills.filter((skill) =>
          candidateSkills.some((cs) =>
            cs.toLowerCase().includes(skill.toLowerCase())
          )
        );
        const skillMatchRatio = matchingSkills.length / skills.length;
        matchScore += Math.round(skillMatchRatio * 30);
        if (matchingSkills.length > 0) {
          matchReasons.push(
            `Has ${matchingSkills.length}/${skills.length} required skills`
          );
        }
      }

      if (experience) {
        const candidateExp = candidate.years_experience || 0;
        if (experience.min && candidateExp >= experience.min) {
          matchScore += 10;
          matchReasons.push("Meets minimum experience requirement");
        }
        if (experience.max && candidateExp <= experience.max) {
          matchScore += 5;
        }
      }

      if (location && candidate.location) {
        if (candidate.location.toLowerCase().includes(location.toLowerCase())) {
          matchScore += 15;
          matchReasons.push("Location matches preference");
        }
      }

      if (
        remotePreference &&
        candidate.remote_preference === remotePreference
      ) {
        matchScore += 10;
        matchReasons.push("Remote work preference aligns");
      }

      if (availability === "open" && candidate.availability === "open") {
        matchScore += 15;
        matchReasons.push("Currently available for new opportunities");
      }

      matchScore = Math.min(matchScore, 100);

      return {
        ...candidate,
        ai_match_score: matchScore,
        match_reasoning: matchReasons.join("; ") || "Basic profile match",
      };
    });

    candidatesWithScores.sort((a, b) => b.ai_match_score - a.ai_match_score);

    if (userId) {
      const searchRecord = await sql(
        `INSERT INTO searches (user_id, job_requisition_id, query_text, filters, results_count)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          userId,
          jobRequisitionId || null,
          query || "",
          JSON.stringify({
            skills,
            location,
            experience,
            salaryRange,
            availability,
            remotePreference,
          }),
          candidatesWithScores.length,
        ]
      );

      const searchId = searchRecord[0].id;

      if (candidatesWithScores.length > 0) {
        const searchResultsData = candidatesWithScores.map(
          (candidate, index) => [
            searchId,
            candidate.id,
            candidate.ai_match_score,
            candidate.match_reasoning,
            index + 1,
          ]
        );

        const insertQuery = `
          INSERT INTO search_results (search_id, candidate_id, ai_match_score, match_reasoning, rank_position)
          VALUES ${searchResultsData
            .map(
              (_, i) =>
                `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${
                  i * 5 + 4
                }, $${i * 5 + 5})`
            )
            .join(", ")}
        `;

        await sql(insertQuery, searchResultsData.flat());
      }
    }

    const totalCountQuery = `
      SELECT COUNT(DISTINCT c.id) as total
      FROM candidates c
      LEFT JOIN companies comp ON c.current_company_id = comp.id
      LEFT JOIN candidate_skills cs ON c.id = cs.candidate_id
      LEFT JOIN skills s ON cs.skill_id = s.id
      WHERE 1=1
    `;

    let countQuery = totalCountQuery;
    const countParams = [];
    let countParamCount = 0;

    if (query) {
      countParamCount++;
      countQuery += ` AND (
        LOWER(c.first_name) LIKE LOWER($${countParamCount})
        OR LOWER(c.last_name) LIKE LOWER($${countParamCount})
        OR LOWER(c.current_title) LIKE LOWER($${countParamCount})
        OR LOWER(c.summary) LIKE LOWER($${countParamCount})
        OR LOWER(comp.name) LIKE LOWER($${countParamCount})
      )`;
      countParams.push(`%${query}%`);
    }

    if (location) {
      countParamCount++;
      countQuery += ` AND (
        LOWER(c.location) LIKE LOWER($${countParamCount})
        OR $${countParamCount} = ANY(LOWER(c.preferred_locations::text)::text[])
      )`;
      countParams.push(`%${location}%`);
    }

    if (experience) {
      if (experience.min !== undefined) {
        countParamCount++;
        countQuery += ` AND c.years_experience >= $${countParamCount}`;
        countParams.push(experience.min);
      }
      if (experience.max !== undefined) {
        countParamCount++;
        countQuery += ` AND c.years_experience <= $${countParamCount}`;
        countParams.push(experience.max);
      }
    }

    if (salaryRange) {
      if (salaryRange.min !== undefined) {
        countParamCount++;
        countQuery += ` AND (c.salary_expectation_max IS NULL OR c.salary_expectation_max >= $${countParamCount})`;
        countParams.push(salaryRange.min);
      }
      if (salaryRange.max !== undefined) {
        countParamCount++;
        countQuery += ` AND (c.salary_expectation_min IS NULL OR c.salary_expectation_min <= $${countParamCount})`;
        countParams.push(salaryRange.max);
      }
    }

    if (availability) {
      countParamCount++;
      countQuery += ` AND c.availability = $${countParamCount}`;
      countParams.push(availability);
    }

    if (remotePreference) {
      countParamCount++;
      countQuery += ` AND c.remote_preference = $${countParamCount}`;
      countParams.push(remotePreference);
    }

    if (skills && skills.length > 0) {
      countParamCount++;
      countQuery += ` AND EXISTS (
        SELECT 1 FROM candidate_skills cs2
        JOIN skills s2 ON cs2.skill_id = s2.id
        WHERE cs2.candidate_id = c.id
        AND LOWER(s2.name) = ANY($${countParamCount})
      )`;
      countParams.push(skills.map((skill) => skill.toLowerCase()));
    }

    const totalResult = await sql(countQuery, countParams);
    const total = parseInt(totalResult[0].total);

    return {
      candidates: candidatesWithScores,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      searchMetadata: {
        averageMatchScore:
          candidatesWithScores.length > 0
            ? Math.round(
                candidatesWithScores.reduce(
                  (sum, c) => sum + c.ai_match_score,
                  0
                ) / candidatesWithScores.length
              )
            : 0,
        topMatchScore:
          candidatesWithScores.length > 0
            ? candidatesWithScores[0].ai_match_score
            : 0,
        appliedFilters: {
          query: !!query,
          skills: !!(skills && skills.length > 0),
          location: !!location,
          experience: !!(
            experience &&
            (experience.min !== undefined || experience.max !== undefined)
          ),
          salaryRange: !!(
            salaryRange &&
            (salaryRange.min !== undefined || salaryRange.max !== undefined)
          ),
          availability: !!availability,
          remotePreference: !!remotePreference,
        },
      },
    };
  } catch (error) {
    return {
      error: "Failed to search candidates",
      details: error.message,
    };
  }
}
export async function POST(request) {
  return handler(await request.json());
}