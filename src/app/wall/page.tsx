"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, Variants, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { Trash2, Film, Sparkles } from "lucide-react"; // 引入垃圾桶图标
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

type PublicRecord = {
  id: string;
  createdAt: string;
  initialMood: string;
  moodCategory: string;
  movieTitle: string;
  healingMessage: string;
  userMemo: string | null;
};

type WallResponse = {
  date: string;
  records: PublicRecord[];
};

const MOOD_GLOW: Record<string, string> = {
  ocean: "bg-cyan-400 shadow-[0_0_10px_theme(colors.cyan.400)]",
  night: "bg-indigo-500 shadow-[0_0_10px_theme(colors.indigo.500)]",
  space: "bg-purple-500 shadow-[0_0_10px_theme(colors.purple.500)]",
  forest: "bg-emerald-400 shadow-[0_0_10px_theme(colors.emerald.400)]",
  rain: "bg-blue-400 shadow-[0_0_10px_theme(colors.blue.400)]",
};

export default function ResonanceWall() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [records, setRecords] = useState<PublicRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ownedIds, setOwnedIds] = useState<string[]>([]);
  const queryDate = searchParams.get("date");
  const selectedDate = useMemo(() => {
    if (queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate)) return queryDate;
    return format(new Date(), "yyyy-MM-dd");
  }, [queryDate]);

  useEffect(() => {
    const stored = localStorage.getItem("vibe_owned_memos");
    if (stored) {
      try {
        setOwnedIds(JSON.parse(stored));
      } catch {
        setOwnedIds([]);
      }
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/wall?date=${selectedDate}`, { cache: "no-store" });
        const data = (await res.json()) as WallResponse | { error?: string };
        if (!isActive) return;
        if (!res.ok) {
          const message = "error" in data && typeof data.error === "string" ? data.error : "获取失败";
          throw new Error(message);
        }
        if (!("records" in data) || !Array.isArray(data.records)) throw new Error("返回格式错误");
        setRecords(data.records);
      } catch (e: unknown) {
        if (!isActive) return;
        setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        if (isActive) setIsLoading(false);
      }
    };
    run();
    return () => { isActive = false; };
  }, [selectedDate]);

  // 🚀 执行删除逻辑
  async function handleDelete(id: string) {
    if (!confirm("确定要让这段共鸣从星空中消散吗？")) return;
    
    try {
      const res = await fetch(`/api/archive/${id}`, { method: "DELETE" });
      if (res.ok) {
        // 1. 前端物理移除记录
        setRecords(prev => prev.filter(r => r.id !== id));
        // 2. 清理本地存储
        const newOwned = ownedIds.filter(oid => oid !== id);
        setOwnedIds(newOwned);
        localStorage.setItem("vibe_owned_memos", JSON.stringify(newOwned));
      }
    } catch {
      alert("删除失败，请稍后再试。");
    }
  }

  function jumpToDate(dateText: string) {
    router.push(`/wall?date=${dateText}`);
  }

  function shiftDate(offset: number) {
    const cursor = new Date(`${selectedDate}T00:00:00`);
    cursor.setDate(cursor.getDate() + offset);
    jumpToDate(format(cursor, "yyyy-MM-dd"));
  }

  const container: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const item: Variants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <div className="relative min-h-screen bg-[#020617] text-slate-100 font-sans p-4 sm:p-8 pt-24">
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#020617] via-[#010b21] to-[#020617] opacity-90" />
      
      <div className="relative z-10 max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row items-center justify-between mb-16 gap-6">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">
              Resonance Wall
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm tracking-[0.3em] uppercase mt-2">
              共频之墙 - <span className="opacity-50">在这个宇宙里，你并不孤单</span>
            </p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="px-8 py-3 rounded-full border border-white/5 text-slate-400 text-[10px] uppercase tracking-widest hover:text-white transition-all bg-white/5 backdrop-blur-md"
          >
            ← BACK TO CINEMA
          </button>
        </header>

        <div className="mb-10 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <div className="text-[10px] uppercase tracking-[0.35em] text-slate-500 font-bold">当前查看日期</div>
              <div className="mt-2 text-xl sm:text-2xl font-black tracking-[0.15em] text-slate-100">
                {format(new Date(`${selectedDate}T00:00:00`), "yyyy.MM.dd")}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => shiftDate(-1)}
                className="h-11 px-4 rounded-xl border border-white/10 text-slate-300 text-xs uppercase tracking-widest hover:text-white hover:border-white/20 transition-all"
              >
                ← 前一天
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => jumpToDate(e.target.value)}
                className="h-11 px-4 rounded-xl border border-white/10 bg-black/20 text-slate-200 text-sm outline-none focus:border-sky-500/50"
              />
              <button
                onClick={() => shiftDate(1)}
                className="h-11 px-4 rounded-xl border border-white/10 text-slate-300 text-xs uppercase tracking-widest hover:text-white hover:border-white/20 transition-all"
              >
                后一天 →
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-8 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-40">
            <div className="w-8 h-8 border-2 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="py-32 text-center rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
            <div className="text-[11px] uppercase tracking-[0.35em] text-slate-500 font-bold">
              No Resonance Yet
            </div>
            <div className="mt-3 text-slate-300/70 text-sm">
              这一天还没有公开留言，换个日期看看吧。
            </div>
          </div>
        ) : (
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6"
          >
            <AnimatePresence mode="popLayout">
              {records.map((record) => {
                const isAuthor = ownedIds.includes(record.id);

                return (
                  <motion.div
                    key={record.id}
                    variants={item}
                    layout
                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
                    className="break-inside-avoid relative group max-w-[90vw]"
                  >
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all duration-500 hover:bg-white/[0.08] hover:border-white/20">
                      
                      <div className="flex items-center justify-between mb-6">
                        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                          {format(new Date(record.createdAt), "yyyy.MM.dd HH:mm")}
                        </span>
                        
                        <div className="flex items-center gap-3">
                          {/* 🚀 只有作者才能看到的删除按钮 */}
                          {isAuthor && (
                            <button 
                              onClick={() => handleDelete(record.id)}
                              className="p-2 -m-2 text-slate-500 hover:text-rose-400 transition-colors"
                              title="删除我的评论"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full animate-pulse",
                            MOOD_GLOW[record.moodCategory] || "bg-slate-400"
                          )} />
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 italic mb-4 leading-relaxed line-clamp-2">
                        &ldquo;{record.initialMood}&rdquo;
                      </p>

                      <div className="flex items-center gap-2 mb-3">
                        <Film size={14} className="text-sky-400/50" />
                        <h3 className="text-lg font-black tracking-tight uppercase text-slate-100 line-clamp-1">
                          {record.movieTitle}
                        </h3>
                      </div>

                      <div className="relative mb-6">
                        <p className="text-sm text-sky-200/30 italic font-serif border-l border-sky-500/10 pl-4 line-clamp-3">
                          {record.healingMessage}
                        </p>
                      </div>

                      {record.userMemo && (
                        <div className="pt-5 border-t border-white/5">
                          <p className="text-sm text-slate-300 font-medium leading-relaxed tracking-wide break-words">
                            {record.userMemo}
                          </p>
                        </div>
                      )}
                      
                      {/* 身份标识：如果是作者发出的，在底部有个微弱的小星光 */}
                      {isAuthor && (
                        <div className="mt-4 flex justify-end">
                           <span className="text-[9px] text-sky-400/40 uppercase tracking-widest flex items-center gap-1">
                             <Sparkles size={10} /> your resonance
                           </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
