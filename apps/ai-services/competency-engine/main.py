"""
AI Engine 1 — Competency Assessment Service (RAG-grounded)
Port: 8001
POST /assess-competency

Accepts profile free-text, required competencies, and retrieved framework
context chunks. Calls OpenAI to infer current skill levels (0-100).
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

app = FastAPI(title="Competency Assessment Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ProfileText(BaseModel):
    currentAssignment: str = ""
    education: str = ""
    workExperience: str = ""
    priorTrainings: str = ""


class RequiredCompetency(BaseModel):
    domain: str
    skillName: str
    requiredLevel: float


class FrameworkContext(BaseModel):
    skillName: str
    referenceText: list[str] = []


class AssessCompetencyRequest(BaseModel):
    userId: str
    jobRole: str
    profileText: ProfileText
    requiredCompetencies: list[RequiredCompetency]
    frameworkContext: list[FrameworkContext] = []


class DomainScore(BaseModel):
    domain: str
    skillName: str
    currentLevel: float
    requiredLevel: float
    gap: float
    justification: str


class AssessCompetencyResponse(BaseModel):
    overallReadinessPct: float
    domainScores: list[DomainScore]


@app.get("/health")
async def health():
    return {"status": "ok", "service": "competency-engine"}


@app.post("/assess-competency", response_model=AssessCompetencyResponse)
async def assess_competency(req: AssessCompetencyRequest):
    if not req.requiredCompetencies:
        raise HTTPException(status_code=400, detail="requiredCompetencies must not be empty")

    skills_list = "\n".join(
        f"- Domain: {c.domain}, Skill: {c.skillName}, RequiredLevel: {c.requiredLevel}/100"
        for c in req.requiredCompetencies
    )

    framework_blocks = []
    for ctx in req.frameworkContext:
        refs = "\n".join(f"  • {t}" for t in ctx.referenceText[:3])
        framework_blocks.append(f"Skill: {ctx.skillName}\n{refs}")
    framework_section = "\n\n".join(framework_blocks) if framework_blocks else "(no framework context retrieved)"

    profile_summary = f"""
Job Role: {req.jobRole}
Current Assignment: {req.profileText.currentAssignment}
Education: {req.profileText.education}
Work Experience: {req.profileText.workExperience}
Prior Trainings: {req.profileText.priorTrainings}
""".strip()

    system_prompt = """You are an expert HR competency assessor for India's Official Statistical System.
Based on an official's profile text AND retrieved competency framework reference text,
infer their current proficiency level (0-100) for each required skill.
Ground your judgments in the framework level descriptors when available.
Be evidence-based — use clues in the text about experience, education, and prior training.
Respond ONLY with valid JSON matching the schema provided."""

    user_prompt = f"""Official Profile:
{profile_summary}

Required Skills to Assess:
{skills_list}

Retrieved Competency Framework Context (RAG):
{framework_section}

Return a JSON object with this exact schema:
{{
  "domainScores": [
    {{
      "domain": "string",
      "skillName": "string",
      "currentLevel": number (0-100),
      "requiredLevel": number (0-100),
      "gap": number (requiredLevel - currentLevel),
      "justification": "brief explanation referencing profile and/or framework"
    }}
  ]
}}

Assess each skill listed. If the profile gives no evidence, assign a conservative level of 20-35.
"""

    try:
        raw = chat_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            json_mode=True,
        )
        result = extract_json_object(raw)
        domain_scores_raw = result.get("domainScores", [])

        domain_scores = []
        for item in domain_scores_raw:
            domain_scores.append(
                DomainScore(
                    domain=item["domain"],
                    skillName=item["skillName"],
                    currentLevel=float(item.get("currentLevel", 30)),
                    requiredLevel=float(item.get("requiredLevel", 70)),
                    gap=float(item.get("gap", 40)),
                    justification=item.get("justification", ""),
                )
            )

        if not domain_scores:
            print("[assess-competency] empty LLM scores — using heuristic fallback")
            domain_scores = heuristic_scores(req)

        total_gap = sum(max(d.gap, 0) for d in domain_scores)
        total_required = sum(d.requiredLevel for d in domain_scores)
        overall_readiness = round(
            100 - (total_gap / total_required * 100) if total_required > 0 else 50, 1
        )
        overall_readiness = max(0.0, min(100.0, overall_readiness))

        return AssessCompetencyResponse(
            overallReadinessPct=overall_readiness,
            domainScores=domain_scores,
        )

    except Exception as e:
        print(f"[assess-competency] LLM failed ({e}) — using heuristic fallback")
        domain_scores = heuristic_scores(req)
        total_gap = sum(max(d.gap, 0) for d in domain_scores)
        total_required = sum(d.requiredLevel for d in domain_scores) or 1
        overall_readiness = round(100 - (total_gap / total_required * 100), 1)
        return AssessCompetencyResponse(
            overallReadinessPct=max(0.0, min(100.0, overall_readiness)),
            domainScores=domain_scores,
        )


def heuristic_scores(req: AssessCompetencyRequest) -> list[DomainScore]:
    """Conservative scores from profile keyword hints when LLM fails."""
    blob = " ".join(
        [
            req.profileText.currentAssignment,
            req.profileText.education,
            req.profileText.workExperience,
            req.profileText.priorTrainings,
        ]
    ).lower()

    scores: list[DomainScore] = []
    for rc in req.requiredCompetencies:
        skill = rc.skillName.lower()
        base = 28.0
        if skill in blob or any(tok in blob for tok in skill.split()):
            base = 55.0
        if "python" in skill and "python" in blob:
            base = 60.0
        if "sql" in skill and "sql" in blob:
            base = 58.0
        current = min(rc.requiredLevel, base)
        gap = max(0.0, rc.requiredLevel - current)
        scores.append(
            DomainScore(
                domain=rc.domain,
                skillName=rc.skillName,
                currentLevel=current,
                requiredLevel=rc.requiredLevel,
                gap=gap,
                justification="Heuristic estimate from profile keywords (LLM unavailable).",
            )
        )
    return scores
