import {
  Oblast,
  OBLASTS,
  AGE_BRACKETS,
  GENDERS,
  ETHNICITIES,
  IndustryTag,
} from "./oblasts"
import { mulberry32, pickInt, weightedPick, type Rng } from "./rng"

export interface Persona {
  id: string
  name: string
  oblast: Oblast
  age_bracket: string
  gender: string
  ethnicity: string
  occupation: string
  education: string
  income_level: string
  income_kzt: number
  urban: boolean
  speaks_kazakh: boolean
}

const NAMES: Record<string, Record<string, string[]>> = {
  Kazakh: {
    Male:   ["Aibek","Nurlan","Dauren","Serik","Arman","Marat","Erlan","Askar","Ruslan","Baurzhan","Yerlan","Daniyar","Azamat","Beibut","Nurbol","Dias","Nurzhan","Alisher","Darkhan"],
    Female: ["Ainur","Gulnara","Asel","Zarina","Madina","Dinara","Meruert","Aigerim","Zhuldyz","Samal","Akbota","Moldir","Gaini","Sholpan","Ainash","Saltanat","Nazgul","Zulfiya"],
  },
  Russian: {
    Male:   ["Andrei","Dmitri","Aleksei","Sergei","Vladimir","Ivan","Nikolai","Artem","Pavel","Mikhail","Alexey","Denis","Maxim","Yuri","Stanislav"],
    Female: ["Natalia","Elena","Olga","Tatiana","Irina","Anna","Marina","Svetlana","Julia","Ekaterina","Oksana","Galina","Vera","Liudmila"],
  },
  Other: {
    Male:   ["Aziz","Timur","Bakhyt","Kanat","Ali","Mukhtar","Damir","Ulan","Bakyt","Akmal","Jahongir"],
    Female: ["Malika","Farida","Gulnoza","Zulfiya","Kamila","Nargiza","Dilnoza","Rohila"],
  },
}

function pickName(rng: Rng, gender: string, ethnicity: string): string {
  const pool = NAMES[ethnicity]?.[gender] ?? NAMES.Kazakh.Male
  return pool[pickInt(rng, pool.length)]
}

// Age weights — younger skews more in fast-growing southern regions
const AGE_WEIGHTS_YOUNG  = [0.22, 0.26, 0.20, 0.16, 0.11, 0.05]  // Turkistan, Shymkent
const AGE_WEIGHTS_NORMAL = [0.15, 0.22, 0.22, 0.20, 0.14, 0.07]  // most regions
const AGE_WEIGHTS_OLD    = [0.10, 0.18, 0.22, 0.22, 0.18, 0.10]  // North KZ, East KZ

function ageWeights(oblastId: string): number[] {
  if (["turkistan","shymkent_city","jambyl","kyzylorda"].includes(oblastId)) return AGE_WEIGHTS_YOUNG
  if (["north_kaz","east_kaz","kostanay","akmola"].includes(oblastId)) return AGE_WEIGHTS_OLD
  return AGE_WEIGHTS_NORMAL
}

function educationForAge(rng: Rng, age_bracket: string, urban: boolean, oblast: Oblast): string {
  const baseHigher = oblast.higher_edu_pct / 100
  const urbanBonus = urban ? 0.1 : -0.05
  const ageBonus = age_bracket === "25–34" || age_bracket === "35–44" ? 0.05 : 0
  const p = Math.min(0.8, baseHigher + urbanBonus + ageBonus)

  if (age_bracket === "65+") return rng() < 0.25 ? "University degree" : "No higher education"
  const r = rng()
  if (r < p * 0.1) return "Postgraduate"
  if (r < p) return "University degree"
  if (r < p + 0.3) return "Vocational / College"
  return "No higher education"
}

// ---- Occupation <-> industry mapping ----
// Each occupation gets a base weight (how common it is nationwide) plus bonus
// weights for regions whose dominant industry matches. Keeps personas coherent:
// an oil worker in Atyrau is plausible, an oil worker in Turkistan is not.

interface OccupationDef {
  label: string
  base: number
  boost?: Partial<Record<IndustryTag, number>>
  ruralOnly?: boolean
  urbanBias?: number // 0–1; higher = more urban
}

const OCCUPATION_DEFS: OccupationDef[] = [
  { label: "Student", base: 1.0, urbanBias: 0.7 },
  { label: "Teacher / Educator", base: 1.2 },
  { label: "Government employee", base: 1.0, boost: { government: 4 }, urbanBias: 0.8 },
  { label: "Oil & Gas worker", base: 0.2, boost: { oil: 6 } },
  { label: "Farmer / Agricultural worker", base: 0.4, boost: { agriculture: 5 }, ruralOnly: true },
  { label: "Factory / Plant worker", base: 0.8, boost: { industry: 4 }, urbanBias: 0.7 },
  { label: "Small business owner", base: 1.0, boost: { trade: 2 } },
  { label: "Healthcare worker", base: 1.2 },
  { label: "IT / Tech worker", base: 0.3, boost: { finance_tech: 6 }, urbanBias: 0.95 },
  { label: "Unemployed", base: 0.8 },
  { label: "Pensioner", base: 1.0 },
  { label: "Construction worker", base: 0.9, boost: { construction: 3 } },
  { label: "Mining worker", base: 0.3, boost: { mining: 5 } },
  { label: "Merchant / Trader", base: 0.9, boost: { trade: 3 } },
  { label: "Driver / Transport worker", base: 0.9 },
  { label: "Hospitality / Tourism worker", base: 0.4, boost: { tourism: 4 } },
]

export const OCCUPATIONS = OCCUPATION_DEFS.map(o => o.label)

function buildOccupationWeights(oblast: Oblast, urban: boolean, age_bracket: string): number[] {
  return OCCUPATION_DEFS.map(def => {
    // Age gates
    if (def.label === "Student" && !["18–24"].includes(age_bracket)) return 0
    if (def.label === "Pensioner" && !["55–64", "65+"].includes(age_bracket)) return 0
    if (age_bracket === "65+" && !["Pensioner"].includes(def.label)) return 0.05 // mostly pensioners

    let w = def.base
    if (def.boost) {
      for (const tag of oblast.industry_tags) {
        if (def.boost[tag]) w += def.boost[tag]!
      }
    }
    if (def.ruralOnly && urban) w *= 0.1
    if (def.urbanBias !== undefined) {
      w *= urban ? def.urbanBias * 2 : (1 - def.urbanBias) * 2
    }
    return Math.max(0.01, w)
  })
}

function incomeFromPersona(rng: Rng, oblast: Oblast, occupation: string, education: string): { income_level: string; income_kzt: number } {
  let base = oblast.median_income_kzt
  if (["IT / Tech worker", "Oil & Gas worker", "Mining worker"].includes(occupation)) base *= 1.5
  if (["Pensioner", "Unemployed", "Farmer / Agricultural worker"].includes(occupation)) base *= 0.55
  if (education === "Postgraduate") base *= 1.3
  if (education === "University degree") base *= 1.15
  // Log-normal jitter ±20% so two personas in the same bucket aren't identical
  const jitter = 1 + (rng() - 0.5) * 0.4
  const income_kzt = Math.round(base * jitter / 1000) * 1000

  // Buckets in KZT (roughly tracks Stat.gov.kz deciles, 2024)
  const income_level =
    income_kzt > 320_000 ? "High income" :
    income_kzt > 200_000 ? "Upper middle income" :
    income_kzt > 130_000 ? "Middle income" :
    "Low income"

  return { income_level, income_kzt }
}

export interface PersonaFilters {
  oblastIds?: string[]
  ageBrackets?: string[]
  genders?: string[]
  ethnicities?: string[]
  occupations?: string[]
}

export function generatePersonas(count: number, filters: PersonaFilters, seed: number): Persona[] {
  const rng = mulberry32(seed)
  const oblastPool = filters.oblastIds?.length
    ? OBLASTS.filter(o => filters.oblastIds!.includes(o.id))
    : OBLASTS

  return Array.from({ length: count }, (_, i) => {
    const oblast = weightedPick(rng, oblastPool, oblastPool.map(o => o.population))

    const ethPool = filters.ethnicities?.length ? filters.ethnicities : ETHNICITIES
    const ethWeights = ethPool.map(e =>
      e === "Kazakh" ? oblast.kazakh_pct : e === "Russian" ? oblast.russian_pct : oblast.other_pct
    )
    const ethnicity = weightedPick(rng, ethPool, ethWeights)

    const gender = filters.genders?.length
      ? filters.genders[pickInt(rng, filters.genders.length)]
      : GENDERS[pickInt(rng, GENDERS.length)]

    const age_bracket = filters.ageBrackets?.length
      ? filters.ageBrackets[pickInt(rng, filters.ageBrackets.length)]
      : weightedPick(rng, AGE_BRACKETS, ageWeights(oblast.id))

    const urban = rng() * 100 < oblast.urban_pct

    const occupation = filters.occupations?.length
      ? filters.occupations[pickInt(rng, filters.occupations.length)]
      : weightedPick(rng, OCCUPATIONS, buildOccupationWeights(oblast, urban, age_bracket))

    const education = educationForAge(rng, age_bracket, urban, oblast)
    const { income_level, income_kzt } = incomeFromPersona(rng, oblast, occupation, education)

    // Language: Kazakhs in high-kazakh-speaker oblasts more likely to speak it
    const kazProb = ethnicity === "Kazakh"
      ? oblast.kazakh_speakers_pct / 100
      : ethnicity === "Russian"
      ? (oblast.kazakh_speakers_pct - 50) / 100
      : 0.4
    const speaks_kazakh = rng() < Math.max(0, kazProb)

    return {
      id: `persona_${i}`,
      name: pickName(rng, gender, ethnicity),
      oblast,
      age_bracket,
      gender,
      ethnicity,
      occupation,
      education,
      income_level,
      income_kzt,
      urban,
      speaks_kazakh,
    }
  })
}
