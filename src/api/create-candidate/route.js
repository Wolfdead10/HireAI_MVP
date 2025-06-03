async function handler({
  first_name,
  last_name,
  email,
  phone,
  location,
  current_title,
  current_company_name,
  years_experience,
  education,
  summary,
  resume_url,
  linkedin_url,
  portfolio_url,
  avatar_url,
  availability,
  salary_expectation_min,
  salary_expectation_max,
  preferred_locations,
  remote_preference,
  source,
  skills,
  work_experiences,
}) {
  if (!first_name || !last_name) {
    return { error: "First name and last name are required" };
  }

  try {
    let current_company_id = null;

    if (current_company_name) {
      const existingCompany = await sql`
        SELECT id FROM companies WHERE LOWER(name) = LOWER(${current_company_name})
      `;

      if (existingCompany.length > 0) {
        current_company_id = existingCompany[0].id;
      } else {
        const newCompany = await sql`
          INSERT INTO companies (name) 
          VALUES (${current_company_name}) 
          RETURNING id
        `;
        current_company_id = newCompany[0].id;
      }
    }

    const candidate = await sql`
      INSERT INTO candidates (
        first_name, last_name, email, phone, location, current_title, 
        current_company_id, years_experience, education, summary, 
        resume_url, linkedin_url, portfolio_url, avatar_url, 
        availability, salary_expectation_min, salary_expectation_max, 
        preferred_locations, remote_preference, source
      ) VALUES (
        ${first_name}, ${last_name}, ${email}, ${phone}, ${location}, 
        ${current_title}, ${current_company_id}, ${years_experience}, 
        ${education}, ${summary}, ${resume_url}, ${linkedin_url}, 
        ${portfolio_url}, ${avatar_url}, ${availability}, 
        ${salary_expectation_min}, ${salary_expectation_max}, 
        ${preferred_locations}, ${remote_preference}, ${source}
      ) RETURNING *
    `;

    const candidateId = candidate[0].id;

    if (skills && Array.isArray(skills)) {
      for (const skill of skills) {
        if (skill.name) {
          let skillId;
          const existingSkill = await sql`
            SELECT id FROM skills WHERE LOWER(name) = LOWER(${skill.name})
          `;

          if (existingSkill.length > 0) {
            skillId = existingSkill[0].id;
          } else {
            const newSkill = await sql`
              INSERT INTO skills (name, category) 
              VALUES (${skill.name}, ${skill.category || null}) 
              RETURNING id
            `;
            skillId = newSkill[0].id;
          }

          await sql`
            INSERT INTO candidate_skills (
              candidate_id, skill_id, proficiency_level, years_experience
            ) VALUES (
              ${candidateId}, ${skillId}, 
              ${skill.proficiency_level || "intermediate"}, 
              ${skill.years_experience || 0}
            )
          `;
        }
      }
    }

    if (work_experiences && Array.isArray(work_experiences)) {
      for (const experience of work_experiences) {
        if (experience.title) {
          let companyId = null;

          if (experience.company_name) {
            const existingCompany = await sql`
              SELECT id FROM companies WHERE LOWER(name) = LOWER(${experience.company_name})
            `;

            if (existingCompany.length > 0) {
              companyId = existingCompany[0].id;
            } else {
              const newCompany = await sql`
                INSERT INTO companies (name) 
                VALUES (${experience.company_name}) 
                RETURNING id
              `;
              companyId = newCompany[0].id;
            }
          }

          await sql`
            INSERT INTO work_experiences (
              candidate_id, company_id, title, start_date, end_date, 
              description, achievements
            ) VALUES (
              ${candidateId}, ${companyId}, ${experience.title}, 
              ${experience.start_date}, ${experience.end_date}, 
              ${experience.description}, ${experience.achievements}
            )
          `;
        }
      }
    }

    const fullCandidate = await sql`
      SELECT 
        c.*,
        comp.name as current_company_name,
        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'id', cs.id,
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
              'company_name', wcomp.name,
              'start_date', we.start_date,
              'end_date', we.end_date,
              'description', we.description,
              'achievements', we.achievements
            )
          ) FILTER (WHERE we.id IS NOT NULL), 
          '[]'
        ) as work_experiences
      FROM candidates c
      LEFT JOIN companies comp ON c.current_company_id = comp.id
      LEFT JOIN candidate_skills cs ON c.id = cs.candidate_id
      LEFT JOIN skills s ON cs.skill_id = s.id
      LEFT JOIN work_experiences we ON c.id = we.candidate_id
      LEFT JOIN companies wcomp ON we.company_id = wcomp.id
      WHERE c.id = ${candidateId}
      GROUP BY c.id, comp.name
    `;

    return {
      success: true,
      candidate: fullCandidate[0],
    };
  } catch (error) {
    return {
      error: "Failed to create candidate: " + error.message,
    };
  }
}
export async function POST(request) {
  return handler(await request.json());
}