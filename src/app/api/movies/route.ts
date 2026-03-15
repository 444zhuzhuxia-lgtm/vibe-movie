import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const MODEL = "deepseek-chat";

// 🚀 优化点 1: 精简 Prompt，减少 AI 的推理延迟
const SYSTEM_PROMPT = `你是一个资深影迷，根据用户心情推荐3部电影。
强制规则：
1. 严禁捏造：title_en 必须是真实英文原名，year 为4位数字。
2. 格式：严格 JSON，字段拆分 en 和 zh。
3. 长度：reason.en ≤ 200字符，reason.zh ≤ 80字符。
4. 结构：{"movies": [{"title": {"en":"","zh":""}, "title_en":"", "year":0, "director":"", "vibe_quote":{"en":"","zh":""}, "reason":{"en":"","zh":""}}]}
必须返回恰好3个对象。`;

export type MovieItem = {
  title: { en: string; zh: string };
  title_en: string;
  year: number;
  director: string;
  vibe_quote: { en: string; zh: string };
  reason: { en: string; zh: string };
  posterUrl: string | null;
  rating: number | null;
  releaseDate: string | null;
};

type RawMovieItem = {
  title?: { en?: string; zh?: string };
  title_en?: string;
  year?: number;
  director?: string;
  vibe_quote?: { en?: string; zh?: string };
  reason?: { en?: string; zh?: string };
};

type AiMoviesPayload = {
  movies?: RawMovieItem[];
};

// 🚀 优化点 2: 缩短单个请求超时时间，防止一个慢请求拖慢整个流程
async function fetchTmdbMovie(params: {
  titleEn: string;
  year: number;
  apiKey: string;
}) {
  const { titleEn, year, apiKey } = params;
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(titleEn)}&year=${year}&language=zh-CN`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000); // 缩短到 6秒 超时

  try {
    const res = await fetch(url, { method: "GET", signal: controller.signal, cache: "force-cache" }); // 开启强制缓存
    const data = await res.json();
    const first = data?.results?.[0];

    if (!first) return { posterUrl: null, rating: null, releaseDate: null, titleZh: null };

    return {
      posterUrl: first.poster_path ? `https://image.tmdb.org/t/p/w780${first.poster_path}` : null,
      rating: first.vote_average || null,
      releaseDate: first.release_date || null,
      titleZh: first.title || null,
    };
  } catch {
    return { posterUrl: null, rating: null, releaseDate: null, titleZh: null };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const tmdbKey = process.env.TMDB_API_KEY;
    
    const body = await req.json();
    const { mood, answers } = body;

    if (!mood) return NextResponse.json({ error: "缺少初始心情" }, { status: 400 });

    // 🚀 优化点 3: AI 请求超时控制在 25秒 左右
    const aiRes = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.6, // 降低一点随机性可以加速收敛
        response_format: { type: 'json_object' }, // 强制 JSON 模式（如果模型支持）
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `心情: ${mood}, 答案: ${answers.join(',')}` },
        ],
      }),
    });

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content) as AiMoviesPayload;
    const rawMovies = Array.isArray(parsed.movies) ? parsed.movies : [];

    // 🚀 优化点 4: 完美的并行执行 (已经在使用 Promise.all，保持高效)
    const enriched = await Promise.all(
      rawMovies.map(async (m) => {
        const safeTitleEn = (m.title_en ?? m.title?.en ?? "").trim();
        const safeYear = typeof m.year === "number" ? m.year : new Date().getFullYear();
        const tmdb = tmdbKey && safeTitleEn
          ? await fetchTmdbMovie({ titleEn: safeTitleEn, year: safeYear, apiKey: tmdbKey })
          : null;
        return {
          ...m,
          title_en: safeTitleEn,
          year: safeYear,
          title: {
            en: safeTitleEn,
            zh: tmdb?.titleZh || m.title?.zh || m.title?.en || safeTitleEn,
          },
          director: m.director ?? "Unknown",
          vibe_quote: {
            en: m.vibe_quote?.en ?? "",
            zh: m.vibe_quote?.zh ?? "",
          },
          reason: {
            en: m.reason?.en ?? "",
            zh: m.reason?.zh ?? "",
          },
          posterUrl: tmdb?.posterUrl || null,
          rating: tmdb?.rating || null,
          releaseDate: tmdb?.releaseDate || null,
        } as MovieItem;
      })
    );

    return NextResponse.json({ movies: enriched });
  } catch {
    return NextResponse.json({ error: "服务器由于情绪过载，稍后再试。" }, { status: 500 });
  }
}
