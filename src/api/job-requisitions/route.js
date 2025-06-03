async function handler({
  status,
  department,
  hiring_manager_id,
  search,
  sort_by = "created_at",
  sort_order = "desc",
  page = 1,
  limit = 20,
}) {
  let whereConditions = [];
  let values = [];
  let paramCount = 0;

  let baseQuery = `
    SELECT 
      jr.*,
      u1.first_name || ' ' || u1.last_name as hiring_manager_name,
      u2.first_name || ' ' || u2.last_name as created_by_name,
      COUNT(DISTINCT ps.candidate_id) as candidate_count,
      COUNT(DISTINCT CASE WHEN ps.stage = 'applied' THEN ps.candidate_id END) as applied_count,
      COUNT(DISTINCT CASE WHEN ps.stage = 'screening' THEN ps.candidate_id END) as screening_count,
      COUNT(DISTINCT CASE WHEN ps.stage = 'interview' THEN ps.candidate_id END) as interview_count,
      COUNT(DISTINCT CASE WHEN ps.stage = 'offer' THEN ps.candidate_id END) as offer_count,
      COUNT(DISTINCT CASE WHEN ps.stage = 'hired' THEN ps.candidate_id END) as hired_count,
      COALESCE(AVG(sr.ai_match_score), 0) as avg_match_score,
      COUNT(DISTINCT sr.id) as total_search_results
    FROM job_requisitions jr
    LEFT JOIN users u1 ON jr.hiring_manager_id = u1.id
    LEFT JOIN users u2 ON jr.created_by_id = u2.id
    LEFT JOIN pipeline_stages ps ON jr.id = ps.job_requisition_id
    LEFT JOIN searches s ON jr.id = s.job_requisition_id
    LEFT JOIN search_results sr ON s.id = sr.search_id
  `;

  if (status) {
    paramCount++;
    whereConditions.push(`jr.status = $${paramCount}`);
    values.push(status);
  }

  if (department) {
    paramCount++;
    whereConditions.push(`jr.department = $${paramCount}`);
    values.push(department);
  }

  if (hiring_manager_id) {
    paramCount++;
    whereConditions.push(`jr.hiring_manager_id = $${paramCount}`);
    values.push(hiring_manager_id);
  }

  if (search) {
    paramCount++;
    whereConditions.push(`(
      LOWER(jr.title) LIKE LOWER($${paramCount}) 
      OR LOWER(jr.description) LIKE LOWER($${paramCount})
    )`);
    values.push(`%${search}%`);
  }

  if (whereConditions.length > 0) {
    baseQuery += ` WHERE ${whereConditions.join(" AND ")}`;
  }

  baseQuery += ` GROUP BY jr.id, u1.first_name, u1.last_name, u2.first_name, u2.last_name`;

  const validSortColumns = {
    created_at: "jr.created_at",
    title: "jr.title",
    candidate_count: "candidate_count",
    avg_match_score: "avg_match_score",
  };

  const sortColumn = validSortColumns[sort_by] || "jr.created_at";
  const sortDirection = sort_order === "asc" ? "ASC" : "DESC";

  baseQuery += ` ORDER BY ${sortColumn} ${sortDirection}`;

  const offset = (page - 1) * limit;
  paramCount++;
  baseQuery += ` LIMIT $${paramCount}`;
  values.push(limit);

  paramCount++;
  baseQuery += ` OFFSET $${paramCount}`;
  values.push(offset);

  let countQuery = `
    SELECT COUNT(DISTINCT jr.id) as total
    FROM job_requisitions jr
  `;

  let countValues = [];
  let countParamCount = 0;
  let countWhereConditions = [];

  if (status) {
    countParamCount++;
    countWhereConditions.push(`jr.status = $${countParamCount}`);
    countValues.push(status);
  }

  if (department) {
    countParamCount++;
    countWhereConditions.push(`jr.department = $${countParamCount}`);
    countValues.push(department);
  }

  if (hiring_manager_id) {
    countParamCount++;
    countWhereConditions.push(`jr.hiring_manager_id = $${countParamCount}`);
    countValues.push(hiring_manager_id);
  }

  if (search) {
    countParamCount++;
    countWhereConditions.push(`(
      LOWER(jr.title) LIKE LOWER($${countParamCount}) 
      OR LOWER(jr.description) LIKE LOWER($${countParamCount})
    )`);
    countValues.push(`%${search}%`);
  }

  if (countWhereConditions.length > 0) {
    countQuery += ` WHERE ${countWhereConditions.join(" AND ")}`;
  }

  const [requisitions, countResult] = await sql.transaction([
    sql(baseQuery, values),
    sql(countQuery, countValues),
  ]);

  const total = countResult[0]?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    requisitions: requisitions.map((req) => ({
      ...req,
      candidate_count: parseInt(req.candidate_count) || 0,
      applied_count: parseInt(req.applied_count) || 0,
      screening_count: parseInt(req.screening_count) || 0,
      interview_count: parseInt(req.interview_count) || 0,
      offer_count: parseInt(req.offer_count) || 0,
      hired_count: parseInt(req.hired_count) || 0,
      avg_match_score: parseFloat(req.avg_match_score) || 0,
      total_search_results: parseInt(req.total_search_results) || 0,
    })),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
export async function POST(request) {
  return handler(await request.json());
}