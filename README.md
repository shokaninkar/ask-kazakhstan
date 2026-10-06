# Ask Kazakhstan

Ask a policy question and get answers from synthetic citizens, one per region of Kazakhstan, shown on an interactive map coloured by sentiment.

Each persona has a region, age bracket, gender, ethnicity, occupation, education, income and whether they speak Kazakh. The LLM answers in character for every persona, tags each answer positive, negative or neutral, and the map colours each oblast accordingly. Click a region to read its answer.

## How it works

- `src/lib/personas.ts` defines the personas; `src/lib/oblasts.ts` and `src/data/kazakhstan-oblasts.json` hold the regions and their GeoJSON.
- `src/app/api/ask/route.ts` fans the question out to GPT-OSS 120B on Groq, one call per persona, with a 20-second timeout per call and JSON-only output.
- `src/components/KazakhstanMap.tsx` renders the map with react-leaflet and colours regions by sentiment.

Guardrails: questions are capped at 240 characters, requests are rate-limited per IP (10 a minute), and the user's question is delimited as untrusted data in the prompt so personas can refuse in character rather than follow injected instructions.

## Run locally

```bash
npm install
cp .env.example .env.local   # add your Groq key
npm run dev
```

`.env.local` needs one variable:

```
GROQ_API_KEY=...
```

## Stack

Next.js 16 (App Router), TypeScript, Groq (GPT-OSS 120B), react-leaflet, Leaflet, GeoJSON, Tailwind CSS.
