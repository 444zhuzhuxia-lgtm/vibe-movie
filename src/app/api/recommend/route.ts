import { NextResponse } from "next/server";

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const MODEL = "deepseek-chat";

const SYSTEM_PROMPT = `你是一个极具品味、洞察人心、语言极简且带有王家卫式疏离感的高级电影策展人。你的任务是根据用户的只言片语，精准捕捉其底层情绪，并推荐一部绝对契合的电影。

拒绝烂俗套话，拒绝说教。

语言风格：冷峻、诗意、一针见血。

必须严格返回合法的 JSON 格式，不要有任何 Markdown 标记或多余文字。

JSON 结构要求：
{
"title": "电影名字",
"director": "导演名字 (年份)",
"vibe_quote": "一句极简、直击灵魂的电影经典台词或情绪短语（如：'不知道从什么时候开始，在什么东西上面都有个日期。'）",
"reason": "一段50字以内的推荐语，语气要像是在深夜电台里的低语，带有极强的共情力或毒舌的精准度。"
}`;

type RecommendResult = {
  title: string;
  director: string;
  vibe_quote: string;
  reason: string;
};

type DeepSeekChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
};

function pickJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function isRecommendResult(v: unknown): v is RecommendResult {
  if (!v || typeof v !== "object") return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.title === "string" &&
    typeof obj.director === "string" &&
    typeof obj.vibe_quote === "string" &&
    typeof obj.reason === "string"
  );
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "服务器未配置 DEEPSEEK_API_KEY。" },
        { status: 500 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "请求体不是合法的 JSON。" },
        { status: 400 }
      );
    }

    const inputText =
      body &&
      typeof body === "object" &&
      "inputText" in body &&
      typeof (body as Record<string, unknown>).inputText === "string"
        ? ((body as Record<string, unknown>).inputText as string).trim()
        : "";

    if (!inputText) {
      return NextResponse.json(
        { error: "请输入一句你的情绪片段。" },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    const upstream = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.7,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: inputText },
        ],
        // DeepSeek OpenAI-compatible; keep strict JSON requirement in prompt.
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      let friendly = "情绪电波被噪音打断了，请稍后再试。";
      try {
        const parsed = JSON.parse(detail) as {
          error?: { message?: unknown };
        };
        const msg = parsed.error?.message;
        if (typeof msg === "string") {
          if (/insufficient\s+balance/i.test(msg)) {
            friendly = "DeepSeek 余额不足。先去充值，再回来潜入。";
          } else if (/invalid\s*api\s*key/i.test(msg) || /api\s*key/i.test(msg)) {
            friendly = "API Key 似乎不对。检查一下 DEEPSEEK_API_KEY。";
          }
        }
      } catch {
        // ignore
      }
      return NextResponse.json(
        {
          error: friendly,
          detail: detail ? detail.slice(0, 800) : undefined,
        },
        { status: 502 }
      );
    }

    const data = (await upstream.json()) as DeepSeekChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "对方沉默了。换一句更锋利的描述试试。" },
        { status: 502 }
      );
    }

    const jsonText = pickJsonObject(content) ?? content;

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return NextResponse.json(
        { error: "收到的回声不够纯净，解析失败。请再试一次。" },
        { status: 502 }
      );
    }

    if (!isRecommendResult(parsed)) {
      return NextResponse.json(
        { error: "推荐结果格式不完整。请再试一次。" },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed, { status: 200 });
  } catch (err: unknown) {
    const isAbort =
      typeof (err as { name?: unknown } | null)?.name === "string" &&
      ((err as { name: string }).name.toLowerCase() === "aborterror");
    return NextResponse.json(
      {
        error: isAbort
          ? "连接超时了。你的情绪太深，我们再潜一次。"
          : "服务器短暂失焦，请稍后再试。",
      },
      { status: isAbort ? 504 : 500 }
    );
  }
}

