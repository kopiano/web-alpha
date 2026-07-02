import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import maplibregl from "maplibre-gl";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { Particles } from "@/components/dashboard/Particles";
import { MapPin, Train, Navigation, Search, X, Locate, Layers, Eye, EyeOff, ArrowRight, Star } from "lucide-react";
import { useAuth } from "@/components/dashboard/AuthProvider";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, Feature, LineString } from "geojson";

/* ─── Types ─── */
interface Station { id: string; name: string; lat: number; lng: number; line: string; lineColor: string; }
interface MetroLine { id: string; name: string; color: string; stations: string[]; }

const METRO_LINES: MetroLine[] = [
  { id: "line1", name: "Line 1", color: "#c23a30", stations: ["1-1","1-2","1-3","1-4","1-5","1-6","1-7","1-8","1-9","1-10","1-11"] },
  { id: "line2", name: "Line 2", color: "#0055a4", stations: ["2-1","2-2","2-3","2-4","2-5","2-6","2-7","2-8","2-9","2-10","2-11","2-12"] },
  { id: "line10", name: "Line 10", color: "#008c95", stations: ["10-1","10-2","10-3","10-4","10-5","10-6","10-7","10-8","10-9","10-10"] },
];

const STATIONS: Station[] = [
  { id: "1-1", name: "Pingguoyuan", lat: 39.910, lng: 116.185, line: "line1", lineColor: "#c23a30" },
  { id: "1-2", name: "Gucheng", lat: 39.907, lng: 116.215, line: "line1", lineColor: "#c23a30" },
  { id: "1-3", name: "Wanshou Lu", lat: 39.905, lng: 116.260, line: "line1", lineColor: "#c23a30" },
  { id: "1-4", name: "Gongzhufen", lat: 39.905, lng: 116.305, line: "line1", lineColor: "#c23a30" },
  { id: "1-5", name: "Fuxingmen", lat: 39.905, lng: 116.345, line: "line1", lineColor: "#c23a30" },
  { id: "1-6", name: "Xidan", lat: 39.908, lng: 116.373, line: "line1", lineColor: "#c23a30" },
  { id: "1-7", name: "Tian'anmen W", lat: 39.908, lng: 116.391, line: "line1", lineColor: "#c23a30" },
  { id: "1-8", name: "Tian'anmen E", lat: 39.909, lng: 116.405, line: "line1", lineColor: "#c23a30" },
  { id: "1-9", name: "Wangfujing", lat: 39.913, lng: 116.413, line: "line1", lineColor: "#c23a30" },
  { id: "1-10", name: "Dongdan", lat: 39.913, lng: 116.425, line: "line1", lineColor: "#c23a30" },
  { id: "1-11", name: "Jianguomen", lat: 39.910, lng: 116.440, line: "line1", lineColor: "#c23a30" },
  { id: "2-1", name: "Xizhimen", lat: 39.942, lng: 116.350, line: "line2", lineColor: "#0055a4" },
  { id: "2-2", name: "Chegongzhuang", lat: 39.937, lng: 116.355, line: "line2", lineColor: "#0055a4" },
  { id: "2-3", name: "Fuxingmen", lat: 39.905, lng: 116.345, line: "line2", lineColor: "#0055a4" },
  { id: "2-4", name: "Xuanwumen", lat: 39.898, lng: 116.370, line: "line2", lineColor: "#0055a4" },
  { id: "2-5", name: "Qianmen", lat: 39.895, lng: 116.395, line: "line2", lineColor: "#0055a4" },
  { id: "2-6", name: "Chongwenmen", lat: 39.898, lng: 116.420, line: "line2", lineColor: "#0055a4" },
  { id: "2-7", name: "Beijing Zhan", lat: 39.902, lng: 116.428, line: "line2", lineColor: "#0055a4" },
  { id: "2-8", name: "Jianguomen", lat: 39.910, lng: 116.440, line: "line2", lineColor: "#0055a4" },
  { id: "2-9", name: "Chaoyangmen", lat: 39.922, lng: 116.438, line: "line2", lineColor: "#0055a4" },
  { id: "2-10", name: "Dongzhimen", lat: 39.940, lng: 116.435, line: "line2", lineColor: "#0055a4" },
  { id: "2-11", name: "Gulou Dajie", lat: 39.945, lng: 116.395, line: "line2", lineColor: "#0055a4" },
  { id: "2-12", name: "Jishuitan", lat: 39.945, lng: 116.365, line: "line2", lineColor: "#0055a4" },
  { id: "10-1", name: "Guomao", lat: 39.910, lng: 116.465, line: "line10", lineColor: "#008c95" },
  { id: "10-2", name: "Shuangjing", lat: 39.900, lng: 116.460, line: "line10", lineColor: "#008c95" },
  { id: "10-3", name: "Jinsong", lat: 39.888, lng: 116.458, line: "line10", lineColor: "#008c95" },
  { id: "10-4", name: "Panjiayuan", lat: 39.875, lng: 116.455, line: "line10", lineColor: "#008c95" },
  { id: "10-5", name: "Fenzhongsi", lat: 39.865, lng: 116.445, line: "line10", lineColor: "#008c95" },
  { id: "10-6", name: "Songjiazhuang", lat: 39.855, lng: 116.430, line: "line10", lineColor: "#008c95" },
  { id: "10-7", name: "Liujiayao", lat: 39.860, lng: 116.410, line: "line10", lineColor: "#008c95" },
  { id: "10-8", name: "Jiaomen W", lat: 39.860, lng: 116.380, line: "line10", lineColor: "#008c95" },
  { id: "10-9", name: "Jiaomen E", lat: 39.860, lng: 116.390, line: "line10", lineColor: "#008c95" },
  { id: "10-10", name: "Gongyiqiao", lat: 39.870, lng: 116.365, line: "line10", lineColor: "#008c95" },
];

/** Get line vertexes as [lat, lng] pairs (matches component state convention). */
function getLinePath(lineId: string): [number, number][] {
  return STATIONS.filter(s => s.line === lineId).map(s => [s.lat, s.lng]);
}

/** Convert [lat, lng] → GeoJSON [lng, lat] for maplibre. */
function ll(p: [number, number]): [number, number] {
  return [p[1], p[0]];
}

const glass = (opacity = 0.08): React.CSSProperties => ({
  background: `rgba(255,255,255,${opacity})`,
  backdropFilter: "blur(40px) saturate(160%)",
  WebkitBackdropFilter: "blur(40px) saturate(160%)",
  border: "0.5px solid rgba(255,255,255,0.1)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
});

export default function MapPage() {
  useAuth();
  const [center, setCenter] = useState<[number, number]>([39.904, 116.407]);
  const [userLocation, setUserLocation] = useState("");
  const [metroVisible, setMetroVisible] = useState(true);
  const [routeMode, setRouteMode] = useState(false);
  const [startQuery, setStartQuery] = useState("");
  const [endQuery, setEndQuery] = useState("");
  const [startStation, setStartStation] = useState<Station | null>(null);
  const [endStation, setEndStation] = useState<Station | null>(null);
  const [matchedStations, setMatchedStations] = useState<Station[]>([]);

  const [showLocDialog, setShowLocDialog] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(false);

  // Get IP location on mount (no permission needed)
  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then(r => r.json())
      .then(d => {
        if (d.latitude && d.longitude) {
          setCenter([d.latitude, d.longitude]);
          setUserLocation(`${d.city || ""}, ${d.country_name || ""}`.replace(/^, /, ""));
        }
      })
      .catch(() => {});
  }, []);

  /* ─── Metro GeoJSON data ─── */
  const [metroGeoJson, setMetroGeoJson] = useState<FeatureCollection | null>(null);
  const [stationsGeoJson, setStationsGeoJson] = useState<FeatureCollection | null>(null);
  const [metroStats, setMetroStats] = useState<{ cities: number; lines: number }>({ cities: 0, lines: 0 });

  useEffect(() => {
    Promise.all([
      fetch("/china_metro.json").then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
      fetch("/china_metro_stations.json").then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
    ])
      .then(([linesData, stationsData]: [FeatureCollection, FeatureCollection]) => {
        setMetroGeoJson(linesData);
        setStationsGeoJson(stationsData);
        const cities = new Set(linesData.features.map(f => f.properties?.city).filter(Boolean));
        setMetroStats({ cities: cities.size, lines: linesData.features.length });
      })
      .catch(err => console.error("Metro data failed to load:", err));
  }, []);

  const requestLocation = useCallback(() => {
    setLocating(true);
    setLocError(false);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCenter([pos.coords.latitude, pos.coords.longitude]);
        setUserLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        setLocating(false);
        setShowLocDialog(false);
      },
      () => {
        setLocError(true);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const routePath = useMemo((): [number, number][] => {
    return [startStation, endStation].filter(Boolean).map(s => [s!.lat, s!.lng]);
  }, [startStation, endStation]);

  const routeLineStations = useMemo(() => {
    if (!startStation || !endStation) return [];
    const lineIds = new Set([startStation.line, endStation.line]);
    const all: Station[] = [];
    lineIds.forEach(lid => {
      const st = STATIONS.filter(s => s.line === lid);
      all.push(...st);
    });
    return all;
  }, [startStation, endStation]);

  const handleSearch = useCallback((query: string) => {
    const q = query.toLowerCase();
    setMatchedStations(STATIONS.filter(s => s.name.toLowerCase().includes(q)).slice(0, 5));
  }, []);

  const clearRoute = useCallback(() => {
    setStartStation(null); setEndStation(null);
    setStartQuery(""); setEndQuery("");
    setRouteMode(false);
  }, []);

  /* ─── City line counts from GeoJSON ─── */
  const cityLines = useMemo(() => {
    if (!metroGeoJson) return [];
    const counts = new Map<string, number>();
    metroGeoJson.features.forEach(f => {
      const city = f.properties?.city;
      if (city) counts.set(city, (counts.get(city) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([city, count]) => ({ city, count }));
  }, [metroGeoJson]);

  /* ─── Map refs ─── */
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const overlaysRef = useRef<{ layer: string; source: string }[]>([]);

  // ─────────────────────────────────────────────
  // 1. Initialize maplibre map once
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      center: ll(center),
      zoom: 13,
      attributionControl: false,
      style: {
        version: 8,
        name: "CartoDB Dark",
        sources: {
          cartodb: {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
              "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
              "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
            ],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com">CARTO</a>',
          },
        },
        layers: [
          { id: "map-bg", type: "background", paint: { "background-color": "#000" } },
          { id: "cartodb-layer", type: "raster", source: "cartodb", minzoom: 0, maxzoom: 20 },
        ],
      },
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => setMapReady(true));

    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─────────────────────────────────────────────
  // 2. Update overlays when deps change
  // ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    // recenter
    map.jumpTo({ center: ll(center) });

    // clear previous overlays
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    overlaysRef.current.forEach(({ layer, source }) => {
      try {
        if (map.getLayer(layer)) map.removeLayer(layer);
        if (map.getSource(source)) map.removeSource(source);
      } catch {
        /* already gone */
      }
    });
    overlaysRef.current = [];

    // ── user marker ──
    const userEl = document.createElement("div");
    userEl.style.cssText =
      "width:16px;height:16px;background:#22d3ee;border:3px solid white;border-radius:50%;box-shadow:0 0 16px rgba(34,211,238,0.6)";
    const userMarker = new maplibregl.Marker({ element: userEl })
      .setLngLat(ll(center))
      .setPopup(new maplibregl.Popup().setHTML('<div class="text-xs font-semibold">You are here</div>'))
      .addTo(map);
    markersRef.current.push(userMarker);

    // ── user radius circle ──
    map.addSource("user-circle", {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "Point", coordinates: ll(center) },
        properties: {},
      },
    });
    map.addLayer({
      id: "user-circle-fill",
      type: "circle",
      source: "user-circle",
      paint: {
        "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 10, 10, 12, 24, 14, 60, 16, 200],
        "circle-color": "#22d3ee",
        "circle-opacity": 0.12,
        "circle-stroke-color": "#22d3ee",
        "circle-stroke-width": 2,
        "circle-stroke-opacity": 0.35,
      },
    });
    overlaysRef.current.push({ layer: "user-circle-fill", source: "user-circle" });

    // ── metro lines (from GeoJSON) ──
    if (metroVisible && metroGeoJson) {
      map.addSource("metro-lines", {
        type: "geojson",
        data: metroGeoJson,
      });
      // Glow layer (wider, transparent)
      map.addLayer({
        id: "metro-lines-glow",
        type: "line",
        source: "metro-lines",
        paint: {
          "line-color": ["get", "colour"],
          "line-width": 8,
          "line-opacity": 0.2,
          "line-blur": 3,
        },
      });
      // Main line layer
      map.addLayer({
        id: "metro-lines-layer",
        type: "line",
        source: "metro-lines",
        paint: {
          "line-color": ["get", "colour"],
          "line-width": 4,
          "line-opacity": 0.85,
        },
      });
      overlaysRef.current.push(
        { layer: "metro-lines-glow", source: "metro-lines" },
        { layer: "metro-lines-layer", source: "metro-lines" },
      );
    }

    // ── metro station markers ──
    if (metroVisible && stationsGeoJson) {
      map.addSource("metro-stations", {
        type: "geojson",
        data: stationsGeoJson,
      });
      map.addLayer({
        id: "metro-stations-layer",
        type: "circle",
        source: "metro-stations",
        paint: {
          "circle-radius": 5,
          "circle-color": "#fff",
          "circle-stroke-color": "#22d3ee",
          "circle-stroke-width": 2,
          "circle-opacity": 0.9,
        },
      });
      overlaysRef.current.push({ layer: "metro-stations-layer", source: "metro-stations" });
    }

    // ── route line ──
    if (routePath.length > 0) {
      const coords = routePath.map(ll);
      map.addSource("route-line", {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} },
      });
      map.addLayer({
        id: "route-line-layer",
        type: "line",
        source: "route-line",
        paint: {
          "line-color": "#a78bfa",
          "line-width": 4,
          "line-dasharray": [10, 6],
          "line-opacity": 0.9,
        },
      });
      overlaysRef.current.push({ layer: "route-line-layer", source: "route-line" });
    }
  }, [center, metroVisible, routePath, routeLineStations, mapReady, metroGeoJson, stationsGeoJson]);

  /* ─── Render ─── */
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <Particles />
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px] animate-ambient-glow"
          style={{ background: "radial-gradient(circle, hsla(160, 100%, 50%, 0.08), transparent 70%)" }} />
      </div>
      <Sidebar />
      <main className="relative z-10 lg:pl-32 w-full h-screen flex flex-col">
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-0 shrink-0"><TopNav /></div>

        <div className="flex-1 px-4 sm:px-6 pb-4 flex gap-4 min-h-0">
          {/* ═══ Map ═══ */}
          <div className="flex-1 rounded-[2rem] overflow-hidden relative" style={glass(0.06)}>
            <div ref={mapContainerRef} className="w-full h-full" style={{ background: "#000" }} />
            <style>{`
              .maplibregl-ctrl-top-right .maplibregl-ctrl-group {
                background: rgba(255,255,255,0.15);
                backdrop-filter: blur(40px) saturate(160%);
                -webkit-backdrop-filter: blur(40px) saturate(160%);
                border: 0.5px solid rgba(255,255,255,0.1);
                box-shadow: 0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06);
                border-radius: 2rem;
                overflow: hidden;
              }
              .maplibregl-ctrl-top-right .maplibregl-ctrl-group button {
                background: transparent;
                border-color: rgba(255,255,255,0.08);
                width: 36px;
                height: 36px;
              }
              .maplibregl-ctrl-top-right .maplibregl-ctrl-group button:hover {
                background: rgba(255,255,255,0.1);
              }
              .maplibregl-ctrl-top-right .maplibregl-ctrl-group button span {
                filter: invert(1);
              }
            `}</style>

            {/* Controls */}
            <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
              {[
                { icon: metroVisible ? EyeOff : Eye, label: "Metro", active: metroVisible, onClick: () => setMetroVisible(!metroVisible), color: "cyan" },
                { icon: Navigation, label: "Route", active: routeMode, onClick: () => { setRouteMode(!routeMode); if (routeMode) clearRoute(); }, color: "violet" },
                { icon: Locate, label: "Locate", active: false, onClick: () => { if ("geolocation" in navigator) { requestLocation(); } }, color: "white" },
              ].map(b => {
                const Icon = b.icon;
                return (
                  <button key={b.label} onClick={b.onClick}
                    className="flex items-center gap-2 px-3 py-2 rounded-[2rem] text-[11px] font-medium transition-all duration-200 hover:scale-[1.02] active:scale-95"
                    style={glass(0.15)}>
                    <Icon size={14} className={b.active ? "text-cyan-400" : "text-white/60"} />
                    <span style={{ color: b.active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)" }}>{b.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="absolute bottom-4 left-4 z-[1000] flex items-center gap-2 px-3 py-2 rounded-xl" style={glass(0.15)}>
              <MapPin size={12} className="text-cyan-400" />
              <span className="text-[10px] text-white/60">{userLocation || "Beijing, China"}</span>
            </div>
          </div>

          {/* ═══ Right Panel ═══ */}
          <div className="w-[300px] shrink-0 flex flex-col gap-3 overflow-y-auto scrollbar-none">
            <div className="rounded-2xl p-4 relative overflow-hidden" style={glass(0.06)}>
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={14} className="text-cyan-400" />
                <span className="text-xs font-semibold text-white/80">Current Location</span>
              </div>
              <p className="text-[11px] text-white/50">{userLocation || "Detecting..."}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-[9px] text-white/30">{center[0].toFixed(4)}, {center[1].toFixed(4)}</p>
                <button onClick={() => { if ("geolocation" in navigator) setShowLocDialog(true); }}
                  className="text-[10px] font-medium px-2.5 py-1 rounded-lg transition-all hover:scale-[1.02] active:scale-95"
                  style={{ background: "rgba(34,211,238,0.08)", color: "rgba(34,211,238,0.7)" }}>
                  <Locate size={11} className="inline mr-1" />Precise
                </button>
              </div>
            </div>

            <div className="rounded-2xl p-4" style={glass(0.06)}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Train size={14} className="text-violet-400" />
                  <span className="text-xs font-semibold text-white/80">Metro Lines</span>
                </div>
                <button onClick={() => setMetroVisible(!metroVisible)}
                  className="text-[10px] font-medium px-2 py-1 rounded-lg transition-all"
                  style={{ background: metroVisible ? "rgba(34,211,238,0.12)" : "rgba(255,255,255,0.04)", color: metroVisible ? "rgba(34,211,238,0.8)" : "rgba(255,255,255,0.3)" }}>
                  {metroVisible ? "Hide" : "Show"}
                </button>
              </div>
              <div className="space-y-1 overflow-y-auto max-h-[120px] pr-1"
                style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(160,160,160,0.4) transparent" }}>
                {cityLines.map(({ city, count }) => (
                  <div key={city} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#22d3ee" }} />
                    <span className="text-[11px] text-white/50">{city}</span>
                    <span className="text-[9px] text-white/20 ml-auto">{count} lines</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-4" style={glass(0.06)}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Navigation size={14} className="text-violet-400" />
                  <span className="text-xs font-semibold text-white/80">Route Planner</span>
                </div>
                {routeMode && <button onClick={clearRoute} className="text-[10px] text-rose-400/60 hover:text-rose-400"><X size={12} /></button>}
              </div>
              {!routeMode ? (
                <button onClick={() => setRouteMode(true)}
                  className="w-full py-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-2" style={glass(0.12)}>
                  <Search size={12} className="text-white/40" />
                  <span className="text-white/50">Plan a route</span>
                </button>
              ) : (
                <div className="space-y-2.5">
                  <div className="relative">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px]" style={glass(0.08)}>
                      <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <input value={startQuery} onChange={e => { setStartQuery(e.target.value); handleSearch(e.target.value); }}
                        placeholder="Start station..." className="flex-1 bg-transparent outline-none text-white/70 placeholder:text-white/20 text-[11px]" />
                    </div>
                    {startQuery && matchedStations.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-10" style={glass(0.95)}>
                        {matchedStations.map(s => (
                          <button key={s.id} onClick={() => { setStartStation(s); setStartQuery(s.name); setMatchedStations([]); }}
                            className="w-full text-left px-3 py-2 text-[11px] text-white/70 hover:bg-white/[0.06] flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.lineColor }} />{s.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center"><ArrowRight size={12} className="text-white/20" /></div>
                  <div className="relative">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px]" style={glass(0.08)}>
                      <div className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                      <input value={endQuery} onChange={e => { setEndQuery(e.target.value); handleSearch(e.target.value); }}
                        placeholder="Destination..." className="flex-1 bg-transparent outline-none text-white/70 placeholder:text-white/20 text-[11px]" />
                    </div>
                    {endQuery && matchedStations.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-10" style={glass(0.95)}>
                        {matchedStations.map(s => (
                          <button key={s.id} onClick={() => { setEndStation(s); setEndQuery(s.name); setMatchedStations([]); }}
                            className="w-full text-left px-3 py-2 text-[11px] text-white/70 hover:bg-white/[0.06] flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.lineColor }} />{s.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {startStation && endStation && (
                    <div className="mt-2 p-3 rounded-xl" style={glass(0.1)}>
                      <div className="flex items-center gap-2 text-[11px] text-white/70">
                        <Star size={12} className="text-amber-400" /><span>Route found</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-white/40">
                        <span className="text-emerald-400 font-medium">{startStation.name}</span>
                        <ArrowRight size={10} />
                        <span className="text-rose-400 font-medium">{endStation.name}</span>
                      </div>
                      <div className="mt-1 text-[9px] text-white/25">
                        Lines: {[startStation.line, endStation.line].filter((v,i,a) => a.indexOf(v)===i).map(l => METRO_LINES.find(m => m.id === l)?.name).join(", ")}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl p-4" style={glass(0.06)}>
              <div className="flex items-center gap-2 mb-3">
                <Layers size={14} className="text-cyan-400" />
                <span className="text-xs font-semibold text-white/80">Map Info</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Metro Cities", value: metroStats.cities.toString() || "—" },
                  { label: "Metro Lines", value: metroStats.lines.toString() || "—" },
                  { label: "Zoom", value: "13" },
                  { label: "Coords", value: `${center[0].toFixed(2)}, ${center[1].toFixed(2)}` },
                ].map(s => (
                  <div key={s.label} className="p-2 rounded-xl text-center" style={glass(0.08)}>
                    <p className="text-[18px] font-bold text-white/70">{s.value}</p>
                    <p className="text-[9px] text-white/30 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ═══ Location Permission Dialog ═══ */}
      {showLocDialog && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}>
          <div className="glass-strong rounded-2xl p-6 w-[340px] animate-dropdown-in">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-full grid place-items-center" style={{ background: "rgba(34,211,238,0.12)" }}>
                <Locate size={16} className="text-cyan-400/70" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/90">Enable Location</p>
                <p className="text-[10px] text-white/40">Precise positioning</p>
              </div>
            </div>
            <p className="text-[12px] text-white/50 leading-relaxed mb-5">
              Allow browser to access your current location for accurate map positioning?
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setShowLocDialog(false)}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-medium transition-all duration-200 hover:bg-white/[0.06]"
                style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.55)" }}>
                Deny
              </button>
              <button onClick={requestLocation}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-medium transition-all duration-200 flex items-center justify-center gap-2"
                style={{ background: "rgba(34,211,238,0.12)", color: "rgba(34,211,238,0.85)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(34,211,238,0.2)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(34,211,238,0.12)"; }}>
                {locating ? (
                  <><span className="w-3 h-3 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" /> Locating...</>
                ) : "Allow"}
              </button>
            </div>
            {locError && (
              <p className="mt-3 text-[10px] text-rose-400/60 text-center">Location request failed. Please check browser permissions.</p>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
