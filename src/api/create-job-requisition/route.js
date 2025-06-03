async function handler({
  title,
  department,
  hiring_manager_id,
  created_by_id,
  description,
  requirements,
  location,
  salary_min,
  salary_max,
  employment_type = "full-time",
  remote_policy = "hybrid",
  priority = "medium",
  target_start_date,
  skills = [],
}) {
  if (!title || !department || !created_by_id) {
    return { error: "Title, department, and created_by_id are required" };
  }

  try {
    const jobRequisitionId = crypto.randomUUID();

    let queries = [];

    const jobQuery = sql`
      INSERT INTO job_requisitions (
        id, title, department, hiring_manager_id, created_by_id, 
        description, requirements, location, salary_min, salary_max, 
        employment_type, remote_policy, priority, target_start_date, 
        status, created_at, updated_at
      ) VALUES (
        ${jobRequisitionId}, ${title}, ${department}, ${hiring_manager_id}, ${created_by_id},
        ${description}, ${requirements}, ${location}, ${salary_min}, ${salary_max},
        ${employment_type}, ${remote_policy}, ${priority}, ${target_start_date},
        'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `;

    queries.push(jobQuery);

    for (const skill of skills) {
      if (skill.skill_id) {
        const skillQuery = sql`
          INSERT INTO job_requisition_skills (
            job_requisition_id, skill_id, importance, years_required
          ) VALUES (
            ${jobRequisitionId}, ${skill.skill_id}, ${
          skill.importance || "nice-to-have"
        }, ${skill.years_required || 0}
          )
        `;
        queries.push(skillQuery);
      }
    }

    await sql.transaction(queries);

    const [createdJob] = await sql`
      SELECT jr.*, 
             hm.first_name as hiring_manager_first_name, 
             hm.last_name as hiring_manager_last_name,
             cb.first_name as created_by_first_name, 
             cb.last_name as created_by_last_name
      FROM job_requisitions jr
      LEFT JOIN users hm ON jr.hiring_manager_id = hm.id
      LEFT JOIN users cb ON jr.created_by_id = cb.id
      WHERE jr.id = ${jobRequisitionId}
    `;

    const jobSkills = await sql`
      SELECT jrs.*, s.name as skill_name, s.category as skill_category
      FROM job_requisition_skills jrs
      JOIN skills s ON jrs.skill_id = s.id
      WHERE jrs.job_requisition_id = ${jobRequisitionId}
    `;

    return {
      success: true,
      job_requisition: {
        ...createdJob,
        skills: jobSkills,
      },
    };
  } catch (error) {
    return { error: "Failed to create job requisition: " + error.message };
  }
}
export async function POST(request) {
  return handler(await request.json());
}