# Sakhi Platform — Technical Overview

> **Version:** 2.0 · **Date:** October 2026
> **Audience:** Engineers, technical reviewers, and infrastructure teams.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Repository Structure](#2-repository-structure)
3. [Technology Stack](#3-technology-stack)
4. [Environment Configuration](#4-environment-configuration)
5. [Codebase Module Reference](#5-codebase-module-reference)
6. [Data Flow & Request Pipeline](#6-data-flow--request-pipeline)
7. [AI Pipeline & Model Architecture](#7-ai-pipeline--model-architecture)
8. [Database Schema & RPC Functions](#8-database-schema--rpc-functions)
9. [Security & Cryptography Implementation](#9-security--cryptography-implementation)
10. [Concurrency Model & Performance](#10-concurrency-model--performance)
11. [Data Ingestion Pipeline](#11-data-ingestion-pipeline)
12. [Deployment & Infrastructure](#12-deployment--infrastructure)
13. [Developer Scripts & Tooling](#13-developer-scripts--tooling)
14. [Key Technical Decisions & Tradeoffs](#14-key-technical-decisions--tradeoffs)
15. [Known Limitations & Technical Debt](#15-known-limitations--technical-debt)

---

## 1. System Overview

Sakhi is a **three-service distributed system** that powers an AI health companion accessible via WhatsApp and Instagram.

```
┌───────────────────────────────────────────────────────────────────┐
│                    SAKHI SYSTEM OVERVIEW                          │
│                                                                   │
│   Service 1: Whatsapp_backend (Python 3.11, FastAPI, :8000)       │
│   ├─ AI Intelligence Engine (LLM, RAG, Routing, NER)             │
│   ├─ All business logic, state machines, triage                  │
│   ├─ Security layer (AES-256-GCM, PII masking)                   │
│   └─ Database operations (Supabase PostgreSQL + pgvector)        │
│                                                                   │
│   Service 2: whatsapp_chatbot (Node.js 18, Express, :3000)        │
│   ├─ Meta WhatsApp Cloud API webhook handler                     │
│   ├─ Inbound message extraction & normalization                  │
│   ├─ Outbound delivery (text, image, templates, list menus)      │
│   └─ Internal API (/v1/send-message) for backend                 │
│                                                                   │
│   Service 3: instagram_chatbot (Node.js 18, Express, :3001)       │
│   ├─ Meta Instagram Graph API webhook handler                    │
│   ├─ Instagram DM extraction                                     │
│   └─ Internal API (/v1/send-dm) for backend                     │
│                                                                   │
│   External Dependencies:                                          │
│   ├─ Supabase (PostgreSQL 15 + pgvector)                         │
│   ├─ OpenAI API (GPT-4o, GPT-4o-mini, text-embedding-3-small)   │
│   ├─ Meta WhatsApp Cloud API                                     │
│   ├─ Meta Instagram Graph API                                    │
│   └─ Google Places API v1                                        │
└───────────────────────────────────────────────────────────────────┘
```

---

## 2. Repository Structure

```
sakhi/
├── Whatsapp_backend/                    # Python AI Backend (FastAPI)
│   ├── main.py                          # Application entry point
│   ├── rag.py                           # Embedding generation (OpenAI text-embedding-3-small)
│   ├── supabase_client.py               # Database client (sync + async wrappers)
│   ├── requirements.txt                 # Python dependencies (17 packages)
│   ├── Dockerfile                       # Python 3.11-slim container
│   ├── docker-compose.yml               # Backend container config (host networking)
│   ├── .env.example                     # Environment variable template
│   │
│   ├── routers/                         # FastAPI API routers
│   │   ├── webhook.py                   # POST /webhook/whatsapp_incoming — main WhatsApp entry
│   │   ├── chat.py                      # POST /sakhi/chat — direct API chat
│   │   ├── user.py                      # User registration, login, profile CRUD
│   │   ├── hospital.py                  # Hospital search endpoints
│   │   └── knowledge_hub.py             # Knowledge base management
│   │
│   ├── services/                        # Business logic orchestration
│   │   ├── routing_engine.py            # Zero-Trust pre/post-care routing decision matrix
│   │   ├── clinical_chat_service.py     # Post-care clinical pipeline (420 lines)
│   │   ├── chat_flow_service.py         # Pre-care normal chat flow (352 lines)
│   │   ├── post_care_service.py         # Symptom track + education track (366 lines)
│   │   ├── onboarding_service.py        # User onboarding FSM (name, clinic selection)
│   │   ├── intent_extractor.py          # GPT-4o-mini NER (treatments, symptoms, intent)
│   │   ├── places_service.py            # Google Places API integration (geocoding + search)
│   │   ├── whatsapp_service.py          # Outbound message bridge to Node.js middleware
│   │   ├── idempotency.py               # Webhook message deduplication
│   │   └── escalation_service.py        # Async escalation event recording
│   │
│   ├── modules/                         # Reusable functional modules
│   │   ├── model_gateway.py             # Semantic router (23 medical categories, cosine similarity)
│   │   ├── slm_client.py                # SLM/LLM client with language locking
│   │   ├── response_builder.py          # LLM response generation engine (1,074 lines)
│   │   ├── guardrails.py                # Intent detection + scope enforcement + output cleanup
│   │   ├── safety_auditor.py            # Token audit + anti-drift safety check
│   │   ├── hybrid_search.py             # 3-lane hybrid RAG (vector + keyword + FAQ)
│   │   ├── search_hierarchical.py       # Hierarchical section-chunk RAG search
│   │   ├── security.py                  # AES-256-GCM encryption + HKDF + blind index
│   │   ├── masking_service.py           # PII masking (phone, email, PAN, Aadhaar)
│   │   ├── conversation.py              # Encrypted conversation storage & retrieval
│   │   ├── escalation.py                # Doctor escalation pipeline + WhatsApp notification
│   │   ├── user_profile.py              # User CRUD with bcrypt + blind phone index
│   │   ├── user_rewards.py              # 4-tier gamification engine
│   │   ├── lead_manager.py              # Conversational lead capture FSM (/newlead)
│   │   ├── clinical_rule_search.py      # Doctor-scoped clinical rule vector search
│   │   ├── medical_knowledge_search.py  # Doctor-scoped medical knowledge retrieval
│   │   ├── intent_decomposer.py         # Multi-intent decomposition (≤3 intents)
│   │   ├── clinic_patient.py            # Patient registry + clinic association
│   │   ├── clinic_registry.py           # Clinic & doctor lookup
│   │   ├── concurrency.py              # Asyncio semaphore for LLM rate limiting
│   │   ├── detect_lang.py               # Telugu/Tinglish/English detection
│   │   ├── translation_service.py       # deep-translator integration
│   │   ├── text_utils.py                # Follow-up extraction, response truncation
│   │   ├── tokenizer_manager.py         # Dual tokenizer (tiktoken + SentencePiece)
│   │   ├── preprocessing.py             # Input text normalization
│   │   ├── sakhi_clinical_prompt.py     # Clinical system prompt templates
│   │   └── user_answers.py              # Survey/questionnaire storage
│   │
│   ├── models/                          # Pydantic request/response schemas
│   │   └── schemas.py                   # RegisterRequest, LoginRequest, ChatRequest, etc.
│   │
│   ├── sql/                             # Database migration scripts (14 files)
│   │   ├── setup_clinic_tables.sql      # Clinical rules + medical knowledge + escalations
│   │   ├── sakhi_knowledge_nodes.sql    # Knowledge graph schema + RPC functions
│   │   ├── setup_hierarchical_rag.sql   # Section chunks + hierarchical search RPC
│   │   ├── setup_encryption.sql         # Encrypted chats table
│   │   ├── setup_rewards.sql            # Rewards + new questions tables
│   │   ├── setup_leads.sql              # Lead generation table
│   │   ├── setup_onboarding.sql         # Chat states table
│   │   ├── migrate_ress_schema.sql      # RESS model migration (display_text, metadata)
│   │   └── ... (6 more migration scripts)
│   │
│   ├── scripts/                         # Developer & operational scripts (14 files)
│   │   ├── terminal_chat.py             # Interactive CLI chat client for testing
│   │   ├── send_marketing_messages.py   # Bulk WhatsApp template message broadcaster
│   │   ├── ingest_hierarchical.py       # Knowledge base ingestion from PDFs
│   │   ├── ingest_json.py               # JSON-based knowledge ingestion
│   │   ├── backfill_embeddings.py       # Batch embedding generation for existing data
│   │   ├── debug_rag.py                 # RAG search debugging tool
│   │   ├── diagnose_llm_failures.py     # LLM failure pattern analyzer
│   │   ├── verify_encryption_v2.py      # Encryption round-trip verification
│   │   └── ... (6 more utility scripts)
│   │
│   └── Data_Ingestion/                  # Knowledge base construction
│       ├── Design Document.txt          # "Antigravity" ingestion blueprint
│       ├── stage_a_architecture_plan.md # Stage A (PDF parsing) architecture
│       ├── stage-b.md                   # Stage B (embedding + indexing) design
│       ├── knowledge_nodes_rows.csv     # 420K+ rows of medical knowledge
│       ├── requirement_clean.txt        # Ingestion requirements spec
│       └── src/                         # Ingestion source scripts
│
├── whatsapp_chatbot/                    # Node.js WhatsApp Middleware
│   ├── index.js                         # Express server (:3000), webhook + internal API
│   ├── controllers/
│   │   └── messageController.js         # Webhook handler, message routing (514 lines)
│   ├── config/
│   │   └── whatsapp.js                  # Meta WhatsApp Cloud API client (sendMessage, media upload)
│   ├── instagram_chatbot/               # Instagram DM Middleware
│   │   ├── index.js                     # Express server (:3001), webhook + internal API
│   │   └── config/
│   │       └── instagram.js             # Meta Instagram Graph API client
│   ├── Dockerfile                       # Node.js container
│   ├── docker-compose.yml               # Middleware container config (host networking)
│   └── package.json                     # Node.js dependencies
│
└── docs/                                # Documentation (this directory)
    ├── ARCHITECTURE.md                  # High-level & low-level architecture
    ├── BUSINESS_ANALYSIS.md             # Business model & investment analysis
    ├── PRODUCT_ANALYSIS.md              # Product features & roadmap
    └── TECHNICAL_OVERVIEW.md            # This file
```

---

## 3. Technology Stack

### 3.1 Backend (Intelligence Engine)

| Package | Version | Purpose |
|:--------|:--------|:--------|
| `fastapi` | 0.115.0 | Async web framework |
| `uvicorn` | 0.32.0 | ASGI server |
| `pydantic` | 2.9.2 | Request/response validation |
| `openai` | 1.52.0 | GPT-4o / GPT-4o-mini / embeddings |
| `httpx` | 0.27.2 | Async HTTP client with connection pooling |
| `supabase` | 2.8.1 | PostgreSQL + pgvector client |
| `cryptography` | 42.0.5 | AES-256-GCM encryption, HKDF key derivation |
| `passlib[bcrypt]` | 1.7.4 | Password hashing |
| `tiktoken` | 0.8.0 | OpenAI token counting |
| `sentencepiece` | 0.2.1 | Telugu SLM tokenizer |
| `numpy` | ≥2.1.0 | Vector math (cosine similarity) |
| `deep-translator` | 1.11.4 | Translation (Telugu/English) |
| `indic-transliteration` | 2.3.57 | Script transliteration |
| `python-dotenv` | 1.0.1 | Environment variable loading |
| `requests` | 2.32.3 | Synchronous HTTP (health checks) |

### 3.2 Middleware (Message Delivery)

| Package | Purpose |
|:--------|:--------|
| `express` | HTTP server framework |
| `axios` | HTTP client for Meta API + backend calls |
| `dotenv` | Environment variable management |

### 3.3 Infrastructure

| Component | Technology |
|:----------|:----------|
| Database | Supabase (PostgreSQL 15 + pgvector extension) |
| Container Runtime | Docker + docker-compose |
| Networking | Host networking mode (`network_mode: "host"`) |
| Logging | Python `logging` + Docker `json-file` driver |
| Health Checks | HTTP GET on `/` (both services) |

---

## 4. Environment Configuration

### 4.1 Backend Environment Variables (`.env`)

| Variable | Required | Description |
|:---------|:---------|:-----------|
| `SUPABASE_URL` | ✅ | Supabase project REST API URL |
| `SUPABASE_SERVICE_ROLE` | ✅ | Supabase service role key (bypasses RLS) |
| `OPENAI_API_KEY` | ✅ | OpenAI API key for GPT + embeddings |
| `PORT` | ⬜ | Backend port (default: `8000`) |
| `NODE_SERVICE_URL` | ✅ | URL of WhatsApp Node.js middleware (e.g., `http://localhost:3000`) |
| `INTERNAL_API_SECRET` | ✅ | Shared secret for backend → middleware authentication |
| `MIDDLEWARE_CALLBACK_URL` | ⬜ | URL for async callbacks (buffered question replay) |
| `GOOGLE_PLACES_API_KEY` | ⬜ | Google Places API key for hospital search |
| `SLM_ENDPOINT_URL` | ⬜ | Custom SLM inference endpoint (Groq/vLLM) |
| `SLM_API_KEY` | ⬜ | SLM endpoint API key |
| `SLM_MODEL_NAME` | ⬜ | SLM model identifier |
| `CHAT_MASTER_KEY` | ⬜ | 64-char hex master key for AES encryption (auto-generated if missing) |
| `BLIND_INDEX_PEPPER` | ⬜ | HMAC pepper for phone number blind indexing |
| `MAX_LLM_CONCURRENCY` | ⬜ | Semaphore limit for concurrent LLM calls (default: `50`) |
| `HTTPX_MAX_KEEPALIVE` | ⬜ | Connection pool keepalive limit (default: `20`) |
| `HTTPX_MAX_CONNECTIONS` | ⬜ | Connection pool max connections (default: `100`) |
| `HOSPITAL_SEARCH_RADIUS_METERS` | ⬜ | Google Places search radius (default: `10000`) |

### 4.2 WhatsApp Middleware Environment Variables

| Variable | Required | Description |
|:---------|:---------|:-----------|
| `VERIFY_TOKEN` | ✅ | Meta webhook verification token |
| `WHATSAPP_TOKEN` | ✅ | WhatsApp Business API bearer token |
| `PHONE_NUMBER_ID` | ✅ | WhatsApp Business phone number ID |
| `SAKHI_API_URL` | ✅ | Backend chat endpoint (default: `http://localhost:8000/sakhi/chat`) |
| `SAKHI_API_TIMEOUT_MS` | ⬜ | Timeout for backend requests |
| `INTERNAL_API_SECRET` | ✅ | Shared secret matching backend config |

### 4.3 Instagram Middleware Environment Variables

| Variable | Required | Description |
|:---------|:---------|:-----------|
| `IG_VERIFY_TOKEN` | ✅ | Instagram webhook verification token |
| `IG_PAGE_ACCESS_TOKEN` | ✅ | Instagram Page access token |
| `SAKHI_API_URL` | ✅ | Backend chat endpoint |

---

## 5. Codebase Module Reference

### 5.1 Module Dependency Graph

```
main.py
  ├── routers/webhook.py
  │     ├── services/routing_engine.py
  │     │     ├── services/intent_extractor.py  (GPT-4o-mini NER)
  │     │     ├── services/post_care_service.py
  │     │     ├── modules/user_profile.py
  │     │     └── supabase_client.py
  │     ├── services/clinical_chat_service.py
  │     │     ├── modules/clinical_rule_search.py
  │     │     ├── modules/medical_knowledge_search.py
  │     │     ├── modules/escalation.py
  │     │     ├── modules/safety_auditor.py
  │     │     └── modules/sakhi_clinical_prompt.py
  │     ├── services/chat_flow_service.py
  │     │     ├── modules/response_builder.py  (1,074 lines — largest module)
  │     │     │     ├── modules/detect_lang.py
  │     │     │     ├── modules/text_utils.py
  │     │     │     ├── modules/hybrid_search.py
  │     │     │     │     ├── supabase_client.py (RPC calls)
  │     │     │     │     └── rag.py (embedding generation)
  │     │     │     └── modules/concurrency.py
  │     │     ├── modules/guardrails.py
  │     │     ├── modules/masking_service.py
  │     │     └── modules/user_rewards.py
  │     ├── services/onboarding_service.py
  │     ├── modules/conversation.py
  │     │     └── modules/security.py (AES-256-GCM)
  │     └── modules/lead_manager.py
  │
  ├── routers/chat.py
  │     └── services/chat_flow_service.py (shared with webhook)
  │
  ├── routers/user.py
  │     └── modules/user_profile.py
  │
  ├── routers/hospital.py
  │     └── services/places_service.py
  │
  └── supabase_client.py (singleton, imported everywhere)
        └── httpx.AsyncClient (connection-pooled)
```

### 5.2 Module Size Distribution

| Module | Lines | Bytes | Complexity |
|:-------|:------|:------|:-----------|
| `response_builder.py` | 1,074 | 44,372 | 🔴 Very High — Core LLM orchestration |
| `slm_client.py` | 572 | ~20K | 🔴 High — SLM/LLM client + language guardrails |
| `messageController.js` | 514 | 15,709 | 🔴 High — WhatsApp webhook + reply construction |
| `model_gateway.py` | 421 | ~17K | 🟡 Medium — Semantic routing singleton |
| `clinical_chat_service.py` | 420 | 14,355 | 🟡 Medium — Clinical triage pipeline |
| `guardrails.py` | 420 | ~15K | 🟡 Medium — Scope enforcement |
| `post_care_service.py` | 366 | ~14K | 🟡 Medium — Symptom/education tracks |
| `chat_flow_service.py` | 352 | 14,638 | 🟡 Medium — Main chat flow |
| `routing_engine.py` | 304 | 13,204 | 🟡 Medium — Pre/post-care routing |
| `user_profile.py` | 222 | 6,900 | 🟢 Low — User CRUD |
| `hybrid_search.py` | 182 | 6,390 | 🟢 Low — RAG fusion logic |
| `tokenizer_manager.py` | 189 | 6,445 | 🟢 Low — Dual tokenizer |
| `lead_manager.py` | 161 | 5,868 | 🟢 Low — Lead FSM |
| `user_rewards.py` | 158 | 5,748 | 🟢 Low — Gamification |
| `escalation.py` | 153 | 5,742 | 🟢 Low — Escalation pipeline |
| `search_hierarchical.py` | 133 | 4,939 | 🟢 Low — Hierarchical RAG |
| `security.py` | 120 | 3,920 | 🟢 Low — Cryptography |
| `conversation.py` | 109 | 4,010 | 🟢 Low — Encrypted storage |
| `safety_auditor.py` | 87 | 3,146 | 🟢 Low — Token audit |
| `intent_extractor.py` | 81 | 2,841 | 🟢 Low — NER |
| `masking_service.py` | 52 | 2,030 | 🟢 Low — PII masking |
| `concurrency.py` | 13 | 356 | 🟢 Trivial — Semaphore wrapper |

---

## 6. Data Flow & Request Pipeline

### 6.1 WhatsApp Inbound Request Flow

```
Meta WhatsApp Cloud API
  │
  │ POST /webhook (JSON payload)
  ▼
whatsapp_chatbot/index.js
  │
  │ messageController.handleIncomingMessage()
  │   ├─ extractMessageInfo(body) — parses text, button replies, list replies
  │   ├─ Deduplication check (in-memory Map, TTL 5min, cap 500)
  │   └─ handleChatAndReply(messageInfo)
  │        │
  │        │ POST http://localhost:8000/webhook/whatsapp_incoming
  │        ▼
Whatsapp_backend/routers/webhook.py
  │
  │ handle_whatsapp_incoming()
  │   ├─ [1] Idempotency check (DB-level via message_id)
  │   ├─ [2] Interactive reply intercept (hospital detail, pincode)
  │   ├─ [3] User resolution (blind phone index lookup)
  │   │       ├─ Existing user → get profile
  │   │       └─ New user → create_partial_user → onboarding flow
  │   ├─ [4] Onboarding intercept (if step != null)
  │   │       ├─ Name extraction (LLM-powered)
  │   │       ├─ Clinic selection (numbered list)
  │   │       └─ If user sent medical question → buffer it
  │   ├─ [5] State intercept layer
  │   │       ├─ Triage hard-stop check
  │   │       └─ Lead flow (/newlead) state machine
  │   ├─ [6] Routing engine (services/routing_engine.py)
  │   │       ├─ Entity extraction (GPT-4o-mini)
  │   │       ├─ Patient lookup + timeline retrieval
  │   │       ├─ Treatment matching (cosine ≥ 0.60)
  │   │       └─ Decision: pre-care vs post-care vs direct reply
  │   ├─ [7] Chat processing (pre-care or clinical pipeline)
  │   └─ [8] Response delivery
  │           ├─ Text reply via Node.js middleware
  │           ├─ Infographic image (if available)
  │           ├─ YouTube link (if available)
  │           └─ Follow-up list menu (if follow-ups generated)
  ▼
whatsapp_chatbot/messageController.js
  │
  │ handleChatAndReply() — receives response payload
  │   ├─ sendMessage(phone, replyText)
  │   ├─ uploadExternalImageAsMedia(infographic_url) → sendMessage(phone, mediaObj)
  │   ├─ buildFollowUpList(follow_ups) → sendMessage(phone, listMessage)
  │   └─ YouTube link: append to text body
  ▼
Meta WhatsApp Cloud API → User's phone
```

### 6.2 Response Payload Structure

```json
{
  "reply": "Your answer text here...",
  "mode": "medical|general|emergency|post_care_greeting|lead_input|...",
  "language": "English|Telugu|Tinglish",
  "route": "openai_rag|openai_direct|slm_rag|slm_direct|hospital_search|post-care",
  "intent": "ivf cost inquiry",
  "youtube_link": "https://youtube.com/...",
  "infographic_url": "https://storage.../infographic.png",
  "specialty": "Fertility",
  "zip_code": "530001"
}
```

---

## 7. AI Pipeline & Model Architecture

### 7.1 Models Used

| Model | Provider | Purpose | Context Window | Cost Profile |
|:------|:---------|:--------|:-------------|:-------------|
| `gpt-4o` | OpenAI | Complex medical Q&A, response generation | 128K tokens | $5/$15 per 1M tokens |
| `gpt-4o-mini` | OpenAI | Classification, NER, smalltalk, safety checks, name extraction | 128K tokens | $0.15/$0.60 per 1M tokens |
| `text-embedding-3-small` | OpenAI | Query/document embeddings (1536 dims) | 8K tokens | $0.02 per 1M tokens |

### 7.2 Semantic Router (ModelGateway)

**File:** [`modules/model_gateway.py`](file:///c:/Users/harin/Downloads/sakhi/Whatsapp_backend/modules/model_gateway.py)

The `ModelGateway` is a **singleton** that precomputes anchor embeddings at startup for 3 categories:

1. **Small Talk** — 32 example phrases (greetings, thanks, identity questions)
2. **Simple Medical** — 23 category anchors (IVF, IUI, ICSI, fertility, pregnancy, PCOS, etc. — each with 3-8 example questions)
3. **Complex Medical** — 10 example phrases (multi-factor queries, comparison questions)

**Routing Algorithm:**
```python
user_embedding = embed(user_message)

smalltalk_sim = cosine_similarity(user_embedding, smalltalk_anchor_mean)
simple_sim    = max(cosine_similarity(user_embedding, cat_mean) for cat in 23_categories)
complex_sim   = cosine_similarity(user_embedding, complex_anchor_mean)

if smalltalk_sim >= 0.45:    → SLM_DIRECT  (no RAG needed)
if simple_sim >= 0.45:       → SLM_RAG     (simple RAG sufficient)
if complex_sim > simple_sim: → OPENAI_RAG  (full GPT-4o + RAG)
else:                        → OPENAI_RAG  (default fallback)
```

### 7.3 Hybrid RAG System

**File:** [`modules/hybrid_search.py`](file:///c:/Users/harin/Downloads/sakhi/Whatsapp_backend/modules/hybrid_search.py)

```
                  User Query
                      │
                      ▼
            ┌────────────────────┐
            │ Generate Embedding  │ (text-embedding-3-small, 1536 dims)
            └─────────┬──────────┘
                      │
          ┌───────────┼───────────────────┐
          ▼           ▼                   ▼
    ┌──────────┐  ┌──────────┐     ┌──────────┐
    │ LANE A   │  │ LANE B   │     │ LANE C   │
    │ Vector   │  │ Keyword  │     │ FAQ      │
    │ Search   │  │ TSVECTOR │     │ Search   │
    │ (pgvec)  │  │ (FTS)    │     │ (pgvec)  │
    │          │  │          │     │          │
    │ RPC:     │  │ RPC:     │     │ RPC:     │
    │ match_   │  │ match_   │     │ match_   │
    │ sakhi_   │  │ sakhi_   │     │ faq      │
    │ knowledge│  │ knowledge│     │          │
    │ _nodes_  │  │ _nodes_  │     │          │
    │ vector   │  │ keyword  │     │          │
    └─────┬────┘  └─────┬────┘     └─────┬────┘
          │             │                │
          │        Log-Sigmoid           │
          │        Normalization         │
          │         f(rank)              │
          │             │                │
          ▼             ▼                ▼
    ┌─────────────────────────────────────────┐
    │         WEIGHTED FUSION GATE            │
    │                                         │
    │   final_score = 0.7 × vector_sim        │
    │                + 0.3 × keyword_norm     │
    │                                         │
    │   Integrity Check:                      │
    │     if best_score < 0.85 →              │
    │       "CONFIDENCE BELOW THRESHOLD"      │
    └───────────────┬─────────────────────────┘
                    │
                    ▼
              Top-K Results
              (+ FAQ YouTube/Infographic links)
```

**Log-Sigmoid Normalization (Lane B):**
```python
def log_sigmoid_normalization(rank, k=1.0, x0=2.0):
    log_rank = math.log(1 + rank)                    # Step A: logarithmic dampening
    normalized = 1 / (1 + math.exp(-k * (log_rank - x0)))  # Step B: sigmoid compression
    return normalized  # output: 0.0 to 1.0
```

### 7.4 Message Classification

**File:** [`modules/response_builder.py`](file:///c:/Users/harin/Downloads/sakhi/Whatsapp_backend/modules/response_builder.py)

The `classify_message()` function uses GPT-4o-mini with a structured JSON response format:

```json
{
  "language": "English|Telugu|Tinglish|Hindi",
  "signal": "SMALLTALK|HOSPITAL_SEARCH|MEDICAL",
  "specialty": "Fertility|General|Cardiology|..."
}
```

### 7.5 Concurrency Limiter

**File:** [`modules/concurrency.py`](file:///c:/Users/harin/Downloads/sakhi/Whatsapp_backend/modules/concurrency.py)

All LLM calls are wrapped with `guarded_llm_call()` — an asyncio semaphore that limits concurrent OpenAI API calls:

```python
MAX_LLM_CONCURRENCY = int(os.getenv("MAX_LLM_CONCURRENCY", "50"))
_llm_semaphore = asyncio.Semaphore(MAX_LLM_CONCURRENCY)

async def guarded_llm_call(coro):
    async with _llm_semaphore:
        return await coro
```

### 7.6 Tokenizer Architecture

**File:** [`modules/tokenizer_manager.py`](file:///c:/Users/harin/Downloads/sakhi/Whatsapp_backend/modules/tokenizer_manager.py)

Dual-tokenizer design for hybrid SLM/LLM architecture:

| Tokenizer | Library | Model | Use Case |
|:----------|:--------|:------|:---------|
| GPT-4o tokenizer | `tiktoken` | `cl100k_base` | Token counting for OpenAI billing/context limits |
| Telugu SLM tokenizer | `sentencepiece` | `modules/assets/telugu.model` | Token counting for custom SLM inference |

Key methods:
- `count_tokens_gpt(text)` — OpenAI token count
- `count_tokens_slm(text)` — SLM token count
- `trim_context_to_budget(context, max_tokens)` — Truncates context to fit model window

---

## 8. Database Schema & RPC Functions

### 8.1 Core Tables

| Table | Purpose | Key Columns |
|:------|:--------|:------------|
| `sakhi_users` | User profiles | `user_id`, `phone_number` (HMAC hash), `name`, `email`, `password_hash` (bcrypt), `role`, `rewards`, `preferred_language` |
| `sakhi_encrypted_chats` | Conversation logs (encrypted) | `user_id`, `role` (user/sakhi), `message_content` (AES-GCM ciphertext), `language`, `chat_id` |
| `sakhi_chat_states` | User state machine storage | `user_id`, `context` (JSONB — onboarding step, lead flow, triage state, zip code) |
| `sakhi_knowledge_nodes` | Knowledge graph (hierarchical) | `node_id`, `node_level`, `title`, `content`, `display_text`, `parent_id`, `metadata` (JSONB), `embedding` (vector 1536) |
| `sakhi_clinical_rules` | Doctor decision rules | `clinic_id`, `doctor_id`, `department`, `treatment_stage`, `scenario`, `emergency_flag`, `provisional_answer`, `embedding` (vector 1536) |
| `sakhi_medical_knowledge` | Doctor medical content | `clinic_id`, `doctor_id`, `category`, `content`, `embedding` (vector 1536) |
| `sakhi_escalations` | Escalation events | `patient_id`, `doctor_id`, `clinic_id`, `reason`, `status`, `conversation_context` (JSONB) |
| `sakhi_clinic_patients` | Patient registry | `id`, `name`, `mobile`, `clinic_id`, `assigned_doctor_id` |
| `sakhi_clinic_users` | Doctors/staff | `id`, `name`, `whatsapp_number`, `clinic_id` |
| `sakhi_clinic_leads` | Lead generation | `name`, `phone`, `age`, `gender`, `problem`, `status`, `source` |
| `sakhi_new_questions` | Knowledge flywheel | `user_id`, `question`, `similarity_score` |
| `faq` | FAQ with multimedia | `question`, `answer`, `youtube_link`, `infographic_url`, `embedding` (vector 1536) |
| `sakhi_clinic_patient_timeline_view` | Patient timeline (view) | `patient_id`, `event_type`, `title`, `description`, `event_date` |

### 8.2 RPC Functions (PostgreSQL)

| Function | Parameters | Purpose |
|:---------|:----------|:--------|
| `hierarchical_search` | `query_embedding`, `match_threshold`, `match_count` | Vector search on section chunks |
| `match_faq` | `query_embedding`, `match_count` | Vector search on FAQ table |
| `match_sakhi_knowledge_nodes_vector` | `query_embedding`, `match_threshold`, `match_count` | Vector search on knowledge nodes |
| `match_sakhi_knowledge_nodes_keyword` | `query_text`, `match_count` | TSVECTOR full-text search on knowledge nodes |
| `match_clinical_rules_vector` | `query_embedding`, `p_clinic_id`, `p_doctor_id`, `p_department`, `p_treatment_stage`, `match_threshold`, `match_count` | Multi-tenant clinical rule search |
| `match_medical_knowledge_vector` | `query_embedding`, `p_clinic_id`, `p_doctor_id`, `match_threshold`, `match_count` | Multi-tenant medical knowledge search |

### 8.3 Database Client Architecture

**File:** [`supabase_client.py`](file:///c:/Users/harin/Downloads/sakhi/Whatsapp_backend/supabase_client.py)

Provides both **synchronous** and **asynchronous** wrappers over the Supabase REST API:

| Function | Sync/Async | Operation |
|:---------|:----------|:----------|
| `supabase_insert(table, data)` | Sync | INSERT |
| `supabase_select(table, select, filters, limit)` | Sync | SELECT |
| `async_supabase_select(table, select, filters)` | Async | SELECT (httpx) |
| `async_supabase_insert(table, data)` | Async | INSERT (httpx) |
| `async_supabase_update(table, match, data)` | Async | UPDATE (httpx) |
| `async_supabase_rpc(function_name, params)` | Async | RPC call (httpx) |
| `generate_user_id()` | Sync | UUID4 generation |

Connection pool configuration (httpx):
```python
_async_http_client = httpx.AsyncClient(
    limits=httpx.Limits(
        max_keepalive_connections=int(os.getenv("HTTPX_MAX_KEEPALIVE", 20)),
        max_connections=int(os.getenv("HTTPX_MAX_CONNECTIONS", 100)),
        keepalive_expiry=30
    ),
    timeout=httpx.Timeout(30.0, connect=5.0),
)
```

---

## 9. Security & Cryptography Implementation

### 9.1 Message Encryption (AES-256-GCM)

**File:** [`modules/security.py`](file:///c:/Users/harin/Downloads/sakhi/Whatsapp_backend/modules/security.py)

```
Master Key (CHAT_MASTER_KEY env var — 32 bytes)
       │
       │ HKDF (SHA-256, salt=user_id, info=b"chat")
       ▼
Per-User Key (32 bytes, unique per user_id)
       │
       │ AES-GCM Encrypt
       │   nonce = os.urandom(12)  ← NIST recommended
       │   ciphertext = AES-GCM(key, nonce, plaintext)
       ▼
Stored in DB: Base64(nonce || ciphertext)
```

**Key properties:**
- Each user gets a **deterministic, unique 32-byte key** derived from the master key
- **12-byte random nonce** per message (never reused — generated with `os.urandom`)
- **Authenticated encryption** — tampering detection built into GCM mode
- **Zero plaintext storage** — all messages in `sakhi_encrypted_chats` are ciphertext
- If `CHAT_MASTER_KEY` is not set, a random 32-byte key is generated (data doesn't survive restart)

### 9.2 PII Masking

**File:** [`modules/masking_service.py`](file:///c:/Users/harin/Downloads/sakhi/Whatsapp_backend/modules/masking_service.py)

```
User message: "My number is 9876543210 and email is test@gmail.com"
                    │
                    ▼ MaskingService.mask()
Masked message: "My number is <PHONE_A1B2C3> and email is <EMAIL_D4E5F6>"
                    │
                    ▼ → sent to OpenAI LLM
LLM response: "Your contact <PHONE_A1B2C3> is noted..."
                    │
                    ▼ MaskingService.unmask()
Final response: "Your contact 9876543210 is noted..."
```

Regex patterns detected:
| Type | Pattern | Example Match |
|:-----|:--------|:-------------|
| Phone (India) | `\b(?:\+91[\-\s]?)?[6-9]\d{9}\b` | `+91 9876543210` |
| Email | Standard RFC pattern | `user@example.com` |
| PAN | `\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b` | `ABCDE1234F` |
| Aadhaar | `\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b` | `1234 5678 9012` |

### 9.3 Phone Number Blind Index

**File:** [`modules/security.py`](file:///c:/Users/harin/Downloads/sakhi/Whatsapp_backend/modules/security.py) — `blind_index_phone()`

```python
def blind_index_phone(phone_number: str) -> str:
    pepper = os.getenv("BLIND_INDEX_PEPPER").encode('utf-8')
    h = hmac.new(pepper, phone_number.encode('utf-8'), hashlib.sha256)
    return h.hexdigest()  # 64-char hex — non-reversible
```

The actual phone number is **never stored** in `sakhi_users.phone_number`. Only the HMAC-SHA256 hash is stored, enabling lookup without exposure.

---

## 10. Concurrency Model & Performance

### 10.1 Async Architecture

| Component | Pattern | Mechanism |
|:----------|:--------|:----------|
| Web server | Async event loop | `uvicorn` ASGI server with `asyncio` |
| LLM calls | Async with connection pooling | `AsyncOpenAI` + shared `httpx.AsyncClient` |
| Database | Async HTTP calls | `async_supabase_*()` via `httpx.AsyncClient` |
| Background tasks | Fire-and-forget | `BackgroundTasks` (post-response) + `asyncio.create_task()` (in-flight) |
| Parallel execution | Concurrent gather | `asyncio.gather(medical_task, intent_task)` |
| Rate limiting | Semaphore | `asyncio.Semaphore(50)` for LLM concurrency |

### 10.2 Connection Pool Configuration

| Pool | Max Keepalive | Max Connections | Timeout | Connect Timeout |
|:-----|:-------------|:----------------|:--------|:---------------|
| Supabase (DB) | 20 (configurable) | 100 (configurable) | 30s | 5s |
| OpenAI (embeddings) | 50 | 200 | 60s | 5s |
| OpenAI (response builder) | 100 | 500 | 60s | 5s |
| Routing engine | 50 | 100 | 30s | 5s |
| Safety auditor | 50 | 100 | 30s | 5s |

### 10.3 Background Task Types

| Task | Trigger | Mechanism | Latency Impact |
|:-----|:--------|:----------|:---------------|
| Save user message | Every request | `asyncio.create_task()` | None |
| Save Sakhi message | Every response | `BackgroundTasks.add_task()` | None |
| Award reward points | Every response | `asyncio.create_task()` | None |
| Store novel question | similarity < 0.4 | `asyncio.create_task()` | None |
| Create escalation | Emergency/no-rule | `asyncio.create_task()` | None |
| Notify doctor (WhatsApp) | Escalation event | `asyncio.create_task()` | None |
| Pre-generate follow-up answers | Medical response | `BackgroundTasks.add_task()` | None |
| Replay buffered question | Onboarding complete | `asyncio.create_task()` | None |

---

## 11. Data Ingestion Pipeline

### 11.1 Architecture Overview

**Directory:** [`Data_Ingestion/`](file:///c:/Users/harin/Downloads/sakhi/Whatsapp_backend/Data_Ingestion)

The "Antigravity" ingestion blueprint transforms medical PDFs into searchable knowledge nodes:

```
Medical PDF
  │
  [1] Layout Parsing (Docling)
  │     → Bounding boxes, font sizes, coordinates
  │
  [2] Semantic Normalization
  │     → Remove page numbers, footers, headers
  │     → Discard text within 20px of page edges
  │
  [3] Hierarchy Inference (Font-Size Thresholds)
  │     → font_size > 20pt  → H1 (Course/Topic)
  │     → font_size 16-20pt → H2 (Module/Section)
  │     → font_size 12-15pt → H3 (Subsection)
  │
  [4] Holding Pen (Buffer)
  │     → Temporary storage before linking
  │
  [5] Tree Construction
  │     → Group body text under H3/H2 headers
  │     → 800-token parent nodes (synthesis context)
  │
  [6] Re-grafting (Cross-Page Stitching)
  │     → Merge split tables/paragraphs across pages
  │
  [7] Slicing
  │     → Parent (800 tokens) → 4 Children (200 tokens each)
  │     → RecursiveCharacterTextSplitter
  │
  [8] Path Stamping ("DNA")
  │     → Each chunk gets: "IVF_Success > Age_35 > Clinical_Stats"
  │     → Prepended to chunk text for baked-in context
  │
  [9] Final Check (Gatekeeper)
       → Verify child→parent linkage integrity
       → Insert into sakhi_knowledge_nodes
```

### 11.2 Ingestion Scripts

| Script | Purpose |
|:-------|:--------|
| [`scripts/ingest_hierarchical.py`](file:///c:/Users/harin/Downloads/sakhi/Whatsapp_backend/scripts/ingest_hierarchical.py) | PDF → hierarchical knowledge node ingestion |
| [`scripts/ingest_json.py`](file:///c:/Users/harin/Downloads/sakhi/Whatsapp_backend/scripts/ingest_json.py) | JSON → knowledge node ingestion |
| [`scripts/backfill_embeddings.py`](file:///c:/Users/harin/Downloads/sakhi/Whatsapp_backend/scripts/backfill_embeddings.py) | Generate embeddings for nodes missing embeddings |
| [`scripts/insert_kb_embedding_rest.py`](file:///c:/Users/harin/Downloads/sakhi/Whatsapp_backend/scripts/insert_kb_embedding_rest.py) | Insert KB entries with embedding via REST |

---

## 12. Deployment & Infrastructure

### 12.1 Docker Configuration

**Backend** ([`Whatsapp_backend/docker-compose.yml`](file:///c:/Users/harin/Downloads/sakhi/Whatsapp_backend/docker-compose.yml)):
```yaml
services:
  sakhi-backend:
    build: .
    container_name: sakhi-whatsapp-backend
    network_mode: "host"     # Direct access to localhost:3000 (Node.js)
    env_file: [.env]
    restart: unless-stopped
    volumes: [./logs:/app/logs]
    healthcheck:
      test: python -c "import requests; requests.get('http://localhost:8000/')"
      interval: 30s, timeout: 10s, retries: 3, start_period: 40s
```

**Middleware** ([`whatsapp_chatbot/docker-compose.yml`](file:///c:/Users/harin/Downloads/sakhi/whatsapp_chatbot/docker-compose.yml)):
```yaml
services:
  whatsapp-chatbot:
    build: .
    container_name: whatsapp-chatbot
    network_mode: "host"     # Direct access to localhost:8000 (Python)
    restart: unless-stopped
    logging:
      driver: "json-file"
      options: {max-size: "10m", max-file: "3"}
    healthcheck:
      test: wget --spider http://localhost:3000/
      interval: 30s, timeout: 10s, retries: 3, start_period: 10s
```

### 12.2 Startup Commands

```bash
# Backend
cd Whatsapp_backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000

# WhatsApp Middleware
cd whatsapp_chatbot
npm install
node index.js

# Instagram Middleware
cd whatsapp_chatbot/instagram_chatbot
npm install
node index.js

# Docker (production)
cd Whatsapp_backend && docker-compose up -d --build
cd whatsapp_chatbot && docker-compose up -d --build
```

### 12.3 Networking

Both services use `network_mode: "host"` — meaning they share the host's network stack:
- Python backend (`:8000`) can call Node.js middleware at `localhost:3000`
- Node.js middleware can call Python backend at `localhost:8000`
- No Docker network configuration needed
- **Tradeoff:** No container network isolation (acceptable for single-server deployment)

---

## 13. Developer Scripts & Tooling

| Script | Command | Purpose |
|:-------|:--------|:--------|
| [`scripts/terminal_chat.py`](file:///c:/Users/harin/Downloads/sakhi/Whatsapp_backend/scripts/terminal_chat.py) | `python scripts/terminal_chat.py` | Interactive CLI chat client for testing the backend |
| [`scripts/debug_rag.py`](file:///c:/Users/harin/Downloads/sakhi/Whatsapp_backend/scripts/debug_rag.py) | `python scripts/debug_rag.py` | Debug RAG search results for a given query |
| [`scripts/diagnose_llm_failures.py`](file:///c:/Users/harin/Downloads/sakhi/Whatsapp_backend/scripts/diagnose_llm_failures.py) | `python scripts/diagnose_llm_failures.py` | Analyze patterns in LLM response failures |
| [`scripts/verify_encryption_v2.py`](file:///c:/Users/harin/Downloads/sakhi/Whatsapp_backend/scripts/verify_encryption_v2.py) | `python scripts/verify_encryption_v2.py` | Verify encryption/decryption round-trip integrity |
| [`scripts/verify_telugu_output.py`](file:///c:/Users/harin/Downloads/sakhi/Whatsapp_backend/scripts/verify_telugu_output.py) | `python scripts/verify_telugu_output.py` | Test Telugu/Tinglish output enforcement |
| [`scripts/inspect_medical_db.py`](file:///c:/Users/harin/Downloads/sakhi/Whatsapp_backend/scripts/inspect_medical_db.py) | `python scripts/inspect_medical_db.py` | Inspect medical knowledge DB contents |
| [`scripts/search_kb_rest.py`](file:///c:/Users/harin/Downloads/sakhi/Whatsapp_backend/scripts/search_kb_rest.py) | `python scripts/search_kb_rest.py` | Test KB vector search via REST |
| [`scripts/trigger_chat.py`](file:///c:/Users/harin/Downloads/sakhi/Whatsapp_backend/scripts/trigger_chat.py) | `python scripts/trigger_chat.py` | Trigger a chat request programmatically |
| [`scripts/send_marketing_messages.py`](file:///c:/Users/harin/Downloads/sakhi/Whatsapp_backend/scripts/send_marketing_messages.py) | `python scripts/send_marketing_messages.py` | Broadcast WhatsApp template marketing messages |
| [`scripts/apply_sql.py`](file:///c:/Users/harin/Downloads/sakhi/Whatsapp_backend/scripts/apply_sql.py) | `python scripts/apply_sql.py` | Apply SQL migration scripts to Supabase |

---

## 14. Key Technical Decisions & Tradeoffs

| Decision | Rationale | Tradeoff |
|:---------|:---------|:---------|
| **Supabase over self-hosted PostgreSQL** | Managed hosting, built-in pgvector, REST API, zero DevOps | Vendor lock-in, REST overhead vs. direct PG connection |
| **httpx over supabase-py for async** | Need async DB calls; `supabase-py` is sync-only | Two client implementations (sync + async), manual REST construction |
| **Host networking over Docker bridge** | Simplest inter-service communication (localhost) | No network isolation, single-server only |
| **Per-user HKDF key derivation** | Each user's data is independently encrypted | Key rotation requires re-encryption of all messages |
| **PII masking (regex) over fine-tuned model** | Deterministic, fast (<5ms), no API call needed | May miss edge cases (names, addresses not covered) |
| **Singleton ModelGateway with precomputed embeddings** | One-time startup cost, zero latency per request for routing | Memory usage (~100MB for anchor vectors), startup delay |
| **GPT-4o-mini for classification** | Low cost ($0.15/1M), fast, good enough for routing decisions | API dependency for every message (no offline classification) |
| **Background tasks vs. message queue** | No infrastructure dependency (no Redis/RabbitMQ needed) | No retry semantics for failed background tasks, tasks lost on crash |
| **In-memory deduplication (Node.js)** | Simple, no external dependency | State lost on restart, memory-bounded (500 entries) |
| **Bcrypt for password hashing** | Industry standard, slow-by-design for brute-force resistance | Higher CPU per login request vs. SHA-256 |

---

## 15. Known Limitations & Technical Debt

| Area | Limitation | Impact | Recommended Fix |
|:-----|:----------|:-------|:---------------|
| **Background tasks** | No retry mechanism for failed `asyncio.create_task()` calls | Silent failure of rewards, escalations, message saves | Add task result logging or use a proper task queue |
| **In-memory dedup (Node.js)** | 500-entry cap, lost on restart | Potential duplicate processing after middleware restart | Move to Redis-based deduplication |
| **Sync DB calls** | `conversation.py` uses synchronous `supabase_insert/select` | Blocks event loop during message save/retrieve | Migrate to `async_supabase_*` wrappers |
| **No connection pooling for sync client** | `supabase-py` SDK creates new HTTP connection per call | Higher latency for sync operations | Already mitigated by async wrappers for most paths |
| **Single ModelGateway instance** | Anchor embeddings loaded once at startup | Cannot add new categories without restart | Add hot-reload capability or config-driven anchors |
| **Hardcoded thresholds** | Routing thresholds (0.45, 0.40, 0.60) are in source code | Cannot tune without code deployment | Move to config/env vars or admin dashboard |
| **No request tracing** | No correlation IDs across service boundaries | Difficult to debug cross-service issues | Add `X-Request-ID` header propagation |
| **No structured logging** | Python `logging` module with string formatting | Hard to parse in log aggregation tools | Migrate to structured JSON logging |
| **No automated tests** | No test suite in repository | Regression risk on every change | Add pytest + integration tests |
| **Large response_builder.py** | 1,074 lines, multiple responsibilities | Hard to maintain, high cognitive load | Split into `classifier.py`, `medical_responder.py`, `smalltalk_responder.py` |

---

*Technical overview generated from line-by-line codebase analysis — Sakhi Platform v2.0*
