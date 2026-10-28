# 🐜 পাঠ্যপিপীলিকা (Pathyo Pipilika) 🇧🇩
> **An AI-Powered, Gamified Competitive EdTech Platform for the Bangladesh NCTB Class 9–10 (SSC) Curriculum.**

**পাঠ্যপিপীলিকা (Pathyo Pipilika)** transforms traditional SSC board exam preparation into an interactive, data-driven mission. By combining a Dual-Source RAG pipeline (NCTB Textbooks + Guidebooks), a 4-Agent AI architecture, dynamic Matplotlib visual generation, and a gamified UI, it delivers unlimited curriculum-accurate practice and personalized coaching.

---

## ✨ Key Features

- **♾️ Unlimited Dynamic Question Generation:** Never run out of practice material. Questions are synthesized on the fly per chapter and difficulty level (`Easy`, `Medium`, `Hard`) directly from NCTB sources.
- **📚 Precision Dual-RAG Pipeline:** Built on **ChromaDB**, indexing both official **NCTB Textbooks** and **SSC Guidebooks** (`backend/data/`) so every question, explanation, and chat response is strictly grounded in the syllabus.
- **🤖 Leo AI Tutor:** An embedded, context-aware 24/7 AI study buddy with full **KaTeX/LaTeX** math and science rendering to resolve conceptual doubts and step-by-step equations.
- **📊 Dynamic Matplotlib Visuals & Analytics:**
  - Automatically generates geometric figures, physics diagrams, and math plots for visual quiz questions (with automated disk cleanup).
  - Renders in-memory Base64 performance curves on the student dashboard to track accuracy trends without server storage bloat.
- **🪙 Gamified UI, Coins & Points System:** High-contrast glassmorphic dark UI featuring live XP points, reward coins, mission streaks, and global leaderboards to keep students engaged.
- **🛡️ Anti-Cheat Telemetry & Exam History:** Tracks browser tab-switching during active exams and logs comprehensive mission history by subject, chapter, score percentage, and timestamp.

---

## 🧠 The 4-Agent AI Architecture (`backend/agents/`)

1. **⚡ Generator Agent (`generator.py`):** Queries the ChromaDB vector store for the selected NCTB subject and chapter, crafting syllabus-aligned MCQs and triggering Matplotlib code when a visual diagram is needed.
2. **🔍 Reviewer Agent (`reviewer.py`):** Acts as an automated quality gate—validating generated questions, verifying mathematical/scientific accuracy, checking LaTeX formatting, and ensuring unambiguous options before the student sees them.
3. **🎯 Coach Agent (`coach.py`):** Analyzes a student's past exam history, accuracy trends, and weak chapters to deliver personalized, actionable study feedback directly on the dashboard.
4. **🏆 Rank Watcher Agent (`rank_watcher.py`):** Monitors exam submissions, calculates XP/coin rewards, factors in difficulty multipliers and anti-cheat integrity, and updates student standings on the leaderboard.

---

## 🛠️ Tech Stack

- **Frontend:** React (Vite), React Router, KaTeX (`react-katex`), Custom Glassmorphic CSS
- **Backend:** Python, FastAPI, Uvicorn
- **AI & Vector DB:** OpenRouter / OpenAI API, ChromaDB, LangChain / RAG Ingestion Pipeline
- **Database & Visualization:** Supabase (PostgreSQL), Matplotlib (In-Memory Base64 & Plot Engine)
- **DevOps:** Docker, Docker Compose, Nginx

---

## 🚀 Quick Start

### Run with Docker Compose
```bash
git clone [https://github.com/your-username/bd-edu-ai-capstone.git](https://github.com/your-username/bd-edu-ai-capstone.git)
cd bd-edu-ai-capstone
docker compose up --build