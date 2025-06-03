"use client";
import React from "react";

import { useUpload } from "../utilities/runtime-helpers";

function MainComponent() {
  const [currentScreen, setCurrentScreen] = React.useState("dashboard");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedJob, setSelectedJob] = React.useState(null);
  const [selectedCandidate, setSelectedCandidate] = React.useState(null);
  const [notifications, setNotifications] = React.useState(3);
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [uploadedFiles, setUploadedFiles] = React.useState([]);
  const [processingResumes, setProcessingResumes] = React.useState(new Set());
  const [processedCandidates, setProcessedCandidates] = React.useState([]);

  const [jobRequisitions, setJobRequisitions] = React.useState([
    {
      id: 1,
      title: "Senior React Developer",
      department: "Engineering",
      candidates: 24,
      aiMatch: 92,
      status: "Active",
    },
    {
      id: 2,
      title: "Product Manager",
      department: "Product",
      candidates: 18,
      aiMatch: 87,
      status: "Active",
    },
    {
      id: 3,
      title: "UX Designer",
      department: "Design",
      candidates: 15,
      aiMatch: 84,
      status: "Draft",
    },
  ]);

  const [candidates, setCandidates] = React.useState([
    {
      id: 1,
      name: "Sarah Chen",
      title: "Senior Software Engineer",
      company: "TechCorp",
      location: "San Francisco, CA",
      experience: "6 years",
      education: "Stanford University",
      aiMatch: 95,
      avatar: "/api/placeholder/64/64",
      summary:
        "Experienced React developer with expertise in building scalable web applications.",
      skills: ["React", "TypeScript", "Node.js", "AWS", "GraphQL", "Python"],
    },
    {
      id: 2,
      name: "Marcus Johnson",
      title: "Full Stack Developer",
      company: "StartupXYZ",
      location: "Austin, TX",
      experience: "4 years",
      education: "UT Austin",
      aiMatch: 88,
      avatar: "/api/placeholder/64/64",
      summary:
        "Full-stack developer passionate about creating user-friendly applications.",
      skills: ["JavaScript", "React", "Node.js", "MongoDB", "Docker"],
    },
  ]);

  const [recentSearches, setRecentSearches] = React.useState([
    {
      query: "Senior React Developer in San Francisco",
      results: 47,
      timestamp: "2 hours ago",
    },
    {
      query: "Product Manager with AI experience",
      results: 23,
      timestamp: "1 day ago",
    },
    {
      query: "UX Designer remote",
      results: 31,
      timestamp: "3 days ago",
    },
  ]);

  const [metrics, setMetrics] = React.useState([
    {
      title: "New Candidates Today",
      value: "12",
      change: "+12%",
      icon: "fas fa-users",
    },
    {
      title: "Outreach Success Rate",
      value: "68%",
      change: "+5%",
      icon: "fas fa-chart-line",
    },
    {
      title: "Time Saved This Week",
      value: "24h",
      change: "+8h",
      icon: "fas fa-clock",
    },
    {
      title: "Active Talent Hotspots",
      value: "8",
      change: "+2",
      icon: "fas fa-map-marker-alt",
    },
  ]);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const [upcomingTasks, setUpcomingTasks] = React.useState([
    {
      task: "Interview with Sarah Chen",
      time: "Today, 2:00 PM",
      type: "interview",
    },
    {
      task: "Review Marcus Johnson's portfolio",
      time: "Tomorrow, 10:00 AM",
      type: "review",
    },
    {
      task: "Follow up with Emily Rodriguez",
      time: "Friday, 3:00 PM",
      type: "followup",
    },
  ]);

  const [showNewSearchModal, setShowNewSearchModal] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showNewCampaignModal, setShowNewCampaignModal] = React.useState(false);

  const [searchFilters, setSearchFilters] = React.useState({
    query: "",
    skills: [],
    experience_min: "",
    experience_max: "",
    salary_min: "",
    salary_max: "",
  });

  const [campaignForm, setCampaignForm] = React.useState({
    name: "",
    jobRequisitionId: "",
    subject: "",
    body: "",
  });

  const [notificationsList, setNotificationsList] = React.useState([
    {
      id: 1,
      type: "candidate_match",
      title: "New candidate match",
      message: "Sarah Chen is a 95% match for Senior React Developer",
      timestamp: "2 hours ago",
      read: false,
    },
    {
      id: 2,
      type: "outreach_reply",
      title: "Candidate replied",
      message: "Marcus Johnson replied to your outreach message",
      timestamp: "1 day ago",
      read: false,
    },
    {
      id: 3,
      type: "interview_reminder",
      title: "Interview reminder",
      message: "Interview with Emily Rodriguez in 30 minutes",
      timestamp: "2 days ago",
      read: true,
    },
  ]);

  const buildSearchDescription = (filters) => {
    const parts = [];
    if (filters.query) parts.push(filters.query);
    if (filters.skills.length > 0)
      parts.push(`Skills: ${filters.skills.join(", ")}`);
    if (filters.experience_min || filters.experience_max) {
      const exp = `${filters.experience_min || "0"}-${
        filters.experience_max || "20+"
      } years`;
      parts.push(`Experience: ${exp}`);
    }
    if (filters.salary_min || filters.salary_max) {
      const sal = `${filters.salary_min || "0"}k-${
        filters.salary_max || "200+"
      }k`;
      parts.push(`Salary: ${sal}`);
    }
    return parts.length > 0 ? parts.join(" • ") : "Advanced Search";
  };

  const handleRerunSearch = (searchQuery) => {
    setSearchQuery(searchQuery);
    handleSearch();
  };

  const renderNewSearchModal = () => {
    if (!showNewSearchModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Advanced Search</h2>
            <button
              onClick={() => setShowNewSearchModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Query
              </label>
              <input
                type="text"
                placeholder="e.g. Senior React Developer"
                value={searchFilters.query}
                onChange={(e) =>
                  setSearchFilters((prev) => ({
                    ...prev,
                    query: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Experience (years)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={searchFilters.experience_min}
                  onChange={(e) =>
                    setSearchFilters((prev) => ({
                      ...prev,
                      experience_min: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Experience (years)
                </label>
                <input
                  type="number"
                  placeholder="20"
                  value={searchFilters.experience_max}
                  onChange={(e) =>
                    setSearchFilters((prev) => ({
                      ...prev,
                      experience_max: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Salary (k)
                </label>
                <input
                  type="number"
                  placeholder="50"
                  value={searchFilters.salary_min}
                  onChange={(e) =>
                    setSearchFilters((prev) => ({
                      ...prev,
                      salary_min: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Salary (k)
                </label>
                <input
                  type="number"
                  placeholder="200"
                  value={searchFilters.salary_max}
                  onChange={(e) =>
                    setSearchFilters((prev) => ({
                      ...prev,
                      salary_max: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skills (comma separated)
              </label>
              <input
                type="text"
                placeholder="React, JavaScript, Node.js"
                value={searchFilters.skills.join(", ")}
                onChange={(e) =>
                  setSearchFilters((prev) => ({
                    ...prev,
                    skills: e.target.value
                      .split(",")
                      .map((skill) => skill.trim())
                      .filter((skill) => skill.length > 0),
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => setShowNewSearchModal(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdvancedSearch}
              disabled={loading}
              className="px-6 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Searching..." : "Search Candidates"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleCreateCampaign = async () => {
    if (!campaignForm.name || !campaignForm.subject || !campaignForm.body) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      console.log("Creating campaign:", campaignForm);
      alert("Campaign created successfully!");
      setShowNewCampaignModal(false);
      setCampaignForm({
        name: "",
        jobRequisitionId: "",
        subject: "",
        body: "",
      });
    } catch (err) {
      console.error("Error creating campaign:", err);
      alert("Failed to create campaign");
    } finally {
      setLoading(false);
    }
  };

  const renderNewCampaignModal = () => {
    if (!showNewCampaignModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Create New Campaign
            </h2>
            <button
              onClick={() => setShowNewCampaignModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Senior Developer Outreach Q1"
                value={campaignForm.name}
                onChange={(e) =>
                  setCampaignForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Requisition (Optional)
              </label>
              <select
                value={campaignForm.jobRequisitionId}
                onChange={(e) =>
                  setCampaignForm((prev) => ({
                    ...prev,
                    jobRequisitionId: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">Select a job requisition</option>
                {jobRequisitions.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} - {job.department}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Subject *
              </label>
              <input
                type="text"
                placeholder="e.g. Exciting opportunity at [Company Name]"
                value={campaignForm.subject}
                onChange={(e) =>
                  setCampaignForm((prev) => ({
                    ...prev,
                    subject: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Body *
              </label>
              <textarea
                rows={8}
                placeholder="Hi [Candidate Name],

I hope this message finds you well. I came across your profile and was impressed by your experience in [relevant skills].

We have an exciting opportunity for a [Job Title] position at [Company Name] that I think would be a great fit for your background.

Would you be interested in learning more about this role?

Best regards,
[Your Name]"
                value={campaignForm.body}
                onChange={(e) =>
                  setCampaignForm((prev) => ({ ...prev, body: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use placeholders like [Candidate Name], [Job Title], [Company
                Name] for personalization
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => setShowNewCampaignModal(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateCampaign}
              disabled={loading}
              className="px-6 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Campaign"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  React.useEffect(() => {
    loadDashboardData();
  }, []);

  React.useEffect(() => {
    if (currentScreen === "candidates") {
      loadCandidatesData();
    }
  }, [currentScreen]);

  React.useEffect(() => {
    if (processedCandidates.length > 0) {
      loadCandidatesData();
    }
  }, [processedCandidates]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const jobsResponse = await fetch("/api/job-requisitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 10 }),
      });

      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json();
        setJobRequisitions(
          jobsData?.requisitions || jobsData || jobRequisitions
        );
      }

      const analyticsResponse = await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "dashboard" }),
      });

      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setMetrics([
          {
            title: "New Candidates Today",
            value: analyticsData?.newCandidates?.toString() || "12",
            change: "+12%",
            icon: "fas fa-users",
          },
          {
            title: "Outreach Success Rate",
            value: `${analyticsData?.outreachSuccess?.openRate || 68}%`,
            change: "+5%",
            icon: "fas fa-chart-line",
          },
          {
            title: "Time Saved This Week",
            value: `${analyticsData?.timeSaved?.estimatedHoursSaved || 24}h`,
            change: "+8h",
            icon: "fas fa-clock",
          },
          {
            title: "Active Talent Hotspots",
            value: analyticsData?.talentHotspots?.length?.toString() || "8",
            change: "+2",
            icon: "fas fa-map-marker-alt",
          },
        ]);
      }

      const candidatesResponse = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 10 }),
      });

      if (candidatesResponse.ok) {
        const candidatesData = await candidatesResponse.json();
        const processedCandidates = (
          candidatesData?.candidates ||
          candidatesData ||
          []
        ).map((candidate) => ({
          ...candidate,
          avatar:
            candidate.avatar_url && candidate.avatar_url.startsWith("http")
              ? candidate.avatar_url
              : "/api/placeholder/64/64",
          aiMatch:
            candidate.ai_match_score || Math.floor(Math.random() * 20) + 75,
          name: `${candidate.first_name || ""} ${
            candidate.last_name || ""
          }`.trim(),
          title: candidate.current_title || "Software Engineer",
          company:
            candidate.current_company_name ||
            candidate.company ||
            "Tech Company",
          experience: candidate.years_experience
            ? `${candidate.years_experience} years`
            : "5+ years",
          summary:
            candidate.summary ||
            "Experienced professional with strong technical background.",
          skills: candidate.skills || [
            "JavaScript",
            "React",
            "Node.js",
            "Python",
            "AWS",
          ],
        }));

        setCandidates(processedCandidates);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const loadCandidatesData = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("Loading candidates data...");

      const candidatesResponse = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 100 }),
      });

      console.log("Candidates response status:", candidatesResponse.status);

      if (!candidatesResponse.ok) {
        throw new Error(
          `Failed to fetch candidates: ${candidatesResponse.status} ${candidatesResponse.statusText}`
        );
      }

      const candidatesData = await candidatesResponse.json();
      console.log("Raw candidates data:", candidatesData);

      const candidatesList = candidatesData.candidates || candidatesData || [];
      console.log("Candidates list:", candidatesList);

      const processedCandidates = candidatesList.map((candidate) => ({
        ...candidate,
        avatar:
          candidate.avatar_url && candidate.avatar_url.startsWith("http")
            ? candidate.avatar_url
            : "/api/placeholder/64/64",
        aiMatch:
          candidate.ai_match_score || Math.floor(Math.random() * 20) + 75,
        name:
          `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim() ||
          "Unknown Name",
        title: candidate.current_title || "Software Engineer",
        company:
          candidate.current_company_name || candidate.company || "Tech Company",
        location: candidate.location || "Remote",
        experience: candidate.years_experience
          ? `${candidate.years_experience} years`
          : "5+ years",
        education: candidate.education || "University Graduate",
        summary:
          candidate.summary ||
          "Experienced professional with strong technical background.",
        skills: Array.isArray(candidate.skills)
          ? candidate.skills.map((s) => (typeof s === "object" ? s.name : s))
          : ["JavaScript", "React", "Node.js", "Python", "AWS"],
      }));

      console.log("Processed candidates:", processedCandidates);
      setCandidates(processedCandidates);
      console.log(
        `Successfully loaded ${processedCandidates.length} candidates from database`
      );

      if (processedCandidates.length === 0) {
        console.log("No candidates found - database might be empty");
        setError("No candidates found in the database");
      }
    } catch (err) {
      console.error("Error loading candidates:", err);
      setError("Failed to load candidates: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/search-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (response.ok) {
        const searchData = await response.json();
        setCandidates(searchData?.candidates || []);
        setCurrentScreen("candidates");
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAdvancedSearch = async () => {
    setLoading(true);
    setError(null);

    try {
      const searchParams = {
        ...searchFilters,
        skills:
          searchFilters.skills.length > 0 ? searchFilters.skills : undefined,
        experience_min: searchFilters.experience_min
          ? parseInt(searchFilters.experience_min)
          : undefined,
        experience_max: searchFilters.experience_max
          ? parseInt(searchFilters.experience_max)
          : undefined,
        salary_min: searchFilters.salary_min
          ? parseInt(searchFilters.salary_min)
          : undefined,
        salary_max: searchFilters.salary_max
          ? parseInt(searchFilters.salary_max)
          : undefined,
        search: searchFilters.query || undefined,
      };

      Object.keys(searchParams).forEach((key) => {
        if (searchParams[key] === "" || searchParams[key] === undefined) {
          delete searchParams[key];
        }
      });

      console.log("Advanced search params:", searchParams);

      const response = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchParams),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const searchData = await response.json();
      console.log("Advanced search response:", searchData);

      let candidatesList = [];

      if (searchData && searchData.candidates) {
        candidatesList = searchData.candidates;
      } else if (Array.isArray(searchData)) {
        candidatesList = searchData;
      } else if (searchData === null || searchData === undefined) {
        console.log(
          "Advanced search returned null/undefined - using empty array"
        );
        candidatesList = [];
      } else {
        console.log("Unexpected advanced search data format:", searchData);
        candidatesList = [];
      }

      const processedCandidates = candidatesList.map((candidate) => ({
        ...candidate,
        avatar:
          candidate.avatar_url && candidate.avatar_url.startsWith("http")
            ? candidate.avatar_url
            : "/api/placeholder/64/64",
        aiMatch:
          candidate.ai_match_score || Math.floor(Math.random() * 20) + 75,
        name:
          `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim() ||
          "Unknown Name",
        title: candidate.current_title || "Software Engineer",
        company:
          candidate.current_company_name || candidate.company || "Tech Company",
        location: candidate.location || "Remote",
        experience: candidate.years_experience
          ? `${candidate.years_experience} years`
          : "5+ years",
        education: candidate.education || "University Graduate",
        summary:
          candidate.summary ||
          "Experienced professional with strong technical background.",
        skills: Array.isArray(candidate.skills)
          ? candidate.skills.map((s) => s.name || s)
          : ["JavaScript", "React", "Node.js", "Python", "AWS"],
      }));

      setCandidates(processedCandidates);
      setCurrentScreen("candidates");
      setShowNewSearchModal(false);

      const searchDescription = buildSearchDescription(searchFilters);
      setRecentSearches((prev) => [
        {
          query: searchDescription,
          results: processedCandidates.length,
          timestamp: "Just now",
        },
        ...prev.slice(0, 4),
      ]);

      console.log(
        `Advanced search completed: ${processedCandidates.length} candidates found`
      );
    } catch (err) {
      console.error("Advanced search error:", err);
      setError("Advanced search failed: " + err.message);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  const [upload, { loading: uploadLoading }] = useUpload();

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);

    if (files.length === 0) {
      console.log("No files selected");
      return;
    }

    for (const file of files) {
      const fileInfo = {
        name: file.name,
        size: file.size,
        status: "uploading",
        id: Date.now() + Math.random(),
      };

      setUploadedFiles((prev) => [...prev, fileInfo]);

      try {
        console.log("Starting upload for file:", file.name);

        const { url, error: uploadError } = await upload({ file });

        if (uploadError) {
          console.error("Upload failed:", uploadError);
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === fileInfo.id
                ? { ...f, status: "upload_failed", error: uploadError }
                : f
            )
          );
          continue;
        }

        if (!url) {
          console.error("Upload succeeded but no URL returned");
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === fileInfo.id
                ? {
                    ...f,
                    status: "upload_failed",
                    error: "No URL returned from upload",
                  }
                : f
            )
          );
          continue;
        }

        console.log("File uploaded successfully, URL:", url);

        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === fileInfo.id ? { ...f, status: "processing", url } : f
          )
        );

        setProcessingResumes((prev) => new Set([...prev, fileInfo.id]));

        console.log("Starting resume processing...");
        const processResponse = await fetch("/api/process-resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume_url: url }),
        });

        console.log("Process response status:", processResponse.status);

        if (!processResponse.ok) {
          const errorText = await processResponse.text();
          console.error("Process response error:", errorText);
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === fileInfo.id
                ? {
                    ...f,
                    status: "processing_failed",
                    error: `Server error: ${processResponse.status} - ${errorText}`,
                  }
                : f
            )
          );
          continue;
        }

        const processResult = await processResponse.json();
        console.log("Process result:", processResult);

        if (processResult.success && processResult.candidate) {
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === fileInfo.id
                ? {
                    ...f,
                    status: "completed",
                    candidate: processResult.candidate,
                  }
                : f
            )
          );

          setProcessedCandidates((prev) => [...prev, processResult.candidate]);
          loadDashboardData();
        } else {
          console.error(
            "Processing failed:",
            processResult.error || "Unknown error"
          );
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === fileInfo.id
                ? {
                    ...f,
                    status: "processing_failed",
                    error:
                      processResult.error ||
                      "Processing failed - no error details",
                  }
                : f
            )
          );
        }
      } catch (err) {
        console.error("Resume processing error:", err);
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === fileInfo.id
              ? {
                  ...f,
                  status: "processing_failed",
                  error: "Network error: " + err.message,
                }
              : f
          )
        );
      } finally {
        setProcessingResumes((prev) => {
          const newSet = new Set(prev);
          newSet.delete(fileInfo.id);
          return newSet;
        });
      }
    }
  };

  const renderNavigation = () => (
    <nav className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <i className="fas fa-brain text-white text-sm"></i>
            </div>
            <span className="text-xl font-bold text-gray-900">HireAI</span>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            <button
              onClick={() => setCurrentScreen("dashboard")}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                currentScreen === "dashboard"
                  ? "text-teal-600 bg-teal-50"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentScreen("jobs")}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                currentScreen === "jobs"
                  ? "text-teal-600 bg-teal-50"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Job Requisitions
            </button>
            <button
              onClick={() => setCurrentScreen("candidates")}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                currentScreen === "candidates"
                  ? "text-teal-600 bg-teal-50"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Candidates
            </button>
            <button
              onClick={() => setCurrentScreen("insights")}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                currentScreen === "insights"
                  ? "text-teal-600 bg-teal-50"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Insights
            </button>
            <button
              onClick={() => setCurrentScreen("outreach")}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                currentScreen === "outreach"
                  ? "text-teal-600 bg-teal-50"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Outreach History
            </button>
            <button
              onClick={() => setCurrentScreen("settings")}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                currentScreen === "settings"
                  ? "text-teal-600 bg-teal-50"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Settings
            </button>
          </div>
        </div>

        <div className="flex-1 max-w-lg mx-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search with PeopleGPT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button className="relative p-2 text-gray-600 hover:text-gray-900">
            <i className="fas fa-bell text-lg"></i>
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {notifications}
              </span>
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100"
            >
              <img
                src="/api/placeholder/32/32"
                alt="User avatar"
                className="w-8 h-8 rounded-full"
              />
              <i className="fas fa-chevron-down text-gray-400 text-sm"></i>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <a
                  href="#"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Profile
                </a>
                <a
                  href="#"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Account Settings
                </a>
                <hr className="my-2" />
                <a
                  href="#"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Sign Out
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );

  const renderDashboard = () => (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="bg-gradient-to-r from-teal-600 to-blue-600 rounded-xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome back, Alex!</h1>
        <p className="text-teal-100 mb-6">
          Find your next great hire with AI-powered talent matching
        </p>

        <div className="max-w-2xl">
          <div className="relative">
            <input
              type="text"
              placeholder="Try: 'Senior React developer in San Francisco with 5+ years experience'"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              className="w-full pl-12 pr-4 py-4 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-white focus:ring-opacity-50"
            />
            <i className="fas fa-brain absolute left-4 top-5 text-teal-600 text-lg"></i>
            <button
              onClick={handleSearch}
              className="absolute right-2 top-2 bg-teal-600 text-white px-6 py-2 rounded-md hover:bg-teal-700 transition-colors"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{metric.title}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metric.value}
                </p>
                <p className="text-sm text-green-600">{metric.change}</p>
              </div>
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                <i className={`${metric.icon} text-teal-600 text-lg`}></i>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Active Job Requisitions
              </h2>
              <button
                onClick={() => setCurrentScreen("jobs")}
                className="text-teal-600 hover:text-teal-700 text-sm font-medium"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              {jobRequisitions.slice(0, 3).map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{job.title}</h3>
                    <p className="text-sm text-gray-600">
                      {job.department} • {job.candidates} candidates
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-sm font-medium text-teal-600">
                        {job.aiMatch}% AI Match
                      </div>
                      <div
                        className={`text-xs px-2 py-1 rounded-full ${
                          job.status === "Active"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {job.status}
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Searches
            </h2>

            <div className="space-y-3">
              {recentSearches.map((search, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{search.query}</p>
                    <p className="text-sm text-gray-600">
                      {search.results} results • {search.timestamp}
                    </p>
                  </div>
                  <button className="text-teal-600 hover:text-teal-700 text-sm font-medium">
                    Re-run
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Upcoming Tasks
            </h2>

            <div className="space-y-3">
              {upcomingTasks.map((task, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      task.type === "interview"
                        ? "bg-blue-500"
                        : task.type === "review"
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                  ></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {task.task}
                    </p>
                    <p className="text-xs text-gray-600">{task.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Upload
            </h2>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-teal-400 transition-colors">
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
                id="resume-upload"
              />
              <label htmlFor="resume-upload" className="cursor-pointer">
                <i className="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-2"></i>
                <p className="text-sm text-gray-600 mb-3">
                  Drop resumes here or click to upload
                </p>
              </label>

              <button
                onClick={() => document.getElementById("resume-upload").click()}
                className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
              >
                <i className="fas fa-upload mr-2"></i>
                Choose Resume Files
              </button>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-3">
                <h3 className="text-sm font-medium text-gray-900">
                  Upload Status:
                </h3>
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700">
                          {file.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({Math.round(file.size / 1024)}KB)
                        </span>
                      </div>
                      {file.error && (
                        <p className="text-xs text-red-600 mt-1">
                          {file.error}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {file.status === "uploading" && (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-xs text-teal-600">
                            Uploading...
                          </span>
                        </div>
                      )}
                      {file.status === "processing" && (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-xs text-blue-600">
                            Processing...
                          </span>
                        </div>
                      )}
                      {file.status === "completed" && (
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-check-circle text-green-600"></i>
                          <span className="text-xs text-green-600">
                            Complete
                          </span>
                        </div>
                      )}
                      {(file.status === "upload_failed" ||
                        file.status === "processing_failed") && (
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-exclamation-circle text-red-600"></i>
                          <span className="text-xs text-red-600">Failed</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderJobRequisitions = () => (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Job Requisitions</h1>
        <button className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors">
          <i className="fas fa-plus mr-2"></i>
          New Requisition
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Search requisitions..."
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                <option>All Departments</option>
                <option>Engineering</option>
                <option>Product</option>
                <option>Design</option>
                <option>Analytics</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                <i className="fas fa-filter mr-2"></i>
                Filters
              </button>
              <button className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                <i className="fas fa-download mr-2"></i>
                Export
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  AI Match
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobRequisitions.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{job.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {job.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {job.candidates}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-teal-600">
                        {job.aiMatch}%
                      </div>
                      <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-teal-600 h-2 rounded-full"
                          style={{ width: `${job.aiMatch}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        job.status === "Active"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => {
                        setSelectedJob(job);
                        setCurrentScreen("candidates");
                      }}
                      className="text-teal-600 hover:text-teal-700 mr-3"
                    >
                      View Candidates
                    </button>
                    <button className="text-gray-400 hover:text-gray-600">
                      <i className="fas fa-ellipsis-h"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCandidates = () => (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {selectedJob
            ? `Candidates for ${selectedJob.title}`
            : "All Candidates"}
        </h1>
        <div className="flex items-center space-x-3">
          {selectedJob && (
            <button
              onClick={() => setSelectedJob(null)}
              className="text-gray-600 hover:text-gray-800"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Back to All Jobs
            </button>
          )}
          <button
            onClick={() => setShowNewSearchModal(true)}
            className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
          >
            <i className="fas fa-search mr-2"></i>
            New Search
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-1/4">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 space-y-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Filters</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Experience Level
                  </label>
                  <div className="space-y-2">
                    {[
                      "Entry Level",
                      "Mid Level",
                      "Senior Level",
                      "Executive",
                    ].map((level) => (
                      <label key={level} className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="ml-2 text-sm text-gray-600">
                          {level}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="City, State"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Skills
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. React, Python"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI Match Score
                  </label>
                  <div className="space-y-2">
                    {["90%+", "80-89%", "70-79%", "60-69%"].map((range) => (
                      <label key={range} className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="ml-2 text-sm text-gray-600">
                          {range}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:w-3/4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    {candidates.length} candidates found
                  </span>
                  <select className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainComponent;