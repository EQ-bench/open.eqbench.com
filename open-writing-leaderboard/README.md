# Open Writing Leaderboard

A Next.js web app displaying creative writing benchmark results for language models. Shows ELO rankings with drill-down into writing samples and judge evaluations.

## Quick Start

```bash
# Install dependencies
cd open-writing-leaderboard
npm install

# Set up database connection
cp .env.example .env  # Then add your DATABASE_URL

# Generate Prisma client (after schema changes)
npx prisma db pull
npx prisma generate

# Run dev server
npm run dev
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon) via Prisma 7
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Theming**: next-themes (dark mode)

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/
│   │   └── samples/[modelName]/  # API route for lazy-loading samples
│   ├── layout.tsx          # Root layout with theme provider
│   ├── page.tsx            # Main leaderboard page
│   └── globals.css         # Tailwind + shadcn theme variables
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── leaderboard.tsx     # Main leaderboard table
│   ├── samples-modal.tsx   # Writing samples viewer modal
│   ├── analysis-modal.tsx  # Lexical analysis modal (placeholder)
│   ├── header.tsx          # Site header
│   ├── theme-provider.tsx  # next-themes provider
│   └── theme-toggle.tsx    # Dark/light mode toggle
├── data/
│   └── prompts.json        # Writing prompts by ID (category + prompt text)
├── generated/
│   └── prisma/             # Generated Prisma client (don't edit)
└── lib/
    ├── db.ts               # Prisma client singleton
    └── utils.ts            # Utility functions (cn helper)
```

## Database Schema

The app reads from the Open Writing Bench database. Key tables:

| Table | Purpose |
|-------|---------|
| `elo_ratings` | Model rankings (ELO score, confidence intervals) |
| `runs` | Benchmark execution records |
| `tasks` | Individual writing tasks with model responses |
| `judge_results` | Individual judge evaluations per task |

Schema is defined in the `open-writing-bench` repo. This app only reads; never push schema changes from here.

### Updating Schema

When the upstream schema changes:

```bash
cd open-writing-leaderboard
npx prisma db pull   # Introspect from live database
npx prisma generate  # Regenerate client types
```

## Key Components

### Leaderboard (`src/components/leaderboard.tsx`)

Main table showing all models ranked by ELO. Features:
- Rank badges (gold #1, silver #2-3, outline rest)
- Visual ELO bar chart
- Icon buttons to open samples/analysis modals

### Samples Modal (`src/components/samples-modal.tsx`)

Modal viewer for a model's writing samples. Features:
- Accordion list (one expanded at a time)
- Shows category, score, and prompt ID per sample
- Displays original writing prompt
- Multi-turn support (planning collapsed by default, chapters expanded)
- Aggregated judge scores

Data is fetched lazily via `/api/samples/[modelName]` to keep page loads fast.

### Analysis Modal (`src/components/analysis-modal.tsx`)

Placeholder for lexical analysis visualizations. To be implemented.

## API Routes

### `GET /api/samples/[modelName]`

Returns writing samples for a model from their most recent completed run.

Response:
```json
{
  "samples": [
    {
      "id": 123,
      "prompt_id": "42",
      "iteration_index": 0,
      "model_response": "...",
      "model_responses": [...],  // Multi-turn format
      "aggregated_scores": { "overall": 8.5, ... }
    }
  ]
}
```

## Prompts Data

Writing prompts are stored in `src/data/prompts.json`:

```json
{
  "1": {
    "category": "Coming-of-age",
    "prompt": "The last summer before everyone left for college..."
  }
}
```

Keyed by `prompt_id` (matches `tasks.prompt_id` in database).

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Neon format) |

Example `.env`:
```
DATABASE_URL="postgresql://user:pass@host.neon.tech/dbname?sslmode=require"
```

## Development

```bash
cd open-writing-leaderboard
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run start    # Run production build
npm run lint     # ESLint
```

### Adding shadcn Components

```bash
npx shadcn@latest add [component-name]
```

### Database Queries

All database access goes through `src/lib/db.ts`. Uses connection pooling via `@prisma/adapter-pg`.

## Deployment

Standard Next.js deployment. Recommended: Vercel.

Ensure `DATABASE_URL` is set in production environment variables.
