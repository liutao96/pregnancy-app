import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Camera, X, Sparkles, Upload, FileText } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import Header from '../components/Header'
import { storage } from '../utils/storage'
import { getCurrentWeek } from '../utils/pregnancyCalc'
import { extractCheckupInfo } from '../utils/ai'

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
    hospital: '',
    type: '常规产检',
    notes: '',
    reports: [],
  })
  const [saving, setSaving] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [autoFilling, setAutoFilling] = useState(false)

  useEffect(() => {
    async function load() {
      const settings = await storage.getSettings()
      const week = getCurrentWeek(settings.dueDate, new Date(), settings)
      setForm(f => ({ ...f, week }))

      if (isEdit) {
        const checkup = await storage.getCheckupById(id)
        if (checkup) setForm(checkup)
      }
    }
    load()
  }, [id, isEdit])

  function update(key, value) {
    setForm(f => ({ ...f, [key]: value }))
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
            if (info.type) updates.type = info.type
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
      const checkup = {
        ...form,
        id: isEdit ? id : uuidv4(),
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

      navigate(`/checkups/${checkup.id}`, { replace: true })
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
              onChange={e => update('date', e.target.value)}
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
          <Field label="检查类型">
            <select
              value={form.type}
              onChange={e => update('type', e.target.value)}
              className="input-base"
            >
              {CHECKUP_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
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
                  {report.isPdf ? (
                    <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                      <FileText size={20} className="text-red-400" />
                    </div>
                  ) : (
                    <img
                      src={`data:${report.mimeType || 'image/jpeg'};base64,${report.imageData}`}
                      alt={report.name}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
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

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-rose-500 text-white py-4 rounded-2xl font-semibold text-base active:bg-rose-600 disabled:opacity-60"
        >
          {saving ? '保存中...' : '保存记录'}
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
