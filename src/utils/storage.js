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

export const storage = {
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
    }
  },
  async saveSettings(settings) {
    return localforage.setItem(KEYS.SETTINGS, settings)
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
    return checkup
  },
  async deleteCheckup(id) {
    const checkups = await this.getCheckups()
    await localforage.setItem(KEYS.CHECKUPS, checkups.filter(c => c.id !== id))
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
    return localforage.setItem(KEYS.QA_HISTORY, messages)
  },
  async clearQAHistory() {
    return localforage.setItem(KEYS.QA_HISTORY, [])
  },

  // Preparation checklist
  async getPreparation() {
    const items = await localforage.getItem(KEYS.PREPARATION)
    return items || DEFAULT_PREPARATION
  },
  async savePreparation(items) {
    return localforage.setItem(KEYS.PREPARATION, items)
  },

  // Postpartum
  async getPostpartum() {
    return (await localforage.getItem(KEYS.POSTPARTUM)) || {
      feedingLogs: [],
      diaperLogs: [],
      sleepLogs: [],
    }
  },
  async savePostpartum(data) {
    return localforage.setItem(KEYS.POSTPARTUM, data)
  },

  // Week content cache (keyed by week number)
  async getWeekCache(week) {
    const cache = await localforage.getItem(KEYS.WEEK_CACHE) || {}
    return cache[week] || null
  },
  async saveWeekCache(week, content) {
    const cache = await localforage.getItem(KEYS.WEEK_CACHE) || {}
    cache[week] = content
    return localforage.setItem(KEYS.WEEK_CACHE, cache)
  },

  // Products cache
  async getProductsCache(week) {
    const cache = await localforage.getItem(KEYS.PRODUCTS_CACHE) || {}
    return cache[week] || null
  },
  async saveProductsCache(week, content) {
    const cache = await localforage.getItem(KEYS.PRODUCTS_CACHE) || {}
    cache[week] = content
    return localforage.setItem(KEYS.PRODUCTS_CACHE, cache)
  },

  // Meal history (confirmed weekly menus)
  async getMealHistory() {
    return (await localforage.getItem(KEYS.MEAL_HISTORY)) || []
  },
  async saveMealHistory(history) {
    return localforage.setItem(KEYS.MEAL_HISTORY, history)
  },
  async addMealWeek(weekData) {
    const history = await this.getMealHistory()
    // Remove if already exists (for regeneration)
    const filtered = history.filter(h => h.weekKey !== weekData.weekKey)
    filtered.unshift(weekData)
    // Keep last 12 weeks
    const trimmed = filtered.slice(0, 12)
    await localforage.setItem(KEYS.MEAL_HISTORY, trimmed)
    return trimmed
  },

  // Food exclusions (dislikes + taboo)
  async getFoodExclusions() {
    return (await localforage.getItem(KEYS.FOOD_EXCLUSIONS)) || {
      dislikes: [],   // 不想吃的
      taboo: [],      // 忌口（孕期禁忌）
    }
  },
  async saveFoodExclusions(data) {
    return localforage.setItem(KEYS.FOOD_EXCLUSIONS, data)
  },
}
