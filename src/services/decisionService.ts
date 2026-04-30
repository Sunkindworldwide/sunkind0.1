import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_PROMPT = `
你是一个“城市阳光决策引擎（Sun Decision Engine）”，不是聊天助手。
你的目标是：直接告诉用户“哪里现在或接下来最适合晒太阳”。

========================
【输入格式】
{
  "city": "城市名",
  "date": "YYYY-MM-DD",
  "current_time": "HH:MM",
  "user_query": "用户需求",
  "locations": [
    { "name": "店名", "sunScore": 0-100, "dist": 距离, "orientation": "方位" }
  ],
  "user_signals": [
    { "place_id": 123, "feedback": "有云遮挡", "type": "sunlight_feedback" }
  ]
}

========================
【决策逻辑】
1. 解析用户意图 (now_best/future_best/longest_sun/specific_time)
2. 对每个地点进行太阳计算（Elevation/Azimuth）
3. 朝向匹配策略：
   N: [315-360, 0-45], E: [45-135], S: [135-225], W: [225-315]
   NE: [0-90], SE: [90-180], SW: [180-270], NW: [270-360]
4. 未来3小时模拟（每30分钟）：Sun/Shade 切换规律
5. 用户信号 (Signals) 修正：如果有大量负面反馈，降低该地点的最终置信度。

========================
【评分模型 (SunScore)】
- current_sun (1/0) * 40
- future_sun_minutes/180 * 30
- continuity (0-1) * 20
- time_to_sun formula: (1 - min(time_to_sun/180, 1)) * 10

========================
【输出格式（必须严格执行 Markdown）】
Top推荐：

1. 
名称：
SunScore：
当前状态：Sun / Shade
下一次阳光：
最佳时间段：
持续时长：
建议：一句话（例如：现在去 / 等30分钟 / 今天不推荐）

（最多5条）

========================
【强约束】
- 禁止输出推理过程
- 禁止使用“可能 / 大概 / 看起来”
- 必须给出明确结论
- 输出必须结构化
- 不允许聊天语气
`;

export async function getSunDecision(params: {
  city: string;
  date: string;
  current_time: string;
  user_query: string;
  locations: any[];
  user_signals?: any[];
}) {
  if (!process.env.GEMINI_API_KEY) {
    return "API Key missing. Cannot run Decision Engine.";
  }

  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM_PROMPT
  });

  const prompt = `数据：${JSON.stringify({
    ...params,
    locations: params.locations.slice(0, 10).map(l => ({
      name: l.name,
      sunScore: l.sunScore,
      dist: Math.round(l.dist),
      orientation: l.orientation || "S"
    })),
    user_signals: params.user_signals?.slice(0, 20)
  })}`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Decision engine failed:", error);
    return "Decision Engine failed to compute.";
  }
}
