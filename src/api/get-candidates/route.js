async function handler({
  page = 1,
  limit = 20,
  location,
  skills,
  availability,
  experience_min,
  experience_max,
  search,
  salary_min,
  salary_max,
  remote_preference,
  source,
}) {
  const offset = (page - 1) * limit;

  let whereConditions = [];
  let values = [];
  let paramCount = 0;

  if (location) {
    paramCount++;
    whereConditions.push(`LOWER(c.location) LIKE LOWER($${paramCount})`);
    values.push(`%${location}%`);
  }

  if (availability) {
    paramCount++;
    whereConditions.push(`c.availability = $${paramCount}`);
    values.push(availability);
  }

  if (experience_min !== undefined) {
    paramCount++;
    whereConditions.push(`c.years_experience >= $${paramCount}`);
    values.push(experience_min);
  }

  if (experience_max !== undefined) {
    paramCount++;
    whereConditions.push(`c.years_experience <= $${paramCount}`);
    values.push(experience_max);
  }

  if (salary_min !== undefined) {
    paramCount++;
    whereConditions.push(`c.salary_expectation_min >= $${paramCount}`);
    values.push(salary_min);
  }

  if (salary_max !== undefined) {
    paramCount++;
    whereConditions.push(`c.salary_expectation_max <= $${paramCount}`);
    values.push(salary_max);
  }

  if (remote_preference) {
    paramCount++;
    whereConditions.push(`c.remote_preference = $${paramCount}`);
    values.push(remote_preference);
  }

  if (source) {
    paramCount++;
    whereConditions.push(`c.source = $${paramCount}`);
    values.push(source);
  }

  if (search) {
    paramCount++;
    whereConditions.push(`(
      LOWER(c.first_name) LIKE LOWER($${paramCount}) OR 
      LOWER(c.last_name) LIKE LOWER($${paramCount}) OR 
      LOWER(c.current_title) LIKE LOWER($${paramCount}) OR 
      LOWER(c.summary) LIKE LOWER($${paramCount})
    )`);
    values.push(`%${search}%`);
  }

  let skillsSubquery = "";
  if (skills && skills.length > 0) {
    const skillPlaceholders = skills
      .map((_, index) => `$${paramCount + index + 1}`)
      .join(",");
    paramCount += skills.length;
    values.push(...skills);

    skillsSubquery = `AND c.id IN (
      SELECT cs.candidate_id 
      FROM candidate_skills cs 
      JOIN skills s ON cs.skill_id = s.id 
      WHERE LOWER(s.name) IN (${skillPlaceholders.toLowerCase()})
      GROUP BY cs.candidate_id 
      HAVING COUNT(DISTINCT s.id) = ${skills.length}
    )`;
  }

  const whereClause =
    whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  paramCount++;
  values.push(limit);
  const limitParam = `$${paramCount}`;

  paramCount++;
  values.push(offset);
  const offsetParam = `$${paramCount}`;

  const query = `
    SELECT 
      c.*,
      comp.name as current_company_name,
      comp.industry as current_company_industry,
      COALESCE(
        JSON_AGG(
          DISTINCT JSONB_BUILD_OBJECT(
            'id', s.id,
            'name', s.name,
            'category', s.category,
            'proficiency_level', cs.proficiency_level,
            'years_experience', cs.years_experience
          )
        ) FILTER (WHERE s.id IS NOT NULL), 
        '[]'
      ) as skills,
      COALESCE(
        JSON_AGG(
          DISTINCT JSONB_BUILD_OBJECT(
            'id', we.id,
            'title', we.title,
            'company_name', wec.name,
            'start_date', we.start_date,
            'end_date', we.end_date,
            'description', we.description
          )
        ) FILTER (WHERE we.id IS NOT NULL), 
        '[]'
      ) as work_experiences
    FROM candidates c
    LEFT JOIN companies comp ON c.current_company_id = comp.id
    LEFT JOIN candidate_skills cs ON c.id = cs.candidate_id
    LEFT JOIN skills s ON cs.skill_id = s.id
    LEFT JOIN work_experiences we ON c.id = we.candidate_id
    LEFT JOIN companies wec ON we.company_id = wec.id
    ${whereClause}
    ${skillsSubquery}
    GROUP BY c.id, comp.name, comp.industry
    ORDER BY c.created_at DESC
    LIMIT ${limitParam} OFFSET ${offsetParam}
  `;

  const countQuery = `
    SELECT COUNT(DISTINCT c.id) as total
    FROM candidates c
    LEFT JOIN candidate_skills cs ON c.id = cs.candidate_id
    LEFT JOIN skills s ON cs.skill_id = s.id
    ${whereClause}
    ${skillsSubquery}
  `;

  const countValues = values.slice(0, -2);

  const [candidates, countResult] = await sql.transaction([
    sql(query, values),
    sql(countQuery, countValues),
  ]);

  const total = parseInt(countResult[0].total);
  const totalPages = Math.ceil(total / limit);

  return {
    candidates,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
export async function POST(request) {
  return handler(await request.json());
}