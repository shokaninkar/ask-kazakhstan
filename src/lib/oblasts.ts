// Occupation tags used to align persona profession with the region's
// dominant industry. See `buildOccupationWeights` in personas.ts.
export type IndustryTag =
  | "oil"
  | "mining"
  | "agriculture"
  | "government"
  | "finance_tech"
  | "industry"
  | "construction"
  | "trade"
  | "tourism"

export interface Oblast {
  id: string
  name: string
  capital: string
  population: number          // 2023 estimate
  urban_pct: number           // % urban
  kazakh_pct: number          // % Kazakh ethnicity
  russian_pct: number         // % Russian ethnicity
  other_pct: number
  kazakh_speakers_pct: number // % who speak Kazakh fluently
  higher_edu_pct: number      // % with higher education degree
  unemployment_pct: number    // official unemployment rate
  median_income_kzt: number   // monthly gross, approx KZT (2023–2024 Stat.gov.kz)
  lat: number
  lng: number
  dominant_industry: string
  industry_tags: IndustryTag[] // structured tags for persona weighting
  key_issues: string[]         // top concerns for this region
}

// Monthly gross median income in KZT. 2023–2024 Stat.gov.kz estimates.
// Rough USD conversion at ~455 KZT/USD, shown in UI only when explicitly requested.
export const OBLASTS: Oblast[] = [
  {
    id: "almaty_city", name: "Almaty", capital: "Almaty",
    population: 2100000, urban_pct: 100,
    kazakh_pct: 55, russian_pct: 20, other_pct: 25,
    kazakh_speakers_pct: 62, higher_edu_pct: 42, unemployment_pct: 5.2, median_income_kzt: 373000,
    lat: 43.25, lng: 76.94,
    dominant_industry: "Finance, Tech, Trade, Media",
    industry_tags: ["finance_tech", "trade"],
    key_issues: ["housing affordability", "traffic congestion", "air pollution", "income inequality", "tech job market"],
  },
  {
    id: "astana_city", name: "Astana", capital: "Astana",
    population: 1250000, urban_pct: 100,
    kazakh_pct: 72, russian_pct: 16, other_pct: 12,
    kazakh_speakers_pct: 80, higher_edu_pct: 46, unemployment_pct: 4.8, median_income_kzt: 346000,
    lat: 51.18, lng: 71.45,
    dominant_industry: "Government, Construction, Finance",
    industry_tags: ["government", "construction", "finance_tech"],
    key_issues: ["government salaries", "construction quality", "bureaucracy", "relocation incentives", "smart city development"],
  },
  {
    id: "shymkent_city", name: "Shymkent", capital: "Shymkent",
    population: 1100000, urban_pct: 100,
    kazakh_pct: 85, russian_pct: 5, other_pct: 10,
    kazakh_speakers_pct: 90, higher_edu_pct: 28, unemployment_pct: 6.1, median_income_kzt: 191000,
    lat: 42.32, lng: 69.59,
    dominant_industry: "Industry, Trade, Construction",
    industry_tags: ["industry", "trade", "construction"],
    key_issues: ["youth unemployment", "overpopulation pressure", "water supply", "industrial pollution", "migration to Almaty"],
  },
  {
    id: "almaty_oblast", name: "Almaty Oblast", capital: "Konayev",
    population: 900000, urban_pct: 38,
    kazakh_pct: 82, russian_pct: 8, other_pct: 10,
    kazakh_speakers_pct: 87, higher_edu_pct: 18, unemployment_pct: 5.0, median_income_kzt: 155000,
    lat: 44.00, lng: 77.50,
    dominant_industry: "Agriculture, Tourism, Hydropower",
    industry_tags: ["agriculture", "tourism"],
    key_issues: ["rural-urban migration", "agricultural subsidies", "road infrastructure", "natural disaster risk", "tourism development"],
  },
  {
    id: "akmola", name: "Akmola", capital: "Kokshetau",
    population: 740000, urban_pct: 52,
    kazakh_pct: 44, russian_pct: 40, other_pct: 16,
    kazakh_speakers_pct: 50, higher_edu_pct: 22, unemployment_pct: 5.5, median_income_kzt: 168000,
    lat: 52.00, lng: 70.00,
    dominant_industry: "Agriculture, Mining, Tourism",
    industry_tags: ["agriculture", "mining", "tourism"],
    key_issues: ["language policy", "agricultural wages", "village depopulation", "pension adequacy", "cross-ethnic relations"],
  },
  {
    id: "aktobe", name: "Aktobe", capital: "Aktobe",
    population: 900000, urban_pct: 65,
    kazakh_pct: 72, russian_pct: 17, other_pct: 11,
    kazakh_speakers_pct: 76, higher_edu_pct: 24, unemployment_pct: 4.9, median_income_kzt: 223000,
    lat: 50.28, lng: 57.21,
    dominant_industry: "Oil, Gas, Chromium mining",
    industry_tags: ["oil", "mining"],
    key_issues: ["resource revenue distribution", "environmental impact of mining", "local job creation", "healthcare access", "western border trade"],
  },
  {
    id: "atyrau", name: "Atyrau", capital: "Atyrau",
    population: 680000, urban_pct: 64,
    kazakh_pct: 90, russian_pct: 6, other_pct: 4,
    kazakh_speakers_pct: 92, higher_edu_pct: 26, unemployment_pct: 4.2, median_income_kzt: 278000,
    lat: 47.10, lng: 51.92,
    dominant_industry: "Oil production (Tengiz, Kashagan)",
    industry_tags: ["oil"],
    key_issues: ["Caspian ecology", "oil wealth distribution", "foreign worker vs local hiring", "Aral Sea legacy", "cost of living inflation"],
  },
  {
    id: "east_kaz", name: "East Kazakhstan", capital: "Oskemen",
    population: 730000, urban_pct: 63,
    kazakh_pct: 52, russian_pct: 37, other_pct: 11,
    kazakh_speakers_pct: 57, higher_edu_pct: 25, unemployment_pct: 5.8, median_income_kzt: 187000,
    lat: 49.50, lng: 82.00,
    dominant_industry: "Mining, Metallurgy, Timber",
    industry_tags: ["mining", "industry"],
    key_issues: ["emigration of Russians", "mine safety", "water resources from Irtysh", "language rights", "border relations with China"],
  },
  {
    // Split from East Kazakhstan in June 2022. Population and ethnic shares: 2026 estimate
    // (citypopulation.de / Wikipedia). Language, education, unemployment and income are
    // approximations carried over from pre-split East Kazakhstan, adjusted for the higher Kazakh share.
    id: "abai", name: "Abai", capital: "Semey",
    population: 596000, urban_pct: 58,
    kazakh_pct: 79, russian_pct: 16, other_pct: 5,
    kazakh_speakers_pct: 78, higher_edu_pct: 22, unemployment_pct: 5.0, median_income_kzt: 175000,
    lat: 50.41, lng: 80.23,
    dominant_industry: "Livestock, Agriculture, Light industry",
    industry_tags: ["agriculture", "industry"],
    key_issues: ["health legacy of the Semipalatinsk test site", "rural depopulation", "road conditions", "livestock prices", "jobs for young people in Semey"],
  },
  {
    id: "jambyl", name: "Jambyl", capital: "Taraz",
    population: 1100000, urban_pct: 44,
    kazakh_pct: 72, russian_pct: 8, other_pct: 20,
    kazakh_speakers_pct: 80, higher_edu_pct: 17, unemployment_pct: 6.3, median_income_kzt: 150000,
    lat: 42.90, lng: 71.40,
    dominant_industry: "Agriculture, Phosphate, Chemicals",
    industry_tags: ["agriculture", "industry"],
    key_issues: ["water shortage", "low wages", "chemical plant pollution", "youth emigration", "road quality"],
  },
  {
    id: "jetisu", name: "Jetisu", capital: "Taldykorgan",
    population: 620000, urban_pct: 40,
    kazakh_pct: 84, russian_pct: 7, other_pct: 9,
    kazakh_speakers_pct: 88, higher_edu_pct: 16, unemployment_pct: 5.7, median_income_kzt: 146000,
    lat: 45.00, lng: 79.00,
    dominant_industry: "Agriculture, Apple orchards, Tourism",
    industry_tags: ["agriculture", "tourism"],
    key_issues: ["new oblast growing pains", "agricultural investment", "road connectivity to Almaty", "land rights"],
  },
  {
    id: "karaganda", name: "Karaganda", capital: "Karaganda",
    population: 1350000, urban_pct: 80,
    kazakh_pct: 42, russian_pct: 36, other_pct: 22,
    kazakh_speakers_pct: 48, higher_edu_pct: 30, unemployment_pct: 5.4, median_income_kzt: 218000,
    lat: 49.80, lng: 73.10,
    dominant_industry: "Coal, Steel, Metallurgy",
    industry_tags: ["mining", "industry"],
    key_issues: ["coal industry decline", "ethnic diversity", "Soviet-era industrial legacy", "mine closures", "retraining workers"],
  },
  {
    id: "kostanay", name: "Kostanay", capital: "Kostanay",
    population: 840000, urban_pct: 57,
    kazakh_pct: 41, russian_pct: 41, other_pct: 18,
    kazakh_speakers_pct: 47, higher_edu_pct: 21, unemployment_pct: 6.0, median_income_kzt: 168000,
    lat: 53.20, lng: 63.62,
    dominant_industry: "Wheat farming, Iron ore",
    industry_tags: ["agriculture", "mining"],
    key_issues: ["Russian emigration concerns", "grain export revenues", "pension delays", "school closures in villages", "bilateral relations with Russia"],
  },
  {
    id: "kyzylorda", name: "Kyzylorda", capital: "Kyzylorda",
    population: 820000, urban_pct: 46,
    kazakh_pct: 96, russian_pct: 2, other_pct: 2,
    kazakh_speakers_pct: 97, higher_edu_pct: 20, unemployment_pct: 4.8, median_income_kzt: 182000,
    lat: 44.85, lng: 65.51,
    dominant_industry: "Oil, Rice farming, Baikonur Cosmodrome",
    industry_tags: ["oil", "agriculture", "government"],
    key_issues: ["Aral Sea disaster legacy", "drinking water quality", "Baikonur economic benefits", "desertification", "remote healthcare"],
  },
  {
    id: "mangystau", name: "Mangystau", capital: "Aktau",
    population: 750000, urban_pct: 65,
    kazakh_pct: 90, russian_pct: 5, other_pct: 5,
    kazakh_speakers_pct: 91, higher_edu_pct: 24, unemployment_pct: 4.5, median_income_kzt: 264000,
    lat: 43.64, lng: 51.18,
    dominant_industry: "Oil, Gas, Port logistics",
    industry_tags: ["oil", "trade"],
    key_issues: ["Zhanaozen labour rights memory", "water scarcity", "Caspian pollution", "foreign oil company practices", "housing costs"],
  },
  {
    id: "north_kaz", name: "North Kazakhstan", capital: "Petropavl",
    population: 540000, urban_pct: 59,
    kazakh_pct: 35, russian_pct: 50, other_pct: 15,
    kazakh_speakers_pct: 40, higher_edu_pct: 22, unemployment_pct: 6.2, median_income_kzt: 159000,
    lat: 54.87, lng: 69.16,
    dominant_industry: "Agriculture, Light industry",
    industry_tags: ["agriculture", "industry"],
    key_issues: ["Russia border proximity", "Russian language dominance", "population shrinkage", "youth leaving", "identity concerns"],
  },
  {
    id: "pavlodar", name: "Pavlodar", capital: "Pavlodar",
    population: 740000, urban_pct: 73,
    kazakh_pct: 44, russian_pct: 39, other_pct: 17,
    kazakh_speakers_pct: 50, higher_edu_pct: 26, unemployment_pct: 5.3, median_income_kzt: 205000,
    lat: 52.28, lng: 76.97,
    dominant_industry: "Aluminium smelting, Coal, Chemicals",
    industry_tags: ["industry", "mining"],
    key_issues: ["industrial pollution", "aluminium plant health impact", "Irtysh river ecology", "energy costs", "Chinese investment concerns"],
  },
  {
    id: "turkistan", name: "Turkistan", capital: "Turkistan",
    population: 2100000, urban_pct: 34,
    kazakh_pct: 88, russian_pct: 2, other_pct: 10,
    kazakh_speakers_pct: 93, higher_edu_pct: 14, unemployment_pct: 7.2, median_income_kzt: 132000,
    lat: 41.50, lng: 68.50,
    dominant_industry: "Agriculture, Cotton, Religious tourism",
    industry_tags: ["agriculture", "tourism"],
    key_issues: ["poverty", "large families and welfare", "water access", "education quality", "Silk Road heritage development"],
  },
  {
    id: "ulytau", name: "Ulytau", capital: "Jezkazgan",
    population: 230000, urban_pct: 60,
    kazakh_pct: 58, russian_pct: 28, other_pct: 14,
    kazakh_speakers_pct: 63, higher_edu_pct: 20, unemployment_pct: 5.6, median_income_kzt: 191000,
    lat: 47.80, lng: 67.70,
    dominant_industry: "Copper mining, Historical heritage",
    industry_tags: ["mining", "tourism"],
    key_issues: ["smallest oblast viability", "mine worker conditions", "remote location", "nomadic cultural heritage"],
  },
  {
    id: "west_kaz", name: "West Kazakhstan", capital: "Oral",
    population: 680000, urban_pct: 58,
    kazakh_pct: 74, russian_pct: 19, other_pct: 7,
    kazakh_speakers_pct: 78, higher_edu_pct: 22, unemployment_pct: 5.1, median_income_kzt: 200000,
    lat: 51.23, lng: 51.40,
    dominant_industry: "Oil, Agriculture, Livestock",
    industry_tags: ["oil", "agriculture"],
    key_issues: ["oil revenue sharing", "Ural river ecology", "proximity to Russia", "livestock sector support", "healthcare infrastructure"],
  },
]

export const OBLASTS_BY_ID = Object.fromEntries(OBLASTS.map(o => [o.id, o]))

// OCCUPATIONS now lives in personas.ts (tied to OCCUPATION_DEFS with industry tags)
export const AGE_BRACKETS = ["18–24", "25–34", "35–44", "45–54", "55–64", "65+"]
export const GENDERS = ["Male", "Female"]
export const ETHNICITIES = ["Kazakh", "Russian", "Other"]
export const EDUCATION_LEVELS = ["No higher education", "Vocational / College", "University degree", "Postgraduate"]
export const INCOME_LEVELS = ["Low income", "Middle income", "Upper middle income", "High income"]
