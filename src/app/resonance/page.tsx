"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";

const moodBackgrounds: Record<string, string> = {
  ocean: "/backgrounds/stage-consistent-bg.svg",
  forest: "/backgrounds/stage-consistent-bg.svg",
  night: "/backgrounds/stage-consistent-bg.svg",
  rain: "/backgrounds/stage-consistent-bg.svg",
  space: "/backgrounds/stage-consistent-bg.svg",
  deep: "/backgrounds/stage-consistent-bg.svg",
  healing: "/backgrounds/stage-consistent-bg.svg",
};

function ResonanceContent() {
  const searchParams = useSearchParams();
  const moodFromQuery = searchParams.get("mood");
  const moodFromStorage = typeof window !== "undefined" ? localStorage.getItem("moodCategory") : null;
  const selectedMood = moodFromQuery || moodFromStorage || "ocean";
  const background = useMemo(
    () => moodBackgrounds[selectedMood] || moodBackgrounds.ocean,
    [selectedMood]
  );

  return (
    <main
      className="min-h-screen w-full flex items-center justify-center text-slate-100"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${background})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
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
