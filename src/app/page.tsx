"use client";

import { Suspense } from "react";
import { useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { toJpeg } from "html-to-image";
import { twMerge } from "tailwind-merge";

import type { QuestionItem, QuestionsResponse } from "./api/questions/route";
import type { MovieItem } from "./api/movies/route";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

function compactText(text: string, maxChars: number) {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return t;
  if (t.length <= maxChars) return t;
  const head = t.slice(0, maxChars);
  const lastSpace = head.lastIndexOf(" ");
  const clipped = lastSpace >= Math.floor(maxChars * 0.6) ? head.slice(0, lastSpace) : head;
  return `${clipped.trimEnd()}…`;
}

const MOOD_IMAGES: Record<string, string> = {
  ocean: "https://images.unsplash.com/photo-1439405326854-014607f694d7?q=80&w=2070",
  forest: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2071",
  night: "https://images.unsplash.com/photo-1506703380046-5214dbe50410?q=80&w=2070",
  rain: "https://images.unsplash.com/photo-1534274988757-a28bf1f554de?q=80&w=2070",
  space: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2072",
};

// 胶片颗粒 SVG (超低透明度, 全屏叠加)
function FilmGrain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-30 mix-blend-soft-light"
      style={{
        backgroundImage:
          'url("data:image/svg+xml;utf8,<svg width=\'1200\' height=\'900\' viewBox=\'0 0 1200 900\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'><filter id=\'grain\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'0.92\' numOctaves=\'4\' seed=\'2\' /></filter><rect width=\'1200\' height=\'900\' filter=\'url(%23grain)\' opacity=\'0.13\'/></svg>")',
        backgroundSize: "cover",
        opacity: 0.15,
        pointerEvents: "none",
      }}
    />
  );
}

// 多层背景（更深邃的蓝黑渐变）
function DeepGradientBG() {
  return (
    <>
      <div
        aria-hidden
        className="fixed inset-0 z-0 bg-[#020617]"
      />
      <div
        aria-hidden
        className="fixed inset-0 z-0 bg-gradient-to-br from-[#020617] via-[#010b21] to-[#020617] opacity-90"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed left-1/2 top-[-30%] z-10 h-[700px] w-[1200px] -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% 25%, rgba(7,89,133,0.1) 0%, rgba(30,58,138,0.05) 52%, rgba(2,6,23,0.07) 100%)",
          filter: "blur(80px)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed left-1/2 bottom-[-17%] z-10 h-[800px] w-[1600px] -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(ellipse 70% 33% at 50% 95%, rgba(30,58,138,0.12) 0%, rgba(15,23,42,0.08) 56%, rgba(2,6,23,0.001) 100%)",
          filter: "blur(100px)",
        }}
      />
    </>
  );
}

const TRANSITION_PHRASES = [
  "Movies are a legal escape. Your exit is opening... (电影是一场合法的逃避，你的专属出口已开启...)",
  "Piecing together those scattered echoes of your heart... (正在为你拼凑那些散落的共鸣...)",
  "Take your seat. The screen is about to glow... (银幕亮起之前，先让情绪落座...)",
];

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

function NavigationBar({
  step,
  setStep,
}: {
  step: Step;
  setStep: (s: Step) => void;
}) {
  const steps = [
    { id: 1, label: "MOOD", subLabel: "情绪", activeSteps: [1] },
    { id: 2, label: "RESONANCE", subLabel: "共鸣", activeSteps: [2] },
    { id: 3, label: "SELECTION", subLabel: "选片", activeSteps: [3, 4, 5, 6, 7] },
  ];

  const currentStepIndex = steps.findIndex((s) => s.activeSteps.includes(step));

  return (
    <nav className="fixed top-0 left-0 w-full z-50 backdrop-blur-md bg-slate-950/70 border-b border-white/5">
      <div className="w-full px-4 md:px-8 h-16 flex items-center justify-center">
        <div
          className={cn(
            "flex items-center gap-2 sm:gap-8",
            "overflow-x-auto overflow-y-hidden",
            "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          )}
        >
          {steps.map((s, idx) => {
            const isCurrent = s.activeSteps.includes(step);
            const isPast = idx < currentStepIndex;
            const isFuture = idx > currentStepIndex;

            return (
              <div key={s.id} className="flex items-center gap-2 sm:gap-5 shrink-0">
                <button
                  onClick={() => isPast && setStep(s.activeSteps[0] as Step)}
                  disabled={isFuture || isCurrent}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 transition-all duration-300",
                    isCurrent
                      ? "text-sky-400"
                      : isPast
                        ? "text-slate-300/60 hover:text-white"
                        : "text-slate-600 cursor-not-allowed"
                  )}
                >
                  <span className={cn("font-bold tracking-widest", "text-[10px] sm:text-xs")}>
                    {s.label}
                  </span>
                  <span className="text-[9px] opacity-50 font-normal leading-none">
                    {s.subLabel}
                  </span>
                </button>
                <div className="w-4 sm:w-10 h-px bg-white/5 shrink-0" />
              </div>
            );
          })}

          <div className="flex items-center gap-2 sm:gap-5 shrink-0">
            <Link
              href="/archive"
              className="shrink-0 flex flex-col items-center justify-center py-2 transition-all duration-300 text-slate-300/60 hover:text-white"
            >
              <span className={cn("font-bold tracking-widest", "text-[10px] sm:text-xs")}>
                ARCHIVE
              </span>
              <span className="text-[9px] opacity-50 font-normal leading-none">
                档案
              </span>
            </Link>
            <div className="w-4 sm:w-10 h-px bg-white/5 shrink-0" />
            <Link
              href="/wall"
              className="shrink-0 flex flex-col items-center justify-center py-2 transition-all duration-300 text-slate-300/60 hover:text-white"
            >
              <span className={cn("font-bold tracking-widest", "text-[10px] sm:text-xs")}>
                WALL
              </span>
              <span className="text-[9px] opacity-50 font-normal leading-none">
                星空
              </span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>(1);
  const [mood, setMood] = useState("");
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [healingMessage, setHealingMessage] = useState("");
  const [moodCategory, setMoodCategory] = useState<string>("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<MovieItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepVisible, setStepVisible] = useState(false);
  const [transitionPhrase, setTransitionPhrase] = useState("");
  const [hasSaved, setHasSaved] = useState(false);
  const [posterImage, setPosterImage] = useState<string | null>(null);
  const [isPosterGenerating, setIsPosterGenerating] = useState(false);
  const [isPosterOpen, setIsPosterOpen] = useState(false);
  const [posterError, setPosterError] = useState<string | null>(null);

  // 图片预加载引擎：在组件首次挂载时静默下载所有背景图到浏览器缓存
  useEffect(() => {
    const preloadImages = () => {
      const imageUrls = Object.values(MOOD_IMAGES);
      imageUrls.forEach((url) => {
        // 使用类型断言解决TypeScript错误
        const img = new window.Image();
        img.src = url;
        // 可选的错误处理
        img.onerror = () => {
          console.warn(`Failed to preload image: ${url}`);
        };
      });
      console.log(`✅ 已预加载 ${imageUrls.length} 张背景图片到浏览器缓存`);
    };

    preloadImages();
  }, []);

  useEffect(() => {
    // 检查是否有存储的状态需要恢复
    const savedStep = sessionStorage.getItem('vibeStep');
    if (savedStep === '7') {
      const savedMovie = sessionStorage.getItem('selectedMovie');
      const savedMood = sessionStorage.getItem('mood');
      const savedMoodCategory = sessionStorage.getItem('moodCategory');
      const savedHealingMessage = sessionStorage.getItem('healingMessage');

      if (savedMovie && savedMood && savedMoodCategory && savedHealingMessage) {
        setSelectedMovie(JSON.parse(savedMovie));
        setMood(savedMood);
        setMoodCategory(savedMoodCategory);
        setHealingMessage(savedHealingMessage);
        setStep(7);
        // 恢复后立即清除，避免刷新时再次进入
        sessionStorage.removeItem('vibeStep');
        sessionStorage.removeItem('selectedMovie');
        sessionStorage.removeItem('mood');
        sessionStorage.removeItem('moodCategory');
        sessionStorage.removeItem('healingMessage');
      }
    }

    setStepVisible(false);
    const t = setTimeout(() => setStepVisible(true), 50);

    // Step 6 -> Step 7 自动流转 (专属放映厅前的二次过渡)
    if (step === 6) {
      const timer = setTimeout(() => {
        setStep(7);
      }, 900);
      return () => {
        clearTimeout(t);
        clearTimeout(timer);
      };
    }

    return () => clearTimeout(t);
  }, [step]);

  // 当进入 Step 7 且选定了电影时，自动保存记录
  useEffect(() => {
    if (step === 7 && selectedMovie && !hasSaved) {
      const saveRecord = async () => {
        try {
          await fetch("/api/archive", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              initialMood: mood,
              moodCategory: moodCategory,
              healingMessage: healingMessage,
              movieTitle: selectedMovie.title.zh, // 使用中文标题作为主标识
            }),
          });
          setHasSaved(true);
        } catch (error) {
          console.error("Failed to save mood record:", error);
        }
      };
      saveRecord();
    }
  }, [step, selectedMovie, mood, moodCategory, healingMessage, hasSaved]);

  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id]);

  async function handleSubmitMood(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isLoading) return;
    const text = mood.trim();
    if (!text) {
      setError("先丢一句情绪进来。");
      return;
    }
    setIsLoading(true);
    setError(null);
    setAnswers({});
    setMovies([]);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: text }),
      });
      const data: QuestionsResponse = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          data &&
          typeof data === "object" &&
          "error" in data &&
          typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : null;
        setError(msg || "情绪电波断了。再试一次。");
        return;
      }
      setQuestions(data.questions ?? []);
      setHealingMessage(data.healing_message ?? "");
      setMoodCategory(data.mood_category ?? "");
      setStep(2); // 进入视觉共鸣
    } catch {
      setError("网络有点冷。稍后再试。");
    } finally {
      setIsLoading(false);
    }
  }

  function handleConfirmAnswers() {
    if (isLoading || !allAnswered) return;
    setError(null);
    setTransitionPhrase(TRANSITION_PHRASES[Math.floor(Math.random() * TRANSITION_PHRASES.length)] ?? TRANSITION_PHRASES[0]);
    setStep(4); // 进入过渡
    setIsLoading(true);

    const minDelay = new Promise<void>((r) => setTimeout(r, 650));
    const fetchPromise = fetch("/api/movies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mood: mood.trim(),
        answers: questions.map((q) => answers[q.id] ?? ""),
      }),
    }).then(async (res) => {
      const data = await res.json().catch(() => null);
      return { res, data };
    });

    Promise.all([fetchPromise, minDelay])
      .then(([{ res, data }]) => {
        if (!res.ok) {
          setError((data && data.error) || "情绪电波断了。再试一次。");
          setStep(3); // 返回问答
        } else {
          setMovies(data.movies ?? []);
          setStep(5); // 进入推荐展示
        }
      })
      .catch(() => {
        setError("网络有点冷。稍后再试。");
        setStep(3);
      })
      .finally(() => setIsLoading(false));
  }

  function handleReset() {
    setStep(1);
    setMood("");
    setQuestions([]);
    setAnswers({});
    setMovies([]);
    setSelectedMovie(null);
    setError(null);
    setHealingMessage("");
    setMoodCategory("");
    setHasSaved(false);
  }

  const subtitle =
    step === 1
      ? (
        <>
          Beyond genres, purely vibes. <span className="block text-sm opacity-50 mt-1 font-normal">不要分类，只要对味。</span>
        </>
      )
      : step === 3
        ? (
          <>
            Pick what resonates. <span className="block text-sm opacity-50 mt-1 font-normal">选最戳你的那一项。</span>
          </>
        )
        : step === 5
          ? (
            <>
              Your Curated Vibe. <span className="block text-sm opacity-50 mt-1 font-normal">你的专属影单。</span>
            </>
          )
          : "";

async function handleGeneratePoster() {
    if (!posterRef.current || !selectedMovie || isPosterGenerating) return;
    setIsPosterGenerating(true);
    setPosterError(null);
    try {
      // 1. 保留图片转 Base64 的防御机制，彻底杜绝跨域红字
      const imgElement = posterRef.current.querySelector('#poster-img') as HTMLImageElement;
      if (imgElement && selectedMovie.posterUrl && !imgElement.src.startsWith('data:')) {
          try {
              const res = await fetch(selectedMovie.posterUrl);
              const blob = await res.blob();
              const base64 = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(blob);
              });
              imgElement.src = base64;
              await new Promise(r => setTimeout(r, 150)); // 等待图片真正渲染
          } catch (fetchErr) {
              console.warn("Failed to pre-fetch image as Base64", fetchErr);
          }
      }

      const dataUrl = await toJpeg(posterRef.current, {
        quality: 0.92,
        pixelRatio: 2, // 乘以2，保证生成的海报是超高清的
        skipFonts: false,
      });

      setPosterImage(dataUrl);
      setIsPosterOpen(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "海报生成失败，请稍后再试。";
      const lowerMsg = msg.toLowerCase();
      const isChunkError =
        lowerMsg.includes("failed to fetch dynamically imported module") ||
        lowerMsg.includes("loading chunk") ||
        lowerMsg.includes("chunkloaderror") ||
        lowerMsg.includes("importing a module script failed");
      setPosterError(
        isChunkError
          ? "资源加载失败，请刷新页面后重试海报生成。若在 Netlify 发生，请确认站点可用且资源未被暂停。"
          : "渲染出错: " + msg
      );
    } finally {
      setIsPosterGenerating(false);
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center font-sans overflow-y-auto overflow-x-hidden bg-[#020617] text-slate-100">
      <DeepGradientBG />
      <FilmGrain />
      <NavigationBar step={step} setStep={setStep} />

      {/* Step 2: 视觉共鸣区 (新) */}
      {step === 2 && (
        <div className={cn(
          "fixed inset-0 z-40 flex items-center justify-center transition-all duration-1000",
          stepVisible ? "opacity-100" : "opacity-0"
        )}>
          {/* 背景图 - 增强渲染防御：深色兜底 + 安全取值 */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-[12000ms] ease-linear scale-110 bg-slate-900"
            style={{ 
              backgroundImage: `url(${MOOD_IMAGES[moodCategory] || MOOD_IMAGES["ocean"]})`,
              transform: stepVisible ? "scale(1)" : "scale(1.15)"
            }}
          />
          {/* 黑色毛玻璃遮罩 */}
          <div className="absolute inset-0 bg-[#020617]/70 backdrop-blur-[2px]" />
          
          <div className="relative z-10 flex flex-col items-center px-6 text-center max-w-2xl">
            <div className="w-16 h-[2px] bg-sky-500/40 mb-10 rounded-full" />
            <p className="text-2xl md:text-4xl font-light leading-relaxed tracking-wide text-white mb-14 drop-shadow-2xl font-serif italic">
              {healingMessage}
            </p>
            <button
              onClick={() => setStep(3)}
              className="group relative px-12 py-4 rounded-full text-white overflow-hidden transition-all duration-500 shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_40px_rgba(14,165,233,0.5)] active:scale-95"
            >
              {/* 按钮底色渐变 */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-sky-500" />
              
              <span className="relative z-10 font-bold tracking-[0.25em] text-sm uppercase flex items-center gap-2">
                Breathe in, keep exploring
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </span>
              
              {/* 扫光动效 */}
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: 全屏沉浸式过渡 */}
      {step === 4 && (
        <div
          className={cn(
            "fixed inset-0 z-20 flex items-center justify-center px-6 bg-[#020617]",
            "transition-all duration-1000 ease-out",
            stepVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          <p
            className={cn(
              "font-light tracking-[0.2em] text-center max-w-xl",
              "text-2xl md:text-3xl text-slate-400 italic font-serif",
              "bg-clip-text text-transparent bg-gradient-to-b from-slate-100 to-slate-500"
            )}
            style={{ animation: "breath 5s ease-in-out infinite" }}
          >
            {transitionPhrase}
          </p>
        </div>
      )}

      {/* Step 6: 专属放映厅前的二次过渡 */}
      {step === 6 && (
        <div
          className={cn(
            "fixed inset-0 z-20 flex items-center justify-center px-6 bg-[#020617]",
            "transition-all duration-[1500ms] ease-in-out",
            stepVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
          )}
        >
          <p
            className={cn(
              "font-light tracking-[0.3em] text-center max-w-xl flex flex-col items-center",
              "text-3xl md:text-4xl text-slate-300 uppercase",
              "bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-600"
            )}
            style={{ animation: "breath 6s ease-in-out infinite" }}
          >
            <span>Lights dimming, showtime...</span>
            <span className="text-sm opacity-40 font-normal tracking-widest mt-4">灯光渐暗，好戏开场...</span>
          </p>
        </div>
      )}

      {/* Step 7: 专属放映厅 (Hero Section) */}
      {step === 7 && selectedMovie && (
        <div
          className={cn(
            "fixed inset-0 z-30 flex flex-col items-center justify-start px-4 sm:px-6 bg-[#020617] overflow-y-auto",
            "transition-all duration-[1500ms] ease-out",
            stepVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          {selectedMovie.posterUrl && (
            <div className="absolute inset-0 z-0">
              <NextImage
                src={selectedMovie.posterUrl}
                alt={selectedMovie.title.en}
                fill
                priority
                sizes="100vw"
                className="object-cover blur-3xl opacity-20 scale-110"
              />
            </div>
          )}

          {/* 背景光晕增强 */}
          <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
             <div className="w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-sky-900/10 rounded-full blur-[120px] animate-pulse" />
             <div className="absolute w-[200px] sm:w-[400px] h-[200px] sm:h-[400px] bg-blue-900/5 rounded-full blur-[100px]" style={{ animation: "breath 7s ease-in-out infinite" }} />
          </div>

          <div className="sticky top-0 z-40 w-full pt-24 pb-6 flex justify-center bg-gradient-to-b from-[#020617] via-[#020617]/90 to-transparent">
            <button
              onClick={() => setStep(5)}
              className="px-6 py-2 rounded-full border border-white/5 text-slate-500 text-[10px] uppercase tracking-widest hover:text-slate-300 hover:border-white/10 transition-all duration-300 bg-white/5 backdrop-blur-xl"
            >
              ← Reselect <span className="opacity-30 ml-1">重选</span>
            </button>
          </div>

          {/* 核心展示区 */}
          <div className="relative z-10 w-full max-w-6xl pb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
              <div className="flex items-center justify-center">
                {selectedMovie.posterUrl ? (
                  <div className="relative h-[52vh] max-h-[520px] w-auto md:h-auto md:w-[380px] aspect-[2/3] rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/20 border border-white/10 bg-white/5">
                    <NextImage
                      src={selectedMovie.posterUrl}
                      alt={selectedMovie.title.en}
                      fill
                      sizes="(max-width: 768px) 80vw, 420px"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/70 via-transparent to-transparent" />
                  </div>
                ) : (
                  <div className="w-[240px] sm:w-[320px] md:w-[380px] aspect-[2/3] rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-950 shadow-2xl shadow-blue-900/20" />
                )}
              </div>

              <div className="text-center md:text-left">
                <h2 className="text-4xl sm:text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-300 to-slate-600 uppercase">
                  {selectedMovie.title.en}
                </h2>
                <div className="mt-3 text-xl sm:text-2xl font-bold text-slate-400 tracking-widest">
                  {selectedMovie.title.zh}
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs uppercase tracking-[0.35em] text-slate-500">
                  <span className="px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl">
                    {selectedMovie.year}
                  </span>
                  <span className="px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl">
                    ★{" "}
                    <span className="text-yellow-300/90">
                      {typeof selectedMovie.rating === "number" ? selectedMovie.rating.toFixed(1) : "--"}
                    </span>
                  </span>
                </div>

                <div className="mt-10 relative max-w-xl mx-auto md:mx-0 break-words">
                  <span className="absolute -top-6 -left-2 text-5xl text-white/5 font-serif select-none">
                    &ldquo;
                  </span>
                  <div className="flex flex-col gap-5">
                    <blockquote className="text-xl sm:text-3xl italic font-serif text-sky-100/80 leading-relaxed tracking-wide break-words whitespace-normal">
                      {selectedMovie.vibe_quote.en}
                    </blockquote>
                    <blockquote className="text-base sm:text-xl font-medium text-sky-200/50 leading-relaxed tracking-wider break-words whitespace-normal">
                      {selectedMovie.vibe_quote.zh}
                    </blockquote>
                  </div>
                  <span className="absolute -bottom-6 -right-2 text-5xl text-white/5 font-serif select-none rotate-180">
                    &rdquo;
                  </span>
                </div>

                <div className="mt-10 flex flex-col gap-4 max-w-xl mx-auto md:mx-0">
                  <div className="text-slate-200/75 text-sm sm:text-base leading-relaxed whitespace-normal break-words">
                    {compactText(selectedMovie.reason.en, 260)}
                  </div>
                  <div className="text-slate-400/70 text-sm sm:text-[15px] leading-relaxed whitespace-normal break-words border-l-2 border-white/10 pl-4">
                    {compactText(selectedMovie.reason.zh, 140)}
                  </div>
                </div>
              </div>
            </div>

             {/* 按钮区域 */}
             <div className="mt-12 flex flex-col sm:flex-row items-center gap-5 sm:gap-8 w-full justify-center px-4">
                <button
                  onClick={() => window.open(`https://search.bilibili.com/all?keyword=${encodeURIComponent(selectedMovie.title.zh + ' 电影解说')}`, '_blank')}
                  className={cn(
                    "group relative w-full sm:w-auto px-10 py-4 rounded-2xl text-sm sm:text-base font-bold tracking-[0.2em] text-white overflow-hidden transition-all duration-500 uppercase",
                    "bg-gradient-to-r from-blue-700 to-sky-600 active:scale-95",
                    "shadow-[0_0_30px_rgba(29,78,216,0.3)] hover:shadow-[0_0_50px_rgba(14,165,233,0.4)]",
                    "animate-pulse-glow"
                  )}
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    Bilibili <span className="text-[10px] opacity-70 font-normal">寻找共鸣</span>
                  </span>
                  <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                </button>

                <button
                  onClick={() => window.open(`https://www.douyin.com/search/${encodeURIComponent(selectedMovie.title.zh + ' 电影解说')}?source=normal&type=general`, '_blank')}
                  className={cn(
                    "group relative w-full sm:w-auto px-10 py-4 rounded-2xl text-sm sm:text-base font-bold tracking-[0.2em] text-white overflow-hidden transition-all duration-500 uppercase",
                    "bg-slate-900/80 border border-white/10 active:scale-95 backdrop-blur-xl",
                    "hover:border-sky-500/30 hover:shadow-[0_0_30px_rgba(14,165,233,0.15)]"
                  )}
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    Douyin <span className="text-[10px] opacity-70 font-normal">寻找共鸣</span>
                  </span>
                  <div className="absolute inset-0 bg-sky-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                </button>
             </div>

             <div className="mt-6 w-full max-w-2xl px-4 mx-auto">
               <button
                 onClick={handleGeneratePoster}
                 disabled={isPosterGenerating}
                 className={cn(
                   "group relative w-full min-h-14 rounded-2xl overflow-hidden transition-all duration-700 px-5 py-3",
                   "bg-gradient-to-r from-purple-700/80 via-indigo-700/80 to-sky-600/70 border border-white/10",
                   "shadow-[0_0_35px_rgba(168,85,247,0.18)] hover:shadow-[0_0_55px_rgba(168,85,247,0.28)]",
                   "active:scale-95 disabled:opacity-60"
                 )}
               >
                 <div
                   className="absolute inset-0 opacity-70"
                   style={{ animation: "breath 6s ease-in-out infinite", background: "radial-gradient(circle at 50% 50%, rgba(168,85,247,0.25) 0%, transparent 55%)" }}
                 />
                 <span className="relative z-10 flex items-center justify-center gap-2 sm:gap-3 text-white text-sm sm:text-base font-semibold tracking-wide leading-tight text-center whitespace-normal">
                   {isPosterGenerating ? "正在冲洗底片..." : (
                     <>
                       <span>🖼️</span>
                       <span>生成专属情绪海报</span>
                       <span className="text-white/80 text-xs sm:text-sm font-medium tracking-[0.2em] uppercase">Save Poster</span>
                     </>
                   )}
                 </span>
               </button>
               {posterError && (
                 <div className="mt-3 text-center text-xs tracking-widest text-rose-400/80">
                   {posterError}
                 </div>
               )}
             </div>

             <div className="mt-10 flex justify-center">
               <button
                 onClick={() => {
                   // 保存状态以便返回
                   sessionStorage.setItem('vibeStep', '7');
                   sessionStorage.setItem('selectedMovie', JSON.stringify(selectedMovie));
                   sessionStorage.setItem('mood', mood);
                   sessionStorage.setItem('moodCategory', moodCategory);
                   sessionStorage.setItem('healingMessage', healingMessage);
                   window.location.href = '/archive';
                 }}
                 className={cn(
                   "group relative flex items-center gap-4 px-8 py-4 rounded-2xl transition-all duration-500",
                   "bg-white/5 border border-white/10 backdrop-blur-xl",
                   "ring-1 ring-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)]",
                   "hover:ring-white/40 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:scale-105 active:scale-95"
                 )}
               >
                 <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
                   <svg className="w-6 h-6 text-sky-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                   </svg>
                 </div>
                 <div className="text-left">
                   <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 group-hover:text-slate-300 transition-colors">
                     Emotional Archive
                   </div>
                   <div className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                     前往情绪档案室 <span className="opacity-40 ml-1">Archive this moment</span>
                   </div>
                 </div>
                 <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" 
                      style={{ background: 'radial-gradient(circle at center, rgba(14,165,233,0.15) 0%, transparent 70%)' }} />
               </button>
             </div>
          </div>
        </div>
      )}

     {/* 海报模板 DOM (隐藏渲染用) */}
      {step === 7 && selectedMovie && (
        <div
          ref={posterRef}
          className="absolute top-0 left-0 -z-[9999] w-[375px] h-[812px] overflow-hidden bg-gradient-to-br from-slate-900 to-blue-950 text-slate-100 p-8 flex flex-col"
        >
          {/* 顶部日期和心情 */}
          <div className="flex items-start justify-between shrink-0">
            <div className="text-[10px] uppercase tracking-[0.35em] text-slate-300/70 font-bold">
              {new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
            </div>
            <div className="max-w-[180px] text-right">
              <div className="inline-flex px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold tracking-[0.2em] uppercase text-slate-200/80 truncate max-w-full">
                {mood || "Tonight's mood"}
              </div>
            </div>
          </div>

          {/* 海报主图与电影名 */}
          <div className="mt-8 flex flex-col items-center shrink-0">
            {selectedMovie.posterUrl ? (
              <img
                id="poster-img"
                src={selectedMovie.posterUrl}
                crossOrigin="anonymous"
                alt={selectedMovie.title.en}
                className="w-[220px] h-[330px] object-cover rounded-2xl shadow-2xl shadow-blue-900/30 border border-white/10"
              />
            ) : (
              <div className="w-[220px] h-[330px] rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border border-white/10" />
            )}
            <div className="mt-5 text-center">
              <div className="text-xl font-black tracking-tight uppercase line-clamp-1">
                {selectedMovie.title.en}
              </div>
              <div className="mt-1 text-[10px] font-bold tracking-[0.3em] uppercase text-slate-300/70">
                {selectedMovie.year}
              </div>
            </div>
          </div>

          {/* 治愈文案与台词 (使用 flex-1 撑开空间，避免重叠) */}
          <div className="mt-6 flex-1 flex flex-col justify-center space-y-4">
            <div className="text-base font-serif italic leading-relaxed text-slate-100/90 line-clamp-3">
              “{healingMessage}”
            </div>
            <div className="text-xs font-serif italic leading-relaxed text-slate-200/70 line-clamp-2">
              {selectedMovie.vibe_quote.en}
            </div>
            <div className="text-xs font-serif italic leading-relaxed text-slate-200/55 line-clamp-2">
              {selectedMovie.vibe_quote.zh}
            </div>
          </div>

          {/* 品牌区 (底部极简水印) */}
          <div className="shrink-0 mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <div className="text-[10px] text-slate-300/60 tracking-widest uppercase font-bold">
              VibeMovie
              <span className="block text-[8px] font-normal tracking-wide mt-1 opacity-70 capitalize">
                Cinema of Emotions
              </span>
            </div>
            <div className="flex items-center gap-1.5 opacity-80">
              <div className="w-2 h-2 rounded-full bg-sky-400" />
              <div className="w-2 h-2 rounded-sm bg-slate-300" />
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isPosterOpen && posterImage && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPosterOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />

            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              className="relative w-full max-w-[560px] bg-white/5 border border-white/10 rounded-[2.5rem] backdrop-blur-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 sm:p-8 flex flex-col items-center gap-6">
                {/* 预览图片 */}
                <NextImage
                  src={posterImage}
                  alt="VibeMovie Poster"
                  width={375}
                  height={812}
                  unoptimized
                  className="w-full h-auto rounded-3xl border border-white/10 shadow-2xl max-w-[90vw]"
                />
                
                {/* 提示文案 */}
                <div className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
                  <div className="text-xs text-slate-300 tracking-wide font-medium">
                    📱 手机端可长按海报直接保存到相册
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 tracking-wide">
                    保存后可分享到朋友圈、QQ 或发给你的共鸣好友
                  </div>
                </div>

                {/* 底部三大操作按钮 */}
                <div className="w-full flex flex-col gap-3">
                  {/* 下载与分享并排 */}
                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href={posterImage}
                      download={`VibeMovie_${new Date().getTime()}.jpg`}
                      className="h-12 rounded-2xl bg-gradient-to-r from-blue-700 to-sky-600 text-white text-[11px] font-bold uppercase tracking-[0.2em] flex items-center justify-center hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                    >
                      下载 <span className="opacity-50 ml-1.5 font-normal">Download</span>
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        alert('🔗 链接已复制，快去分享你的共鸣吧！');
                      }}
                      className="h-12 rounded-2xl bg-white/10 border border-white/10 text-white text-[11px] font-bold uppercase tracking-[0.2em] flex items-center justify-center hover:bg-white/15 active:scale-95 transition-all"
                    >
                      分享 <span className="opacity-50 ml-1.5 font-normal">Share</span>
                    </button>
                  </div>
                  
                  {/* 返回按钮占满底宽 */}
                  <button
                    onClick={() => setIsPosterOpen(false)}
                    className="w-full h-12 rounded-2xl text-[11px] font-bold uppercase tracking-[0.3em] text-slate-500 hover:text-slate-200 border border-white/5 hover:border-white/10 transition-all bg-black/20"
                  >
                    返回 <span className="opacity-50 ml-1 font-normal">Back</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Step 1 / 3 / 5 共用主布局 */}
      {(step === 1 || step === 3 || step === 5) && (
        <div
          ref={containerRef}
          className={cn(
            "relative z-20 flex flex-col items-center w-full px-4 pt-32 pb-12 min-h-full",
            "transition-all duration-1000 ease-[cubic-bezier(0.45,0,0.15,1)]",
            stepVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          <span
            className="mb-3 text-5xl select-none transition-all duration-300 hover:rotate-12 hover:scale-110"
            aria-label="Cinema Icon"
          >
            🎬
          </span>
          <h1
            className={cn(
              "bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-300 to-slate-600 drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]",
              "text-center font-sans font-black select-none uppercase",
              "tracking-[0.15em] text-5xl sm:text-7xl md:text-8xl leading-[1] mb-6",
              "transition-all duration-300 hover:tracking-[0.2em]"
            )}
          >
            VibeMovie
            <span className="block text-sm sm:text-base font-light tracking-[0.5em] text-slate-500 mt-2">Cinema of Emotions <span className="opacity-50 font-normal"></span></span>
          </h1>
          <div className="mb-10 sm:mb-16 flex flex-col items-center gap-2 w-full max-w-2xl">
            <div
              className="font-medium text-slate-400 text-lg sm:text-xl tracking-wider text-center"
            >
              {subtitle}
            </div>
          </div>

          {/* Step 1: 情绪输入区 */}
        {step === 1 && (
          <div
            className={cn(
              "w-full max-w-2xl transition-all duration-1000 ease-out",
              stepVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <form className="w-full" autoComplete="off" onSubmit={handleSubmitMood}>
              <div className="flex flex-col sm:flex-row items-stretch gap-4">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    placeholder="e.g. 今天c++挂科了，我好伤心喔……"
                    className={cn(
                      "w-full min-w-0 h-16 pl-6 pr-6 sm:pr-48 text-base sm:text-lg font-medium tracking-wide rounded-2xl",
                      "bg-white/[0.03] border border-white/5 backdrop-blur-2xl outline-none",
                      "placeholder:text-slate-600 placeholder:font-normal italic",
                      "focus:border-sky-700/40 focus:ring-4 focus:ring-sky-900/20",
                      "transition-all duration-500 shadow-2xl",
                      isLoading && "opacity-50"
                    )}
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={cn(
                      "hidden sm:block absolute top-2 right-2 h-[48px] px-8 min-w-[140px] rounded-xl text-xs font-bold uppercase tracking-[0.2em] shadow-xl select-none",
                      "bg-gradient-to-r from-blue-700 to-sky-600 text-white",
                      "transition-all duration-300 hover:translate-y-[-1px] hover:shadow-sky-500/20 active:translate-y-[1px]",
                      isLoading && "opacity-50"
                    )}
                  >
                    {isLoading ? "Diving..." : "Find My Vibe"}
                  </button>
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className={cn(
                      "sm:hidden w-full h-14 rounded-2xl text-sm font-bold uppercase tracking-widest bg-gradient-to-r from-blue-700 to-sky-600 text-white shadow-xl",
                      "transition-all duration-300 active:scale-95",
                      isLoading && "opacity-50"
                    )}
                  >
                    {isLoading ? "Diving..." : "Find My Vibe"}
                  </button>
              </div>
              <div
                className={cn(
                  "mt-6 text-slate-600 tracking-[0.3em] text-[10px] uppercase text-center select-none transition-all duration-700",
                  isLoading ? "opacity-100 translate-y-0 animate-pulse" : "opacity-0 -translate-y-1"
                )}
              >
                Diving into your emotional depths... <span className="opacity-30 ml-2">正在潜入你的情绪海...</span>
              </div>
              {error && !isLoading && (
                <div className="mt-5 text-xs tracking-widest text-rose-500/80 text-center uppercase transition-all duration-700">
                  {error}
                </div>
              )}
            </form>
          </div>
        )}

        {/* Step 3: 私人定制问答区 */}
        {step === 3 && (
          <div
            className={cn(
              "w-full max-w-3xl pb-32 transition-all duration-1000 ease-out",
              stepVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <div className="flex flex-col gap-8">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="bg-white/[0.02] backdrop-blur-3xl border border-white/[0.03] rounded-[2rem] p-8 sm:p-10 shadow-2xl"
                >
                  <p className="text-slate-200 font-medium text-lg sm:text-xl tracking-wide mb-8 font-serif italic">
                    {q.text}
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {q.options.map((opt: string) => {
                      const selected = answers[q.id] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                          className={cn(
                            "px-7 py-3 rounded-full text-xs sm:text-sm font-medium tracking-wide transition-all duration-500",
                            "border border-white/5 backdrop-blur-xl",
                            selected
                              ? "bg-blue-700 text-white border-blue-500 shadow-[0_0_25px_rgba(29,78,216,0.4)] scale-105"
                              : "bg-white/2 text-slate-500 hover:text-slate-300 hover:border-white/10 hover:bg-white/5"
                          )}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-16 flex flex-col items-center gap-6">
              <button
                type="button"
                onClick={handleConfirmAnswers}
                disabled={!allAnswered || isLoading}
                className={cn(
                  "w-full sm:w-auto px-16 py-5 rounded-2xl text-sm font-bold uppercase tracking-[0.25em] transition-all duration-500",
                  allAnswered && !isLoading
                    ? "bg-gradient-to-r from-blue-700 to-sky-600 text-white shadow-2xl hover:scale-105 hover:shadow-sky-500/20 active:scale-95"
                    : "bg-white/2 text-slate-700 cursor-not-allowed border border-white/5"
                )}
              >
                Confirm & Explore <span className="text-[10px] opacity-40 ml-2">确认探索</span>
              </button>
              {error && !isLoading && (
                <div className="text-xs tracking-widest text-rose-500/70 uppercase">{error}</div>
              )}
            </div>
          </div>
        )}

        {/* Step 5: 终极推荐展示区 */}
        {step === 5 && (
          <div
            className={cn(
              "w-full max-w-7xl transition-all duration-1000 ease-out pb-20",
              stepVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
              {movies.map((movie, i) => (
                <div
                  key={movie.title.en + i}
                  className="group relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl transition-all duration-700 hover:-translate-y-3"
                >
                  {movie.posterUrl ? (
                    <div className="absolute inset-0">
                      <NextImage
                        src={movie.posterUrl}
                        alt={movie.title.en}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-950" />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent" />

                  <div className="relative z-10 flex flex-col p-8 sm:p-10 min-h-[520px]">
                    <div className="flex items-start justify-between gap-6">
                      <div className="min-w-0">
                        <div className="text-2xl sm:text-3xl font-black tracking-tighter uppercase text-white truncate">
                          {movie.title.en}
                        </div>
                        <div className="mt-2 text-sm sm:text-base font-bold text-slate-300/80 tracking-wider truncate">
                          {movie.title.zh}
                        </div>
                      </div>
                      <div className="shrink-0 text-sm font-bold tracking-widest text-yellow-300/90">
                        ★ {typeof movie.rating === "number" ? movie.rating.toFixed(1) : "--"}
                      </div>
                    </div>

                    <div className="mt-4 text-[10px] uppercase tracking-[0.35em] text-slate-400/70">
                      {movie.year}
                    </div>

                    <div className="mt-8 flex-1 flex flex-col justify-end gap-4">
                      <div className="text-slate-100/80 text-sm sm:text-base font-light leading-relaxed whitespace-normal break-words">
                        {compactText(movie.reason.en, 220)}
                      </div>
                      <div className="text-slate-200/55 text-sm sm:text-[15px] leading-relaxed whitespace-normal break-words border-l-2 border-white/10 pl-4">
                        {compactText(movie.reason.zh, 120)}
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 px-8 sm:px-10 pb-8 sm:pb-10">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMovie(movie);
                        setStep(6);
                      }}
                      className={cn(
                        "w-full py-4 rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] transition-all duration-500",
                        "bg-white/10 border border-white/10 text-slate-100/80 backdrop-blur-xl",
                        "hover:bg-blue-700 hover:text-white hover:border-transparent hover:shadow-[0_0_30px_rgba(29,78,216,0.3)]",
                        "active:scale-95"
                      )}
                    >
                      Watch This <span className="opacity-50 ml-1">就看这部</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-20 flex justify-center">
              <button
                type="button"
                onClick={handleReset}
                className={cn(
                  "px-12 py-4 rounded-full text-[10px] font-bold uppercase tracking-[0.4em] transition-all duration-500",
                  "bg-transparent border border-white/5 text-slate-600 hover:text-slate-400 hover:border-white/10 hover:bg-white/2"
                )}
              >
                Reset Vibe <span className="opacity-30 ml-1">重新感知</span>
              </button>
            </div>
          </div>
        )}
        </div>
      )}
    </div>
  );
}
