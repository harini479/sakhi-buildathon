

## Technical Design: Hybrid RAG & Intelligence Integration

### 1. The Multi-Lane Retrieval Engine (Phase 3)
The chatbot will no longer rely on a single vector search. It must now execute two parallel "lanes" to Supabase to ensure medical precision. 

* **Lane A (Semantic):** Uses `text-embedding-3-small` to find the top 5 match vectors. 
* **Lane B (Keyword):** Uses a PostgreSQL `TSVECTOR` query (leveraging your **GIN index**) to find keyword matches. 
* **The Fusion Gate:** Results are combined in FastAPI using a weighted formula:
    $$Final\_Score = (0.7 \times Vector\_Similarity) + (0.3 \times Normalized\_Keyword\_Rank)$$ 
* **The 0.85 Hard Gate:** If the $Final\_Score < 0.85$, the chatbot triggers the **Expert Redirection** (from Stage B). 

---

### 2. Recursive Hydration Logic (Phase 4)
To prevent the LLM from hallucinating on small, fragmented "child" chunks (200 tokens), the chatbot performs a **Hydration Step** before generating a response. 

1.  **Search Hooks:** The initial search identifies the best **Child Chunks**. 
2.  **Hydration Select:** The backend takes the `parent_id` from those children and fetches the **Full Parent Section** (800+ tokens). 
3.  **Deduplication:** If multiple children point to the same parent, the Python logic ensures the 800-token section is only injected into the prompt **once**.

---

### 3. Intelligence & Expert Growth Loop (Stage B Integration)
This is the "Persistence" layer of your chatbot codebase. 

* **Metadata Enricher:** For any new data (including expert answers), the system generates **3 Unique Follow-up Questions**. 
* **Grounded Anchors:** Each question is paired with an `answer_excerpt`. The code performs a `string.includes()` check to verify the answer exists in the 800-token text before saving. 
* **Expert Dashboard:** When the **0.85 Gate** fails, the question is pushed to an expert dashboard (n8n/FastAPI). 
* **Persistence:** The expert's verified answer is re-ingested as a new node with a unique `(parent_id, order_index)` constraint to avoid duplicates. 



---

### 4. Real-Time Auditor & Safety (Phase 5)
For medical topics like IVF, the chatbot uses a "Kill-Switch" during streaming. [cite: 35, 49]

* **Stream Monitoring:** The backend monitors the LLM's output tokens against the "Hydrated" context. [cite: 50]
* **The Auditor:** If the LLM mentions a fact not found in the 800-token parent section, the **Websocket stream is killed** instantly. [cite: 23, 51]
* **Recovery:** The user receives a standard safety message: *"I've stopped this response as I could not verify a medical fact..."* [cite: 52]

---

### 📊 Implementation Summary for the Chatbot Codebase

| Step | Component | Action |
| :--- | :--- | :--- |
| **1** | **Query Handler** | Execute Parallel Vector + Keyword searches in Supabase. [cite: 38] |
| **2** | **Scoring Logic** | Apply Weighted Fusion and enforce the **0.85 Hard Gate**. [cite: 40, 41] |
| **3** | **Context Manager** | Fetch 800-token Parent Sections based on Child `parent_id`. [cite: 46] |
| **4** | **Safety Layer** | Implement the Real-Time Auditor to kill streams on hallucinations. [cite: 50, 51] |
| **5** | **Growth Layer** | Route low-score queries to the Expert Dashboard for manual review. [cite: 19, 21] |

**Would you like me to draft the Python class for the "Real-Time Auditor" that monitors the LLM stream for medical grounding?**