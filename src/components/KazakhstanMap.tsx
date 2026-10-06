"use client"

import { useEffect, useRef } from "react"
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON, Layer, PathOptions } from "leaflet"

interface SentimentBucket {
  positive: number
  negative: number
  neutral: number
  total: number
}

interface SentimentData {
  [oblastId: string]: SentimentBucket
}

interface Props {
  oblastSentiment: SentimentData
  onOblastClick?: (oblastId: string, name: string) => void
  activeOblast?: string | null
}

interface LayerEntry {
  id: string
  name: string
  layer: Layer
}

function sentimentColor(data?: SentimentBucket): string {
  if (!data || data.total === 0) return "#1e293b"
  const posRatio = data.positive / data.total
  const negRatio = data.negative / data.total
  if (posRatio > 0.6) return "#059669"
  if (posRatio > 0.4) return "#10b981"
  if (negRatio > 0.6) return "#dc2626"
  if (negRatio > 0.4) return "#ef4444"
  return "#d97706"
}

function styleFor(
  id: string,
  sentiment: SentimentData,
  activeOblast: string | null | undefined
): PathOptions {
  const data = sentiment[id]
  const isActive = activeOblast === id
  return {
    fillColor: sentimentColor(data),
    fillOpacity: data ? 0.75 : 0.25,
    color: isActive ? "#a78bfa" : "#334155",
    weight: isActive ? 2.5 : 1,
  }
}

function tooltipHtml(name: string, data?: SentimentBucket): string {
  if (!data) {
    return `<div class="text-xs font-semibold">${name}</div><div class="text-xs text-gray-400">No data yet</div>`
  }
  return `<div class="text-xs font-semibold">${name}</div>
          <div class="text-xs mt-1">✅ ${data.positive} · ⚠️ ${data.neutral} · ❌ ${data.negative}</div>`
}

export default function KazakhstanMap({ oblastSentiment, onOblastClick, activeOblast }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const geoLayerRef = useRef<LeafletGeoJSON | null>(null)
  const layersRef = useRef<LayerEntry[]>([])

  // onOblastClick may change reference between renders (parent inline callback);
  // keep a stable ref so the init effect doesn't re-run.
  const clickRef = useRef(onOblastClick)
  useEffect(() => {
    clickRef.current = onOblastClick
  }, [onOblastClick])

  // Latest sentiment / active state — read inside event handlers.
  const sentimentRef = useRef(oblastSentiment)
  const activeRef = useRef(activeOblast)
  useEffect(() => { sentimentRef.current = oblastSentiment }, [oblastSentiment])
  useEffect(() => { activeRef.current = activeOblast }, [activeOblast])

  // ---- Init once ----
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return

    let cancelled = false

    async function initMap() {
      const L = (await import("leaflet")).default
      await import("leaflet/dist/leaflet.css")
      if (cancelled || !containerRef.current) return

      const map = L.map(containerRef.current, {
        center: [48.0, 66.0],
        zoom: 4,
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: true,
      })
      // No basemap tiles: the region shapes are the map. (CARTO tiles now require an API key.)
      map.attributionControl.setPrefix(false)
      map.attributionControl.addAttribution("Boundaries © OpenStreetMap contributors")

      mapRef.current = map

      const geojsonData = await fetch("/kazakhstan-oblasts.json").then(r => r.json())
      if (cancelled) return

      const geoLayer = L.geoJSON(geojsonData, {
        style: (feature) => {
          const id = feature?.properties?.id as string | undefined
          if (!id) return {}
          return styleFor(id, sentimentRef.current, activeRef.current)
        },
        onEachFeature: (feature, layer) => {
          const id = feature.properties.id as string
          const name = feature.properties.name as string

          layer.bindTooltip(tooltipHtml(name, sentimentRef.current[id]), {
            className: "kaz-tooltip",
            sticky: true,
          })

          layer.on("click", () => clickRef.current?.(id, name))
          layer.on("mouseover", () => {
            ;(layer as unknown as { setStyle: (s: PathOptions) => void }).setStyle({
              fillOpacity: 0.9,
              weight: 2,
            })
          })
          layer.on("mouseout", () => {
            ;(layer as unknown as { setStyle: (s: PathOptions) => void }).setStyle(
              styleFor(id, sentimentRef.current, activeRef.current)
            )
          })

          layersRef.current.push({ id, name, layer })
        },
      }).addTo(map)

      geoLayerRef.current = geoLayer
    }

    initMap()

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      geoLayerRef.current = null
      layersRef.current = []
    }
  }, [])

  // ---- Restyle only when sentiment or active changes ----
  useEffect(() => {
    for (const { id, name, layer } of layersRef.current) {
      const data = oblastSentiment[id]
      ;(layer as unknown as { setStyle: (s: PathOptions) => void }).setStyle(
        styleFor(id, oblastSentiment, activeOblast)
      )
      ;(layer as unknown as { setTooltipContent: (c: string) => void }).setTooltipContent(
        tooltipHtml(name, data)
      )
    }
  }, [oblastSentiment, activeOblast])

  return (
    <>
      <style>{`
        .kaz-tooltip {
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 8px;
          color: white;
          padding: 6px 10px;
          font-family: inherit;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        }
        .kaz-tooltip::before { display: none; }
        .leaflet-container { background: #0b1220; }
        .leaflet-control-attribution { background: rgba(15,23,42,0.8) !important; color: #64748b !important; font-size: 10px; }
        .leaflet-control-attribution a { color: #94a3b8 !important; }
        .leaflet-control-zoom { border: 1px solid #334155 !important; }
        .leaflet-control-zoom a { background: #0f172a !important; color: #94a3b8 !important; border-color: #334155 !important; }
        .leaflet-control-zoom a:hover { background: #1e293b !important; color: white !important; }
      `}</style>
      <div ref={containerRef} className="w-full h-full rounded-xl" />
    </>
  )
}
