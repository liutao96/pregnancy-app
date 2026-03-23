import localforage from 'localforage'

localforage.config({
  name: 'pregnancy-companion',
  storeName: 'data',
})

const KEYS = {
  SETTINGS: 'settings',
  CHECKUPS: 'checkups',
  QA_HISTORY: 'qa-history',
  PREPARATION: 'preparation',
  POSTPARTUM: 'postpartum',
  WEEK_CACHE: 'week-cache',
  PRODUCTS_CACHE: 'products-cache',
  MEAL_HISTORY: 'meal-history',
  FOOD_EXCLUSIONS: 'food-exclusions',
  NAMES: 'names',
}

// Default preparation checklist
const DEFAULT_PREPARATION = [
  { id: '1', category: '证件材料', text: '准生证/生育服务证明', checked: false },
  { id: '2', category: '证件材料', text: '夫妻双方身份证（原件+复印件）', checked: false },
  { id: '3', category: '证件材料', text: '社保卡/医保卡', checked: false },
  { id: '4', category: '证件材料', text: '产检手册/孕产妇健康手册', checked: false },
  { id: '5', category: '证件材料', text: '住院押金（建议备3000-5000元）', checked: false },
  { id: '6', category: '妈妈用品', text: '哺乳内衣 2-3件', checked: false },
  { id: '7', category: '妈妈用品', text: '产褥垫（加大型）×20片', checked: false },
  { id: '8', category: '妈妈用品', text: '卫生巾（夜用/日用各一包）', checked: false },
  { id: '9', category: '妈妈用品', text: '月子帽、月子袜、束腹带', checked: false },
  { id: '10', category: '妈妈用品', text: '洗漱用品（牙刷、毛巾、洗发水）', checked: false },
  { id: '11', category: '妈妈用品', text: '宽松睡衣 2-3套', checked: false },
  { id: '12', category: '妈妈用品', text: '吸管杯/保温杯', checked: false },
  { id: '13', category: '妈妈用品', text: '产后修复内裤（5-6条）', checked: false },
  { id: '14', category: '宝宝用品', text: '新生儿衣服（0-3月，2-3套）', checked: false },
  { id: '15', category: '宝宝用品', text: '尿不湿 NB码 1-2包', checked: false },
  { id: '16', category: '宝宝用品', text: '婴儿湿巾 2-3包', checked: false },
  { id: '17', category: '宝宝用品', text: '婴儿包被/浴巾 2条', checked: false },
  { id: '18', category: '宝宝用品', text: '婴儿帽子 2顶', checked: false },
  { id: '19', category: '宝宝用品', text: '奶粉（备用，以防母乳不足）', checked: false },
  { id: '20', category: '宝宝用品', text: '奶瓶 1-2个', checked: false },
  { id: '21', category: '入院必备', text: '相机/充电宝（记录珍贵时刻）', checked: false },
  { id: '22', category: '入院必备', text: '手机充电线', checked: false },
  { id: '23', category: '入院必备', text: '轻便拖鞋（防滑）', checked: false },
  { id: '24', category: '入院必备', text: '零食、能量补充食品', checked: false },
  { id: '25', category: '入院必备', text: '提前了解入院路线和流程', checked: false },
]

// OSS sync helpers (lazy import to avoid circular deps)
let ossModule = null
async function getOSS() {
  if (!ossModule) {
    ossModule = await import('./oss')
  }
  return ossModule
}

// Sync all local data to OSS (fire and forget)
async function syncAllToOSS() {
  try {
    const oss = await getOSS()
    const data = {
      settings: await localforage.getItem(KEYS.SETTINGS),
      checkups: await localforage.getItem(KEYS.CHECKUPS) || [],
      qaHistory: await localforage.getItem(KEYS.QA_HISTORY) || [],
      preparation: await localforage.getItem(KEYS.PREPARATION),
      postpartum: await localforage.getItem(KEYS.POSTPARTUM),
      mealHistory: await localforage.getItem(KEYS.MEAL_HISTORY) || [],
      foodExclusions: await localforage.getItem(KEYS.FOOD_EXCLUSIONS),
      names: await localforage.getItem(KEYS.NAMES) || [],
      syncedAt: Date.now(),
    }
    await oss.saveDataToOSS(data)
  } catch (e) {
    console.log('OSS sync error:', e.message)
  }
}

export const storage = {
  // Initialize: sync from OSS and merge with local data
  // Call this once on app startup
  async init() {
    try {
      const oss = await getOSS()
      const remoteData = await oss.loadDataFromOSS()
      if (!remoteData) return // First time, no remote data

      // Load all local data
      const localData = {
        settings: await localforage.getItem(KEYS.SETTINGS),
        checkups: await localforage.getItem(KEYS.CHECKUPS) || [],
        qaHistory: await localforage.getItem(KEYS.QA_HISTORY) || [],
        preparation: await localforage.getItem(KEYS.PREPARATION),
        postpartum: await localforage.getItem(KEYS.POSTPARTUM),
        mealHistory: await localforage.getItem(KEYS.MEAL_HISTORY) || [],
        foodExclusions: await localforage.getItem(KEYS.FOOD_EXCLUSIONS),
        names: await localforage.getItem(KEYS.NAMES) || [],
      }

      // Merge: for each field, use the one with most recent data
      const merged = { ...remoteData }

      // Checkups: merge by id, newer date wins
      if (localData.checkups.length > 0 || remoteData.checkups?.length > 0) {
        const checkupMap = new Map()
        for (const c of (remoteData.checkups || [])) {
          checkupMap.set(c.id, c)
        }
        for (const c of localData.checkups) {
          const existing = checkupMap.get(c.id)
          if (!existing || new Date(c.date) >= new Date(existing.date)) {
            checkupMap.set(c.id, c)
          }
        }
        merged.checkups = Array.from(checkupMap.values()).sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        )
      }

      // Settings: merge object keys, prefer local (user's device data)
      if (localData.settings) {
        merged.settings = { ...remoteData.settings, ...localData.settings }
      }

      // Save merged data back to local
      if (merged.settings) await localforage.setItem(KEYS.SETTINGS, merged.settings)
      if (merged.checkups) await localforage.setItem(KEYS.CHECKUPS, merged.checkups)
      if (merged.qaHistory) await localforage.setItem(KEYS.QA_HISTORY, merged.qaHistory)
      if (merged.preparation) await localforage.setItem(KEYS.PREPARATION, merged.preparation)
      if (merged.postpartum) await localforage.setItem(KEYS.POSTPARTUM, merged.postpartum)
      if (merged.mealHistory) await localforage.setItem(KEYS.MEAL_HISTORY, merged.mealHistory)
      if (merged.foodExclusions) await localforage.setItem(KEYS.FOOD_EXCLUSIONS, merged.foodExclusions)
      if (merged.names) await localforage.setItem(KEYS.NAMES, merged.names)

      // Sync merged data back to OSS
      await syncAllToOSS()

      console.log('OSS sync complete')
    } catch (e) {
      console.log('Init sync error:', e.message)
    }
  },

  // Settings
  async getSettings() {
    const s = await localforage.getItem(KEYS.SETTINGS)
    return s || {
      dueDate: '2026-08-14',
      momName: '宝妈',
      dadName: '准爸爸',
      babyNickname: '宝宝',
      reportWeekOverride: null,
      reportWeekOverrideDate: null,
      babyBorn: false,
      babyBirthDate: null,
      customCheckupTypes: [],
      weeklyCheckupReminder: true,
    }
  },
  async saveSettings(settings) {
    const result = await localforage.setItem(KEYS.SETTINGS, settings)
    syncAllToOSS() // fire and forget
    return result
  },

  // Checkups
  async getCheckups() {
    return (await localforage.getItem(KEYS.CHECKUPS)) || []
  },
  async saveCheckup(checkup) {
    const checkups = await this.getCheckups()
    const idx = checkups.findIndex(c => c.id === checkup.id)
    if (idx >= 0) {
      checkups[idx] = checkup
    } else {
      checkups.push(checkup)
    }
    checkups.sort((a, b) => new Date(b.date) - new Date(a.date))
    await localforage.setItem(KEYS.CHECKUPS, checkups)
    syncAllToOSS() // fire and forget
    return checkup
  },
  async deleteCheckup(id) {
    const checkups = await this.getCheckups()
    await localforage.setItem(KEYS.CHECKUPS, checkups.filter(c => c.id !== id))
    syncAllToOSS()
  },
  async getCheckupById(id) {
    const checkups = await this.getCheckups()
    return checkups.find(c => c.id === id)
  },

  // Q&A History
  async getQAHistory() {
    return (await localforage.getItem(KEYS.QA_HISTORY)) || []
  },
  async saveQAHistory(messages) {
    const result = await localforage.setItem(KEYS.QA_HISTORY, messages)
    syncAllToOSS()
    return result
  },
  async clearQAHistory() {
    const result = await localforage.setItem(KEYS.QA_HISTORY, [])
    syncAllToOSS()
    return result
  },

  // Preparation checklist
  async getPreparation() {
    const items = await localforage.getItem(KEYS.PREPARATION)
    return items || DEFAULT_PREPARATION
  },
  async savePreparation(items) {
    const result = await localforage.setItem(KEYS.PREPARATION, items)
    syncAllToOSS()
    return result
  },

  // Postpartum
  async getPostpartum() {
    const data = await localforage.getItem(KEYS.POSTPARTUM)
    return data || { feedingLogs: [], diaperLogs: [], sleepLogs: [] }
  },
  async savePostpartum(data) {
    const result = await localforage.setItem(KEYS.POSTPARTUM, data)
    syncAllToOSS()
    return result
  },

  // Week content cache (not synced to OSS)
  async getWeekCache(week) {
    const cache = await localforage.getItem(KEYS.WEEK_CACHE) || {}
    return cache[week] || null
  },
  async saveWeekCache(week, content) {
    const cache = await localforage.getItem(KEYS.WEEK_CACHE) || {}
    cache[week] = content
    return localforage.setItem(KEYS.WEEK_CACHE, cache)
  },

  // Products cache (not synced to OSS)
  async getProductsCache(week) {
    const cache = await localforage.getItem(KEYS.PRODUCTS_CACHE) || {}
    return cache[week] || null
  },
  async saveProductsCache(week, content) {
    const cache = await localforage.getItem(KEYS.PRODUCTS_CACHE) || {}
    cache[week] = content
    return localforage.setItem(KEYS.PRODUCTS_CACHE, cache)
  },

  // Meal history
  async getMealHistory() {
    return (await localforage.getItem(KEYS.MEAL_HISTORY)) || []
  },
  async saveMealHistory(history) {
    const result = await localforage.setItem(KEYS.MEAL_HISTORY, history)
    syncAllToOSS()
    return result
  },
  async addMealWeek(weekData) {
    const history = await this.getMealHistory()
    const filtered = history.filter(h => h.weekKey !== weekData.weekKey)
    filtered.unshift(weekData)
    const trimmed = filtered.slice(0, 12)
    await localforage.setItem(KEYS.MEAL_HISTORY, trimmed)
    syncAllToOSS()
    return trimmed
  },

  // Food exclusions
  async getFoodExclusions() {
    const stored = await localforage.getItem(KEYS.FOOD_EXCLUSIONS)
    if (stored) return stored
    // Default pregnancy taboos (only return defaults if nothing stored yet)
    return {
      dislikes: [],
      taboo: [
        '生肉、生鱼片（如刺身、醉虾蟹）',
        '生蛋、半熟蛋（如温泉蛋、溏心蛋）',
        '未经巴氏消毒的奶制品（生牛奶、软奶酪）',
        '高汞鱼（鲨鱼、剑鱼、金枪鱼、马林鱼）',
        '酒精（红酒、白酒、啤酒、米酒等）',
        '咖啡因（每日限量200mg，约1杯咖啡）',
        '冷盘熟食/即食肉类（切片火腿等）',
        '腌制/熏制肉类（腊肉、香肠、培根）',
        '生蚝、生的贝类',
        '外卖沙拉（无法确认食材来源）',
      ],
    }
  },
  async saveFoodExclusions(data) {
    const result = await localforage.setItem(KEYS.FOOD_EXCLUSIONS, data)
    syncAllToOSS()
    return result
  },

  // Names collection
  async getNames() {
    return (await localforage.getItem(KEYS.NAMES)) || []
  },
  async saveName(nameData) {
    const names = await this.getNames()
    names.unshift({
      ...nameData,
      id: nameData.id || Date.now().toString(),
      createdAt: Date.now(),
    })
    await localforage.setItem(KEYS.NAMES, names)
    syncAllToOSS()
    return nameData
  },
  async deleteName(id) {
    const names = await this.getNames()
    await localforage.setItem(KEYS.NAMES, names.filter(n => n.id !== id))
    syncAllToOSS()
  },
}
