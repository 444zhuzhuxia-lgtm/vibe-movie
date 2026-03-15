"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const moodBackgrounds: Record<string, string> = {
  ocean: "/backgrounds/mood-ocean.jpg",
  forest: "/backgrounds/mood-forest.jpg",
  night: "/backgrounds/mood-night.jpg",
  rain: "/backgrounds/mood-rain.jpg",
  space: "/backgrounds/mood-space.jpg",
  deep: "/backgrounds/mood-night.jpg",
  healing: "/backgrounds/mood-forest.jpg",
};

type LutPreset = "cinematic" | "wkw" | "blade";

const LUT_PRESETS: Record<LutPreset, string> = {
  cinematic:
    "linear-gradient(145deg, rgba(6,14,34,0.76) 0%, rgba(8,18,42,0.68) 46%, rgba(4,10,26,0.82) 100%), radial-gradient(circle at 20% 18%, rgba(56,189,248,0.15) 0%, rgba(56,189,248,0) 40%), radial-gradient(circle at 82% 84%, rgba(99,102,241,0.16) 0%, rgba(99,102,241,0) 44%)",
  wkw:
    "linear-gradient(150deg, rgba(20,8,12,0.72) 0%, rgba(46,18,28,0.58) 42%, rgba(14,8,14,0.78) 100%), radial-gradient(circle at 18% 24%, rgba(244,114,182,0.2) 0%, rgba(244,114,182,0) 42%), radial-gradient(circle at 78% 82%, rgba(250,204,21,0.16) 0%, rgba(250,204,21,0) 46%)",
  blade:
    "linear-gradient(145deg, rgba(4,18,26,0.78) 0%, rgba(6,30,38,0.62) 45%, rgba(4,10,16,0.84) 100%), radial-gradient(circle at 20% 18%, rgba(34,211,238,0.2) 0%, rgba(34,211,238,0) 40%), radial-gradient(circle at 82% 84%, rgba(249,115,22,0.2) 0%, rgba(249,115,22,0) 44%)",
};

const LUT_LABELS: Record<LutPreset, string> = {
  cinematic: "CINEMA",
  wkw: "WKW",
  blade: "BLADE",
};

function ResonanceContent() {
  const searchParams = useSearchParams();
  const moodFromQuery = searchParams.get("mood");
  const lutFromQuery = searchParams.get("lut");
  const moodFromStorage = typeof window !== "undefined" ? localStorage.getItem("moodCategory") : null;
  const selectedMood = moodFromQuery || moodFromStorage || "ocean";
  const [lutPreset, setLutPreset] = useState<LutPreset>(() => {
    if (typeof window === "undefined") return "cinematic";
    const saved = localStorage.getItem("vibe_lut_preset");
    if (saved === "cinematic" || saved === "wkw" || saved === "blade") return saved;
    return "cinematic";
  });
  const queryLut =
    lutFromQuery === "cinematic" || lutFromQuery === "wkw" || lutFromQuery === "blade"
      ? lutFromQuery
      : null;
  const activePreset = queryLut ?? lutPreset;
  const background = useMemo(
    () => moodBackgrounds[selectedMood] || moodBackgrounds.ocean,
    [selectedMood]
  );
  const activeLutOverlay = LUT_PRESETS[activePreset];

  useEffect(() => {
    localStorage.setItem("vibe_lut_preset", lutPreset);
  }, [lutPreset]);

  return (
    <main
      className="min-h-screen w-full flex items-center justify-center text-slate-100"
      style={{
        backgroundImage: `${activeLutOverlay}, url(${background})`,
        backgroundBlendMode: "normal, screen, soft-light, normal",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="fixed right-3 top-20 z-[60] rounded-2xl border border-white/10 bg-slate-950/55 p-1.5 backdrop-blur-md">
        <div className="flex items-center gap-1">
          {(["cinematic", "wkw", "blade"] as LutPreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => setLutPreset(preset)}
              className={`rounded-xl px-2.5 py-1.5 text-[10px] font-bold tracking-[0.2em] transition-all ${
                activePreset === preset
                  ? "bg-sky-400/20 text-sky-200"
                  : "text-slate-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {LUT_LABELS[preset]}
            </button>
          ))}
        </div>
      </div>
      <div className="text-center px-6">
        <h1 className="text-4xl font-black tracking-widest uppercase">Resonance</h1>
      </div>
    </main>
  );
}

export default function ResonancePage() {
  return (
    <Suspense fallback={<div className="text-white text-center mt-20">正在加载星海...</div>}>
      <ResonanceContent />
    </Suspense>
  );
}
