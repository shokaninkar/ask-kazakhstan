# Ask Kazakhstan

Ask a policy question and get answers from 20 synthetic citizens, one for each of Kazakhstan's 20 regions, shown on an interactive map coloured by sentiment.

Each persona has a region, age bracket, gender, ethnicity, occupation, education, income, whether they speak Kazakh, and an outlook, trust in government and news source drawn independently of ethnicity. Every answer comes with a one-line description of the person as they speak (age, clothes, setting) and an illustrated avatar. The LLM answers in character for every persona, tags each answer positive, negative or neutral, and the map colours each oblast accordingly. Click a region to read its answer.

## How it works

- `src/lib/personas.ts` defines the personas; `src/lib/oblasts.ts` and `src/data/kazakhstan-oblasts.json` hold the regions and their GeoJSON.
- `src/app/api/ask/route.ts` sends personas to GPT-OSS 120B on Groq in batches of five, two batches at a time, with JSON-only output. Batching keeps a full 20-persona question inside Groq's free-tier limit of 8,000 tokens a minute; rate-limited calls wait the time Groq asks for and retry.
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

Next.js 16 (App Router), TypeScript, Groq (GPT-OSS 120B), react-leaflet, Leaflet, GeoJSON, Tailwind CSS. Avatars by DiceBear.

Region boundaries (2022 borders, all 20 regions) © OpenStreetMap contributors, ODbL 1.0.
