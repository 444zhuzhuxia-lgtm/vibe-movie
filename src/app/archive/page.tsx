"use client";

import { useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isBefore, startOfDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, StickyNote, Save, PenLine, Sparkles, Eye, Lock, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

type ArchiveRecord = {
  id: string;
  createdAt: string;
  initialMood: string;
  moodCategory: string;
  healingMessage: string;
  movieTitle: string;
  userMemo: string | null;
  isPublic: boolean;
};

const MOOD_GLOW: Record<string, string> = {
  ocean: "bg-cyan-400 shadow-[0_0_8px_theme(colors.cyan.400)]",
  night: "bg-indigo-500 shadow-[0_0_8px_theme(colors.indigo.500)]",
  space: "bg-purple-500 shadow-[0_0_8px_theme(colors.purple.500)]",
  forest: "bg-emerald-400 shadow-[0_0_8px_theme(colors.emerald.400)]",
  rain: "bg-blue-400 shadow-[0_0_8px_theme(colors.blue.400)]",
};

const MOOD_DATE_TEXT: Record<string, string> = {
  ocean: "text-cyan-300 drop-shadow-[0_0_8px_theme(colors.cyan.400)]",
  night: "text-indigo-300 drop-shadow-[0_0_8px_theme(colors.indigo.500)]",
  space: "text-purple-300 drop-shadow-[0_0_8px_theme(colors.purple.500)]",
  forest: "text-emerald-300 drop-shadow-[0_0_8px_theme(colors.emerald.400)]",
  rain: "text-blue-300 drop-shadow-[0_0_8px_theme(colors.blue.400)]",
};

export default function ArchivePage() {
  const router = useRouter();
  const [records, setRecords] = useState<ArchiveRecord[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRecord, setSelectedRecord] = useState<ArchiveRecord | null>(null);
  const [memo, setMemo] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isVisibilitySaving, setIsVisibilitySaving] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, []);

  async function fetchRecords() {
    const res = await fetch("/api/archive");
    const data = await res.json();
    if (Array.isArray(data)) {
      setRecords(data);
    }
  }

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  async function handleSaveMemo() {
    if (!selectedRecord || isSaving) return;
    if (isPublic && memo.trim().length === 0) {
      setPublishError("开启匿名发布时，需要写一句留言才能漂流到共频之墙。");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/archive", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: selectedRecord.id, 
          userMemo: memo,
          isPublic: isPublic // 确保同步可见性状态
        }),
      });

      if (res.ok) {
        // 🚀 核心逻辑：记录“我”是这条评论的作者
        const myOwnedMemos = JSON.parse(localStorage.getItem("vibe_owned_memos") || "[]");
        if (!myOwnedMemos.includes(selectedRecord.id)) {
          myOwnedMemos.push(selectedRecord.id);
          localStorage.setItem("vibe_owned_memos", JSON.stringify(myOwnedMemos));
        }

        // 更新状态
        setRecords(records.map(r => r.id === selectedRecord.id ? { ...r, userMemo: memo, isPublic: isPublic } : r));
        setPublishError(null);

        // 🚀 核心逻辑：跳转到共频之墙
        router.push("/wall");
      }
    } catch (error) {
      console.error("Failed to save memo:", error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleVisibility() {
    if (!selectedRecord || isVisibilitySaving) return;
    const next = !isPublic;
    if (next && memo.trim().length === 0) {
      setPublishError("开启匿名发布时，需要写一句留言才能漂流到共频之墙。");
      return;
    }
    setIsVisibilitySaving(true);
    try {
      const res = await fetch(`/api/archive/${selectedRecord.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: next }),
      });
      if (!res.ok) throw new Error("toggle failed");
      setIsPublic(next);
      setRecords(records.map(r => r.id === selectedRecord.id ? { ...r, isPublic: next } : r));
      setSelectedRecord({ ...selectedRecord, isPublic: next });
      if (!next) setPublishError(null);
    } catch (error) {
      console.error("Failed to toggle visibility:", error);
    } finally {
      setIsVisibilitySaving(false);
    }
  }

  async function handleDeleteRecord() {
    if (!selectedRecord || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/archive/${selectedRecord.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setRecords(records.filter(r => r.id !== selectedRecord.id));
      setSelectedRecord(null);
      setIsDeleteConfirmOpen(false);
    } catch (error) {
      console.error("Failed to delete record:", error);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-[#020617] text-slate-100 font-sans p-4 sm:p-8 pt-24 overflow-x-hidden">
      {/* 顶部背景装饰 */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#020617] via-[#010b21] to-[#020617] opacity-90" />
      <div className="fixed top-[-10%] left-1/2 -translate-x-1/2 w-full h-[500px] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">
              Emotional Archive
            </h1>
            <p className="text-slate-500 text-sm tracking-[0.3em] uppercase mt-2">私人情绪档案室</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push("/")}
              className="px-6 py-2 rounded-full border border-white/5 text-slate-400 text-xs uppercase tracking-widest hover:text-white hover:border-white/20 transition-all"
            >
              ← Back
            </button>
          </div>
        </header>

        {/* 日历控制 */}
        <div className="flex items-center justify-between mb-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-bold tracking-[0.2em] uppercase">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* 日历网格 */}
        <div className="grid grid-cols-7 gap-2 sm:gap-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="text-center text-[10px] uppercase tracking-widest text-slate-600 font-bold py-2">
              {day}
            </div>
          ))}
          
          {/* 空白填充 */}
          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {days.map(day => {
            const dayRecords = records.filter(r => isSameDay(new Date(r.createdAt), day));
            const hasRecord = dayRecords.length > 0;
            const moodKey = hasRecord ? dayRecords[0]?.moodCategory : null;
            const isPastDay = isBefore(day, startOfDay(new Date()));
            const isClickable = isPastDay || hasRecord;
            
            return (
              <motion.div
                key={day.toISOString()}
                whileHover={isClickable ? { scale: 1.05 } : {}}
                className={cn(
                  "aspect-square relative flex flex-col items-center justify-center rounded-xl border transition-all",
                  isToday(day) ? "border-sky-500/50 bg-sky-500/5" : "border-white/5 bg-white/[0.02]",
                  isClickable ? "cursor-pointer hover:bg-white/[0.08] hover:border-white/20" : "cursor-default opacity-40"
                )}
                onClick={() => {
                  if (isPastDay) {
                    router.push(`/wall?date=${format(day, "yyyy-MM-dd")}`);
                    return;
                  }
                  if (!hasRecord) return;
                  setSelectedRecord(dayRecords[0]);
                  setMemo(dayRecords[0].userMemo || "");
                  setIsPublic(dayRecords[0].isPublic);
                  setPublishError(null);
                }}
              >
                <span
                  className={cn(
                    "text-sm sm:text-lg font-medium mb-1",
                    hasRecord && moodKey ? MOOD_DATE_TEXT[moodKey] : isToday(day) ? "text-sky-400" : "text-slate-400"
                  )}
                >
                  {format(day, "d")}
                </span>
                
                {/* 呼吸感微光圆点 - 限制展示数量，防止溢出 */}
{hasRecord && (
  <div className="flex gap-1 max-w-full overflow-hidden justify-center px-1">
    {dayRecords.slice(0, 3).map((r) => (
      <div
        key={r.id}
        className={cn(
          "w-1.5 h-1.5 rounded-full animate-pulse shrink-0",
          MOOD_GLOW[r.moodCategory] || "bg-slate-400 shadow-[0_0_8px_rgba(255,255,255,0.3)]"
        )}
      />
    ))}
    {dayRecords.length > 3 && (
      <div className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" title={`More than 3 records`} />
    )}
  </div>
)}
              </motion.div>
            );
          })}
        </div>

        <div className="mt-10 sm:mt-14 space-y-4">
          <button
            type="button"
            onClick={() => {
              const latest = records[0];
              if (!latest) return;
              setSelectedRecord(latest);
              setMemo(latest.userMemo || "");
              setIsPublic(latest.isPublic);
              setPublishError(null);
            }}
            disabled={records.length === 0}
            className={cn(
              "w-full group relative overflow-hidden rounded-3xl px-8 py-6 text-left transition-all duration-700",
              "bg-white/5 border border-white/10 backdrop-blur-2xl",
              "ring-1 ring-white/20 shadow-[0_0_15px_rgba(255,255,255,0.08)]",
              "hover:border-sky-500/30 hover:shadow-[0_0_30px_rgba(14,165,233,0.18)] hover:scale-[1.01] active:scale-[0.99]",
              records.length === 0 && "opacity-50 cursor-not-allowed hover:scale-100"
            )}
          >
            <div className="flex items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <PenLine size={18} className="text-sky-300" />
                  </div>
                  <div className="text-xs uppercase tracking-[0.35em] text-slate-500 font-bold">
                    Post a Memo <span className="opacity-30 ml-2">发表评论</span>
                  </div>
                </div>
                <div className="mt-4 text-slate-300 text-sm sm:text-base">
                  写一句，把此刻封存成漂流瓶。
                  <span className="opacity-40 ml-2">Open the latest ticket and leave a note.</span>
                </div>
              </div>
              <Sparkles size={18} className="text-white/20 group-hover:text-sky-300/60 transition-colors" />
            </div>
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ background: "radial-gradient(circle at 30% 20%, rgba(14,165,233,0.18) 0%, transparent 55%)" }}
            />
          </button>

          <Link
            href="/wall"
            className={cn(
              "w-full inline-flex items-center justify-center gap-3 rounded-3xl px-8 py-5 transition-all duration-700",
              "bg-white/5 border border-white/10 backdrop-blur-2xl",
              "hover:text-sky-300 hover:border-sky-500/30 hover:shadow-[0_0_22px_rgba(14,165,233,0.15)]"
            )}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.35em] text-slate-400">
              🌌 Explore the Wall <span className="opacity-30">窥探星海</span>
            </span>
          </Link>
        </div>
      </div>

      {/* 票根 Modal */}
      <AnimatePresence>
        {selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRecord(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="relative w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              {/* 票根顶部 - 打孔设计 */}
              <div className="relative p-8 pb-6 border-b border-dashed border-white/10">
                <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-[#020617] rounded-full border border-white/10" />
                <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-[#020617] rounded-full border border-white/10" />
                
                <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold">
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={12} />
                    {format(new Date(selectedRecord.createdAt), "yyyy.MM.dd HH:mm")}
                  </div>
                  <div>Ticket No. {selectedRecord.id.slice(0, 8)}</div>
                </div>
              </div>

              {/* 票根中部 - 内容 */}
              <div className="p-8 space-y-8">
                <div className="text-center">
                  <h3 className="text-3xl sm:text-4xl font-black italic uppercase bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500 leading-tight">
                    {selectedRecord.movieTitle}
                  </h3>
                  <div className={cn(
                    "inline-block px-3 py-1 rounded-full text-[9px] uppercase tracking-widest mt-4 border border-white/5",
                    MOOD_GLOW[selectedRecord.moodCategory]
                  )}>
                    {selectedRecord.moodCategory} vibe
                  </div>
                </div>

                <div className="relative">
                  <StickyNote size={40} className="absolute -top-6 -left-4 text-white/5" />
                  <p className="text-slate-300 text-lg sm:text-xl font-serif italic leading-relaxed text-center break-words whitespace-normal">
                    &ldquo;{selectedRecord.healingMessage}&rdquo;
                  </p>
                </div>

                {/* 留言区 */}
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block ml-2">
                    Personal Memo <span className="opacity-30">私人留言</span>
                  </label>
                  <textarea
                    value={memo}
                    onChange={(e) => {
                      setMemo(e.target.value);
                      if (publishError && e.target.value.trim().length > 0) setPublishError(null);
                    }}
                    placeholder={isPublic ? "写下此刻的感受...（发布后所有用户可见）" : "写下此刻的感受...（仅自己可见）"}
                    className="w-full h-32 bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-slate-200 outline-none focus:border-sky-500/30 focus:ring-1 focus:ring-sky-500/20 transition-all resize-none"
                  />
                  {publishError && (
                    <div className="text-[11px] text-rose-400/80 tracking-wide ml-2">
                      {publishError}
                    </div>
                  )}
                </div>
              </div>

              {/* 票根底部 - 操作 */}
              <div className="p-8 pt-0 space-y-4">
                <button
                  onClick={handleSaveMemo}
                  disabled={isSaving}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50"
                >
                  <Save size={14} />
                  {isSaving ? "Saving..." : "Save Memo"}
                </button>

                <div className="flex gap-4">
                  <button
                    onClick={handleToggleVisibility}
                    disabled={isVisibilitySaving}
                    className={cn(
                      "flex-1 h-12 rounded-2xl border text-xs font-bold uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-2",
                      "bg-white/5 backdrop-blur-xl",
                      isPublic
                        ? "border-sky-500/30 text-sky-200 shadow-[0_0_20px_rgba(14,165,233,0.18)]"
                        : "border-white/10 text-slate-300/70 hover:text-white hover:border-white/20",
                      "disabled:opacity-60"
                    )}
                  >
                    {isPublic ? <Eye size={16} /> : <Lock size={16} />}
                    {isPublic ? "公开" : "私密"}
                  </button>

                  <button
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/30 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>

                  <button
                    onClick={() => setSelectedRecord(null)}
                    className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDeleteConfirmOpen && selectedRecord && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              className="relative w-full max-w-md bg-white/5 border border-white/10 rounded-[2rem] backdrop-blur-2xl shadow-2xl p-8"
            >
              <div className="text-xs uppercase tracking-[0.35em] text-slate-500 font-bold mb-4">
                Gentle Warning <span className="opacity-30 ml-2">温柔提示</span>
              </div>
              <div className="text-slate-300 text-sm leading-relaxed break-words whitespace-normal mb-8">
                确定让这段记忆消散吗？
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleDeleteRecord}
                  disabled={isDeleting}
                  className="flex-1 h-12 rounded-2xl bg-rose-600/80 border border-rose-500/30 text-white text-xs font-bold uppercase tracking-[0.25em] hover:bg-rose-600 transition-all active:scale-95 disabled:opacity-60"
                >
                  {isDeleting ? "Deleting..." : "Confirm"}
                </button>
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/10 text-slate-300/80 text-xs font-bold uppercase tracking-[0.25em] hover:bg-white/10 hover:border-white/20 transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
