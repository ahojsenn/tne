# Roadmap & Product Ideas

Ideas and strategic directions that are not yet in the backlog.

---

## 💡 Audience Q&A

Integrate questions for the audience with multiple choice answers.

- A presenter creates a question with 2–4 answer options
- Players on `/throw` see the question and vote by selecting an answer
- Results are displayed in real-time on `/gameconsole` (bar chart or similar)
- Optionally: reveal correct answer after voting closes

**Data source: Google Sheets** (already configured in `nuxt.config.ts`)
- Tab `questions` — list of questions
- Tab `answers` — answer options per question
- 2 test questions with answer options already in place

**Open questions:**
- Should voting replace throwing during Q&A, or run alongside it? --> a question console page
- Should results be shown live or only after voting closes? --> live

**Planned pages:**
- `/quiz` — presenter view to browse questions from Google Sheets and activate one; active question is broadcast via Socket.io to all clients
- `/throw` — gets a voting UI when a question is active
- `/gameconsole` — shows live results of the active question
