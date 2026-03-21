const AI_API = 'https://ai-gateway.happycapy.ai/api/v1/chat/completions'
const API_KEY = import.meta.env.VITE_AI_GATEWAY_API_KEY
const MODEL = 'anthropic/claude-sonnet-4.6'

async function chat(messages, options = {}) {
  const res = await fetch(AI_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: options.maxTokens || 2000,
      ...options,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`AI请求失败: ${res.status} ${err}`)
  }
  const data = await res.json()
  return data.choices[0].message.content
}

const SYSTEM_PROMPT = `你是一位专业的孕期健康顾问和陪伴助手，同时也是准爸爸的得力助手。你了解孕期每个阶段的重点，能用温暖、通俗易懂的语言解释医学知识。

重要原则：
- 使用简洁、温暖、亲切的中文
- 医疗建议仅供参考，遇到异常情况请就医
- 考虑到准爸爸也会使用，给出爸爸视角的建议
- 回答要实用具体，避免泛泛而谈`

// Analyze a checkup report image
export async function analyzeReport(imageBase64, week, previousAnalysis = null) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `这是孕${week}周的产检报告图片，请帮我详细分析。${previousAnalysis ? '上次报告摘要：' + previousAnalysis : ''}

请按以下JSON格式返回分析结果（不要包含任何其他内容，只返回JSON）：
{
  "examName": "检查名称",
  "week": ${week},
  "summary": "总体情况摘要（2-3句话）",
  "indicators": [
    {
      "name": "指标名称",
      "value": "检测值",
      "reference": "参考范围",
      "status": "normal|warning|abnormal",
      "explanation": "通俗解释"
    }
  ],
  "keyFindings": "关键发现",
  "concerns": ["需要关注的事项"],
  "recommendations": ["建议事项"],
  "dadTips": ["准爸爸可以做什么"],
  "nextCheckup": "下次检查建议"
}`
        },
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
        }
      ]
    }
  ]

  const content = await chat(messages, { maxTokens: 3000 })

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('无法解析AI返回的结果')
  return JSON.parse(jsonMatch[0])
}

// Extract checkup info from report image (auto-fill form)
export async function extractCheckupInfo(imageBase64) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `这是一张产检报告图片，请从图片中识别并提取以下信息：

请按以下JSON格式返回（只返回JSON，不要包含任何其他内容）：
{
  "date": "检查日期（YYYY-MM-DD格式，如2026-03-15，如果图片看不清就返回空字符串）",
  "week": "孕周（数字，如19，如果图片看不清就返回null）",
  "hospital": "医院/机构名称（如果图片看不清就返回空字符串）",
  "type": "检查类型（如B超、唐筛、糖耐、血常规等，根据图片内容判断，如果看不清就返回常规产检）",
  "confidence": "识别置信度（high/medium/low）"
}`
        },
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
        }
      ]
    }
  ]

  const responseContent = await chat(messages, { maxTokens: 500 })

  // Extract JSON from response
  const jsonMatch = responseContent.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('无法从图片中提取信息，请手动填写')
  return JSON.parse(jsonMatch[0])
}

// Generate weekly guide content
export async function generateWeeklyGuide(week, dueDate, settings = {}) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `请为孕${week}周的准父母生成本周指南。预产期是${dueDate}。

请按以下JSON格式返回（只返回JSON，不含其他内容）：
{
  "babyDevelopment": {
    "headline": "本周宝宝发育亮点（一句话）",
    "details": ["发育细节1", "发育细节2", "发育细节3", "发育细节4"]
  },
  "momChanges": {
    "headline": "妈妈本周变化亮点",
    "details": ["变化1", "变化2", "变化3"]
  },
  "nutrition": {
    "headline": "本周营养重点",
    "keyNutrients": [
      {"name": "营养素名称", "why": "为什么需要", "foods": ["食物1", "食物2"]}
    ],
    "recipes": [
      {"name": "推荐食谱名称", "desc": "简短描述"}
    ],
    "avoid": ["需要避免的食物1", "需要避免的食物2"]
  },
  "precautions": [
    {"title": "注意事项标题", "desc": "详细说明"}
  ],
  "dadGuide": {
    "headline": "本周准爸爸指南",
    "tasks": ["爸爸可以做的事1", "爸爸可以做的事2", "爸爸可以做的事3"]
  },
  "weeklyTip": "本周最重要的一条提示（给准父母的贴心话）"
}`
    }
  ]

  const content = await chat(messages, { maxTokens: 3000 })
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('无法解析AI返回的结果')
  return JSON.parse(jsonMatch[0])
}

// Q&A chat
export async function askQuestion(userMessage, history, context) {
  const contextStr = `当前孕周：${context.week}周，预产期：${context.dueDate}，宝宝昵称：${context.babyNickname}`

  const messages = [
    {
      role: 'system',
      content: `${SYSTEM_PROMPT}\n\n当前情况：${contextStr}\n\n请用温暖、专业的语言回答孕期相关问题。回答要实用，长度适中，不要过于冗长。`
    },
    ...history.slice(-10), // Last 10 messages for context
    { role: 'user', content: userMessage }
  ]

  return chat(messages, { maxTokens: 1500 })
}

// Generate product recommendations
export async function generateProducts(week) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `请为孕${week}周的准父母推荐实用好物。

请按以下JSON格式返回（只返回JSON）：
{
  "categories": [
    {
      "name": "分类名称",
      "icon": "emoji图标",
      "items": [
        {
          "name": "商品名称",
          "desc": "为什么需要/好处",
          "tips": "选购建议",
          "urgency": "now|soon|later",
          "priceRange": "价格区间（如：100-300元）"
        }
      ]
    }
  ]
}`
    }
  ]

  const content = await chat(messages, { maxTokens: 3000 })
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('无法解析AI返回的结果')
  return JSON.parse(jsonMatch[0])
}

// Generate weekly meal plan
export async function generateMealPlan(week, exclusions, historyDishes = []) {
  const exclusionStr = exclusions.dislikes.length > 0
    ? `不想吃：${exclusions.dislikes.join('、')}。`
    : ''
  const tabooStr = exclusions.taboo.length > 0
    ? `孕期忌口：${exclusions.taboo.join('、')}（绝对不能出现）。`
    : ''
  const historyStr = historyDishes.length > 0
    ? `最近吃过的菜（尽量不要重复）：${historyDishes.join('、')}。`
    : ''

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `请为孕${week}周的孕妇推荐一周菜谱。

要求：
- 工作日（周一~周五）：推荐家常菜，简单易做
- 周日：推荐营养价值更高的菜，滋补为主
- 每天3餐：早餐、午餐、晚餐，每餐3菜1汤
- ${exclusionStr}
- ${tabooStr}
- ${historyStr}

请按以下严格JSON格式返回（只返回JSON，不要有任何其他内容）：
{
  "weekLabel": "2026年第12周",
  "days": [
    {
      "day": "周一",
      "type": "weekday",
      "breakfast": {"dishes": ["菜名1", "菜名2", "菜名3"], "soup": "汤名"},
      "lunch": {"dishes": ["菜名1", "菜名2", "菜名3"], "soup": "汤名"},
      "dinner": {"dishes": ["菜名1", "菜名2", "菜名3"], "soup": "汤名"}
    },
    {
      "day": "周二",
      "type": "weekday",
      "breakfast": {"dishes": ["菜名1", "菜名2", "菜名3"], "soup": "汤名"},
      "lunch": {"dishes": ["菜名1", "菜名2", "菜名3"], "soup": "汤名"},
      "dinner": {"dishes": ["菜名1", "菜名2", "菜名3"], "soup": "汤名"}
    },
    {"day": "周三", "type": "weekday", "breakfast": {"dishes": ["菜名1", "菜名2", "菜名3"], "soup": "汤名"}, "lunch": {"dishes": ["菜名1", "菜名2", "菜名3"], "soup": "汤名"}, "dinner": {"dishes": ["菜名1", "菜名2", "菜名3"], "soup": "汤名"}},
    {"day": "周四", "type": "weekday", "breakfast": {"dishes": ["菜名1", "菜名2", "菜名3"], "soup": "汤名"}, "lunch": {"dishes": ["菜名1", "菜名2", "菜名3"], "soup": "汤名"}, "dinner": {"dishes": ["菜名1", "菜名2", "菜名3"], "soup": "汤名"}},
    {"day": "周五", "type": "weekday", "breakfast": {"dishes": ["菜名1", "菜名2", "菜名3"], "soup": "汤名"}, "lunch": {"dishes": ["菜名1", "菜名2", "菜名3"], "soup": "汤名"}, "dinner": {"dishes": ["菜名1", "菜名2", "菜名3"], "soup": "汤名"}},
    {"day": "周六", "type": "weekend", "breakfast": {"dishes": ["菜名1", "菜名2", "菜名3"], "soup": "汤名"}, "lunch": {"dishes": ["菜名1", "菜名2", "菜名3"], "soup": "汤名"}, "dinner": {"dishes": ["菜名1", "菜名2", "菜名3"], "soup": "汤名"}},
    {"day": "周日", "type": "sunday", "breakfast": {"dishes": ["菜名1", "菜名2", "菜名3"], "soup": "汤名"}, "lunch": {"dishes": ["菜名1", "菜名2", "菜名3"], "soup": "汤名"}, "dinner": {"dishes": ["菜名1", "菜名2", "菜名3"], "soup": "汤名"}}
  ]
}`
    }
  ]

  const content = await chat(messages, { maxTokens: 4000 })
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('无法解析AI返回的结果')
  return JSON.parse(jsonMatch[0])
}

// Generate detailed recipe
export async function generateRecipe(dishName, mealType) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `请给出孕妇餐"${dishName}"的详细做法。

要求：
- 适合孕妇食用（安全食材）
- 主料、辅料用量精确（用克或常见单位）
- 步骤清晰，每步说明火候和时间
- 注明营养价值和注意事项
- 难度控制在家常水平

请按以下JSON格式返回（只返回JSON）：
{
  "name": "${dishName}",
  "servings": "1-2人份",
  "difficulty": "简单|中等",
  "time": "准备X分钟 + 烹饪X分钟",
  "nutrients": "主要营养价值",
  "ingredients": [
    {"name": "原料名称", "amount": "用量"}
  ],
  "steps": [
    {"step": 1, "desc": "具体步骤...", "tip": "小贴士（可选）"}
  ],
  "notes": "孕妇食用注意事项"
}`
    }
  ]

  const content = await chat(messages, { maxTokens: 3000 })
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('无法解析AI返回的结果')
  return JSON.parse(jsonMatch[0])
}

// Stream version for Q&A (returns reader)
export async function askQuestionStream(userMessage, history, context, onChunk) {
  const contextStr = `当前孕周：${context.week}周，预产期：${context.dueDate}`

  const messages = [
    {
      role: 'system',
      content: `${SYSTEM_PROMPT}\n\n当前情况：${contextStr}\n\n请用温暖、专业的语言回答孕期相关问题。`
    },
    ...history.slice(-10),
    { role: 'user', content: userMessage }
  ]

  const res = await fetch(AI_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: 1500,
      stream: true,
    }),
  })

  if (!res.ok) throw new Error(`AI请求失败: ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let fullContent = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(l => l.trim())

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta?.content || ''
          if (delta) {
            fullContent += delta
            onChunk(delta, fullContent)
          }
        } catch (e) {
          // ignore parse errors
        }
      }
    }
  }

  return fullContent
}
