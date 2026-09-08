"""
Course Recommendation Service (LLM-ranked, with heuristic fallback)
Port: 8002
POST /recommend-courses
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from llm import chat_completion, extract_json_object

load_dotenv()

app = FastAPI(title="Course Recommendation Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DomainGap(BaseModel):
    domain: str
    skillName: str
    gap: float


class CandidateCourse(BaseModel):
    id: str
    title: str
    description: str
    domain: str
    skillTags: list[str]


class RecommendCoursesRequest(BaseModel):
    userId: str
    domainGaps: list[DomainGap]
    candidateCourses: list[CandidateCourse]
    learningHistory: list[str] = []


class CourseRecommendation(BaseModel):
    courseId: str
    score: float
    reason: str


class RecommendCoursesResponse(BaseModel):
    recommendations: list[CourseRecommendation]


def heuristic_rank(req: RecommendCoursesRequest) -> list[CourseRecommendation]:
    """Deterministic fallback when the free LLM returns bad/empty JSON."""
    history = set(req.learningHistory)
    gap_skills = {g.skillName.lower() for g in req.domainGaps}
    gap_domains = {g.domain for g in req.domainGaps}
    max_gap = max((g.gap for g in req.domainGaps), default=50) or 50

    scored: list[CourseRecommendation] = []
    for c in req.candidateCourses:
        if c.id in history:
            continue
        tag_hits = sum(1 for t in c.skillTags if t.lower() in gap_skills)
        domain_hit = 1 if c.domain in gap_domains else 0
        score = min(1.0, 0.35 + 0.2 * tag_hits + 0.25 * domain_hit + 0.2 * (max_gap / 100))
        reason_bits = []
        if tag_hits:
            reason_bits.append(f"matches {tag_hits} skill gap tag(s)")
        if domain_hit:
            reason_bits.append(f"aligned with {c.domain.replace('_', ' ').title()} domain gaps")
        if not reason_bits:
            reason_bits.append("general professional development pick from retrieved candidates")
        scored.append(
            CourseRecommendation(
                courseId=c.id,
                score=round(score, 2),
                reason="; ".join(reason_bits) + " (heuristic fallback)",
            )
        )

    scored.sort(key=lambda r: r.score, reverse=True)
    return scored[:10]


@app.get("/health")
async def health():
    return {"status": "ok", "service": "recommendation-engine"}


@app.post("/recommend-courses", response_model=RecommendCoursesResponse)
async def recommend_courses(req: RecommendCoursesRequest):
    if not req.candidateCourses:
        raise HTTPException(status_code=400, detail="candidateCourses must not be empty")

    if req.domainGaps:
        gaps_text = "\n".join(
            f"- Domain: {g.domain}, Skill: {g.skillName}, Gap: {g.gap}/100 points"
            for g in req.domainGaps
        )
    else:
        gaps_text = "- No specific gaps — recommend general professional development courses."

    courses_text = "\n".join(
        f"[{c.id}] {c.title} (Domain: {c.domain}, Tags: {', '.join(c.skillTags)})\n  {c.description[:200]}"
        for c in req.candidateCourses[:30]
    )

    already_enrolled = ", ".join(req.learningHistory) if req.learningHistory else "None"

    system_prompt = """You are an expert learning advisor for India's Official Statistical System.
Given a learner's skill gaps and a catalogue of courses, select and rank the most relevant courses.
Prefer courses that directly address the largest gaps. Exclude courses the learner has already completed.
Respond ONLY with valid JSON — no markdown, no commentary."""

    user_prompt = f"""Learner Skill Gaps:
{gaps_text}

Already Enrolled/Completed Course IDs: {already_enrolled}

Available Courses:
{courses_text}

Return a JSON object:
{{
  "recommendations": [
    {{
      "courseId": "string (the course ID in brackets above)",
      "score": number (0.0 to 1.0 relevance score),
      "reason": "1-2 sentence explanation of why this course addresses the gap"
    }}
  ]
}}

Return at most 10 recommendations, ordered by score descending. Only include courses from the list above.
"""

    try:
        raw = chat_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
            max_tokens=2048,
            json_mode=True,
        )
        result = extract_json_object(raw)
        recs_raw = result.get("recommendations", [])
        valid_ids = {c.id for c in req.candidateCourses}

        recommendations = [
            CourseRecommendation(
                courseId=r["courseId"],
                score=float(r.get("score", 0.5)),
                reason=r.get("reason", ""),
            )
            for r in recs_raw
            if r.get("courseId") in valid_ids
        ]

        if not recommendations:
            print("[recommend-courses] LLM returned no valid IDs — using heuristic fallback")
            recommendations = heuristic_rank(req)

        return RecommendCoursesResponse(recommendations=recommendations)

    except Exception as e:
        print(f"[recommend-courses] LLM failed ({e}) — using heuristic fallback")
        return RecommendCoursesResponse(recommendations=heuristic_rank(req))
