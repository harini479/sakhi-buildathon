# Sakhi Platform — Architecture Document
## High-Level & Low-Level System Design

> **Version:** 2.0 · **Date:** October 2026
> **Scope:** Complete technical architecture of the Sakhi (JanmaSethu) AI-powered maternal & clinical companion platform.

---

## Table of Contents

1. [Executive Architecture Summary](#1-executive-architecture-summary)
2. [High-Level Architecture](#2-high-level-architecture)
3. [System Topology & Deployment](#3-system-topology--deployment)
4. [Component Architecture (Low-Level)](#4-component-architecture-low-level)
5. [Data Architecture & Schema Design](#5-data-architecture--schema-design)
6. [AI/ML Pipeline Architecture](#6-aiml-pipeline-architecture)
7. [Security Architecture](#7-security-architecture)
8. [API Contract & Interface Design](#8-api-contract--interface-design)
9. [Concurrency & Performance Model](#9-concurrency--performance-model)
10. [Technology Stack](#10-technology-stack)

---

## 1. Executive Architecture Summary

Sakhi is a **multi-channel conversational AI platform** built as a distributed system with three deployable units:

| Unit | Technology | Port | Role |
|:-----|:-----------|:-----|:-----|
| **Whatsapp_backend** | Python / FastAPI | 8000 | AI Intelligence Engine (brain) |
| **whatsapp_chatbot** | Node.js / Express | 3000 | WhatsApp Cloud API Middleware |
| **instagram_chatbot** | Node.js / Express | 3001 | Instagram Graph API Middleware |

The system follows a **Middleware → Backend** separation pattern where Node.js services handle Meta platform webhook verification, message parsing, and outbound delivery, while the Python backend houses all AI logic, RAG retrieval, routing, security, and database operations.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        META CLOUD PLATFORM                          │
│              (WhatsApp Cloud API / Instagram Graph API)             │
└────────────┬──────────────────────────────────┬─────────────────────┘
             │ Webhook POST                     │ Webhook POST
             ▼                                  ▼
┌────────────────────────┐         ┌────────────────────────┐
│   whatsapp_chatbot     │         │   instagram_chatbot    │
│   (Node.js :3000)      │         │   (Node.js :3001)      │
│                        │         │                        │
│ ● Webhook verification │         │ ● Webhook verification │
│ ● Message extraction   │         │ ● DM extraction        │
│ ● Outbound delivery    │         │ ● Outbound delivery    │
│ ● Template messages    │         │ ● Quick replies        │
│ ● Media uploads        │         │ ● Image messages       │
│ ● Follow-up list menus │         │                        │
│ ● Idempotency (in-mem) │         │                        │
└────────────┬───────────┘         └────────────┬───────────┘
             │ HTTP POST /webhook/               │ HTTP POST /sakhi/
             │ whatsapp_incoming                 │ chat
             ▼                                   ▼
┌────────────────────────────────────────────────────────────────────┐
│                     Whatsapp_backend (Python :8000)                 │
│                        FastAPI Application                         │
│                                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Routers  │  │ Services │  │ Modules  │  │  Models  │          │
│  │          │  │          │  │          │  │          │          │
│  │ webhook  │  │ routing  │  │ security │  │ schemas  │          │
│  │ chat     │  │ clinical │  │ guardrail│  │          │          │
│  │ user     │  │ chat_flow│  │ model_gw │  │          │          │
│  │ hospital │  │ onboard  │  │ RAG      │  │          │          │
│  │ know_hub │  │ places   │  │ masking  │  │          │          │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    Supabase (PostgreSQL + pgvector)         │    │
│  │  sakhi_users · sakhi_encrypted_chats · sakhi_knowledge_    │    │
│  │  nodes · sakhi_clinical_rules · sakhi_escalations ·        │    │
│  │  sakhi_clinic_patients · sakhi_chat_states · etc.          │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. High-Level Architecture

### 2.1 Architectural Patterns Used

| Pattern | Where Applied |
|:--------|:-------------|
| **Microservices** | Three independent deployable units (Backend, WA Middleware, IG Middleware) |
| **Middleware Proxy** | Node.js services act as thin proxies between Meta APIs and the AI backend |
| **Semantic Routing** | `ModelGateway` uses vector cosine similarity to route queries to different AI tiers |
| **RAG (Retrieval-Augmented Generation)** | Hybrid vector + keyword search feeds grounded context to the LLM |
| **Zero-Trust Medical Safety** | 4-layer defense: Similarity Gate → Prompt Constraint → Token Audit → Knowledge Flywheel |
| **State Machine** | User onboarding, lead flow, and triage use explicit step-based FSMs stored in DB |
| **CQRS (partial)** | Conversation writes go to encrypted table; reads decrypt on-the-fly |
| **Event-Driven Background Tasks** | FastAPI `BackgroundTasks` + `asyncio.create_task` for non-blocking side effects |
| **Singleton Services** | `ModelGateway`, `SLMClient`, `SakhiGuardrails` are singleton instances |

### 2.2 Request Lifecycle (End-to-End)

```
User sends WhatsApp message
        │
        ▼
[1] Meta Cloud API delivers webhook POST to Node.js (:3000)
        │
        ▼
[2] messageController.js extracts text, sender phone, message ID
    ├─ Deduplicates via in-memory TTL cache (5 min, 500 entries)
    ├─ Sends interactive/list reply text if applicable
    │
    ▼
[3] HTTP POST → Python backend /webhook/whatsapp_incoming
        │
        ▼
[4] Webhook Router (routers/webhook.py)
    ├─ Idempotency check (DB-level via services/idempotency.py)
    ├─ Interactive list reply → Hospital detail flow
    ├─ Pincode resolution → Hospital search flow
    │
    ▼
[5] User Resolution & Onboarding
    ├─ Lookup user by blind-indexed phone (modules/user_profile.py)
    ├─ Lookup clinic patient (routing_engine._get_patient_details)
    ├─ If new → create_partial_user → onboarding FSM (name extraction)
    │
    ▼
[6] State Intercept Layer
    ├─ Check triage hard-stop state (lead_manager._get_chat_state)
    ├─ Evaluate hard-stop response (post_care_service.evaluate_hard_stop)
    ├─ Lead flow (/newlead) state machine
    │
    ▼
[7] Zero-Trust Routing Engine (services/routing_engine.py)
    ├─ Entity & intent extraction via GPT-4o-mini (intent_extractor.py)
    ├─ Patient timeline retrieval & active treatment context
    ├─ Semantic treatment match verification (embedding cosine ≥ 0.60)
    ├─ Decision Matrix:
    │   ├─ Symptom + Patient → Post-Care Symptom Track
    │   ├─ Treatment match + Patient → Post-Care Education Track
    │   ├─ Treatment mismatch + Patient → Strict Guardrail Rejection
    │   ├─ Smalltalk + Patient → Personalized greeting
    │   └─ Anything else → Pre-Care (Normal Chat Flow)
    │
    ▼
[8] Normal Chat Flow (services/chat_flow_service.py)
    ├─ Guardrail out-of-scope check (sports, movies, politics → redirect)
    ├─ PII masking (phone, email, PAN, Aadhaar)
    ├─ Message classification (response_builder.classify_message)
    │   ├─ Signal: SMALLTALK → GPT smalltalk response
    │   ├─ Signal: HOSPITAL_SEARCH → Google Places API flow
    │   └─ Signal: MEDICAL → RAG + GPT medical response
    ├─ Language detection (English / Telugu / Tinglish)
    ├─ Hybrid RAG search (vector + keyword + FAQ lanes)
    ├─ LLM response generation with grounded context
    ├─ PII unmasking of response
    ├─ Tinglish/Telugu enforcement & rewrite if needed
    ├─ Output cleanup (guardrails.clean_output)
    ├─ Reward points classification & async award
    ├─ Background: follow-up question pre-generation
    │
    ▼
[9] Response Delivery
    ├─ Send text reply via Node.js middleware (services/whatsapp_service.py)
    ├─ Send infographic image if available
    ├─ Send YouTube link if available
    ├─ Record escalation if mode == "escalation"
    └─ Return JSON response payload
```

---

## 3. System Topology & Deployment

### 3.1 Container Architecture

```yaml
# docker-compose.yml (Backend)
services:
  sakhi-backend:
    build: ./Whatsapp_backend
    ports: ["8000:8000"]
    env_file: .env
    # Python 3.11-slim base image
    # uvicorn main:app --host 0.0.0.0 --port 8000

# docker-compose.yml (Middleware)
services:
  whatsapp-middleware:
    build: ./whatsapp_chatbot
    ports: ["3000:3000"]
    env_file: .env
    # Node.js 18 base image
```

### 3.2 External Service Dependencies

| Service | Purpose | Module |
|:--------|:--------|:-------|
| **Supabase (PostgreSQL + pgvector)** | Primary database, vector similarity search, RPC functions | `supabase_client.py` |
| **OpenAI API** | GPT-4o / GPT-4o-mini (chat), text-embedding-3-small (embeddings) | `rag.py`, `response_builder.py`, `slm_client.py` |
| **Meta WhatsApp Cloud API** | Inbound/outbound WhatsApp messaging | `config/whatsapp.js` |
| **Meta Instagram Graph API** | Inbound/outbound Instagram DMs | `config/instagram.js` |
| **Google Places API (v1)** | Hospital search, geocoding, place details | `services/places_service.py` |

### 3.3 Connection Pool Architecture

```
┌──────────────────────────────────────────────────────┐
│              Shared httpx.AsyncClient Pools           │
│                                                      │
│  supabase_client._async_http_client                  │
│    ├─ max_keepalive: 20 (env: HTTPX_MAX_KEEPALIVE)   │
│    ├─ max_connections: 100 (env: HTTPX_MAX_CONNECTIONS)│
│    └─ keepalive_expiry: 30s                          │
│                                                      │
│  rag._openai_embed_http                              │
│    ├─ max_keepalive: 50                              │
│    └─ max_connections: 200                           │
│                                                      │
│  routing_engine._openai_http_client                  │
│    ├─ max_keepalive: 50                              │
│    └─ max_connections: 100                           │
│                                                      │
│  All pools: timeout=30s, connect=5s                  │
└──────────────────────────────────────────────────────┘
```

---

## 4. Component Architecture (Low-Level)

### 4.1 Routers Layer (`routers/`)

| Router | Prefix | Endpoints | Responsibility |
|:-------|:-------|:----------|:---------------|
| `webhook.py` | `/webhook` | `POST /whatsapp_incoming` | WhatsApp inbound message orchestration |
| `chat.py` | `/sakhi/chat` | `POST /` | Direct API chat (web UI, testing) |
| `user.py` | `/sakhi/user` | Register, login, profile CRUD | User management |
| `hospital.py` | `/sakhi/hospital` | Hospital search endpoints | Hospital discovery |
| `knowledge_hub.py` | `/sakhi/knowledge` | KB management endpoints | Knowledge base admin |

### 4.2 Services Layer (`services/`)

| Service | Lines | Purpose |
|:--------|:------|:--------|
| `routing_engine.py` | 304 | **Zero-Trust Routing Decision Matrix** — Determines pre-care vs post-care path using patient timeline, treatment matching, and entity extraction |
| `clinical_chat_service.py` | 420 | **Clinical Post-Care Pipeline** — Multi-intent decomposition → Rule search → Emergency detection → Confidence evaluation → Knowledge retrieval → Response generation → Safety check |
| `chat_flow_service.py` | 352 | **Normal Chat Flow (Pre-Care)** — Guardrails → Classification → Language detection → RAG search → LLM response → Masking/cleanup → Rewards |
| `post_care_service.py` | 366 | **Symptom Track & Education Track** — 1-question triage gate, vectorized symptom matching, education content retrieval |
| `onboarding_service.py` | 176 | **User Onboarding FSM** — Name extraction (LLM-powered), clinic selection, profile creation |
| `places_service.py` | 128 | **Hospital Discovery** — Google Places API v1 integration with geocoding & caching |
| `intent_extractor.py` | 81 | **NER + Intent Classification** — GPT-4o-mini-powered extraction of treatments, symptoms, and primary intent |
| `escalation_service.py` | ~40 | **Escalation Recording** — Async background task for persisting escalation events |
| `whatsapp_service.py` | ~40 | **Outbound Message Bridge** — HTTP POST to Node.js middleware `/v1/send-message` |
| `idempotency.py` | ~50 | **Message Deduplication** — Prevents duplicate webhook processing |

### 4.3 Modules Layer (`modules/`)

#### Core AI Modules

| Module | Lines | Architecture Role |
|:-------|:------|:-----------------|
| `model_gateway.py` | 421 | **Semantic Router Singleton** — Precomputes mean anchor vectors for 23 medical categories + smalltalk + facility queries. Routes via cosine similarity to SLM_DIRECT / SLM_RAG / OPENAI_RAG |
| `slm_client.py` | 572 | **SLM Client (OpenAI fallback mode)** — Designed for pluggable SLM endpoint (Groq/vLLM). Currently routes all calls through GPT-4o-mini with Level-2 prompt guardrails |
| `response_builder.py` | 44,372 bytes | **LLM Response Engine** — Message classification, smalltalk generation, medical response generation (with RAG context), intent label generation, follow-up pre-computation |
| `guardrails.py` | 420 | **Intent Detection + Scope Enforcement + Output Cleanup** — Keyword-based intent classifier, out-of-scope pattern matching (regex), system prompt builder, AI self-reference removal |
| `safety_auditor.py` | 87 | **Token Audit + Anti-Drift Check** — Blacklisted word scanning, GPT-powered drift validation (SAFE/UNSAFE) |

#### RAG & Search Modules

| Module | Lines | Architecture Role |
|:-------|:------|:-----------------|
| `hybrid_search.py` | 182 | **3-Lane Hybrid RAG** — Lane A: Vector search (0.7 weight), Lane B: Keyword/TSVECTOR search (0.3 weight, log-sigmoid normalized), Lane C: FAQ search. Weighted fusion gate |
| `search_hierarchical.py` | 133 | **Hierarchical RAG** — Searches section chunks + FAQ table via Supabase RPC. Merges document context with YouTube links |
| `rag_search.py` | ~80 | **Simple RAG Search** — Basic vector similarity search |

#### Security & Privacy Modules

| Module | Lines | Architecture Role |
|:-------|:------|:-----------------|
| `security.py` | 120 | **AES-256-GCM Encryption** — HKDF key derivation per user, message encryption/decryption, blind phone index (HMAC-SHA256) |
| `masking_service.py` | 52 | **PII Masking Engine** — Regex-based detection & tokenization of phone numbers, email, PAN, Aadhaar. Reversible mask/unmask |
| `conversation.py` | 109 | **Encrypted Conversation Storage** — All messages encrypted before DB write, decrypted on read. Zero plaintext storage |

#### Clinical Modules

| Module | Lines | Architecture Role |
|:-------|:------|:-----------------|
| `escalation.py` | 153 | **Escalation Pipeline** — DB record creation, WhatsApp doctor notification, patient-facing messages for 6 escalation reasons |
| `clinical_rule_search.py` | ~80 | **Clinical Rule Vector Search** — Multi-tenant (clinic + doctor scoped) similarity search on `sakhi_clinical_rules` |
| `medical_knowledge_search.py` | ~60 | **Medical Knowledge Retrieval** — Doctor-scoped vector search on `sakhi_medical_knowledge` |
| `intent_decomposer.py` | ~100 | **Multi-Intent Decomposition** — Splits complex patient messages into ≤3 individual intents for parallel processing |
| `clinic_patient.py` | ~180 | **Patient Registry** — Patient lookup, clinic association, doctor assignment |
| `clinic_registry.py` | ~80 | **Clinic & Doctor Registry** — Clinic listing, doctor lookup |

#### User & State Modules

| Module | Lines | Architecture Role |
|:-------|:------|:-----------------|
| `user_profile.py` | 222 | **User CRUD** — Registration, login (bcrypt), phone normalization, blind indexing, context state management |
| `user_rewards.py` | 158 | **Gamification Engine** — 4-tier reward classification (1/2/3/5 pts), async point awarding, novel question storage |
| `lead_manager.py` | 161 | **Lead Generation FSM** — 5-step conversational flow (name→phone→age→gender→problem→save) |
| `user_answers.py` | ~40 | **Survey/Questionnaire Storage** |

#### Language & Text Modules

| Module | Lines | Architecture Role |
|:-------|:------|:-----------------|
| `detect_lang.py` | ~100 | **Language Detection** — Telugu Unicode detection, Tinglish identification |
| `translation_service.py` | ~70 | **Translation Layer** — deep-translator integration |
| `text_utils.py` | ~130 | **Text Utilities** — Response truncation, follow-up extraction, text cleanup |
| `tokenizer_manager.py` | ~170 | **Token Budget Manager** — tiktoken-based token counting for prompt/context budget management |
| `preprocessing.py` | ~20 | **Input Preprocessing** — Text normalization |

---

## 5. Data Architecture & Schema Design

### 5.1 Database: Supabase (PostgreSQL + pgvector)

```
┌──────────────────────────────────────────────────────────────────┐
│                    SAKHI DATABASE SCHEMA                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─── USER DOMAIN ───────────────────────────────────────────┐  │
│  │  sakhi_users (user_id, phone_number[hashed], name,        │  │
│  │              email, password_hash, role, rewards,          │  │
│  │              preferred_language, relation_to_patient)      │  │
│  │                                                           │  │
│  │  sakhi_chat_states (user_id, context[JSONB])              │  │
│  │    → Stores onboarding step, lead flow state,             │  │
│  │      triage state, zip code, clinic context               │  │
│  │                                                           │  │
│  │  sakhi_encrypted_chats (user_id, role, message_content    │  │
│  │    [AES-GCM ciphertext], nonce, language, chat_id)        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─── KNOWLEDGE DOMAIN ─────────────────────────────────────┐   │
│  │  sakhi_knowledge_nodes (node_id, node_level, title,       │  │
│  │    content, display_text, parent_id, metadata[JSONB],     │  │
│  │    embedding[vector(1536)])                               │  │
│  │    → Hierarchical H1→H2→H3→Chunk structure               │  │
│  │    → RESS Model: display_text for cited medical answers   │  │
│  │                                                           │  │
│  │  sakhi_section_chunks (embedding[vector(1536)],           │  │
│  │    header_path, section_content)                          │  │
│  │    → Legacy hierarchical search table                     │  │
│  │                                                           │  │
│  │  faq (question, answer, youtube_link, infographic_url,    │  │
│  │    embedding[vector(1536)])                               │  │
│  │    → FAQ with multimedia attachments                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─── CLINICAL DOMAIN ──────────────────────────────────────┐   │
│  │  sakhi_clinic_patients (id, name, mobile, clinic_id,      │  │
│  │    assigned_doctor_id)                                    │  │
│  │                                                           │  │
│  │  sakhi_clinic_users (id [doctor/staff], name,             │  │
│  │    whatsapp_number, clinic_id)                            │  │
│  │                                                           │  │
│  │  sakhi_clinical_rules (clinic_id, doctor_id, department,  │  │
│  │    treatment_stage, scenario, emergency_flag,             │  │
│  │    provisional_answer, clarifying_question,               │  │
│  │    escalation_trigger, embedding[vector(1536)])           │  │
│  │    → Multi-tenant, doctor-scoped decision rules           │  │
│  │                                                           │  │
│  │  sakhi_medical_knowledge (clinic_id, doctor_id, category, │  │
│  │    sub_category, content, embedding[vector(1536)])        │  │
│  │    → Doctor-specific medical content                      │  │
│  │                                                           │  │
│  │  sakhi_escalations (patient_id, doctor_id, clinic_id,     │  │
│  │    reason, status, conversation_context[JSONB])           │  │
│  │                                                           │  │
│  │  sakhi_clinic_patient_timeline_view (patient_id,          │  │
│  │    event_type, title, description, event_date)            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─── OPERATIONAL DOMAIN ───────────────────────────────────┐   │
│  │  sakhi_clinic_leads (name, phone, age, gender, problem)   │  │
│  │  sakhi_new_questions (user_id, question, similarity_score)│  │
│  │  sakhi_knowledge_flywheel (blocked queries, audit kills)  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─── RPC FUNCTIONS ────────────────────────────────────────┐   │
│  │  hierarchical_search(query_embedding, threshold, count)   │  │
│  │  match_faq(query_embedding, count)                        │  │
│  │  match_sakhi_knowledge_nodes_vector(...)                  │  │
│  │  match_sakhi_knowledge_nodes_keyword(query_text, count)   │  │
│  │  match_clinical_rules_vector(... + clinic/doctor scope)   │  │
│  │  match_medical_knowledge_vector(... + clinic/doctor scope)│  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 5.2 Vector Search Architecture

- **Embedding Model:** OpenAI `text-embedding-3-small` (1536 dimensions)
- **Index Type:** pgvector `<=>` (cosine distance) operator
- **Similarity Formula:** `1 - (embedding <=> query_embedding)`
- **Batch API:** `generate_embeddings_batch()` for bulk ingestion

---

## 6. AI/ML Pipeline Architecture

### 6.1 Semantic Routing (ModelGateway)

```
                    User Message
                         │
                         ▼
              ┌─────────────────────┐
              │  Generate Embedding  │  (text-embedding-3-small)
              └──────────┬──────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   ┌─────────────┐ ┌──────────────┐ ┌───────────────┐
   │ Small Talk   │ │ 23 Medical   │ │ Complex Med   │
   │ Anchor       │ │ Category     │ │ Anchor        │
   │ (32 examples)│ │ Anchors      │ │ (10 examples) │
   └──────┬──────┘ └──────┬───────┘ └───────┬───────┘
          │               │                  │
     cosine_sim      max(cosine_sim)    cosine_sim
          │               │                  │
          ▼               ▼                  ▼
   ┌──────────────────────────────────────────────┐
   │         Threshold-Based Decision Gate         │
   │  Small Talk ≥ 0.45 → SLM_DIRECT              │
   │  Facility  ≥ 0.40 → SLM_RAG                  │
   │  Complex > Simple  → OPENAI_RAG              │
   │  Simple   ≥ 0.45  → SLM_RAG                  │
   │  Default           → OPENAI_RAG              │
   └──────────────────────────────────────────────┘
```

**Medical Categories Indexed (23):**
IVF, IUI, ICSI, Fertility, Female Infertility, Male Infertility, Laparoscopy, Postpartum, Conception, Embryo Freezing, Sperm Freezing, Egg Freezing, PCOS, PCOD, Ayurveda, Hysteroscopy, Pregnancy, Surrogacy, C-Section, Natural Birth, Nutrition & Tests, General Health, Medication & Exercises, Treatments General

### 6.2 Hybrid RAG Pipeline

```
         User Query
              │
              ▼
    ┌──────────────────┐
    │ Generate Embedding│
    └────────┬─────────┘
             │
    ┌────────┼────────────────┐
    ▼        ▼                ▼
  Lane A   Lane B          Lane C
  Vector   Keyword          FAQ
  Search   TSVECTOR        Search
  (RPC)    (RPC)           (RPC)
    │        │                │
    │    Log-Sigmoid          │
    │    Normalization        │
    │        │                │
    ▼        ▼                ▼
    ┌────────────────────────────┐
    │    Weighted Fusion Gate    │
    │  score = 0.7·vec + 0.3·kw │
    │                            │
    │  Integrity Threshold: 0.85 │
    │  (Below → system warning)  │
    └────────────┬───────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │   Context Formatter        │
    │   Document + FAQ + YouTube │
    └────────────┬───────────────┘
                 │
                 ▼
           LLM Prompt
```

### 6.3 Clinical Chat Pipeline (Post-Care)

```
Patient Message
       │
       ▼
  Intent Decomposition (≤3 intents)
       │
       ▼ (for each intent)
  ┌────────────────────────────────────────┐
  │ [1] Clinical Rule Search               │
  │     (doctor-scoped vector similarity)  │
  │                                        │
  │ [2] Emergency Check                    │
  │     → Immediate escalation + notify    │
  │                                        │
  │ [3] Confidence Evaluation              │
  │     → none: escalate                   │
  │     → low: send clarifying question    │
  │     → high: proceed                    │
  │                                        │
  │ [4] Medical Knowledge Retrieval        │
  │     (grounded in matched rule)         │
  │                                        │
  │ [5] Response Generation                │
  │     (rule + knowledge → LLM)           │
  │                                        │
  │ [6] Safety Check                       │
  │     (anti_drift_check → SAFE/UNSAFE)   │
  └────────────────────────────────────────┘
       │
       ▼
  Combine responses from all intents
       │
       ▼
  Return or Escalate
```

---

## 7. Security Architecture

### 7.1 Defense-in-Depth Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                               │
│                                                                  │
│  Layer 1: DATA-AT-REST ENCRYPTION                                │
│  ├─ AES-256-GCM authenticated encryption                        │
│  ├─ HKDF (SHA-256) per-user key derivation                      │
│  │   Key = HKDF(master_key, salt=user_id, info=b"chat")         │
│  ├─ 12-byte random nonce per message (NIST recommended)          │
│  ├─ Nonce prepended to ciphertext → single Base64 payload        │
│  └─ Zero plaintext in database (sakhi_encrypted_chats)           │
│                                                                  │
│  Layer 2: PII MASKING (Transit Protection)                       │
│  ├─ Regex detection: Phone (+91), Email, PAN, Aadhaar            │
│  ├─ Tokenized replacement: <PHONE_A1B2C3>                        │
│  ├─ Mask BEFORE sending to LLM                                   │
│  ├─ Unmask AFTER receiving LLM response                          │
│  └─ No PII ever reaches OpenAI servers                           │
│                                                                  │
│  Layer 3: PHONE NUMBER BLIND INDEX                               │
│  ├─ HMAC-SHA256(pepper, phone_number)                            │
│  ├─ Non-reversible lookup index                                  │
│  └─ Actual phone number never stored in sakhi_users              │
│                                                                  │
│  Layer 4: PASSWORD SECURITY                                      │
│  ├─ bcrypt hashing via passlib                                   │
│  └─ Constant-time comparison                                     │
│                                                                  │
│  Layer 5: INTERNAL API AUTHENTICATION                            │
│  ├─ x-internal-secret header verification                        │
│  └─ Middleware-to-backend communication secured                  │
│                                                                  │
│  Layer 6: MEDICAL SAFETY GUARDRAILS                              │
│  ├─ Blacklisted word token audit (guarantee, 100%, cure, etc.)   │
│  ├─ Anti-drift check (GPT-powered SAFE/UNSAFE validation)        │
│  ├─ Out-of-scope topic redirection                               │
│  └─ AI self-reference cleanup (OpenAI, ChatGPT, GPT-4 removal)  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Compliance Readiness

| Regulation | Coverage |
|:-----------|:---------|
| **India DPDP Act 2023** | Per-user encryption, blind indexes, no plaintext PII storage |
| **HIPAA** | Encryption at rest, PII masking in transit to LLM, audit logging |
| **GDPR** | Right to erasure possible (delete user_id → all encrypted data becomes unreadable), data minimization via masking |

---

## 8. API Contract & Interface Design

### 8.1 Primary API Endpoints

```
POST /sakhi/chat
  Request:  { user_id?, phone_number?, message, language }
  Response: { reply, mode, language, route, intent, youtube_link?, infographic_url? }

POST /webhook/whatsapp_incoming
  Request:  { message_info: { from, text, message_id, raw } }
  Response: { status, response? }

POST /sakhi/user/register
  Request:  { name, email, password, phone_number?, role?, preferred_language? }

POST /sakhi/user/login
  Request:  { email, password }

POST /expert/redirect
  Request:  { ...arbitrary }
  Response: { status, message }
```

### 8.2 Internal Service APIs

```
Node.js Middleware exposes:
  POST /v1/send-message  (x-internal-secret header)
    { phone, message?, media_url?, template_name?, language_code?, components? }

  POST /v1/send-dm  (Instagram)
    { recipient_id, message?, image_url?, quick_replies? }
```

---

## 9. Concurrency & Performance Model

### 9.1 Async Architecture

- **FastAPI** runs on `uvicorn` with native `asyncio` event loop
- **All database operations** have both sync (`supabase_*`) and async (`async_supabase_*`) variants
- **LLM calls** use `AsyncOpenAI` with shared `httpx.AsyncClient` connection pools
- **Background tasks** via two mechanisms:
  - `FastAPI BackgroundTasks` — runs after response is sent
  - `asyncio.create_task()` — fire-and-forget for rewards, escalations, flywheel logging
- **Parallel execution** via `asyncio.gather()` for concurrent LLM calls (e.g., medical response + intent label simultaneously)

### 9.2 Latency Budget

| Operation | Target | Mechanism |
|:----------|:-------|:----------|
| Embedding generation | ~200ms | Shared connection pool, batch API |
| RAG search (3-lane) | ~300ms | Parallel RPC calls |
| LLM response | ~1-3s | gpt-4o-mini (fast), gpt-4o (complex) |
| Encryption/Decryption | <1ms | AES-GCM hardware-accelerated |
| PII Masking | <5ms | Compiled regex patterns |
| Reward computation | ~0ms (async) | Fire-and-forget task |

---

## 10. Technology Stack

### Backend (Intelligence Engine)

| Layer | Technology | Version |
|:------|:-----------|:--------|
| Framework | FastAPI | 0.115.0 |
| Server | Uvicorn | 0.32.0 |
| Language | Python | 3.11 |
| Validation | Pydantic | 2.9.2 |
| HTTP Client | httpx | 0.27.2 |
| AI/LLM | OpenAI Python SDK | 1.52.0 |
| Database | Supabase Python SDK | 2.8.1 |
| Tokenizer | tiktoken | 0.8.0 |
| Encryption | cryptography | 42.0.5 |
| Auth | passlib[bcrypt] | 1.7.4 |
| Vectors | numpy | ≥2.1.0 |
| Translation | deep-translator | 1.11.4 |
| Transliteration | indic-transliteration | 2.3.57 |
| NLP Tokenizer | sentencepiece | 0.2.1 |

### Middleware (Message Delivery)

| Layer | Technology |
|:------|:-----------|
| Runtime | Node.js 18 |
| Framework | Express.js |
| HTTP Client | Axios |
| Config | dotenv |

### Infrastructure

| Layer | Technology |
|:------|:-----------|
| Database | Supabase (PostgreSQL 15 + pgvector) |
| Containerization | Docker + docker-compose |
| AI Provider | OpenAI API (GPT-4o, GPT-4o-mini, text-embedding-3-small) |
| Maps | Google Places API v1 |
| Messaging | Meta WhatsApp Cloud API + Meta Instagram Graph API |

---

*Document generated from codebase analysis — Sakhi Platform v2.0*
