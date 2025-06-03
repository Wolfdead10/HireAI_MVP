async function handler({
  candidateId,
  jobRequisitionId,
  resumeText,
  candidateData,
  jobRequirements,
}) {
  try {
    let candidate = candidateData;
    let jobReq = jobRequirements;

    if (candidateId && !candidate) {
      const candidateResult = await sql`
        SELECT c.*, 
               array_agg(DISTINCT s.name) as skills,
               array_agg(DISTINCT we.title || ' at ' || comp.name) as work_history
        FROM candidates c
        LEFT JOIN candidate_skills cs ON c.id = cs.candidate_id
        LEFT JOIN skills s ON cs.skill_id = s.id
        LEFT JOIN work_experiences we ON c.id = we.candidate_id
        LEFT JOIN companies comp ON we.company_id = comp.id
        WHERE c.id = ${candidateId}
        GROUP BY c.id
      `;

      if (candidateResult.length === 0) {
        return { error: "Candidate not found" };
      }

      candidate = candidateResult[0];
    }

    if (jobRequisitionId && !jobReq) {
      const jobResult = await sql`
        SELECT jr.*, 
               array_agg(DISTINCT s.name) as required_skills
        FROM job_requisitions jr
        LEFT JOIN job_requisition_skills jrs ON jr.id = jrs.job_requisition_id
        LEFT JOIN skills s ON jrs.skill_id = s.id
        WHERE jr.id = ${jobRequisitionId}
        GROUP BY jr.id
      `;

      if (jobResult.length === 0) {
        return { error: "Job requisition not found" };
      }

      jobReq = jobResult[0];
    }

    if (!candidate || !jobReq) {
      return { error: "Missing candidate or job requirements data" };
    }

    const prompt = `
You are an expert AI recruiter analyzing candidate fit for a job position. Please provide a comprehensive analysis in JSON format.

CANDIDATE PROFILE:
- Name: ${candidate.first_name} ${candidate.last_name}
- Current Title: ${candidate.current_title || "Not specified"}
- Years of Experience: ${candidate.years_experience || "Not specified"}
- Location: ${candidate.location || "Not specified"}
- Skills: ${
      candidate.skills
        ? candidate.skills.filter((s) => s).join(", ")
        : "Not specified"
    }
- Work History: ${
      candidate.work_history
        ? candidate.work_history.filter((h) => h && h !== " at ").join("; ")
        : "Not specified"
    }
- Summary: ${candidate.summary || "Not provided"}
- Resume Text: ${resumeText || "Not provided"}

JOB REQUIREMENTS:
- Position: ${jobReq.title}
- Department: ${jobReq.department}
- Location: ${jobReq.location || "Not specified"}
- Employment Type: ${jobReq.employment_type || "Not specified"}
- Salary Range: ${
      jobReq.salary_min && jobReq.salary_max
        ? `$${jobReq.salary_min} - $${jobReq.salary_max}`
        : "Not specified"
    }
- Required Skills: ${
      jobReq.required_skills
        ? jobReq.required_skills.filter((s) => s).join(", ")
        : "Not specified"
    }
- Description: ${jobReq.description || "Not provided"}
- Requirements: ${jobReq.requirements || "Not provided"}

Please analyze this candidate's fit for the role and respond with a JSON object containing:

{
  "matchScore": <number between 0-100>,
  "matchReasoning": "<detailed explanation of why this score was given>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "concerns": ["<concern 1>", "<concern 2>", "<concern 3>"],
  "interviewQuestions": [
    "<specific question 1 based on candidate background>",
    "<specific question 2 based on candidate background>",
    "<specific question 3 based on candidate background>",
    "<specific question 4 based on candidate background>",
    "<specific question 5 based on candidate background>"
  ],
  "skillsAlignment": {
    "matching": ["<skill 1>", "<skill 2>"],
    "missing": ["<skill 1>", "<skill 2>"],
    "transferable": ["<skill 1>", "<skill 2>"]
  },
  "recommendation": "<hire/consider/pass with brief reasoning>"
}

Focus on practical, actionable insights. Be specific about technical skills, experience relevance, and cultural fit indicators.
`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization:
            "Bearer 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",
          "Content-Type": "application/json",
          "HTTP-Referer": "https://create.xyz",
          "X-Title": "HireAI Candidate Analysis",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `AI analysis failed: ${response.status} - ${errorText}` };
    }

    const aiResponse = await response.json();

    if (
      !aiResponse.choices ||
      !aiResponse.choices[0] ||
      !aiResponse.choices[0].message
    ) {
      return { error: "Invalid response from AI service" };
    }

    let analysisResult;
    try {
      const content = aiResponse.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        analysisResult = JSON.parse(content);
      }
    } catch (parseError) {
      return { error: "Failed to parse AI analysis response" };
    }

    const finalResult = {
      candidateId: candidateId || null,
      jobRequisitionId: jobRequisitionId || null,
      matchScore: analysisResult.matchScore || 0,
      matchReasoning: analysisResult.matchReasoning || "No reasoning provided",
      strengths: analysisResult.strengths || [],
      concerns: analysisResult.concerns || [],
      interviewQuestions: analysisResult.interviewQuestions || [],
      skillsAlignment: analysisResult.skillsAlignment || {
        matching: [],
        missing: [],
        transferable: [],
      },
      recommendation:
        analysisResult.recommendation || "No recommendation provided",
      analyzedAt: new Date().toISOString(),
      candidateName: candidate.first_name + " " + candidate.last_name,
      jobTitle: jobReq.title,
    };

    if (candidateId && jobRequisitionId) {
      await sql`
        INSERT INTO search_results (search_id, candidate_id, ai_match_score, match_reasoning)
        VALUES (${jobRequisitionId}, ${candidateId}, ${finalResult.matchScore}, ${finalResult.matchReasoning})
        ON CONFLICT DO NOTHING
      `;
    }

    return finalResult;
  } catch (error) {
    return { error: `Analysis failed: ${error.message}` };
  }
}
export async function POST(request) {
  return handler(await request.json());
}