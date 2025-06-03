async function handler({
  department,
  status,
  priority,
  hiring_manager_id,
  search,
  salary_min,
  salary_max,
  employment_type,
  remote_policy,
  page = 1,
  limit = 20,
}) {
  const offset = (page - 1) * limit;

  let whereConditions = [];
  let values = [];
  let paramCount = 0;

  if (department) {
    paramCount++;
    whereConditions.push(`jr.department = $${paramCount}`);
    values.push(department);
  }

  if (status) {
    paramCount++;
    whereConditions.push(`jr.status = $${paramCount}`);
    values.push(status);
  }

  if (priority) {
    paramCount++;
    whereConditions.push(`jr.priority = $${paramCount}`);
    values.push(priority);
  }

  if (hiring_manager_id) {
    paramCount++;
    whereConditions.push(`jr.hiring_manager_id = $${paramCount}`);
    values.push(hiring_manager_id);
  }

  if (employment_type) {
    paramCount++;
    whereConditions.push(`jr.employment_type = $${paramCount}`);
    values.push(employment_type);
  }

  if (remote_policy) {
    paramCount++;
    whereConditions.push(`jr.remote_policy = $${paramCount}`);
    values.push(remote_policy);
  }

  if (salary_min) {
    paramCount++;
    whereConditions.push(`jr.salary_max >= $${paramCount}`);
    values.push(salary_min);
  }

  if (salary_max) {
    paramCount++;
    whereConditions.push(`jr.salary_min <= $${paramCount}`);
    values.push(salary_max);
  }

  if (search) {
    paramCount++;
    whereConditions.push(`(
      LOWER(jr.title) LIKE LOWER($${paramCount}) OR 
      LOWER(jr.description) LIKE LOWER($${paramCount}) OR 
      LOWER(jr.requirements) LIKE LOWER($${paramCount})
    )`);
    values.push(`%${search}%`);
  }

  const whereClause =
    whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  const countQuery = `
    SELECT COUNT(*) as total
    FROM job_requisitions jr
    ${whereClause}
  `;

  const dataQuery = `
    SELECT 
      jr.*,
      hm.first_name as hiring_manager_first_name,
      hm.last_name as hiring_manager_last_name,
      hm.email as hiring_manager_email,
      cb.first_name as created_by_first_name,
      cb.last_name as created_by_last_name,
      cb.email as created_by_email
    FROM job_requisitions jr
    LEFT JOIN users hm ON jr.hiring_manager_id = hm.id
    LEFT JOIN users cb ON jr.created_by_id = cb.id
    ${whereClause}
    ORDER BY jr.created_at DESC
    LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
  `;

  values.push(limit, offset);

  const [countResult, jobsResult] = await sql.transaction([
    sql(countQuery, values.slice(0, -2)),
    sql(dataQuery, values),
  ]);

  const total = parseInt(countResult[0].total);
  const totalPages = Math.ceil(total / limit);

  const jobIds = jobsResult.map((job) => job.id);

  let skillsData = [];
  if (jobIds.length > 0) {
    const skillsQuery = `
      SELECT 
        jrs.job_requisition_id,
        s.name as skill_name,
        s.category as skill_category,
        jrs.importance,
        jrs.years_required
      FROM job_requisition_skills jrs
      JOIN skills s ON jrs.skill_id = s.id
      WHERE jrs.job_requisition_id = ANY($1)
      ORDER BY jrs.importance DESC, s.name
    `;

    skillsData = await sql(skillsQuery, [jobIds]);
  }

  const skillsByJob = {};
  skillsData.forEach((skill) => {
    if (!skillsByJob[skill.job_requisition_id]) {
      skillsByJob[skill.job_requisition_id] = [];
    }
    skillsByJob[skill.job_requisition_id].push({
      name: skill.skill_name,
      category: skill.skill_category,
      importance: skill.importance,
      years_required: skill.years_required,
    });
  });

  const jobs = jobsResult.map((job) => ({
    id: job.id,
    title: job.title,
    department: job.department,
    description: job.description,
    requirements: job.requirements,
    location: job.location,
    salary_min: job.salary_min,
    salary_max: job.salary_max,
    employment_type: job.employment_type,
    remote_policy: job.remote_policy,
    status: job.status,
    priority: job.priority,
    target_start_date: job.target_start_date,
    created_at: job.created_at,
    updated_at: job.updated_at,
    hiring_manager: job.hiring_manager_id
      ? {
          id: job.hiring_manager_id,
          first_name: job.hiring_manager_first_name,
          last_name: job.hiring_manager_last_name,
          email: job.hiring_manager_email,
        }
      : null,
    created_by: job.created_by_id
      ? {
          id: job.created_by_id,
          first_name: job.created_by_first_name,
          last_name: job.created_by_last_name,
          email: job.created_by_email,
        }
      : null,
    required_skills: skillsByJob[job.id] || [],
  }));

  return {
    jobs,
    pagination: {
      page,
      limit,
      total,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    },
  };
}
export async function POST(request) {
  return handler(await request.json());
}