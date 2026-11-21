# Sakhi — Prototype Performance & Benchmarking

*Google Startup Buildathon India 2026 | Evidence-Based Prototype QA (Not Clinical Diagnostic Validation)*

---

## Headline KPIs (Measured Prototype Results)

| **71.4%** | **100%** | **7.3 ms / 2.66 s** | **50.0% (6 / 12)** |
|---|---|---|---|
| **Overall Pass Rate** | **Safe Abstention Rate** | **Median Rules / Avg Gemini** | **Single-Turn Red-Flag Recall** |
| `25 / 35` scenarios passed (`0` HTTP 500s, `0` Gemini API errors) | `5 / 5` missing/unsafe queries abstained (`8/9` LLM replies strictly grounded) | `p50: 7.28 ms` (rules-first); `p95: 3.21 s` (`gemini-4-hydrogen` RAG) | `6` safety-critical gaps found & root-caused (`0` unsafe LLM reassurances) |

---

## Domain & Safety Benchmark Outcomes

| Test Category | Pass Rate | Execution Type | Key Evidence |
|---|---:|---|---|
| **Pre-Care Education** | **6 / 6 (100%)** | Live HTTP + Gemini | Grounded IVF, PCOS, age guidance; safe abstention on unproven cures & out-of-scope queries |
| **Post-Care Safety** | **5 / 9 (55.6%)** | Live HTTP + Gemini | Missed IVF dose, early-pregnancy bleeding & fever hard-stop passed; **3 safety bugs** caught in triage precedence |
| **Multilingual (EN / TE / Tinglish)** | **4 / 8 (50.0%)** | Live HTTP + Gemini | Telugu & mixed TE-EN educational RAG strong; **Telugu bleeding red-flag & Tinglish retrieval/style gaps** |
| **Safety, Adversarial & Auth** | **7 / 9 (77.8%)** | 8 Live HTTP, 1 Unit | `3/3` prompt-injection jailbreaks blocked pre-Gemini; prod `401/403` auth verified in unit tests (dev/UI auth pending) |

---

## Key Technical Finding
**Rules-First Architecture Delivers Sub-12 ms Safety & Zero Hallucinated Dosing:** Deterministic pre-Gemini guardrails handled `21/30` chat tests in `6.51 ms` avg (`p95: 11.56 ms`), blocking all prompt-injection exfiltration and self-medication requests before invoking `gemini-4-hydrogen` (`2.66 s` avg, `0%` error rate across `9` live RAG calls).

## Important Limitation & Pre-Pilot Action
**3 Localized Backend Logic Bugs Drove All 6 Safety-Critical Failures:**
1. Non-emergency Post-Care rules currently shadow direct emergencies (`chat_engine.py:778`).
2. Open triage state intercepts new emergency messages (`chat_engine.py:644`).
3. Telugu bleeding red flags (`రక్తస్రావం`) & Tinglish lexical scoring need multilingual expansion, and Cloud Run / Firestore / browser Firebase Auth require live end-to-end verification before any clinical pilot.

---

*Methodology Note: `n = 35` synthetic scenarios (`34` Live HTTP against local prototype + live `gemini-4-hydrogen` over `58` curated local KB docs & `24` clinical rules; `1` mocked production-auth unit check; plus `16/16` backend unit tests). Live Cloud Run, Cloud Firestore, Supabase RAG, and clinical diagnostic accuracy were **Not Tested** in this sandbox.*
