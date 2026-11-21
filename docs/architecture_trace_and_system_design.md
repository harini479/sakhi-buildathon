# Sakhi WhatsApp Backend: Architecture Trace and System Design

## Scope

This document traces the current architecture directly from the codebase and SQL scripts in this repository. It describes:

- Runtime components
- Request and response flow
- State management
- Retrieval and knowledge ingestion
- Database model
- Deployment shape
- Current design constraints and risks

Primary implementation references:

- [main.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/main.py)
- [modules/response_builder.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/modules/response_builder.py)
- [modules/slm_client.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/modules/slm_client.py)
- [modules/model_gateway.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/modules/model_gateway.py)
- [modules/search_hierarchical.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/modules/search_hierarchical.py)
- [modules/lead_manager.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/modules/lead_manager.py)
- [supabase_client.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/supabase_client.py)
- [sql/setup_hierarchical_rag.sql](/d:/Ottobon/Sakhi-Whatsapp-Backend/sql/setup_hierarchical_rag.sql)
- [sql/setup_leads_strict.sql](/d:/Ottobon/Sakhi-Whatsapp-Backend/sql/setup_leads_strict.sql)
- [sql/setup_rewards.sql](/d:/Ottobon/Sakhi-Whatsapp-Backend/sql/setup_rewards.sql)
- [sql/update_faq_rpc.sql](/d:/Ottobon/Sakhi-Whatsapp-Backend/sql/update_faq_rpc.sql)

## Executive Summary

The backend is a FastAPI service that acts as an orchestration layer around:

- Supabase/Postgres for persistent state and vector search
- OpenAI for embeddings, translation, classification, rewriting, and most response generation
- A semantic router that decides whether a request is treated as small talk, simple medical, or complex medical

The system is mostly stateless at the API layer. Durable state is externalized to Supabase:

- User profile and onboarding state in `sakhi_users`
- Chat history in `sakhi_conversations`
- Lead-capture workflow state in `sakhi_chat_states`
- Reward points in `sakhi_users.rewards`
- Novel question capture in `sakhi_new_questions`
- Medical knowledge in `sakhi_sections`, `sakhi_section_chunks`, and `sakhi_faq`

Although the code refers to an SLM path, the current implementation runs effectively in OpenAI-only mode because `SLMClient` disables the external SLM endpoint and falls back to GPT-based generation.

## System Context

```mermaid
flowchart LR
    U[Client / WhatsApp Adapter / Frontend] --> API[FastAPI App]

    API --> ORCH[Chat Orchestration]
    ORCH --> DB[(Supabase / Postgres)]
    ORCH --> OAI[OpenAI API]

    DB --> USERS[sakhi_users]
    DB --> CONV[sakhi_conversations]
    DB --> STATE[sakhi_chat_states]
    DB --> LEADS[sakhi_clinic_leads]
    DB --> FAQ[sakhi_faq]
    DB --> SEC[sakhi_sections]
    DB --> CHUNKS[sakhi_section_chunks]
    DB --> NEWQ[sakhi_new_questions]
    DB --> ANS[sakhi_users_answer]

    OAI --> EMB[text-embedding-3-small]
    OAI --> GPT[gpt-4o-mini]
```

## Runtime Architecture

### Main subsystems

1. API layer
   - FastAPI app and endpoint definitions in [main.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/main.py).

2. User and conversation persistence
   - User profile CRUD in [modules/user_profile.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/modules/user_profile.py).
   - Conversation logging and retrieval in [modules/conversation.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/modules/conversation.py).

3. Request analysis and routing
   - Language and signal classification in [modules/response_builder.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/modules/response_builder.py).
   - Semantic route selection in [modules/model_gateway.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/modules/model_gateway.py).
   - Topic scope enforcement in [modules/guardrails.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/modules/guardrails.py).

4. Response generation
   - Small talk and medical response generation in [modules/response_builder.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/modules/response_builder.py).
   - SLM facade and GPT fallback behavior in [modules/slm_client.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/modules/slm_client.py).

5. Retrieval
   - Embedding generation in [rag.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/rag.py).
   - Hierarchical vector search in [modules/search_hierarchical.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/modules/search_hierarchical.py).

6. Workflow/state features
   - Onboarding state machine in [main.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/main.py).
   - Lead capture flow in [modules/lead_manager.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/modules/lead_manager.py).
   - Reward system in [modules/user_rewards.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/modules/user_rewards.py).

### Component diagram

```mermaid
flowchart TD
    subgraph API["FastAPI Layer"]
        HOME["GET /"]
        REG["POST /user/register"]
        LOGIN["POST /user/login"]
        CHAT["POST /sakhi/chat"]
        ANS["POST /user/answers"]
        REL["POST /user/relation"]
        LANG["POST /user/preferred-language"]
    end

    subgraph Services["Application Services"]
        UP["user_profile"]
        CONV["conversation"]
        GW["model_gateway"]
        RB["response_builder"]
        SLM["slm_client"]
        GR["guardrails"]
        RAG["search_hierarchical"]
        LEAD["lead_manager"]
        REW["user_rewards"]
        TR["translation_service"]
    end

    subgraph Infra["Infrastructure"]
        SB["supabase_client"]
        PG[(Supabase/Postgres)]
        OA["OpenAI"]
    end

    CHAT --> UP
    CHAT --> CONV
    CHAT --> GR
    CHAT --> TR
    CHAT --> RB
    CHAT --> SLM
    CHAT --> GW
    CHAT --> RAG
    CHAT --> LEAD
    CHAT --> REW

    REG --> UP
    LOGIN --> UP
    ANS --> SB
    REL --> UP
    LANG --> UP

    UP --> SB
    CONV --> SB
    LEAD --> SB
    REW --> SB
    RAG --> SB

    SB --> PG
    GW --> OA
    RB --> OA
    SLM --> OA
    TR --> OA
    RAG --> OA
```

## API Surface

Current HTTP endpoints in [main.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/main.py):

- `GET /`
- `POST /user/register`
- `POST /user/login`
- `POST /sakhi/chat`
- `POST /user/answers`
- `POST /user/relation`
- `POST /user/preferred-language`

Notes:

- `POST /user/register` is defined twice in `main.py`. Functionally this is redundant and should be cleaned up.
- `allow_origins=["*"]` is configured for CORS, which is acceptable for development but too open for production.

## Core Chat Flow

### High-level request lifecycle

`/sakhi/chat` is the main orchestration path.

1. Resolve the user by `user_id` or `phone_number`.
2. If user does not exist and phone number is present, create a partial user.
3. Run onboarding if `name`, `gender`, or `location` is still missing.
4. Intercept command-style flows:
   - `/rewards`
   - `/newlead`
   - in-progress lead workflow
5. Run out-of-scope guardrails.
6. Persist the user message to conversation history.
7. Launch in parallel:
   - translation to English for routing/search
   - classification for signal/language
   - intent label generation
8. Route the query using the semantic router.
9. Generate reply through one of three paths:
   - `SLM_DIRECT`
   - `SLM_RAG`
   - `OPENAI_RAG`
10. Persist Sakhi response.
11. Attach metadata such as `youtube_link` and `infographic_url` when present.
12. Trigger asynchronous reward updates and optional new-question capture.

### Sequence diagram: `/sakhi/chat`

```mermaid
sequenceDiagram
    participant C as Client
    participant A as FastAPI /sakhi/chat
    participant U as user_profile
    participant G as guardrails
    participant T as translation_service
    participant CL as classify_message
    participant I as slm_client intent label
    participant R as model_gateway
    participant H as hierarchical_rag_query
    participant B as response_builder / slm_client
    participant S as Supabase
    participant O as OpenAI

    C->>A: ChatRequest
    A->>U: resolve/get/create user
    U->>S: read/write sakhi_users
    S-->>U: user row
    U-->>A: user

    A->>A: onboarding checks
    alt onboarding incomplete
        A-->>C: onboarding response
    else normal flow
        A->>G: out-of-scope check
        G-->>A: allow or redirect
        alt out-of-scope
            A->>S: save user + bot messages
            A-->>C: redirect response
        else continue
            A->>S: save user message
            par parallel preprocessing
                A->>T: translate to English
                T->>O: GPT translation
                O-->>T: translated text
                T-->>A: English query
            and
                A->>CL: classify signal/language
                CL->>O: GPT classification
                O-->>CL: JSON
                CL-->>A: classification
            and
                A->>I: generate intent label
                I->>O: GPT intent summarization
                O-->>I: label
                I-->>A: intent label
            end

            A->>R: decide_route(english query)
            R->>O: embedding for user query
            O-->>R: vector
            R-->>A: route

            alt route = SLM_DIRECT
                A->>B: generate_chat
                B->>O: GPT smalltalk
                O-->>B: reply
                B-->>A: reply
            else route = SLM_RAG
                A->>H: hierarchical_rag_query
                H->>O: query embedding
                H->>S: RPC hierarchical_search
                H->>S: RPC match_faq
                H-->>A: context + similarity
                A->>B: generate_rag_response
                B->>O: GPT medical fallback
                O-->>B: reply
                B-->>A: reply
            else route = OPENAI_RAG
                A->>B: generate_medical_response
                B->>H: hierarchical_rag_query
                H->>O: query embedding
                H->>S: RPC hierarchical_search + match_faq
                H-->>B: context + similarity
                B->>O: GPT medical generation
                O-->>B: reply
                B-->>A: reply
            end

            A->>S: save Sakhi message
            A->>S: async reward update / novel question capture
            A-->>C: final payload
        end
    end
```

## Routing and Model Strategy

### Logical routes

The router in [modules/model_gateway.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/modules/model_gateway.py) exposes three destinations:

- `SLM_DIRECT`
  - Greetings, small talk, lightweight conversational turns
- `SLM_RAG`
  - Simpler medical and facility-info queries
- `OPENAI_RAG`
  - Complex medical or low-confidence cases

### How routing works

The route is chosen by semantic similarity between the query embedding and precomputed anchor embeddings for:

- small talk
- multiple simple medical categories
- medical complexity markers
- facility/location info

Important current-state detail:

- The router uses OpenAI embeddings at runtime.
- Anchor vectors are computed during singleton initialization.
- This means application startup depends on external embedding calls.

### Effective model behavior today

Although the names suggest an external SLM path, [modules/slm_client.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/modules/slm_client.py) sets:

- `self.endpoint_url = None`
- old SLM HTTP logic behind `if False`

So the actual current behavior is:

- `SLM_DIRECT` -> GPT-based smalltalk generation
- `SLM_RAG` -> GPT-based medical generation via the fallback path
- `OPENAI_RAG` -> GPT-based medical generation directly

In practice, routing mostly controls prompt style and retrieval path, not provider selection.

## Language Handling Design

### Inputs

The system supports:

- English
- Telugu
- Tinglish
- partial handling for Hindi in classifier output

### Processing pattern

1. Deterministic local language heuristics in [modules/detect_lang.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/modules/detect_lang.py)
2. LLM-based classification refinement in `classify_message`
3. Translation to English for routing and retrieval in [modules/translation_service.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/modules/translation_service.py)
4. Language-locked generation or forced rewrite for:
   - Tinglish
   - Telugu

### Design intent

The system tries to:

- search and route in English for better recall
- answer in the user’s conversational language
- use rewrite passes when direct model output violates target-language constraints

## Retrieval-Augmented Generation Design

### Data model for retrieval

Hierarchical RAG is implemented using:

- `sakhi_sections`
  - stores full parent section content
- `sakhi_section_chunks`
  - stores smaller searchable chunks with embeddings
- `sakhi_faq`
  - stores FAQ question vectors and media metadata

### Retrieval pattern

`hierarchical_rag_query` in [modules/search_hierarchical.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/modules/search_hierarchical.py):

1. Generates an embedding for the user query.
2. Calls `hierarchical_search` RPC over `sakhi_section_chunks`.
3. Calls `match_faq` RPC over `sakhi_faq`.
4. Merges results.
5. Returns:
   - merged retrieval context
   - best similarity score

### Retrieval architecture

```mermaid
flowchart TD
    Q[User question] --> E[Generate embedding]
    E --> RPC1[RPC hierarchical_search]
    E --> RPC2[RPC match_faq]

    RPC1 --> CH[sakhi_section_chunks]
    CH --> SEC[sakhi_sections]
    RPC2 --> FAQ[sakhi_faq]

    SEC --> MERGE[Merge results]
    FAQ --> MERGE
    MERGE --> CTX[Formatted context]
    CTX --> GEN[LLM response generation]
```

### Why the hierarchy exists

The SQL in [sql/setup_hierarchical_rag.sql](/d:/Ottobon/Sakhi-Whatsapp-Backend/sql/setup_hierarchical_rag.sql) uses small chunks for search but returns full parent section content. This is a classic design to balance:

- good recall from small semantic chunks
- better answer quality from larger contextual passages

## Knowledge Ingestion Pipeline

The repository includes offline ingestion utilities:

- [scripts/ingest_hierarchical.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/scripts/ingest_hierarchical.py)
- [scripts/ingest_json.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/scripts/ingest_json.py)

### Ingestion flow

1. Read a structured `.docx` or hierarchical `.json`.
2. Parse document hierarchy.
3. Insert parent sections into `sakhi_sections`.
4. Split section content into chunks.
5. Generate embeddings per chunk via OpenAI.
6. Insert searchable chunks into `sakhi_section_chunks`.

### Ingestion diagram

```mermaid
flowchart LR
    SRC[DOCX / JSON source] --> PARSE[Hierarchy parser]
    PARSE --> PARENT[Insert sakhi_sections rows]
    PARENT --> CHUNK[Split into chunks]
    CHUNK --> EMB[Generate embeddings]
    EMB --> CHILD[Insert sakhi_section_chunks rows]
```

## State Management

The system uses multiple state stores, each for a specific concern.

### 1. User identity and onboarding state

Stored in `sakhi_users`.

Used fields include:

- `user_id`
- `phone_number`
- `name`
- `gender`
- `location`
- `preferred_language`
- `relation_to_patient`
- `rewards`

Onboarding is not stored as an explicit state enum. Instead, it is inferred from null checks:

- no `name` -> ask name
- no `gender` -> ask gender
- no `location` -> ask location

### 2. Lead-capture workflow state

Stored in `sakhi_chat_states.context`.

This holds a JSON payload shaped like:

```json
{
  "lead_flow": {
    "step": "ask_name",
    "data": {
      "name": "...",
      "phone": "...",
      "age": "...",
      "gender": "..."
    }
  }
}
```

### 3. Conversation memory

Stored in `sakhi_conversations`.

Each turn is persisted, then the last few messages are reloaded for prompt history.

### State diagram: onboarding and lead flow

```mermaid
stateDiagram-v2
    [*] --> ResolveUser
    ResolveUser --> AskName: user exists but name missing
    ResolveUser --> AskGender: name exists, gender missing
    ResolveUser --> AskLocation: name+gender exist, location missing
    ResolveUser --> MainChat: profile complete

    AskName --> AskGender
    AskGender --> AskLocation
    AskLocation --> MainChat

    MainChat --> Rewards: /rewards
    MainChat --> LeadName: /newlead
    LeadName --> LeadPhone
    LeadPhone --> LeadAge
    LeadAge --> LeadGender
    LeadGender --> LeadProblem
    LeadProblem --> LeadSaved
    LeadSaved --> MainChat
```

## Data Model

### Core tables and relationships

```mermaid
erDiagram
    sakhi_users ||--o{ sakhi_conversations : has
    sakhi_users ||--|| sakhi_chat_states : owns
    sakhi_users ||--o{ sakhi_users_answer : submits
    sakhi_users ||--o{ sakhi_new_questions : asks

    sakhi_sections ||--o{ sakhi_section_chunks : contains

    sakhi_users {
        uuid user_id PK
        text name
        text email
        text phone_number
        text password_hash
        text role
        text preferred_language
        text relation_to_patient
        text gender
        text location
        int rewards
        jsonb context
    }

    sakhi_conversations {
        uuid chat_id
        uuid user_id FK
        text message_text
        text message_type
        text language
        timestamptz created_at
    }

    sakhi_chat_states {
        uuid user_id PK
        jsonb context
        timestamptz updated_at
    }

    sakhi_clinic_leads {
        uuid id PK
        text name
        text phone
        text age
        text gender
        text source
        text inquiry
        text problem
        text treatment_doctor
        text treatment_suggested
        text status
        timestamptz date_added
        timestamptz updated_at
        timestamptz created_at
    }

    sakhi_users_answer {
        uuid user_id
        text question_key
        jsonb selected_options
    }

    sakhi_new_questions {
        int id PK
        text user_id
        text question
        float similarity_score
        timestamptz created_at
    }

    sakhi_sections {
        bigint id PK
        text header_path
        text content
        int token_count
    }

    sakhi_section_chunks {
        bigint id PK
        bigint section_id FK
        text chunk_content
        vector embedding
    }

    sakhi_faq {
        int id PK
        text question
        text answer
        text youtube_link
        text infographic_url
        vector question_vector
    }
```

### Notes on schema usage

- `sakhi_users.context` still exists in code but lead flow has moved to `sakhi_chat_states`.
- `sakhi_new_questions.user_id` is `TEXT`, while most user identifiers are UUIDs.
- `sakhi_conversations` write path assigns `chat_id` only to Sakhi messages, not user messages.

## Lead Management Subsystem

The lead subsystem is isolated from normal medical chat except for entry through `/sakhi/chat`.

### Flow

1. User sends `/newlead`.
2. `lead_manager` initializes `sakhi_chat_states.context.lead_flow`.
3. Subsequent user replies are interpreted as step input.
4. On final step, a row is inserted into `sakhi_clinic_leads`.
5. State is cleared by setting `lead_flow` to `None`.

### Design intent

This is a conversational data capture workflow embedded inside the same chat endpoint, rather than a separate lead API.

## Reward System

The reward subsystem is asynchronous and non-blocking.

### Rules

- `CONVERSATIONAL` -> 1 point
- `FOLLOW_UP` -> 2 points
- `MEDICAL` -> 3 points
- `NEW_QUESTION` -> 5 points

### Triggering behavior

- small talk route awards conversational points
- medical routes award medical or new-question points based on similarity threshold
- novel questions are also persisted to `sakhi_new_questions`

## Deployment Design

### Current deployment model

The repository is packaged as a single containerized FastAPI app.

References:

- [Dockerfile](/d:/Ottobon/Sakhi-Whatsapp-Backend/Dockerfile)
- [docker-compose.yml](/d:/Ottobon/Sakhi-Whatsapp-Backend/docker-compose.yml)

### Deployment diagram

```mermaid
flowchart TD
    subgraph Runtime["Container Runtime"]
        APP[uvicorn main:app]
    end

    subgraph External["External Services"]
        SUPA[(Supabase)]
        OPENAI[OpenAI API]
    end

    CLIENT[Client / Adapter] --> APP
    APP --> SUPA
    APP --> OPENAI
```

### Characteristics

- Single service process
- No internal queue
- No cache layer
- No worker tier
- No separate retrieval service
- No dedicated auth service

## System Design Assessment

### What the design does well

- Keeps the API layer simple and thin.
- Pushes durable state into a managed database.
- Uses vector retrieval in a way that preserves larger contextual passages.
- Separates lead workflow state from core user profile.
- Uses parallel async preprocessing for translation, classification, and intent labeling.

### Current architectural constraints

1. OpenAI is on the hot path multiple times per request.
   - A single chat turn may perform translation, classification, intent labeling, embedding generation, and final generation.

2. The named SLM architecture is not materially active.
   - The route names suggest provider diversification, but the implementation currently collapses back to GPT.

3. Startup depends on remote embedding calls.
   - `ModelGateway` computes anchor vectors on initialization.

4. Supabase is both OLTP store and vector retrieval backend.
   - This is simple operationally, but centralizes nearly all state and retrieval load in one external dependency.

5. No caching layer exists.
   - Frequent reads occur for user profile, rewards, chat history, and routing-related operations.

6. Security posture is not production-ready in some areas.
   - Passwords are compared as plain text in [modules/user_profile.py](/d:/Ottobon/Sakhi-Whatsapp-Backend/modules/user_profile.py).
   - CORS is fully open.
   - Service-role access is used from the backend for broad database operations.

7. Some implementation duplication exists.
   - Duplicate `/user/register` route.
   - Repeated keys in response payloads such as `reply` and `infographic_url` assignments.

### Recommended target architecture evolution

If this backend is expected to scale, the next clean design would be:

1. Keep FastAPI as the orchestration gateway.
2. Split generation concerns into explicit services/modules:
   - classifier/router
   - retriever
   - response generator
3. Add Redis for:
   - recent profile cache
   - short conversation history cache
   - precomputed router anchors
4. Make the SLM route real if latency/cost optimization is still a goal.
5. Precompute and persist router anchors instead of generating them at startup.
6. Move non-critical work off the request thread:
   - rewards
   - analytics
   - novel question capture
   - optional follow-up generation
7. Replace plain-text password handling with hashed authentication.

## Suggested Logical Target Architecture

```mermaid
flowchart LR
    C[Client / Channel Adapter] --> API[FastAPI Gateway]

    API --> AUTH[Auth/Profile Service]
    API --> CHAT[Chat Orchestrator]
    API --> LEAD[Lead Workflow Service]

    CHAT --> CACHE[(Redis Cache)]
    CHAT --> RET[Retrieval Service]
    CHAT --> ROUTE[Routing Service]
    CHAT --> GEN[Generation Service]
    CHAT --> EVT[Async Jobs / Queue]

    AUTH --> DB[(Postgres / Supabase)]
    LEAD --> DB
    RET --> DB
    RET --> OAI[Embedding Provider]
    ROUTE --> OAI
    GEN --> OAI
    EVT --> DB
```

## Conclusion

The current system is best described as a single-service AI chat backend with database-centric state management and OpenAI-centric intelligence, wrapped by a semantic routing layer and a hierarchical RAG subsystem. It is coherent as an MVP architecture and already has clear subsystem boundaries, but the current implementation still behaves more like a unified GPT orchestration service than a true multi-model architecture.

For documentation and diagramming purposes, the most important mental model is:

- FastAPI orchestrates
- Supabase stores state and performs vector retrieval
- OpenAI powers nearly all intelligence functions
- chat, onboarding, lead capture, rewards, and retrieval are implemented as separable service modules inside one codebase
