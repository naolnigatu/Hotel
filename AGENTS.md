# Agent Guidelines & Operational Rules

## 1. Git & Branching Policy (CRITICAL & STRICT)
* **NEVER push directly to `main` or existing branches.**
* **Always create a new branch for ANY set of changes:**
  1. Create and switch to a descriptive new branch: `git checkout -b <branch-name>`
  2. Commit changes with a clean, semantic commit message.
  3. Push only the newly created branch: `git push -u origin <branch-name>`
* **Author Identity**: Use `spadmin77` for Git operations as configured.

## 2. Technology & Architecture Rules
* **Database & Backend**: Supabase PostgreSQL with Row-Level Security (RLS). No Firebase.
* **ORM**: Prisma ORM with multi-schema (`public`, `auth`). Keep `schema.prisma` in sync.
* **No Gemini**: Zero Gemini/Google GenAI packages, keys, or metadata allowed in this app.
