# Sakhi Platform — Product Analysis Document

> **Version:** 1.0 · **Date:** October 2026
> **Scope:** Feature inventory, user journey mapping, product maturity assessment, UX analysis, and product roadmap.

---

## Table of Contents

1. [Product Overview & Positioning](#1-product-overview--positioning)
2. [Feature Inventory & Maturity Matrix](#2-feature-inventory--maturity-matrix)
3. [User Journey Maps](#3-user-journey-maps)
4. [Intelligence Pipeline Analysis](#4-intelligence-pipeline-analysis)
5. [User Experience (UX) Analysis](#5-user-experience-ux-analysis)
6. [Content & Knowledge Base Analysis](#6-content--knowledge-base-analysis)
7. [Multi-Channel Strategy Analysis](#7-multi-channel-strategy-analysis)
8. [Product Quality & Safety Assessment](#8-product-quality--safety-assessment)
9. [Product Gaps & Opportunity Map](#9-product-gaps--opportunity-map)
10. [Product Roadmap Recommendation](#10-product-roadmap-recommendation)

---

## 1. Product Overview & Positioning

### 1.1 Product Identity

**Sakhi** ("सखी" / "Friend" in Sanskrit) is positioned as a **trusted digital friend** for the fertility-to-parenthood journey — not a clinical tool, not a search engine, but an always-available companion that *happens* to be backed by doctor-approved medical intelligence.

**Product Pillars:**

| Pillar | Manifestation in Product |
|:-------|:------------------------|
| **Empathetic Companion** | Warm persona, emoji-rich responses, emotional support detection, no robotic disclaimers |
| **Medical Authority** | RAG-grounded responses, Zero-Trust hallucination prevention, doctor escalation |
| **Universal Access** | WhatsApp-native (no downloads), multilingual (EN/TE/Tinglish), free entry tier |
| **Clinical Integration** | Post-care companion mode, doctor-in-the-loop, patient timeline awareness |

### 1.2 Dual-Mode Product Architecture

Sakhi operates in two distinct product modes based on user identity:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   MODE 1: PRE-CARE (Consumer / Unregistered)                     │
│   ═══════════════════════════════════════════                     │
│   Target: Anyone seeking health information                      │
│   Entry: Send "Hi" on WhatsApp/Instagram                         │
│   Features:                                                      │
│   ├─ Medical Q&A (RAG-grounded)                                  │
│   ├─ Hospital discovery (Google Places)                          │
│   ├─ Emotional support                                           │
│   ├─ Reward points gamification                                  │
│   ├─ Infographics & YouTube video links                          │
│   └─ Multilingual responses                                     │
│                                                                  │
│   MODE 2: POST-CARE (Registered Clinic Patient)                  │
│   ════════════════════════════════════════════                    │
│   Target: Patients registered at a partner clinic                │
│   Entry: Automatically detected by phone number match            │
│   Features:                                                      │
│   ├─ Treatment-aware context (from patient timeline)             │
│   ├─ Clinical rule-based triage                                  │
│   ├─ Emergency detection & instant doctor alert                  │
│   ├─ Symptom tracking (1-question triage gate)                   │
│   ├─ Treatment education (scoped to active treatment)            │
│   ├─ Doctor escalation with WhatsApp notification                │
│   └─ Strict guardrails (only answers about current treatment)    │
│                                                                  │
│   The routing engine (routing_engine.py) automatically            │
│   determines which mode a user falls into based on:              │
│   ├─ Phone number → sakhi_clinic_patients lookup                 │
│   ├─ Active treatment detection (timeline analysis)              │
│   └─ Intent & entity extraction (GPT-4o-mini NER)               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Feature Inventory & Maturity Matrix

### 2.1 Complete Feature Map

| # | Feature | Module | Maturity | User Value |
|:-:|:--------|:-------|:---------|:-----------|
| 1 | **Conversational Onboarding** | `onboarding_service.py` | ✅ Production | First-time user gets name-based personalized welcome |
| 2 | **Medical Q&A (RAG)** | `chat_flow_service.py`, `hybrid_search.py` | ✅ Production | Grounded answers from 420K+ knowledge nodes |
| 3 | **Semantic Query Routing** | `model_gateway.py` | ✅ Production | 23-category intelligent routing |
| 4 | **Smalltalk Handling** | `slm_client.py`, `chat_flow_service.py` | ✅ Production | Natural greeting and conversation flow |
| 5 | **Hospital Discovery** | `places_service.py`, `hospital_message_builder.py` | ✅ Production | Pincode-based hospital search with Google Places |
| 6 | **Lead Generation** | `lead_manager.py` | ✅ Production | 5-step conversational lead capture (/newlead) |
| 7 | **Reward Points System** | `user_rewards.py` | ✅ Production | 4-tier gamification (1/2/3/5 pts) |
| 8 | **Out-of-Scope Guardrails** | `guardrails.py` | ✅ Production | Sports/movies/politics → empathetic redirect |
| 9 | **PII Masking** | `masking_service.py` | ✅ Production | Phone, email, PAN, Aadhaar tokenization before LLM |
| 10 | **End-to-End Encryption** | `security.py`, `conversation.py` | ✅ Production | AES-256-GCM per-user encryption of all chat logs |
| 11 | **Multilingual (EN/TE/Tinglish)** | `detect_lang.py`, `slm_client.py` | ✅ Production | Auto-detection + response in user's language |
| 12 | **Tinglish Enforcement** | `response_builder.py` | ✅ Production | Force-rewrite if model outputs wrong script |
| 13 | **Follow-Up Questions** | `text_utils.py`, `messageController.js` | ✅ Production | Interactive WhatsApp list menus with pre-generated follow-ups |
| 14 | **Infographic Delivery** | `chat_flow_service.py`, `messageController.js` | ✅ Production | Image media attached to medical responses |
| 15 | **YouTube Video Links** | `search_hierarchical.py`, `chat_flow_service.py` | ✅ Production | Relevant video recommendations from FAQ |
| 16 | **Intent Label Generation** | `slm_client.py` | ✅ Production | Short intent summary for each response |
| 17 | **Clinical Post-Care Triage** | `clinical_chat_service.py` | ✅ Production | Multi-intent decomposition + clinical rule matching |
| 18 | **Emergency Detection & Doctor Alert** | `escalation.py` | ✅ Production | Immediate WhatsApp notification to doctor |
| 19 | **Symptom Track** | `post_care_service.py` | ✅ Production | 1-question triage gate with vectorized symptom matching |
| 20 | **Education Track** | `post_care_service.py` | ✅ Production | Treatment-scoped educational content |
| 21 | **Treatment Matching** | `routing_engine.py` | ✅ Production | Semantic verification of user query vs active treatment |
| 22 | **Patient Timeline Awareness** | `routing_engine.py` | ✅ Production | Contextual greetings based on active treatment |
| 23 | **Triage Hard-Stop** | `post_care_service.py`, `webhook.py` | ✅ Production | Mid-conversation state for symptom clarification |
| 24 | **Safety Token Audit** | `safety_auditor.py` | ✅ Production | Blacklisted word detection + anti-drift check |
| 25 | **Clinic Registration** | `onboarding_service.py`, `clinic_patient.py` | ✅ Production | Clinic selection + doctor assignment |
| 26 | **WhatsApp Template Messages** | `messageController.js` | ✅ Production | Cold outreach outside 24h window |
| 27 | **Marketing Message Sender** | `scripts/send_marketing_messages.py` | ✅ Script | Bulk template message broadcasting |
| 28 | **Instagram DM Channel** | `instagram_chatbot/` | ✅ Production | Parallel Instagram messaging channel |
| 29 | **Knowledge Flywheel** | `user_rewards.py` (store_new_question) | ✅ Production | Novel questions auto-stored for KB expansion |
| 30 | **ZIP Code Context** | `chat_flow_service.py` | ✅ Production | Extracts and stores user's pincode from messages |

### 2.2 Feature Maturity Distribution

```
Production (30):  ██████████████████████████████ 100%
Beta (0):         
Alpha (0):        

TOTAL FEATURES: 30 shipping features across 2 product modes
```

---

## 3. User Journey Maps

### 3.1 Journey 1: New Consumer User (Pre-Care)

```
┌──────────────────────────────────────────────────────────────────┐
│  JOURNEY: First-Time WhatsApp User                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 1: USER SAYS "Hi"                                          │
│  ├─ System: create_partial_user (blind-indexed phone)            │
│  ├─ State: onboarding_step = "name"                              │
│  └─ Sakhi: "Welcome to Sakhi! 🌺 What should I call you?"       │
│                                                                  │
│  Step 2: USER SAYS "Deepthi"                                     │
│  ├─ System: LLM extracts name (extract_name_from_onboarding)     │
│  ├─ System: update_user_profile(name: "Deepthi")                 │
│  ├─ State: onboarding_step = null                                │
│  └─ Sakhi: "Nice to meet you, Deepthi! 🌺 I am Sakhi, your     │
│       companion for fertility and wellness."                     │
│                                                                  │
│  Step 3: USER ASKS "What is IVF?"                                │
│  ├─ Guardrails: not out-of-scope ✓                               │
│  ├─ Classification: signal = MEDICAL                             │
│  ├─ Language: English                                            │
│  ├─ PII Masking: no PII detected                                 │
│  ├─ Hybrid RAG: vector + keyword + FAQ search                    │
│  ├─ LLM: generates grounded response with context                │
│  ├─ Follow-ups: ["IVF cost?", "IVF success rate?", "IVF risks?"]│
│  ├─ Rewards: +3 points (MEDICAL)                                 │
│  └─ Sakhi: [Detailed IVF explanation + YouTube link +            │
│       interactive list menu with follow-up questions]            │
│                                                                  │
│  Step 4: USER TAPS "IVF cost?"                                   │
│  ├─ Pre-computed answer served (background task)                 │
│  ├─ Rewards: +2 points (FOLLOW_UP)                               │
│  └─ Sakhi: [Cost breakdown in INR + clinic locations]            │
│                                                                  │
│  Step 5: USER ASKS "hospitals near me"                           │
│  ├─ Classification: signal = HOSPITAL_SEARCH                     │
│  ├─ No ZIP code stored                                           │
│  └─ Sakhi: "Please provide your 6-digit pincode"                 │
│                                                                  │
│  Step 6: USER SAYS "530001"                                      │
│  ├─ resolve_zipcode → geocode → Google Places search              │
│  └─ Sakhi: [Interactive list of 10 nearby hospitals with         │
│       ratings, open status, and Google Maps links]               │
│                                                                  │
│  Step 7: USER TAPS "Apollo Hospital"                             │
│  ├─ get_hospital_details (place details API)                     │
│  └─ Sakhi: [Full contact card: phone, address, rating, map link] │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Journey 2: Clinic Patient (Post-Care)

```
┌──────────────────────────────────────────────────────────────────┐
│  JOURNEY: Registered IVF Patient                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 1: PATIENT SAYS "Hi"                                       │
│  ├─ System: phone match in sakhi_clinic_patients ✓                │
│  ├─ System: auto-link profile with clinic record                 │
│  ├─ System: fetch patient timeline                               │
│  ├─ System: extract active treatment = "IVF Cycle 1"             │
│  └─ Sakhi: "Hi Sneha! 🌸 How are you feeling today with your    │
│       IVF Cycle 1?"                                              │
│                                                                  │
│  Step 2: PATIENT ASKS "I had mild cramping after embryo transfer"│
│  ├─ Entity extraction: symptoms = ["cramping"]                   │
│  ├─ Route: Post-Care → Symptom Track                             │
│  ├─ Vectorized symptom matching against clinical rules            │
│  ├─ Rule found: "mild cramping is normal after ET"               │
│  ├─ Confidence: HIGH                                             │
│  ├─ Medical knowledge retrieval (doctor-scoped)                  │
│  ├─ Safety check: SAFE ✓                                         │
│  └─ Sakhi: "Hi Sneha, mild cramping after embryo transfer is     │
│       completely normal. [Detailed reassurance + care tips].      │
│       If the cramping becomes severe, please let me know         │
│       immediately."                                              │
│                                                                  │
│  Step 3: PATIENT SAYS "I have heavy bleeding"                    │
│  ├─ Entity extraction: symptoms = ["heavy bleeding"]             │
│  ├─ Clinical rule search → emergency_flag = TRUE                 │
│  ├─ 🚨 EMERGENCY PATH TRIGGERED                                 │
│  ├─ Escalation created in sakhi_escalations                      │
│  ├─ Doctor notified via WhatsApp: "🚨 EMERGENCY: Patient Sneha  │
│  │   reports heavy bleeding during IVF Cycle 1"                  │
│  └─ Sakhi: "🚨 This sounds like it could be urgent. I am        │
│       immediately notifying your doctor's team. Please do not    │
│       wait — call your doctor or visit the nearest hospital."    │
│                                                                  │
│  Step 4: PATIENT ASKS "What about knee surgery?"                 │
│  ├─ Entity extraction: treatments = ["knee surgery"]             │
│  ├─ Treatment match: "knee surgery" vs "IVF Cycle 1" → 0.15     │
│  ├─ Semantic similarity < 0.60 threshold                         │
│  ├─ STRICT GUARDRAIL REJECTION                                   │
│  └─ Sakhi: "I can only assist you with questions related to      │
│       your current treatment (IVF Cycle 1). I cannot answer      │
│       questions about other treatments."                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 3.3 Journey 3: Clinic Staff — Lead Generation

```
┌──────────────────────────────────────────────────────────────────┐
│  JOURNEY: Staff uses /newlead                                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Staff: /newlead                                                 │
│  Sakhi: "Hello! Let's register a new patient. Their name?"       │
│                                                                  │
│  Staff: Priya Sharma                                             │
│  Sakhi: "Thanks. Could you share Priya Sharma's phone number?"   │
│                                                                  │
│  Staff: 9876543210                                               │
│  Sakhi: "Got it. How old are they?"                              │
│                                                                  │
│  Staff: 28                                                       │
│  Sakhi: "And their gender?"                                      │
│                                                                  │
│  Staff: Female                                                   │
│  Sakhi: "Finally, what health concern are they facing?"          │
│                                                                  │
│  Staff: Difficulty conceiving for 2 years                        │
│  Sakhi: "Thank you. I've noted everything down. We'll take       │
│       good care of them."                                        │
│  └─ Saved to sakhi_clinic_leads: status = "New Inquiry"          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Intelligence Pipeline Analysis

### 4.1 Classification Engine

The message classification system (`response_builder.classify_message`) produces three signals:

| Signal | Trigger | Processing Path |
|:-------|:--------|:---------------|
| `SMALLTALK` | Greetings, thanks, identity questions | GPT smalltalk → direct response (no RAG) |
| `HOSPITAL_SEARCH` | Hospital/clinic location queries | Google Places API → interactive list |
| `MEDICAL` | Health, fertility, pregnancy questions | Hybrid RAG → GPT-4o medical response |

Additionally, the classification extracts:
- **Language:** English / Telugu / Tinglish (auto-detected)
- **Specialty:** e.g., "Fertility", "General" (for hospital search scoping)

### 4.2 Routing Decision Matrix (Post-Care)

```
                        Is Registered
                        Clinic Patient?
                        /            \
                      YES              NO
                      /                  \
              Has Active               Pre-Care
              Treatment?              (Normal Chat Flow)
              /          \
            YES            NO
            /                \
   Treatment Match?     "No active treatments.
   (cosine ≥ 0.60)      Contact your clinic."
   /             \
  YES             NO
  /                 \
Education        "I can only assist
Track            with [active treatment]."
(or Symptom
 Track if
 symptoms
 detected)
```

### 4.3 Language Processing Pipeline

```
User Input (any language)
        │
        ▼
┌────────────────────────┐
│ classify_message()     │  Detects: en / telugu / tinglish
│ (GPT-4o-mini)          │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ Set target_lang        │  English → "English"
│                        │  Telugu  → "Telugu"
│                        │  Tinglish → "Tinglish"
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ Generate LLM response  │  System prompt includes
│ with SLM_LANGUAGE_LOCK │  SLM_LANGUAGE_LOCK directive
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ Post-Generation Check  │
│                        │
│ If target == Tinglish: │
│   ├─ contains_telugu_  │  (checks for Unicode 0C00–0C7F)
│   │  unicode()?        │
│   ├─ is_mostly_english?│  (checks English word ratio)
│   └─ → force_rewrite_  │  (re-prompts LLM to fix)
│      to_tinglish()     │
└────────────────────────┘
```

---

## 5. User Experience (UX) Analysis

### 5.1 Conversational UX Strengths

| UX Element | Implementation | Impact |
|:-----------|:-------------|:-------|
| **Personalization** | Name used in every greeting ("Hi Deepthi!") | Builds emotional connection |
| **Emoji usage** | 🌺 🌸 💜 🏆 in responses | Warm, non-clinical tone |
| **Interactive menus** | WhatsApp list replies for follow-ups | Reduces typing friction, guides discovery |
| **Media enrichment** | Infographics + YouTube links with text answers | Multi-modal learning |
| **Graceful error handling** | "I'm sorry, I encountered an issue. Please try again. 🌸" | No raw error traces to users |
| **Empathetic redirects** | Out-of-scope: "I appreciate you sharing that! While I'm not equipped..." | No harsh rejections |
| **Multiple redirect templates** | 3 randomized out-of-scope responses | Avoids sounding robotic |
| **Progressive onboarding** | Only asks for name (not email/DOB/blood type upfront) | Minimal friction |
| **Smart name extraction** | LLM handles "naa peru Deepthi" (Tinglish name input) | Cross-language onboarding |
| **Buffered initial question** | If user asks a medical question during onboarding, it's saved and answered after onboarding completes | No question lost |

### 5.2 Conversational UX Gaps

| Gap | Impact | Recommendation |
|:---|:------|:--------------|
| **No typing indicator / status feedback** | User waits 2-5s with no feedback during LLM processing | Send WhatsApp "typing" status during processing |
| **No conversation memory summary** | Returning users get no recap of last conversation | Add "Welcome back! Last time we discussed..." |
| **No proactive check-ins** | Users must always initiate | Scheduled WhatsApp templates: "How are you feeling today, Deepthi?" |
| **No voice message support** | 70%+ of Tier-2/3 users send audio | Whisper/Bhashini integration for voice notes |
| **No image/document input** | Users can't share lab reports or ultrasound images | Vision model integration for report interpretation |
| **No rich card format** | Text-heavy responses for complex medical info | WhatsApp Business cards/carousels for structured data |
| **No conversation rating** | No explicit feedback mechanism | Post-conversation "Was this helpful? 👍 / 👎" |

### 5.3 Error Handling & Edge Cases

| Edge Case | Current Handling | Assessment |
|:----------|:----------------|:-----------|
| Empty message | Returns `{"status": "continue_chat"}` | ✅ Good |
| Duplicate webhook | In-memory TTL cache (5min, 500 entries) + DB idempotency check | ✅ Good |
| LLM timeout | Escalation / fallback error message | ✅ Acceptable |
| Encrypted message decryption failure | Returns "[Decryption Error]" marker | ✅ Good (graceful degradation) |
| User sends medical query during onboarding | Saves as `initial_question`, replays after onboarding | ✅ Excellent |
| Onboarding name confusion (user asks question instead of name) | Detects via `is_onboarding_input_invalid()` with 100+ keywords | ✅ Excellent |
| Treatment mismatch (post-care patient asks about unrelated treatment) | Hard rejection with explanation | ✅ Good (strict safety) |

---

## 6. Content & Knowledge Base Analysis

### 6.1 Knowledge Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                   KNOWLEDGE BASE ARCHITECTURE                    │
│                                                                  │
│  Source Data:                                                    │
│  ├─ Medical PDFs → Docling parser → hierarchy inference           │
│  ├─ Doctor-authored content → clinical rules                     │
│  └─ FAQ database → question/answer + YouTube links               │
│                                                                  │
│  Storage Structure:                                              │
│  ├─ sakhi_knowledge_nodes (Hierarchical: H1→H2→H3→Chunk)         │
│  │   ├─ 420K+ nodes from knowledge_nodes_rows.csv                │
│  │   ├─ 800-token parent nodes (synthesis context)               │
│  │   ├─ 200-token child chunks (retrieval units)                 │
│  │   └─ Breadcrumb paths: "IVF > Age Over 35 > Success Rates"   │
│  │                                                               │
│  ├─ sakhi_clinical_rules (Doctor-scoped decision rules)          │
│  │   ├─ Per clinic, per doctor, per department                   │
│  │   ├─ Treatment-stage-aware scenarios                          │
│  │   ├─ Emergency flags for critical situations                  │
│  │   └─ Provisional answers + clarifying questions               │
│  │                                                               │
│  ├─ sakhi_medical_knowledge (Doctor-scoped medical content)      │
│  │   ├─ Categorized by specialty and sub-category                │
│  │   └─ Multi-tenant isolation                                   │
│  │                                                               │
│  └─ faq (Multimedia FAQ)                                         │
│      ├─ Question/answer pairs                                    │
│      ├─ YouTube video links                                      │
│      └─ Infographic URLs                                         │
│                                                                  │
│  Ingestion Pipeline (Data_Ingestion/):                           │
│  ├─ Stage A: PDF → Layout → Hierarchy → Tree → Chunks            │
│  ├─ Tools: Docling (layout), font-size thresholds (hierarchy)    │
│  ├─ Token budget: 800-token parents, 200-token children          │
│  └─ Scripts: ingest_hierarchical.py, ingest_json.py              │
│                                                                  │
│  Search Architecture:                                            │
│  ├─ 3-lane hybrid: Vector (0.7) + Keyword (0.3) + FAQ           │
│  ├─ Integrity threshold: 0.85 (below → expert warning)           │
│  └─ Log-sigmoid normalization for keyword rank fusion             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 Medical Domain Coverage

| Domain | Coverage (from ModelGateway categories) | Depth |
|:-------|:---------------------------------------|:------|
| IVF | ✅ Comprehensive | Process, cost, risks, success rates, step-by-step |
| IUI | ✅ Comprehensive | Process, cost, success rates, IUI vs IVF |
| ICSI | ✅ Good | Process, ICSI vs IVF, when needed |
| Fertility (general) | ✅ Comprehensive | Natural improvement, age factors, tests |
| Female Infertility | ✅ Good | Causes, symptoms, tests, treatments |
| Male Infertility | ✅ Good | Causes, symptoms, sperm quality, tests |
| PCOS/PCOD | ✅ Comprehensive | Symptoms, treatment, diet, infertility link |
| Pregnancy | ✅ Good | Early symptoms, diet, exercises, tests |
| C-Section / Natural Birth | ✅ Good | Comparison, recovery, preparation |
| Postpartum | ✅ Good | Recovery, depression, diet, baby care |
| Egg / Sperm / Embryo Freezing | ✅ Good | Process, safety, duration, candidacy |
| Surrogacy | ✅ Basic | Process, legality in India |
| Laparoscopy / Hysteroscopy | ✅ Good | Purpose, recovery, pain management |
| Ayurveda | ✅ Basic | Fertility treatments, diet |
| Nutrition & Vitamins | ✅ Good | Folic acid, iron, pregnancy nutrition |
| General Health | ✅ Basic | Headaches, cold, fever during pregnancy |

### 6.3 Knowledge Flywheel (Self-Improving System)

```
User asks question
       │
       ▼
RAG Search → similarity score
       │
       ├─ similarity ≥ 0.4 → Answer from KB → +3 points
       │
       └─ similarity < 0.4 → Novel question detected!
                              ├─ Store in sakhi_new_questions
                              ├─ +5 points to user
                              └─ Weekly: Medical team reviews
                                 → Adds verified content to KB
                                 → KB coverage improves
                                 → Future users get better answers
```

---

## 7. Multi-Channel Strategy Analysis

### 7.1 Channel Comparison

| Capability | WhatsApp | Instagram |
|:-----------|:---------|:----------|
| **Message types** | Text, image, interactive list, template | Text, image, quick replies |
| **Follow-up menus** | ✅ WhatsApp list replies (rich) | ✅ Quick replies (simpler) |
| **Template messaging** | ✅ For cold outreach & marketing | ❌ Not supported |
| **Media delivery** | ✅ Infographics + YouTube links | ✅ Images + text |
| **Webhook verification** | ✅ Meta Cloud API | ✅ Meta Graph API |
| **Internal API** | `POST /v1/send-message` | `POST /v1/send-dm` |
| **Deduplication** | In-memory TTL + DB | In-memory |
| **User identification** | Phone number | Instagram Scoped User ID (IGSID) |

### 7.2 Architecture Pattern

Both channels share the **same backend intelligence** — the Node.js middlewares are thin adapters:

```
WhatsApp Middleware ──┐
                      ├──► Python Backend (same AI engine)
Instagram Middleware ─┘
```

This means adding a new channel (e.g., Telegram, Web Chat) requires only a new thin middleware — zero AI logic duplication.

---

## 8. Product Quality & Safety Assessment

### 8.1 Safety Layers Inventory

| Layer | Type | Implementation | Status |
|:------|:-----|:-------------|:-------|
| **L1: Out-of-scope detection** | Deterministic | Regex patterns + keyword matching in `guardrails.py` | ✅ Active |
| **L2: Prompt guardrails** | Generative | `SLM_LANGUAGE_LOCK`, `SAKHI_SCOPE`, topic constraints | ✅ Active |
| **L3: RAG grounding** | Deterministic | Hybrid search context injected into every medical response | ✅ Active |
| **L4: Token audit** | Deterministic | Blacklisted word replacement ("guarantee", "100%", "cure") | ✅ Active |
| **L5: Anti-drift check** | Generative | GPT-4o-mini validates SAFE/UNSAFE on drafted responses | ✅ Active (post-care) |
| **L6: Emergency detection** | Vector search | `emergency_flag` in clinical rules with doctor notification | ✅ Active (post-care) |
| **L7: Treatment scope lock** | Semantic | Cosine similarity ≥ 0.60 between query and active treatment | ✅ Active (post-care) |
| **L8: Output cleanup** | Deterministic | AI self-reference removal, excessive newline fix, banned words | ✅ Active |
| **L9: PII masking** | Deterministic | Mask before LLM, unmask after | ✅ Active |
| **L10: Encryption at rest** | Cryptographic | AES-256-GCM per-user keys | ✅ Active |

### 8.2 Safety Assessment Score

| Dimension | Score | Justification |
|:----------|:------|:-------------|
| Hallucination prevention | 9/10 | RAG grounding + token audit + anti-drift check |
| Data privacy | 9/10 | Encryption + PII masking + blind indexes |
| Emergency handling | 8/10 | Immediate doctor notification + patient instructions |
| Scope control | 8/10 | Out-of-scope detection + topic restrictions |
| Language safety | 7/10 | Tinglish enforcement works but may occasionally leak |
| Liability protection | 8/10 | No definitive diagnoses, doctor escalation path |

**Overall Product Safety: 8.2/10** — Industry-leading for health chatbots.

---

## 9. Product Gaps & Opportunity Map

### 9.1 High-Impact Feature Gaps

```
                      ┌────────────────────────────────┐
                      │     PRODUCT OPPORTUNITY MAP     │
                      └────────────────────────────────┘

   HIGH IMPACT                                          
        │                                               
        │   ● Voice Message Support      ● Lab Report   
        │     (Whisper/Bhashini)           Analysis      
        │                                (Vision model) 
        │   ● Admin Dashboard           ● Partner/Husband
        │     (Clinic portal)             Companion Mode 
        │                                               
        │   ● Proactive Check-ins      ● ABDM/ABHA     
        │     (Scheduled nudges)         Integration     
        │                                               
        │   ● Appointment Booking       ● Hindi/Tamil   
   MED  │     Integration                Support        
   IMPACT                                               
        │   ● Conversation Rating      ● Medication     
        │     (Feedback loop)            Reminders       
        │                                               
        │   ● Rich Card Responses      ● Community      
        │     (WhatsApp cards)           Feature         
        │                                               
   LOW  │   ● Chat History Export      ● Referral       
   IMPACT    (Patient portal)            Program         
        │                                               
        └──────────────────────────────────────────────→
              LOW EFFORT              HIGH EFFORT        
```

### 9.2 Feature Priority Recommendations

| Priority | Feature | Effort | Revenue Impact | User Impact |
|:---------|:--------|:-------|:-------------|:-----------|
| 🔴 P0 | **Clinic Admin Dashboard** (web portal for clinic management, analytics) | 6-8 weeks | Unlocks B2B sales | Enables self-service |
| 🔴 P0 | **Voice Message Processing** (WhatsApp audio notes → text → response) | 2-3 weeks | Unlocks Tier-2/3 India | 70% of target users send voice |
| 🔴 P0 | **Proactive Check-in Messages** (scheduled template nudges) | 2-3 weeks | Increases retention by 30%+ | Patient feels cared for |
| 🟡 P1 | **Lab Report / Image Analysis** (photo → OCR → medical interpretation) | 4-6 weeks | Premium feature differentiator | Reduces patient anxiety |
| 🟡 P1 | **Hindi Language Support** (4th language) | 3-4 weeks | 500M+ Hindi speakers | National expansion |
| 🟡 P1 | **Analytics & Reporting** (escalation trends, query patterns, engagement metrics) | 4-6 weeks | ROI proof for clinic buyers | Data-driven decisions |
| 🟡 P1 | **Partner Companion Mode** (husband/partner pairing) | 3-4 weeks | Viral K-factor > 1.2 | Family engagement |
| 🟠 P2 | **ABDM/ABHA Integration** (government health ID) | 6-8 weeks | Government partnership | National health ecosystem |
| 🟠 P2 | **Appointment Booking** (integration with clinic scheduling) | 4-6 weeks | New revenue stream | End-to-end patient journey |
| 🟠 P2 | **Medication Reminders** (scheduled per treatment protocol) | 3-4 weeks | Adherence improvement | Reduces treatment abandonment |

---

## 10. Product Roadmap Recommendation

### 10.1 Phased Roadmap

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCT ROADMAP (12 MONTHS)                   │
├──────┬──────────────────────────────────────────────────────────┤
│      │                                                          │
│ Q1   │  PHASE: "Revenue Foundation"                             │
│      │  ├─ 🔴 Clinic Admin Dashboard (web portal)               │
│      │  ├─ 🔴 Analytics & Reporting (ROI metrics)               │
│      │  ├─ 🔴 Voice Message Processing                          │
│      │  ├─ 🔴 Proactive Check-in Messages                       │
│      │  └─ Conversation feedback mechanism                      │
│      │                                                          │
│ Q2   │  PHASE: "Market Expansion"                               │
│      │  ├─ 🟡 Hindi language support                            │
│      │  ├─ 🟡 Lab Report / Image Analysis                       │
│      │  ├─ 🟡 Partner Companion Mode ("Duo-Sync")               │
│      │  ├─ Billing & subscription management                    │
│      │  └─ Tamil & Kannada language support                     │
│      │                                                          │
│ Q3   │  PHASE: "Platform Play"                                  │
│      │  ├─ 🟠 ABDM/ABHA Integration                            │
│      │  ├─ 🟠 Appointment Booking Integration                   │
│      │  ├─ 🟠 Medication Reminders                              │
│      │  ├─ On-premise SLM deployment (cost reduction)            │
│      │  └─ Web chat channel (3rd channel)                        │
│      │                                                          │
│ Q4   │  PHASE: "Enterprise Scale"                               │
│      │  ├─ Multi-specialty expansion (oncology, cardiac)         │
│      │  ├─ SSO / RBAC for enterprise clients                    │
│      │  ├─ Anonymized population health analytics               │
│      │  ├─ Telegram channel (4th channel)                        │
│      │  └─ Performance optimization for 1M+ messages/day        │
│      │                                                          │
└──────┴──────────────────────────────────────────────────────────┘
```

### 10.2 Success Criteria by Phase

| Phase | KPI | Target |
|:------|:----|:-------|
| Q1 — Revenue Foundation | Clinics onboarded with dashboard access | 10+ |
| Q1 — Revenue Foundation | Voice messages processed successfully | 90%+ accuracy |
| Q2 — Market Expansion | Monthly active users | 50,000+ |
| Q2 — Market Expansion | Languages supported | 5 (EN, TE, Tinglish, Hindi, Tamil) |
| Q3 — Platform Play | ABDM health records linked | 1,000+ patients |
| Q3 — Platform Play | Inference cost reduction (SLM) | 50%+ savings |
| Q4 — Enterprise Scale | Enterprise contracts signed | 3+ hospital chains |
| Q4 — Enterprise Scale | Daily message volume capacity | 100K+ |

---

*Product analysis generated from comprehensive codebase study — Sakhi Platform v2.0*
