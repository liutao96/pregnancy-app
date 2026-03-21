import { differenceInDays, addDays, parseISO, format } from 'date-fns'

// Pregnancy is ~280 days (40 weeks) from LMP
// Due date = LMP + 280 days
// LMP = dueDate - 280 days

export function getLMP(dueDate) {
  const due = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate
  return addDays(due, -280)
}

export function getCurrentWeek(dueDate, today = new Date(), settings = {}) {
  // If there's a B超 report override (reportWeekOverride), use it
  // B超 measurement is more accurate than LMP calculation
  if (settings?.reportWeekOverride && settings?.reportWeekOverrideDate) {
    const overrideDate = typeof settings.reportWeekOverrideDate === 'string'
      ? parseISO(settings.reportWeekOverrideDate)
      : settings.reportWeekOverrideDate
    const daysDiff = differenceInDays(today, overrideDate)
    // Each 7 days = 1 week from the override week
    const weekOffset = Math.floor(daysDiff / 7)
    return settings.reportWeekOverride + weekOffset
  }

  const due = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate
  const lmp = getLMP(due)
  const daysPregnant = differenceInDays(today, lmp)
  return Math.floor(daysPregnant / 7)
}

export function getCurrentDay(dueDate, today = new Date()) {
  const due = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate
  const lmp = getLMP(due)
  const daysPregnant = differenceInDays(today, lmp)
  return daysPregnant % 7
}

export function getDaysUntilDue(dueDate, today = new Date()) {
  const due = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate
  return differenceInDays(due, today)
}

export function getTrimester(week) {
  if (week <= 12) return 1
  if (week <= 27) return 2
  return 3
}

export function getTrimesterLabel(week) {
  const t = getTrimester(week)
  if (t === 1) return '孕早期'
  if (t === 2) return '孕中期'
  return '孕晚期'
}

export function getWeekLabel(week) {
  if (week < 4) return `第${week}周（孕早期）`
  if (week < 13) return `第${week}周（孕早期）`
  if (week < 28) return `第${week}周（孕中期）`
  return `第${week}周（孕晚期）`
}

// Baby size comparison by week
export const babySizeByWeek = {
  4: { emoji: '🌱', name: '芝麻', size: '约1mm' },
  5: { emoji: '🫐', name: '蓝莓', size: '约2mm' },
  6: { emoji: '🫘', name: '豌豆', size: '约3mm' },
  7: { emoji: '☕', name: '咖啡豆', size: '约5mm' },
  8: { emoji: '🍓', name: '草莓', size: '约1.6cm' },
  9: { emoji: '🍇', name: '葡萄', size: '约2.3cm' },
  10: { emoji: '🍊', name: '金橘', size: '约3.1cm' },
  11: { emoji: '🍋', name: '青柠', size: '约4.1cm' },
  12: { emoji: '🥝', name: '猕猴桃', size: '约5.4cm' },
  13: { emoji: '🍑', name: '桃子', size: '约7.4cm' },
  14: { emoji: '🍋', name: '柠檬', size: '约8.7cm' },
  15: { emoji: '🍎', name: '苹果', size: '约10.1cm' },
  16: { emoji: '🥑', name: '牛油果', size: '约11.6cm' },
  17: { emoji: '🍐', name: '梨', size: '约13cm' },
  18: { emoji: '🫑', name: '甜椒', size: '约14.2cm' },
  19: { emoji: '🥭', name: '芒果', size: '约15.3cm' },
  20: { emoji: '🍌', name: '香蕉', size: '约16.4cm' },
  21: { emoji: '🥕', name: '胡萝卜', size: '约26.7cm' },
  22: { emoji: '🌽', name: '玉米', size: '约27.8cm' },
  23: { emoji: '🍆', name: '茄子', size: '约28.9cm' },
  24: { emoji: '🌽', name: '玉米棒', size: '约30cm' },
  25: { emoji: '🧅', name: '椰菜花', size: '约34.6cm' },
  26: { emoji: '🥬', name: '生菜', size: '约35.6cm' },
  27: { emoji: '🥦', name: '西兰花', size: '约36.6cm' },
  28: { emoji: '🍆', name: '大茄子', size: '约37.6cm' },
  29: { emoji: '🎃', name: '南瓜', size: '约38.6cm' },
  30: { emoji: '🥬', name: '大白菜', size: '约39.9cm' },
  31: { emoji: '🥥', name: '椰子', size: '约41.1cm' },
  32: { emoji: '🍈', name: '哈密瓜', size: '约42.4cm' },
  33: { emoji: '🍍', name: '菠萝', size: '约43.7cm' },
  34: { emoji: '🥜', name: '大冬瓜', size: '约45cm' },
  35: { emoji: '🎃', name: '大南瓜', size: '约46.2cm' },
  36: { emoji: '🍉', name: '小西瓜', size: '约47.4cm' },
  37: { emoji: '🥦', name: '瑞士甜菜', size: '约48.6cm' },
  38: { emoji: '🎑', name: '大韭菜', size: '约49.8cm' },
  39: { emoji: '🌊', name: '西瓜', size: '约50.7cm' },
  40: { emoji: '🎁', name: '小宝贝', size: '约51.2cm' },
}

export function getBabySize(week) {
  const w = Math.min(Math.max(week, 4), 40)
  return babySizeByWeek[w] || babySizeByWeek[40]
}

// Important checkup milestones
export const checkupMilestones = [
  { week: 6, name: '确认宫内妊娠', desc: 'B超确认宫内妊娠，排除宫外孕' },
  { week: 11, name: 'NT检查', desc: '颈项透明带扫描，评估染色体异常风险' },
  { week: 12, name: '早期唐筛/NIPT', desc: '唐氏综合征筛查（无创DNA或血清学）' },
  { week: 16, name: '中期产检', desc: '常规产检，血压、体重、宫高腹围' },
  { week: 20, name: '大排畸（系统超声）', desc: '详细检查胎儿结构发育，排除重大畸形' },
  { week: 24, name: '糖耐量测试（OGTT）', desc: '筛查妊娠期糖尿病，需空腹检查' },
  { week: 28, name: '孕晚期开始', desc: '每4周一次产检，检查胎位' },
  { week: 32, name: '产检+胎心监护', desc: '评估胎儿生长，开始胎心监护' },
  { week: 36, name: '每2周产检', desc: '更频繁监测，检查胎位是否入盆' },
  { week: 38, name: '每周产检', desc: '临产前密切监测' },
  { week: 40, name: '预产期', desc: '期待你的宝宝到来！' },
]

export function getNextCheckup(currentWeek) {
  return checkupMilestones.find(m => m.week > currentWeek)
}

export function formatPregnancyDate(dueDate, week, day) {
  return `第${week}周 第${day}天`
}
