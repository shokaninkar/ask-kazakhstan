"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { OBLASTS, AGE_BRACKETS, GENDERS, ETHNICITIES } from "@/lib/oblasts"
import { OCCUPATIONS } from "@/lib/personas"
import { randomSeed } from "@/lib/rng"

const KazakhstanMap = dynamic(() => import("@/components/KazakhstanMap"), { ssr: false })

const MAX_QUESTION_LEN = 240

interface PersonaResponse {
  personaId: string
  name: string
  oblast: string
  oblastId: string
  age_bracket: string
  gender: string
  ethnicity: string
  occupation: string
  education: string
  income_level: string
  income_kzt: number
  urban: boolean
  speaks_kazakh: boolean
  outlook?: string
  sentiment: "positive" | "negative" | "neutral"
  response: string
  appearance?: string
}

// Illustrated avatar, deterministic per persona. DiceBear is keyless and free.
function avatarUrl(r: PersonaResponse): string {
  const seed = encodeURIComponent(`${r.name}-${r.oblastId}-${r.age_bracket}`)
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${seed}&backgroundColor=1e293b`
}

interface SentimentBucket {
  positive: number
  negative: number
  neutral: number
  total: number
}

const SAMPLE_QUESTIONS = [
  "Should Kazakhstan invest more in renewable energy?",
  "Is moving the capital to Astana good for the country?",
  "Should the Kazakh language replace Russian in official settings?",
  "Do you support raising the retirement age?",
  "Should Kazakhstan attract more foreign tech companies?",
  "Is the wealth distribution between regions fair?",
]

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#10b981",
  negative: "#ef4444",
  neutral: "#d97706",
}

const SENTIMENT_ICONS: Record<string, string> = {
  positive: "✅",
  negative: "❌",
  neutral: "⚖️",
}

function formatKzt(n: number): string {
  return `${new Intl.NumberFormat("ru-RU").format(n)} ₸`
}

function FilterGroup({ label, items, active, onToggle }: {
  label: string; items: string[]; active: string[]; onToggle: (v: string) => void
}) {
  return (
    <div className="mb-4">
      <p className="text-xs text-slate-600 mb-2 font-medium">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map(item => (
          <button key={item} onClick={() => onToggle(item)}
            className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
              active.includes(item) ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
            }`}>{item}</button>
        ))}
      </div>
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-500">{children}</span>
}

// ---- SSE parser ----
// Consumes a ReadableStream<Uint8Array> and yields {event, data} pairs.
async function* parseSSE(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      let event = "message"
      const dataLines: string[] = []
      for (const line of chunk.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim()
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim())
      }
      if (dataLines.length) {
        try {
          yield { event, data: JSON.parse(dataLines.join("\n")) }
        } catch {
          // skip malformed
        }
      }
    }
  }
}

export default function Home() {
  const [question, setQuestion] = useState("")
  const [loading, setLoading] = useState(false)
  const [responses, setResponses] = useState<PersonaResponse[]>([])
  const [oblastSentiment, setOblastSentiment] = useState<Record<string, SentimentBucket>>({})
  const [activeOblast, setActiveOblast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [personaCount, setPersonaCount] = useState(20)
  const [seed, setSeed] = useState<number | null>(null)
  const [stats, setStats] = useState<{ succeeded: number; failed: number; requested: number } | null>(null)
  const [filters, setFilters] = useState<{
    oblastIds: string[]; ageBrackets: string[]; genders: string[]; ethnicities: string[]; occupations: string[]
  }>({ oblastIds: [], ageBrackets: [], genders: [], ethnicities: [], occupations: [] })

  const abortRef = useRef<AbortController | null>(null)

  const filteredResponses = activeOblast ? responses.filter(r => r.oblastId === activeOblast) : responses

  // ---- Hydrate from URL on mount ----
  useEffect(() => {
    const url = new URL(window.location.href)
    const q = url.searchParams.get("q")
    const s = url.searchParams.get("seed")
    const n = url.searchParams.get("n")
    if (q) setQuestion(q.slice(0, MAX_QUESTION_LEN))
    if (s && /^\d+$/.test(s)) setSeed(Number(s) >>> 0)
    if (n && /^\d+$/.test(n)) {
      const parsed = Number(n)
      if ([6, 12, 20].includes(parsed)) setPersonaCount(parsed)
    }
  }, [])

  const ask = useCallback(async (opts?: { reuseSeed?: boolean }) => {
    const q = question.trim()
    if (!q || loading) return

    const activeSeed = opts?.reuseSeed && seed ? seed : randomSeed()
    setSeed(activeSeed)

    // Reflect in URL for permalink
    const url = new URL(window.location.href)
    url.searchParams.set("q", q)
    url.searchParams.set("seed", String(activeSeed))
    url.searchParams.set("n", String(personaCount))
    window.history.replaceState({}, "", url.toString())

    setLoading(true)
    setError(null)
    setResponses([])
    setOblastSentiment({})
    setActiveOblast(null)
    setStats(null)

    // Cancel any in-flight request
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, filters, count: personaCount, seed: activeSeed }),
        signal: ac.signal,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      if (!res.body) throw new Error("Response has no body")

      const nextSentiment: Record<string, SentimentBucket> = {}
      for await (const { event, data } of parseSSE(res.body)) {
        if (event === "persona") {
          const p = data as PersonaResponse
          setResponses(prev => [...prev, p])
          const bucket = nextSentiment[p.oblastId] ?? { positive: 0, negative: 0, neutral: 0, total: 0 }
          bucket[p.sentiment]++
          bucket.total++
          nextSentiment[p.oblastId] = bucket
          setOblastSentiment({ ...nextSentiment })
        } else if (event === "done") {
          setStats(data as typeof stats)
        } else if (event === "error") {
          // Per-persona error, non-fatal — just log
          // eslint-disable-next-line no-console
          console.warn("persona failed:", data)
        } else if (event === "meta") {
          const meta = data as { seed: number }
          setSeed(meta.seed)
        }
      }
    } catch (e) {
      if ((e as { name?: string }).name === "AbortError") return
      setError(e instanceof Error ? e.message : "Failed to get responses")
    } finally {
      setLoading(false)
      if (abortRef.current === ac) abortRef.current = null
    }
  }, [question, filters, personaCount, loading, seed])

  function toggleFilter(key: keyof typeof filters, value: string) {
    setFilters(f => ({ ...f, [key]: f[key].includes(value) ? f[key].filter(v => v !== value) : [...f[key], value] }))
  }

  const handleOblastClick = useCallback((id: string) => {
    setActiveOblast(prev => prev === id ? null : id)
  }, [])

  const sentimentSummary = responses.reduce(
    (acc, r) => { acc[r.sentiment]++; return acc },
    { positive: 0, negative: 0, neutral: 0 }
  )

  const charsLeft = MAX_QUESTION_LEN - question.length
  const charsWarning = charsLeft < 30

  return (
    <div className="min-h-screen bg-[#080d14] text-white font-sans">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center text-sm">🇰🇿</div>
          <span className="font-bold text-lg tracking-tight">Ask Kazakhstan</span>
          <span className="text-xs text-slate-500 hidden sm:block">AI synthetic opinion polling</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/methodology" className="text-xs text-slate-500 hover:text-sky-400 transition-colors">Methodology</Link>
          <span className="text-xs text-slate-600 hidden sm:inline">Powered by Groq + Llama 3</span>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row" style={{ height: "calc(100vh - 65px)" }}>
        {/* Left panel */}
        <div className="w-full lg:w-[420px] flex-shrink-0 border-r border-slate-800 flex flex-col overflow-hidden">
          <div className="p-5 border-b border-slate-800">
            <p className="text-xs text-slate-500 mb-3 uppercase tracking-widest font-medium">Ask a question</p>
            <textarea
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-sky-500 transition-colors"
              rows={3}
              maxLength={MAX_QUESTION_LEN}
              placeholder="e.g. Should Kazakhstan raise the retirement age?"
              value={question}
              onChange={e => setQuestion(e.target.value.slice(0, MAX_QUESTION_LEN))}
            />
            <div className="flex justify-between text-[10px] mt-1 mb-2">
              <span className={charsWarning ? "text-amber-500" : "text-slate-600"}>{charsLeft} chars left</span>
              {seed !== null && <span className="text-slate-600 font-mono">seed: {seed}</span>}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
              {SAMPLE_QUESTIONS.slice(0, 3).map(q => (
                <button key={q} onClick={() => setQuestion(q)}
                  className="text-xs px-2 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-sky-400 hover:bg-slate-700 transition-colors text-left">
                  {q.length > 44 ? q.slice(0, 44) + "…" : q}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs text-slate-500">Personas:</span>
              {[6, 12, 20].map(n => (
                <button key={n} onClick={() => setPersonaCount(n)}
                  className={`text-xs px-3 py-1 rounded-lg transition-colors ${personaCount === n ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
                  {n}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => ask()} disabled={loading || !question.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed">
                {loading ? "Generating responses…" : "Ask Kazakhstan →"}
              </button>
              {seed !== null && !loading && responses.length > 0 && (
                <button onClick={() => ask({ reuseSeed: true })}
                  title="Re-run with same seed — deterministic"
                  className="px-3 py-2.5 rounded-xl text-sm bg-slate-800 hover:bg-slate-700 text-slate-300">
                  ↻
                </button>
              )}
            </div>
            {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
            {stats && stats.failed > 0 && (
              <p className="text-xs text-amber-500 mt-2">{stats.succeeded}/{stats.requested} personas responded ({stats.failed} failed)</p>
            )}
          </div>

          <div className="p-5 border-b border-slate-800 overflow-y-auto">
            <p className="text-xs text-slate-500 mb-3 uppercase tracking-widest font-medium">Filters</p>
            <FilterGroup label="Age" items={AGE_BRACKETS} active={filters.ageBrackets} onToggle={v => toggleFilter("ageBrackets", v)} />
            <FilterGroup label="Gender" items={GENDERS} active={filters.genders} onToggle={v => toggleFilter("genders", v)} />
            <FilterGroup label="Ethnicity" items={ETHNICITIES} active={filters.ethnicities} onToggle={v => toggleFilter("ethnicities", v)} />
            <FilterGroup label="Occupation" items={OCCUPATIONS} active={filters.occupations} onToggle={v => toggleFilter("occupations", v)} />
            <FilterGroup label="Region" items={OBLASTS.map(o => o.name)}
              active={filters.oblastIds.map(id => OBLASTS.find(o => o.id === id)?.name ?? id)}
              onToggle={v => { const o = OBLASTS.find(o => o.name === v); if (o) toggleFilter("oblastIds", o.id) }} />
          </div>

          {responses.length > 0 && (
            <div className="p-5">
              <p className="text-xs text-slate-500 mb-3 uppercase tracking-widest font-medium">Overall sentiment — {responses.length} responses</p>
              <div className="flex gap-3">
                {(["positive", "negative", "neutral"] as const).map(s => (
                  <div key={s} className="flex-1 rounded-xl p-3 bg-slate-900 border border-slate-800 text-center">
                    <div className="text-xl font-bold" style={{ color: SENTIMENT_COLORS[s] }}>{sentimentSummary[s]}</div>
                    <div className="text-xs text-slate-500 mt-0.5 capitalize">{s}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="relative bg-slate-950" style={{ height: "55%" }}>
            <KazakhstanMap oblastSentiment={oblastSentiment} onOblastClick={handleOblastClick} activeOblast={activeOblast} />
            <div className="absolute bottom-4 left-4 bg-[#080d14]/90 backdrop-blur border border-slate-800 rounded-xl p-3 text-xs space-y-1.5 z-[1000]">
              <div className="text-slate-500 font-medium mb-1">Sentiment</div>
              {[["#059669","Strongly positive"],["#10b981","Positive"],["#d97706","Neutral / Mixed"],["#ef4444","Negative"],["#dc2626","Strongly negative"],["#1e293b","No data"]].map(([c,l]) => (
                <div key={l} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: c }} />
                  <span className="text-slate-400">{l}</span>
                </div>
              ))}
            </div>
            {activeOblast && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-sky-600/90 text-xs text-white font-medium px-3 py-1.5 rounded-full z-[1000]">
                {OBLASTS.find(o => o.id === activeOblast)?.name} · click to clear
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {loading && responses.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-slate-500">Generating {personaCount} synthetic personas…</p>
              </div>
            )}
            {!loading && responses.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="text-4xl mb-4">🗺️</div>
                <p className="text-slate-400 font-medium mb-2">Ask a question to see responses</p>
                <p className="text-sm text-slate-600 max-w-sm">AI generates one synthetic persona for each of Kazakhstan&apos;s 20 regions, built from real population and demographic data.</p>
                <p className="text-xs text-slate-700 mt-4">
                  AI-generated opinions only · <Link href="/methodology" className="underline hover:text-sky-400">read the methodology</Link>
                </p>
              </div>
            )}
            {filteredResponses.map(r => (
              <div key={r.personaId} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={avatarUrl(r)} alt="" width={44} height={44} loading="lazy"
                      className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-sm">{r.name}</span>
                      <span className="text-slate-500 text-xs ml-2">{r.age_bracket} · {r.gender} · {r.ethnicity}</span>
                      {r.speaks_kazakh && <span className="text-xs ml-1.5 text-amber-600/80">🗣 Kaz</span>}
                      {r.appearance && <p className="text-xs text-slate-500 italic mt-0.5 leading-snug">{r.appearance}</p>}
                    </div>
                  </div>
                  <span className="text-base flex-shrink-0">{SENTIMENT_ICONS[r.sentiment]}</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed mb-3">&ldquo;{r.response}&rdquo;</p>
                <div className="flex flex-wrap gap-1.5">
                  <Tag>{r.oblast}</Tag>
                  <Tag>{r.urban ? "🏙 Urban" : "🌾 Rural"}</Tag>
                  <Tag>{r.occupation}</Tag>
                  <Tag>{r.education}</Tag>
                  <Tag>{formatKzt(r.income_kzt)}/mo</Tag>
                </div>
              </div>
            ))}
            {loading && responses.length > 0 && (
              <div className="flex items-center justify-center py-4 gap-2 text-xs text-slate-600">
                <div className="w-3 h-3 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                <span>streaming… {responses.length}/{personaCount}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
