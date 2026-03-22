import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Camera, X, Sparkles, Upload, FileText } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { parseISO } from 'date-fns'
import Header from '../components/Header'
import { storage } from '../utils/storage'
import { getCurrentWeek } from '../utils/pregnancyCalc'
import { extractCheckupInfo, analyzeReport } from '../utils/ai'

const CHECKUP_TYPES = [
  '常规产检', 'NT检查', '唐氏筛查（早期）', '唐氏筛查（中期）', '无创DNA（NIPT）',
  '大排畸（系统超声）', '糖耐量测试（OGTT）', '胎心监护', '产前检查', 'B超',
  '血常规', '尿常规', '肝肾功能检查', '羊水穿刺', '其他'
]

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function isPdf(file) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

function getFileThumb(file) {
  if (isPdf(file)) {
    return null // Show PDF icon instead
  }
  return URL.createObjectURL(file)
}

export default function CheckupForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id && id !== 'new'

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    week: 19,
    hospital: '霍山县医院',
    types: ['常规产检'],
    notes: '',
    reports: [],
  })
  const [saving, setSaving] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [autoFilling, setAutoFilling] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [summaryAttempted, setSummaryAttempted] = useState(false)
  const [settings, setSettings] = useState(null)
  const [initialized, setInitialized] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [customTypes, setCustomTypes] = useState([])
  const [showNewTypeInput, setShowNewTypeInput] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')

  useEffect(() => {
    async function load() {
      const s = await storage.getSettings()
      setSettings(s)
      setCustomTypes(s.customCheckupTypes || [])
      const week = getCurrentWeek(s.dueDate, new Date(), s)
      setForm(f => ({ ...f, week }))
      setInitialized(true)

      if (isEdit) {
        const checkup = await storage.getCheckupById(id)
        if (checkup) setForm({ ...checkup, types: checkup.types || checkup.type ? [checkup.type] : ['常规产检'] })
      }
    }
    load()
  }, [id, isEdit])

  function update(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  const allTypes = [...CHECKUP_TYPES, ...customTypes]

  async function addCustomType() {
    const name = newTypeName.trim()
    if (!name) return
    const updated = [...customTypes, name]
    setCustomTypes(updated)
    setNewTypeName('')
    setShowNewTypeInput(false)
    // Save to settings
    const s = await storage.getSettings()
    await storage.saveSettings({ ...s, customCheckupTypes: updated })
    // Add to selected types
    if (!form.types.includes(name)) {
      update('types', [...form.types, name])
    }
  }

  function addType(type) {
    if (!form.types.includes(type)) {
      update('types', [...form.types, type])
    }
  }

  function removeType(type) {
    update('types', form.types.filter(t => t !== type))
  }

  // When user manually changes the date, recalculate pregnancy week
  // In edit mode, don't auto-change week (record already has its own week)
  function handleDateChange(dateStr) {
    if (!dateStr) {
      update('date', dateStr)
      return
    }
    update('date', dateStr)
    // Only auto-calculate week when form is initialized and not in edit mode
    if (!initialized || isEdit) return
    try {
      const selectedDate = parseISO(dateStr)
      const week = getCurrentWeek(settings.dueDate, selectedDate, settings)
      update('week', week)
    } catch (e) {
      console.log('Week calculation error:', e)
    }
  }

  function openPreview(report) {
    if (report.isPdf) {
      const byteCharacters = atob(report.imageData)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/pdf' })
      setPreviewUrl(URL.createObjectURL(blob))
    } else {
      setPreviewUrl(`data:${report.mimeType || 'image/jpeg'};base64,${report.imageData}`)
    }
  }

  function closePreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  async function handleImageUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setImageLoading(true)
    try {
      const newReports = await Promise.all(files.map(async (file) => {
        const base64 = await fileToBase64(file)
        const pdf = isPdf(file)
        return {
          id: uuidv4(),
          name: file.name.replace(/\.[^/.]+$/, ''),
          imageData: base64,
          mimeType: pdf ? 'application/pdf' : file.type,
          isPdf: pdf,
          aiAnalysis: null,
          uploadedAt: new Date().toISOString(),
        }
      }))
      setForm(f => ({ ...f, reports: [...f.reports, ...newReports] }))

      // Auto-fill from first file (only if form is still empty/default and first file is image)
      if (newReports.length > 0 && !isEdit && !newReports[0].isPdf) {
        const firstImage = newReports[0].imageData
        setAutoFilling(true)
        try {
          const info = await extractCheckupInfo(firstImage)
          if (info) {
            const updates = {}
            if (info.date) updates.date = info.date
            // B超报告的测量孕周优先于LMP计算孕周
            if (info.bUltrasoundWeek != null) {
              updates.week = parseInt(info.bUltrasoundWeek)
            } else if (info.week) {
              updates.week = parseInt(info.week)
            }
            if (info.hospital) updates.hospital = info.hospital
            if (info.type) updates.types = [info.type]
            if (Object.keys(updates).length > 0) {
              setForm(f => ({ ...f, ...updates }))
            }
          }
        } catch (e) {
          console.log('Auto-fill failed:', e.message)
        } finally {
          setAutoFilling(false)
        }
      }
    } finally {
      setImageLoading(false)
    }
    e.target.value = ''
  }

  function removeReport(reportId) {
    setForm(f => ({ ...f, reports: f.reports.filter(r => r.id !== reportId) }))
  }

  function updateReportName(reportId, name) {
    setForm(f => ({
      ...f,
      reports: f.reports.map(r => r.id === reportId ? { ...r, name } : r)
    }))
  }

  async function handleSave() {
    if (!form.date || !form.week) return
    setSaving(true)
    try {
      const checkupId = isEdit ? id : uuidv4()
      const checkup = {
        ...form,
        id: checkupId,
        week: parseInt(form.week),
        createdAt: isEdit ? form.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      await storage.saveCheckup(checkup)

      // If week differs from calculated, save override (B超 week takes priority)
      const settings = await storage.getSettings()
      const calcWeek = getCurrentWeek(settings.dueDate, new Date(), settings)
      if (Math.abs(checkup.week - calcWeek) >= 1) {
        await storage.saveSettings({
          ...settings,
          reportWeekOverride: checkup.week,
          reportWeekOverrideDate: checkup.date,
        })
      }

      // Generate AI summary for new records with image reports (not PDFs)
      // Analyze ALL image reports and combine results into one summary
      if (!isEdit && form.reports.length > 0 && !checkup.aiSummary && !summaryAttempted) {
        const imageReports = form.reports.filter(r => !r.isPdf)
        if (imageReports.length > 0) {
          setSummarizing(true)
          setSummaryAttempted(true)
          try {
            // Analyze each image report sequentially
            const allAnalyses = []
            for (const report of imageReports) {
              const analysis = await analyzeReport(report.imageData, checkup.week)
              allAnalyses.push({ ...analysis, reportId: report.id })
            }

            // Combine all analyses into one comprehensive summary
            const combinedIndicators = []
            const combinedRecommendations = []
            const summaries = []

            for (const a of allAnalyses) {
              if (a.examName) summaries.push(`【${a.examName}】`)
              if (a.summary) summaries.push(a.summary)
              if (a.indicators?.length > 0) {
                for (const ind of a.indicators) {
                  combinedIndicators.push({ ...ind, source: a.examName || '检查报告' })
                }
              }
              if (a.recommendations?.length > 0) {
                for (const rec of a.recommendations) {
                  combinedRecommendations.push(rec)
                }
              }
            }

            const combinedSummary = {
              examName: allAnalyses.length > 1
                ? `综合分析（${allAnalyses.length}份报告）`
                : allAnalyses[0]?.examName || '产检报告',
              summary: summaries.filter(s => s).join('\n'),
              indicators: combinedIndicators,
              recommendations: combinedRecommendations,
              reportAnalyses: allAnalyses, // Preserve per-report analyses
            }

            // Save checkup with combined AI summary
            const updatedCheckup = { ...checkup, aiSummary: combinedSummary }
            await storage.saveCheckup(updatedCheckup)
          } catch (e) {
            console.log('Summary generation failed:', e.message)
          } finally {
            setSummarizing(false)
          }
        }
      }

      navigate(`/checkups/${checkupId}`, { replace: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-rose-50 pb-nav">
      <Header title={isEdit ? '编辑记录' : '新增产检记录'} back />

      <div className="px-4 py-4 space-y-4">
        {/* Date + Week */}
        <div className="bg-white rounded-2xl p-4 space-y-4">
          <Field label="检查日期">
            <input
              type="date"
              value={form.date}
              onChange={e => handleDateChange(e.target.value)}
              className="input-base"
            />
          </Field>
          <Field label="孕周（周）" hint="B超报告孕周 > 末次月经计算">
            <input
              type="number"
              min="4" max="42"
              value={form.week}
              onChange={e => update('week', e.target.value)}
              className="input-base"
            />
          </Field>
        </div>

        {/* Type + Hospital */}
        <div className="bg-white rounded-2xl p-4 space-y-4">
          <Field label="检查类型（可多选）">
            {/* Selected type tags */}
            {form.types.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {form.types.map(t => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {t}
                    <button
                      onClick={() => removeType(t)}
                      className="ml-1 hover:text-rose-800"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* Add type dropdown + custom */}
            <div className="flex gap-2">
              <select
                value=""
                onChange={e => { if (e.target.value) addType(e.target.value); e.target.value = '' }}
                className="input-base flex-1"
              >
                <option value="">+ 添加检查类型</option>
                {allTypes.filter(t => !form.types.includes(t)).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {showNewTypeInput ? (
                <div className="flex gap-1 flex-shrink-0">
                  <input
                    type="text"
                    value={newTypeName}
                    onChange={e => setNewTypeName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomType()}
                    placeholder="输入类型名称"
                    className="input-base w-28"
                    autoFocus
                  />
                  <button
                    onClick={addCustomType}
                    className="px-3 bg-rose-500 text-white rounded-xl text-sm font-medium flex-shrink-0"
                  >
                    添加
                  </button>
                  <button
                    onClick={() => { setShowNewTypeInput(false); setNewTypeName('') }}
                    className="px-2 text-slate-400 text-sm flex-shrink-0"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewTypeInput(true)}
                  className="px-3 border border-rose-200 text-rose-400 rounded-xl text-sm font-medium flex-shrink-0 active:bg-rose-50"
                >
                  + 自定义
                </button>
              )}
            </div>
          </Field>
          <Field label="医院/机构">
            <input
              type="text"
              value={form.hospital}
              onChange={e => update('hospital', e.target.value)}
              placeholder="例：北京协和医院"
              className="input-base"
            />
          </Field>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl p-4">
          <Field label="备注">
            <textarea
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              placeholder="医生的嘱咐、自己的感受..."
              rows={3}
              className="input-base resize-none"
            />
          </Field>
        </div>

        {/* Report upload */}
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-slate-800">上传报告</p>
            <p className="text-xs text-slate-400">
              {form.reports.length > 0 ? `已上传 ${form.reports.length} 个文件` : '支持 JPG/PNG/PDF，可多选'}
            </p>
          </div>

          {form.reports.length > 0 && (
            <div className="space-y-2 mb-3">
              {form.reports.map(report => (
                <div key={report.id} className="flex items-center gap-3 bg-rose-50 rounded-xl p-2.5">
                  <button
                    onClick={() => openPreview(report)}
                    className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-rose-300 rounded-lg"
                  >
                    {report.isPdf ? (
                      <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center">
                        <FileText size={20} className="text-red-400" />
                      </div>
                    ) : (
                      <img
                        src={`data:${report.mimeType || 'image/jpeg'};base64,${report.imageData}`}
                        alt={report.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                  </button>
                  <input
                    type="text"
                    value={report.name}
                    onChange={e => updateReportName(report.id, e.target.value)}
                    className="flex-1 text-sm bg-transparent outline-none text-slate-700 font-medium"
                    placeholder="报告名称"
                  />
                  <span className="text-xs text-slate-400 bg-white px-2 py-0.5 rounded-full flex-shrink-0">
                    {report.isPdf ? 'PDF' : '图片'}
                  </span>
                  <button
                    onClick={() => removeReport(report.id)}
                    className="p-1 text-slate-400 active:text-rose-500 flex-shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Auto-fill indicator */}
          {autoFilling && (
            <div className="flex items-center justify-center gap-2 bg-violet-50 border border-violet-200 rounded-xl py-3 text-violet-600 mb-2">
              <Sparkles size={16} className="animate-pulse" />
              <span className="text-sm font-medium">正在识别报告信息...</span>
            </div>
          )}

          <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-xl py-4 cursor-pointer active:bg-rose-50 transition-colors ${imageLoading || autoFilling ? 'border-slate-200 text-slate-400' : 'border-rose-200 text-rose-400'}`}>
            <Upload size={20} />
            <span className="text-sm font-medium">
              {imageLoading ? '处理中...' : autoFilling ? '识别中...' : '点击上传报告（可多选）'}
            </span>
            <input
              type="file"
              accept="image/*,.pdf,application/pdf"
              multiple
              className="hidden"
              onChange={handleImageUpload}
              disabled={imageLoading || autoFilling}
            />
          </label>
          {!autoFilling && form.reports.length === 0 && (
            <p className="text-xs text-slate-400 text-center mt-1.5">上传报告图片，自动识别日期、孕周等信息</p>
          )}
        </div>

        {/* Summarizing indicator */}
        {summarizing && (
          <div className="flex items-center justify-center gap-2 bg-violet-50 border border-violet-200 rounded-xl py-3 text-violet-600">
            <Sparkles size={16} className="animate-pulse" />
            <span className="text-sm font-medium">正在分析报告，生成总结...</span>
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || summarizing}
          className="w-full bg-rose-500 text-white py-4 rounded-2xl font-semibold text-base active:bg-rose-600 disabled:opacity-60"
        >
          {saving ? (summarizing ? '正在生成报告总结...' : '保存中...') : '保存记录'}
        </button>
      </div>

      <style>{`
        .input-base {
          width: 100%;
          background: #fff1f2;
          border: none;
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 14px;
          color: #1e293b;
          outline: none;
        }
        .input-base:focus {
          box-shadow: 0 0 0 2px #fda4af;
        }
        select.input-base {
          appearance: auto;
        }
      `}</style>

      {/* Report preview modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={closePreview}
        >
          <div className="relative max-w-full max-h-full">
            <button
              onClick={closePreview}
              className="absolute -top-10 right-0 text-white text-sm font-medium px-3 py-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              关闭
            </button>
            {previewUrl.startsWith('data:application/pdf') ? (
              <iframe
                src={previewUrl}
                className="w-[90vw] max-w-xl h-[80vh] rounded-xl border-0"
                title="PDF预览"
              />
            ) : (
              <img
                src={previewUrl}
                alt="报告预览"
                className="max-w-[90vw] max-h-[80vh] rounded-xl object-contain"
                onClick={e => e.stopPropagation()}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-slate-600">{label}</label>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
