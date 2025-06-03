async function handler({ resume_url, source = "resume_upload" }) {
  if (!resume_url) {
    return { error: "Resume URL is required" };
  }

  try {
    // Step 1: Fetch the resume file
    console.log("Fetching resume from URL:", resume_url);
    const response = await fetch(resume_url);
    if (!response.ok) {
      console.error(
        "Failed to fetch resume:",
        response.status,
        response.statusText
      );
      return {
        error: `Failed to fetch resume file: ${response.status} ${response.statusText}`,
      };
    }

    // Step 2: Get resume content
    const resumeContent = await response.text();
    console.log("Resume content length:", resumeContent.length);

    if (!resumeContent || resumeContent.length < 50) {
      return { error: "Resume file appears to be empty or too short" };
    }

    // Step 3: Call AI for analysis
    console.log("Calling AI for resume analysis...");
    const aiResponse = await fetch(
      "/integrations/anthropic-claude-sonnet-3-5/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Please analyze this resume and extract structured candidate information. Return a JSON object with the following fields:

Resume content:
${resumeContent}

Extract and return:
- first_name (string)
- last_name (string) 
- email (string, if found)
- phone (string, if found)
- location (string, current location if found)
- current_title (string, most recent job title)
- current_company_name (string, most recent company)
- years_experience (number, total years of experience)
- education (string, education background summary)
- summary (string, professional summary or objective)
- linkedin_url (string, if found)
- portfolio_url (string, if found)
- skills (array of objects with name, category, proficiency_level, years_experience)
- work_experiences (array of objects with title, company_name, start_date, end_date, description, achievements)
- salary_expectation_min (number, if mentioned)
- salary_expectation_max (number, if mentioned)
- preferred_locations (array of strings, if mentioned)
- remote_preference (string: remote/hybrid/onsite, if mentioned)

For skills, categorize them appropriately (e.g., "Programming", "Design", "Management", etc.) and estimate proficiency levels and years of experience based on context.

For work experiences, extract start/end dates in YYYY-MM-DD format if possible, or YYYY-MM if only month/year available.

Return only valid JSON without any additional text or formatting.`,
            },
          ],
          json_schema: {
            name: "resume_analysis",
            schema: {
              type: "object",
              properties: {
                first_name: { type: "string" },
                last_name: { type: "string" },
                email: { type: ["string", "null"] },
                phone: { type: ["string", "null"] },
                location: { type: ["string", "null"] },
                current_title: { type: ["string", "null"] },
                current_company_name: { type: ["string", "null"] },
                years_experience: { type: ["number", "null"] },
                education: { type: ["string", "null"] },
                summary: { type: ["string", "null"] },
                linkedin_url: { type: ["string", "null"] },
                portfolio_url: { type: ["string", "null"] },
                skills: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      category: { type: ["string", "null"] },
                      proficiency_level: { type: "string" },
                      years_experience: { type: "number" },
                    },
                    required: [
                      "name",
                      "category",
                      "proficiency_level",
                      "years_experience",
                    ],
                    additionalProperties: false,
                  },
                },
                work_experiences: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      company_name: { type: "string" },
                      start_date: { type: ["string", "null"] },
                      end_date: { type: ["string", "null"] },
                      description: { type: ["string", "null"] },
                      achievements: { type: ["string", "null"] },
                    },
                    required: [
                      "title",
                      "company_name",
                      "start_date",
                      "end_date",
                      "description",
                      "achievements",
                    ],
                    additionalProperties: false,
                  },
                },
                salary_expectation_min: { type: ["number", "null"] },
                salary_expectation_max: { type: ["number", "null"] },
                preferred_locations: {
                  type: "array",
                  items: { type: "string" },
                },
                remote_preference: { type: ["string", "null"] },
              },
              required: [
                "first_name",
                "last_name",
                "email",
                "phone",
                "location",
                "current_title",
                "current_company_name",
                "years_experience",
                "education",
                "summary",
                "linkedin_url",
                "portfolio_url",
                "skills",
                "work_experiences",
                "salary_expectation_min",
                "salary_expectation_max",
                "preferred_locations",
                "remote_preference",
              ],
              additionalProperties: false,
            },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      console.error(
        "AI analysis failed:",
        aiResponse.status,
        aiResponse.statusText
      );
      const errorText = await aiResponse.text();
      console.error("AI error details:", errorText);
      return {
        error: `AI analysis failed: ${aiResponse.status} ${aiResponse.statusText}`,
      };
    }

    // Step 4: Parse AI response
    const aiResult = await aiResponse.json();
    console.log("AI response received:", JSON.stringify(aiResult, null, 2));

    if (
      !aiResult.choices ||
      !aiResult.choices[0] ||
      !aiResult.choices[0].message
    ) {
      console.error("Invalid AI response format:", aiResult);
      return { error: "Invalid AI response format" };
    }

    let candidateData;
    try {
      candidateData = JSON.parse(aiResult.choices[0].message.content);
      console.log(
        "Parsed candidate data:",
        JSON.stringify(candidateData, null, 2)
      );
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error(
        "AI response content:",
        aiResult.choices[0].message.content
      );
      return { error: "Failed to parse AI response: " + parseError.message };
    }

    if (!candidateData.first_name || !candidateData.last_name) {
      console.error("Missing required fields:", candidateData);
      return {
        error: "Could not extract required candidate information from resume",
      };
    }

    // Fix date formats for work experiences
    if (
      candidateData.work_experiences &&
      Array.isArray(candidateData.work_experiences)
    ) {
      candidateData.work_experiences = candidateData.work_experiences.map(
        (exp) => {
          // Fix start_date format
          if (exp.start_date && exp.start_date.match(/^\d{4}-\d{2}$/)) {
            exp.start_date = exp.start_date + "-01"; // Add day as 01
          }
          // Fix end_date format
          if (exp.end_date && exp.end_date.match(/^\d{4}-\d{2}$/)) {
            exp.end_date = exp.end_date + "-01"; // Add day as 01
          }
          // Handle "current" or null end dates
          if (
            !exp.end_date ||
            exp.end_date.toLowerCase() === "current" ||
            exp.end_date.toLowerCase() === "present"
          ) {
            exp.end_date = null;
          }
          return exp;
        }
      );
    }

    // Step 5: Create candidate
    console.log("Creating candidate with data:", candidateData);
    const createCandidateResponse = await fetch("/api/create-candidate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...candidateData,
        resume_url,
        source,
        availability: "open",
      }),
    });

    if (!createCandidateResponse.ok) {
      const errorText = await createCandidateResponse.text();
      console.error(
        "Failed to create candidate:",
        createCandidateResponse.status,
        errorText
      );
      return {
        error: `Failed to create candidate record: ${createCandidateResponse.status}`,
      };
    }

    const createResult = await createCandidateResponse.json();
    console.log("Candidate creation result:", createResult);

    if (createResult.error) {
      console.error("Candidate creation error:", createResult.error);
      return { error: createResult.error };
    }

    console.log("Resume processing completed successfully");
    return {
      success: true,
      message: "Resume processed and candidate created successfully",
      candidate: createResult.candidate,
      extracted_data: candidateData,
    };
  } catch (error) {
    console.error("Resume processing error:", error);
    return { error: "Resume processing failed: " + error.message };
  }
}
export async function POST(request) {
  return handler(await request.json());
}