"""
AI Engine 2 — Assessment & Feedback Service
Port: 8003

Supports full extractedText OR RAG-retrieved chunks for large documents.
"""

import os
import json
from typing import Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from llm import chat_completion, extract_json_object

load_dotenv()

app = FastAPI(title="Assessment & Feedback Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def resolve_source_text(extracted_text: str | None, retrieved_chunks: list[str]) -> str:
    if extracted_text and extracted_text.strip():
        return extracted_text.strip()
    if retrieved_chunks:
        return "\n\n".join(c for c in retrieved_chunks if c and c.strip())
    return ""


class GenerateMcqsRequest(BaseModel):
    extractedText: str | None = None
    retrievedChunks: list[str] = []
    numQuestions: int = 10


class MCQQuestion(BaseModel):
    questionText: str
    options: list[str]
    correctOptionIndex: int
    explanation: str


class GenerateMcqsResponse(BaseModel):
    questions: list[MCQQuestion]


class GenerateNotesRequest(BaseModel):
    extractedText: str | None = None
    retrievedChunks: list[str] = []


class GenerateNotesResponse(BaseModel):
    notes: str


class CourseOutcomeAnalyticsRequest(BaseModel):
    courseId: str
    attempts: list[dict] = []


class CourseOutcomeAnalyticsResponse(BaseModel):
    totalAttempts: int
    passRate: float
    avgScore: float
    avgCompletionTimeSec: float | None


class ModifyQuizRequest(BaseModel):
    extractedText: str | None = None
    retrievedChunks: list[str] = []
    previousQuestions: list[str]
    weakTopics: list[str]


class ModifyQuizResponse(BaseModel):
    questions: list[MCQQuestion]


@app.get("/health")
async def health():
    return {"status": "ok", "service": "assessment-engine"}


def fallback_mcqs(source: str, num: int) -> list[MCQQuestion]:
    """Simple deterministic MCQs when the free LLM fails."""
    sentences = [s.strip() for s in source.replace("\n", " ").split(".") if len(s.strip()) > 40]
    if not sentences:
        sentences = [source[:200]]
    questions: list[MCQQuestion] = []
    for i, sentence in enumerate(sentences[:num]):
        snippet = sentence[:120]
        questions.append(
            MCQQuestion(
                questionText=f"Based on the material, which statement is most accurate?",
                options=[
                    f"A) {snippet}",
                    "B) The material does not discuss this topic at all",
                    "C) This concept is unrelated to official statistics",
                    "D) The text recommends ignoring this idea",
                ],
                correctOptionIndex=0,
                explanation=f"The source text supports option A: {snippet} (heuristic fallback)",
            )
        )
    while len(questions) < num:
        questions.append(
            MCQQuestion(
                questionText="What should a learner do after studying this material?",
                options=[
                    "A) Review key concepts and practice applying them",
                    "B) Discard the material immediately",
                    "C) Avoid all related courses",
                    "D) Skip assessments entirely",
                ],
                correctOptionIndex=0,
                explanation="Review and practice reinforce learning (heuristic fallback)",
            )
        )
    return questions[:num]


@app.post("/generate-mcqs", response_model=GenerateMcqsResponse)
async def generate_mcqs(req: GenerateMcqsRequest):
    source = resolve_source_text(req.extractedText, req.retrievedChunks)
    if not source:
        raise HTTPException(status_code=400, detail="extractedText or retrievedChunks required")

    num = min(req.numQuestions, 20)

    system_prompt = """You are an expert educational assessment designer.
Create high-quality multiple-choice questions from the provided text.
Each question should test comprehension, not just recall.
Respond ONLY with valid JSON — no markdown fences."""

    user_prompt = f"""Generate exactly {num} multiple-choice questions from this text:

---
{source[:6000]}
---

Return a JSON object:
{{
  "questions": [
    {{
      "questionText": "string",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctOptionIndex": 0,
      "explanation": "Why this answer is correct"
    }}
  ]
}}

Rules:
- correctOptionIndex is 0-based (0=A, 1=B, 2=C, 3=D)
- Each question must have exactly 4 options
- Explanation must reference the source text
"""

    try:
        raw = chat_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.4,
            max_tokens=4096,
            json_mode=True,
        )
        result = extract_json_object(raw)
        questions_raw = result.get("questions", [])

        questions = [
            MCQQuestion(
                questionText=q["questionText"],
                options=q["options"],
                correctOptionIndex=int(q["correctOptionIndex"]),
                explanation=q.get("explanation", ""),
            )
            for q in questions_raw
            if q.get("questionText") and len(q.get("options", [])) == 4
        ]

        if not questions:
            print("[generate-mcqs] LLM returned no valid questions — using fallback")
            questions = fallback_mcqs(source, num)

        return GenerateMcqsResponse(questions=questions)

    except Exception as e:
        print(f"[generate-mcqs] LLM failed ({e}) — using fallback")
        return GenerateMcqsResponse(questions=fallback_mcqs(source, num))


@app.post("/generate-notes", response_model=GenerateNotesResponse)
async def generate_notes(req: GenerateNotesRequest):
    source = resolve_source_text(req.extractedText, req.retrievedChunks)
    if not source:
        raise HTTPException(status_code=400, detail="extractedText or retrievedChunks required")

    system_prompt = """You are an expert educational content summarizer.
Create clear, well-structured study notes from the provided text.
Use markdown formatting with headers, bullet points, and key takeaways."""

    user_prompt = f"""Create comprehensive study notes from this text:

---
{source[:7000]}
---

Format as markdown with:
- ## Main Sections
- ### Sub-sections
- Key concepts in **bold**
- Bullet lists for important points
- A "## Key Takeaways" section at the end
"""

    try:
        notes = chat_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.4,
            max_tokens=4096,
        )
        if not (notes or "").strip():
            raise ValueError("Empty notes from LLM")
        return GenerateNotesResponse(notes=notes)

    except Exception as e:
        print(f"[generate-notes] LLM failed ({e}) — using fallback")
        # Heuristic notes from source sentences
        sentences = [s.strip() for s in source.replace("\n", " ").split(".") if len(s.strip()) > 30]
        bullets = "\n".join(f"- {s}" for s in sentences[:12]) or f"- {source[:500]}"
        fallback = (
            "## Study Notes (fallback)\n\n"
            "### Key points from the material\n"
            f"{bullets}\n\n"
            "## Key Takeaways\n"
            "- Review the points above and practice applying them.\n"
            "- Retake related quizzes after revising weak topics.\n"
        )
        return GenerateNotesResponse(notes=fallback)


@app.post("/course-outcome-analytics", response_model=CourseOutcomeAnalyticsResponse)
async def course_outcome_analytics(req: CourseOutcomeAnalyticsRequest):
    attempts = req.attempts
    total = len(attempts)
    if total == 0:
        return CourseOutcomeAnalyticsResponse(
            totalAttempts=0, passRate=0.0, avgScore=0.0, avgCompletionTimeSec=None
        )

    scores = [float(a.get("score", 0)) for a in attempts]
    avg_score = round(sum(scores) / total, 2)
    pass_rate = round(sum(1 for s in scores if s >= 60) / total * 100, 2)

    return CourseOutcomeAnalyticsResponse(
        totalAttempts=total,
        passRate=pass_rate,
        avgScore=avg_score,
        avgCompletionTimeSec=None,
    )


@app.post("/modify-quiz", response_model=ModifyQuizResponse)
async def modify_quiz(req: ModifyQuizRequest):
    source = resolve_source_text(req.extractedText, req.retrievedChunks)
    if not source:
        # Allow retest when only prior questions + weak topics are available (paste-only demos)
        bits = [f"Weak topics: {', '.join(req.weakTopics)}"] if req.weakTopics else []
        bits.extend(req.previousQuestions[:15])
        source = "\n".join(bits).strip()
    if not source:
        raise HTTPException(
            status_code=400,
            detail="extractedText, retrievedChunks, or previousQuestions required",
        )

    prev_questions_text = "\n".join(f"- {q}" for q in req.previousQuestions[:10])
    weak_topics_text = ", ".join(req.weakTopics) if req.weakTopics else "general review"

    system_prompt = """You are an expert educational assessment designer specializing in remediation.
Create a new, varied set of MCQs that avoids repeating previous questions and focuses on weak areas.
Respond ONLY with valid JSON."""

    user_prompt = f"""Generate 10 new multiple-choice questions for a quiz retest.

Source Text:
---
{source[:6000]}
---

Topics the learner is weak on: {weak_topics_text}

Previously asked questions (do NOT repeat these):
{prev_questions_text}

Return JSON:
{{
  "questions": [
    {{
      "questionText": "string",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctOptionIndex": 0,
      "explanation": "string"
    }}
  ]
}}

Weight at least 60% of new questions toward the weak topics.
"""

    try:
        raw = chat_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.6,
            json_mode=True,
        )
        result = extract_json_object(raw)
        questions_raw = result.get("questions", [])

        questions = [
            MCQQuestion(
                questionText=q["questionText"],
                options=list(q["options"])[:4],
                correctOptionIndex=int(q["correctOptionIndex"]),
                explanation=q.get("explanation", ""),
            )
            for q in questions_raw
            if q.get("questionText") and len(q.get("options", [])) >= 4
        ]

        if not questions:
            print("[modify-quiz] LLM returned no valid questions — using fallback")
            questions = fallback_mcqs(source, 10)

        return ModifyQuizResponse(questions=questions)

    except Exception as e:
        print(f"[modify-quiz] LLM failed ({e}) — using fallback")
        return ModifyQuizResponse(questions=fallback_mcqs(source, 10))
