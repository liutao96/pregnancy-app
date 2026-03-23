import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, X, FileText, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { parseISO } from 'date-fns'
import Header from '../components/Header'
import { storage } from '../utils/storage'
import { extractCheckupInfo, analyzeReport } from '../utils/ai'

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

export default function BatchUpload() {
  const navigate = useNavigate()
  const [files, setFiles] = useState([]) // { file, id, status, info, error }
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' })
  const [grouped, setGrouped] = useState(null) // grouped records ready to save
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(0)

  async function handleFileSelect(e) {
    const selected = Array.from(e.target.files)
    if (!selected.length) return

    // Add files to state
    const newFiles = selected.map(file => ({
      file,
      id: uuidv4(),
      status: 'pending', // pending, analyzing, done, error
      info: null,
      error: null,
    }))
    setFiles(prev => [...prev, ...newFiles])
  }

  async function startProcessing() {
    setProcessing(true)
    setProgress({ current: 0, total: files.length, message: '准备中...' })

    const settings = await storage.getSettings()
    const results = []

    for (let i = 0; i < files.length; i++) {
      const item = files[i]
      setProgress({ current: i + 1, total: files.length, message: `分析第${i + 1}张...` })

      try {
        // Update status
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'analyzing' } : f))

        const base64 = await fileToBase64(item.file)
        const info = await extractCheckupInfo(base64)

        // If date is empty, try to use file name or today
        let date = info.date
        if (!date) {
          // Try to extract date from file name
          const nameMatch = item.file.name.match(/(\d{4}[-_]\d{1,2}[-_]\d{1,2})/)
          if (nameMatch) {
            date = nameMatch[1].replace(/_/g, '-')
          }
        }

        results.push({
          ...item,
          status: 'done',
          info: {
            ...info,
            date: date || new Date().toISOString().split('T')[0],
          },
        })
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'done', info: { ...info, date: date || new Date().toISOString().split('T')[0] } } : f))
      } catch (e) {
        const fallbackDate = new Date().toISOString().split('T')[0]
        results.push({
          ...item,
          status: 'error',
          error: e.message,
          info: { date: fallbackDate, type: '常规产检', week: null, hospital: '' },
        })
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', error: e.message } : f))
      }
    }

    // Group by date
    const groupedByDate = {}
    for (const r of results) {
      const date = r.info?.date || 'unknown'
      if (!groupedByDate[date]) {
        groupedByDate[date] = []
      }
      groupedByDate[date].push(r)
    }

    setGrouped(groupedByDate)
    setProcessing(false)
  }

  async function handleSaveAll() {
    if (!grouped) return
    setSaving(true)

    const settings = await storage.getSettings()
    const existingCheckups = await storage.getCheckups()
    let savedCount = 0
    let newCount = 0

    for (const [date, items] of Object.entries(grouped)) {
      // Get week from first item with valid week
      let week = null
      let bUltrasoundWeek = null
      for (const item of items) {
        if (item.info?.week && !week) week = item.info.week
        if (item.info?.bUltrasoundWeek && !bUltrasoundWeek) bUltrasoundWeek = item.info.bUltrasoundWeek
      }

      // Calculate week if not found
      if (!week) {
        const dueDate = settings.dueDate
        const due = parseISO(dueDate)
        const daysDiff = Math.floor((new Date(date) - due) / (1000 * 60 * 60 * 24))
        week = 40 - Math.floor(daysDiff / 7)
      }

      // Build new reports
      const newReports = await Promise.all(items.map(async (item) => {
        const reportId = uuidv4()
        const base64 = await fileToBase64(item.file)
        return {
          id: reportId,
          name: item.file.name.replace(/\.[^/.]+$/, ''),
          imageData: base64,
          isPdf: isPdf(item.file),
          mimeType: isPdf(item.file) ? 'application/pdf' : item.file.type,
        }
      }))

      // Check if checkup with same date already exists
      const existingCheckup = existingCheckups.find(c => c.date === date)

      if (existingCheckup) {
        // Merge into existing checkup - append new reports
        const updatedCheckup = {
          ...existingCheckup,
          reports: [...(existingCheckup.reports || []), ...newReports],
        }
        await storage.saveCheckup(updatedCheckup)
        savedCount++
        setSaved(savedCount + newCount)
      } else {
        // Create new checkup
        const checkupId = uuidv4()
        const checkup = {
          id: checkupId,
          date,
          week,
          hospital: items[0]?.info?.hospital || '霍山县医院',
          types: [items[0]?.info?.type || '常规产检'],
          notes: '',
          reports: newReports,
          createdAt: Date.now(),
        }
        await storage.saveCheckup(checkup)
        newCount++
        setSaved(savedCount + newCount)
      }
    }

    setSaving(false)
    // Navigate to checkups list after a short delay
    setTimeout(() => navigate('/checkups'), 1500)
  }

  function removeFile(id) {
    setFiles(prev => prev.filter(f => f.id !== id))
    if (grouped) {
      // Recalculate grouping
      const remaining = files.filter(f => f.id !== id)
      const groupedByDate = {}
      for (const item of remaining) {
        if (item.status !== 'done' && item.status !== 'error') continue
        const date = item.info?.date || 'unknown'
        if (!groupedByDate[date]) groupedByDate[date] = []
        groupedByDate[date].push(item)
      }
      setGrouped(Object.keys(groupedByDate).length > 0 ? groupedByDate : null)
    }
  }

  return (
    <div className="min-h-screen bg-rose-50 pb-nav">
      <Header title="批量上传产检报告" back />

      <div className="px-4 py-4 space-y-4">
        {/* File upload area */}
        <div className="bg-white rounded-2xl p-4">
          <label className="flex items-center justify-center gap-2 border-2 border-dashed border-rose-200 rounded-xl py-6 cursor-pointer active:bg-rose-50 transition-colors">
            <Upload size={24} className="text-rose-400" />
            <span className="text-rose-500 font-medium">点击选择文件（支持多选）</span>
            <input
              type="file"
              accept="image/*,.pdf,application/pdf"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              disabled={processing}
            />
          </label>
          <p className="text-xs text-slate-400 text-center mt-2">支持 JPG/PNG/PDF，可上传多张报告</p>
        </div>

        {/* File list */}
        {files.length > 0 && !grouped && (
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-slate-700">已选择 {files.length} 个文件</p>
              {!processing && (
                <button
                  onClick={startProcessing}
                  className="px-4 py-2 bg-rose-500 text-white rounded-xl text-sm active:bg-rose-600"
                >
                  开始分析
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {files.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl">
                  <FileText size={20} className={item.file.type.includes('pdf') ? 'text-red-400' : 'text-rose-400'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{item.file.name}</p>
                    <p className="text-xs text-slate-400">
                      {item.status === 'pending' && '等待分析'}
                      {item.status === 'analyzing' && '分析中...'}
                      {item.status === 'done' && (item.info?.date ? `日期: ${item.info.date}` : '已完成')}
                      {item.status === 'error' && `失败: ${item.error}`}
                    </p>
                  </div>
                  <button onClick={() => removeFile(item.id)} className="text-slate-400 active:text-rose-500">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Processing progress */}
        {processing && (
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="text-sm font-medium text-slate-700">正在分析报告...</p>
                <p className="text-xs text-slate-400">{progress.message}</p>
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-rose-500 h-2 rounded-full transition-all"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1 text-center">{progress.current} / {progress.total}</p>
          </div>
        )}

        {/* Grouped preview */}
        {grouped && !saving && (
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-slate-700">将创建 {Object.keys(grouped).length} 条产检记录</p>
              <button
                onClick={() => setGrouped(null)}
                className="text-sm text-rose-500 active:text-rose-600"
              >
                重新选择
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {Object.entries(grouped).sort((a, b) => new Date(b[0]) - new Date(a[0])).map(([date, items]) => (
                <div key={date} className="border border-slate-100 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={14} className="text-emerald-500" />
                    <span className="text-sm font-medium text-slate-700">{date}</span>
                    <span className="text-xs text-slate-400">({items.length}份报告)</span>
                  </div>
                  <div className="space-y-1">
                    {items.map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-2 text-xs text-slate-500">
                        {item.status === 'done' ? (
                          <CheckCircle size={12} className="text-emerald-400" />
                        ) : (
                          <AlertCircle size={12} className="text-amber-400" />
                        )}
                        <span className="truncate flex-1">{item.file.name}</span>
                        {item.info?.type && <span className="text-rose-400">{item.info.type}</span>}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-50 text-xs text-slate-400">
                    {items[0]?.info?.hospital || '霍山县医院'}
                    {items[0]?.info?.week && ` · 孕${items[0].info.week}周`}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveAll}
              className="w-full mt-4 py-3 bg-rose-500 text-white rounded-xl font-medium active:bg-rose-600 flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              确认保存（相同日期会自动合并）
            </button>
          </div>
        )}

        {/* Saving state */}
        {saving && (
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="text-sm font-medium text-slate-700">正在保存...</p>
                <p className="text-xs text-slate-400">保存中，同步到云端...</p>
              </div>
            </div>
          </div>
        )}

        {/* WeChat tip */}
        {/MicroMessenger|WeChat/i.test(navigator.userAgent) && (
          <p className="text-xs text-amber-500 text-center">
            提示：微信内置浏览器可能受限，建议用 Safari 或 Chrome 打开
          </p>
        )}
      </div>
    </div>
  )
}
