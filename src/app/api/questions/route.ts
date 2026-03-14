import { NextResponse } from "next/server";

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const MODEL = "deepseek-chat";

const SYSTEM_PROMPT = `你是一个非常懂大学生的知心好友、同龄人。说话要接地气、温暖、口语化，像是在宿舍夜谈或者陪朋友散心。

请根据用户刚才说的心情，完成以下任务：
1. 生成至少 3 道追问，帮他/她把心里那点事儿说透。
2. 提供一句 30 字以内的一针见血的治愈文案 (healing_message)。文案要求：英文为主，并在括号内附带简短的中文翻译，例如 "Breathe in, the stars are watching. (深呼吸，星辰在守候)"。
3. 从 ['ocean', 'forest', 'night', 'rain', 'space'] 中选择一个最匹配用户当前心境的分类 (mood_category)。

【极度严格的 mood_category 分类指南 - 必须且只能从以下 5 个词中选择一个】
- "ocean" (海洋): 忧郁深沉、压抑沉重、心事如海、需要被包容接纳的情绪
- "night" (夜晚): 孤独静谧、深夜emo、独自思考、渴望陪伴或独处的时刻
- "rain" (雨): 压抑治愈、伤感但需要释放、想哭一场、洗涤心灵的氛围
- "space" (宇宙): 迷茫宏大、感到渺小、对未来的不确定、需要开阔视野
- "forest" (森林): 清新自然、想要逃离、寻求平静、渴望呼吸新鲜空气

严禁自行创造新词！mood_category 必须且只能是以上 5 个词中的一个，严格区分大小写。

你要深刻理解大学生的现实处境：绩点焦虑、卷不动又不敢躺、同辈压力、迷茫不知道往哪走、恋爱受挫、DDL 轰炸、自我怀疑、和家里说不通的委屈，等等。

提问风格（务必遵守）：
- 多用共情式的口语，比如：「是不是觉得…」「其实最怕的是不是…」「有没有那种…」「会不会有时候…」。
- 不要用书面词，比如：禁止「比喻」「心结」「潜意识」「深层次」这类词。要像朋友在问，不是老师在出题。

选项风格（务必遵守）：
- 每个问题 3～4 个选项，选项要像大学生心底的真实大白话。
- 好的例子：「就想看世界毁灭，大家一起摆烂」「想大哭一场把委屈全倒出来」「表面没事，其实心里早就崩了」。
- 坏的例子：不要写「彻底的毁灭与宣泄」「寻求内在的释放」这种书面腔。

强制规则：
- 每个问题必须是选择题，options 为字符串数组，长度 3 或 4。
- 必须严格返回合法 JSON，不要有任何 Markdown 标记（如 \`\`\`json）或多余文字。只输出一个 JSON 对象。
- mood_category 字段必须且只能从 ['ocean', 'forest', 'night', 'rain', 'space'] 中选择一个，严禁创造新词！

JSON 结构（严格遵循）：
{
  "healing_message": "治愈文案",
  "mood_category": "ocean/forest/night/rain/space",
  "questions": [
    { "id": 1, "text": "问题正文（口语化、共情式）", "options": ["大白话选项A", "大白话选项B", "大白话选项C"] },
    { "id": 2, "text": "问题正文", "options": ["选项A", "选项B", "选项C", "选项D"] }
  ]
}
questions 数组至少 3 个元素。id 从 1 开始递增。`;

export type QuestionItem = {
  id: number;
  text: string;
  options: string[];
};

export type QuestionsResponse = {
  questions: QuestionItem[];
  healing_message: string;
  mood_category: 'ocean' | 'forest' | 'night' | 'rain' | 'space';
};

type DeepSeekChatCompletionResponse = {
  choices?: Array<{
    message?: { content?: unknown };
  }>;
};

function pickJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function isQuestionItem(v: unknown): v is QuestionItem {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (typeof o.id !== "number" || typeof o.text !== "string" || !Array.isArray(o.options)) return false;
  return o.options.every((x: unknown) => typeof x === "string");
}

function isQuestionsResponse(v: unknown): v is QuestionsResponse {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.questions) || o.questions.length < 3) return false;
  if (typeof o.healing_message !== "string" || !o.healing_message) return false;
  const validCategories = ['ocean', 'forest', 'night', 'rain', 'space'];
  if (typeof o.mood_category !== "string" || !validCategories.includes(o.mood_category)) return false;
  return o.questions.every(isQuestionItem);
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

    const mood =
      body &&
      typeof body === "object" &&
      "mood" in body &&
      typeof (body as Record<string, unknown>).mood === "string"
        ? ((body as Record<string, unknown>).mood as string).trim()
        : "";

    if (!mood) {
      return NextResponse.json(
        { error: "请先输入你的心情。" },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);

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
          { role: "user", content: mood },
        ],
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      let friendly = "情绪电波被噪音打断了，请稍后再试。";
      try {
        const parsed = JSON.parse(detail) as { error?: { message?: unknown } };
        const msg = parsed.error?.message;
        if (typeof msg === "string") {
          if (/insufficient\s+balance/i.test(msg)) friendly = "DeepSeek 余额不足。先去充值，再回来潜入。";
          else if (/invalid\s*api\s*key/i.test(msg) || /api\s*key/i.test(msg)) friendly = "API Key 似乎不对。检查一下 DEEPSEEK_API_KEY。";
        }
      } catch {
        // ignore
      }
      return NextResponse.json(
        { error: friendly, detail: detail ? detail.slice(0, 800) : undefined },
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

    const jsonText = pickJsonObject(content) ?? content.replace(/^```\w*\n?|```\s*$/g, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return NextResponse.json(
        { error: "收到的回声不够纯净，解析失败。请再试一次。" },
        { status: 502 }
      );
    }

    if (!isQuestionsResponse(parsed)) {
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
