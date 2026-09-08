"""
AI Engine 3 — Remediation Recommendation Service (LLM-based, RAG-retrieved context)
Port: 8004
POST /recommend-remediation
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from llm import chat_completion, extract_json_object

load_dotenv()

app = FastAPI(title="Remediation Recommendation Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QuizAttemptInput(BaseModel):
    score: float
    weakTopics: list[str]


class CandidateCourse(BaseModel):
    id: str
    title: str
    skillTags: list[str]


class RetrievedContext(BaseModel):
    topic: str
    chunks: list[str] = []


class RecommendRemediationRequest(BaseModel):
    userId: str
    quizAttempt: QuizAttemptInput
    candidateCourses: list[CandidateCourse]
    retrievedContext: list[RetrievedContext] = []


class RemediationModule(BaseModel):
    courseId: str
    topic: str
    priority: str
    reason: str


class RecommendRemediationResponse(BaseModel):
    modulesToRedo: list[RemediationModule]


def heuristic_remediation(req: RecommendRemediationRequest) -> list[RemediationModule]:
    """Deterministic fallback when free LLM fails."""
    weak = [t.lower() for t in req.quizAttempt.weakTopics] or ["general review"]
    modules: list[RemediationModule] = []

    for course in req.candidateCourses:
        tags = [t.lower() for t in course.skillTags]
        hits = [w for w in weak if any(w in t or t in w for t in tags) or w in course.title.lower()]
        if not hits and req.quizAttempt.score >= 70:
            continue
        priority = "high" if hits else ("medium" if req.quizAttempt.score < 60 else "low")
        topic = hits[0] if hits else (req.quizAttempt.weakTopics[0] if req.quizAttempt.weakTopics else "general review")
        modules.append(
            RemediationModule(
                courseId=course.id,
                topic=topic,
                priority=priority,
                reason=(
                    f"Addresses weak topic '{topic}' via course tags/title"
                    if hits
                    else f"Supportive review after score {req.quizAttempt.score}"
                )
                + " (heuristic fallback)",
            )
        )

    priority_rank = {"high": 0, "medium": 1, "low": 2}
    modules.sort(key=lambda m: priority_rank.get(m.priority, 9))
    return modules[:5]


@app.get("/health")
async def health():
    return {"status": "ok", "service": "remediation-engine"}


@app.post("/recommend-remediation", response_model=RecommendRemediationResponse)
async def recommend_remediation(req: RecommendRemediationRequest):
    if not req.candidateCourses:
        raise HTTPException(status_code=400, detail="candidateCourses must not be empty")

    weak_topics_text = (
        ", ".join(req.quizAttempt.weakTopics) if req.quizAttempt.weakTopics else "general review needed"
    )

    courses_text = "\n".join(
        f"[{c.id}] {c.title} — Tags: {', '.join(c.skillTags)}"
        for c in req.candidateCourses[:20]
    )

    context_blocks = []
    for ctx in req.retrievedContext:
        snippets = "\n".join(f"  • {c[:400]}" for c in ctx.chunks[:3])
        context_blocks.append(f"Topic: {ctx.topic}\n{snippets}")
    context_section = "\n\n".join(context_blocks) if context_blocks else "(no retrieved course material context)"

    system_prompt = """You are a personalized learning advisor for India's Official Statistical System.
Based on a learner's quiz performance, weak topics, candidate courses, and retrieved course-material context,
recommend specific courses/modules to redo. Prioritize by weakness severity and topic relevance.
Respond ONLY with valid JSON — no markdown, no commentary."""

    user_prompt = f"""Learner Quiz Performance:
- Score: {req.quizAttempt.score}/100
- Weak Topics: {weak_topics_text}

Candidate Courses (RAG-retrieved):
{courses_text}

Retrieved Course Material Context (RAG):
{context_section}

Create a prioritized remediation plan. Return JSON:
{{
  "modulesToRedo": [
    {{
      "courseId": "string (ID from list above)",
      "topic": "specific topic within the course",
      "priority": "high|medium|low",
      "reason": "why this module addresses the weak area"
    }}
  ]
}}

- Assign "high" priority to topics directly matching weak areas
- Include at most 5 modules
- Order by priority (high first)
"""

    try:
        raw = chat_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=2048,
            json_mode=True,
        )
        result = extract_json_object(raw)
        modules_raw = result.get("modulesToRedo", [])
        valid_ids = {c.id for c in req.candidateCourses}

        modules = [
            RemediationModule(
                courseId=m["courseId"],
                topic=m.get("topic", ""),
                priority=m.get("priority", "medium"),
                reason=m.get("reason", ""),
            )
            for m in modules_raw
            if m.get("courseId") in valid_ids
        ]

        if not modules:
            print("[recommend-remediation] LLM returned no valid modules — using heuristic fallback")
            modules = heuristic_remediation(req)

        return RecommendRemediationResponse(modulesToRedo=modules)

    except Exception as e:
        print(f"[recommend-remediation] LLM failed ({e}) — using heuristic fallback")
        return RecommendRemediationResponse(modulesToRedo=heuristic_remediation(req))
