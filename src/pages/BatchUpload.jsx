import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, X, FileText, CheckCircle, AlertCircle, RefreshCw, MessageSquare, Send, Sparkles } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { parseISO } from 'date-fns'
import Header from '../components/Header'
import { storage } from '../utils/storage'
import { extractCheckupInfo, analyzeReport, askAboutReports } from '../utils/ai'

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
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0, message: '' })

  // Results state
  const [results, setResults] = useState(null) // [{ checkup, success, error }]
  const [regeneratingId, setRegeneratingId] = useState(null)

  // Q&A state
  const [selectedCheckup, setSelectedCheckup] = useState(null)
  const [qaQuestion, setQaQuestion] = useState('')
  const [qaAnswer, setQaAnswer] = useState('')
  const [qaLoading, setQaLoading] = useState(false)

  async function handleFileSelect(e) {
    const selected = Array.from(e.target.files)
    if (!selected.length) return

    const newFiles = selected.map(file => ({
      file,
      id: uuidv4(),
      status: 'pending',
      info: null,
      error: null,
    }))
    setFiles(prev => [...prev, ...newFiles])
  }

  async function startProcessing() {
    setProcessing(true)
    setProgress({ current: 0, total: files.length, message: '提取报告中...' })

    const results = []

    for (let i = 0; i < files.length; i++) {
      const item = files[i]
      setProgress({ current: i + 1, total: files.length, message: `提取第${i + 1}张...` })

      try {
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'analyzing' } : f))

        // PDF文件不支持AI图像识别，跳过信息提取
        if (isPdf(item.file)) {
          const fallbackDate = new Date().toISOString().split('T')[0]
          results.push({
            ...item,
            status: 'done',
            info: { date: fallbackDate, type: '常规产检', week: null, hospital: '', confidence: 'low' },
          })
          setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'done', info: { date: fallbackDate, type: '常规产检', week: null, hospital: '', confidence: 'low' } } : f))
          continue
        }

        const base64 = await fileToBase64(item.file)
        const info = await extractCheckupInfo(base64)

        let date = info.date
        if (!date) {
          const nameMatch = item.file.name.match(/(\d{4}[-_]\d{1,2}[-_]\d{1,2})/)
          if (nameMatch) {
            date = nameMatch[1].replace(/_/g, '-')
          }
        }

        const finalDate = date || new Date().toISOString().split('T')[0]
        results.push({
          ...item,
          status: 'done',
          info: { ...info, date: finalDate },
        })
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'done', info: { ...info, date: finalDate } } : f))
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
      if (!groupedByDate[date]) groupedByDate[date] = []
      groupedByDate[date].push(r)
    }

    setGrouped(groupedByDate)
    setProcessing(false)
  }

  async function handleSaveAll() {
    if (!grouped) return
    setSaving(true)
    setResults(null)

    const settings = await storage.getSettings()
    const existingCheckups = await storage.getCheckups()
    const allCheckups = []

    // First pass: save all checkup records with reports (without aiSummary yet)
    for (const [date, items] of Object.entries(grouped)) {
      setSaveProgress({ current: 0, total: Object.keys(grouped).length, message: `保存 ${date}...` })

      let week = null
      for (const item of items) {
        if (item.info?.week && !week) week = item.info.week
      }

      // 如果没有识别出孕周，根据报告日期和预产期计算
      if (!week && settings.dueDate) {
        try {
          const dueDate = parseISO(settings.dueDate)
          const checkupDate = new Date(date)
          // 计算预产期还有多少天
          const daysUntilDue = Math.floor((dueDate.getTime() - checkupDate.getTime()) / (1000 * 60 * 60 * 24))
          // 孕周 = 40 - 距离预产期的周数
          week = Math.max(1, Math.min(45, 40 - Math.floor(daysUntilDue / 7)))
        } catch (e) {
          console.log('Week calculation failed:', e)
        }
      }

      // 如果仍然没有孕周，使用默认值1（用户需要手动修改）
      if (!week) {
        week = 1
      }

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

      const existingCheckup = existingCheckups.find(c => c.date === date)

      if (existingCheckup) {
        const updatedCheckup = {
          ...existingCheckup,
          reports: [...(existingCheckup.reports || []), ...newReports],
        }
        await storage.saveCheckup(updatedCheckup)
        allCheckups.push({ checkup: updatedCheckup, isNew: false })
      } else {
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
        allCheckups.push({ checkup, isNew: true })
      }
    }

    // Second pass: generate AI analysis for each checkup
    const resultsWithAnalysis = []
    for (let i = 0; i < allCheckups.length; i++) {
      const { checkup } = allCheckups[i]
      setSaveProgress({ current: i + 1, total: allCheckups.length, message: `分析 ${checkup.date}...` })

      try {
        // Get historical checkups for comparison
        const historical = (await storage.getCheckups())
          .filter(c => c.aiSummary && c.id !== checkup.id)
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 5)

        // Analyze each image report
        const imageReports = checkup.reports?.filter(r => !r.isPdf) || []
        const allAnalyses = []

        for (const report of imageReports) {
          try {
            const analysis = await analyzeReport(report.imageData, checkup.week, historical)
            allAnalyses.push({ ...analysis, reportId: report.id })
          } catch (e) {
            console.log('Report analysis failed:', e.message)
          }
        }

        // Combine analyses
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

        const aiSummary = {
          examName: allAnalyses.length > 1
            ? `综合分析（${allAnalyses.length}份报告）`
            : allAnalyses[0]?.examName || '产检报告',
          summary: summaries.filter(s => s).join('\n'),
          indicators: combinedIndicators,
          recommendations: combinedRecommendations,
          reportAnalyses: allAnalyses,
          generatedAt: Date.now(),
        }

        // Update checkup with aiSummary
        const updatedCheckup = { ...checkup, aiSummary }
        await storage.saveCheckup(updatedCheckup)
        resultsWithAnalysis.push({ checkup: updatedCheckup, success: true })
      } catch (e) {
        console.log('Analysis failed for checkup:', checkup.date, e.message)
        resultsWithAnalysis.push({ checkup, success: false, error: e.message })
      }
    }

    setSaving(false)
    setResults(resultsWithAnalysis)
    setSaveProgress({ current: 0, total: 0, message: '' })
  }

  async function handleRegenerate(checkupId) {
    setRegeneratingId(checkupId)
    try {
      const checkup = await storage.getCheckupById(checkupId)
      if (!checkup) return

      const historical = (await storage.getCheckups())
        .filter(c => c.aiSummary && c.id !== checkupId)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5)

      const imageReports = checkup.reports?.filter(r => !r.isPdf) || []
      const allAnalyses = []

      for (const report of imageReports) {
        const analysis = await analyzeReport(report.imageData, checkup.week, historical)
        allAnalyses.push({ ...analysis, reportId: report.id })
      }

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

      const aiSummary = {
        examName: allAnalyses.length > 1
          ? `综合分析（${allAnalyses.length}份报告）`
          : allAnalyses[0]?.examName || '产检报告',
        summary: summaries.filter(s => s).join('\n'),
        indicators: combinedIndicators,
        recommendations: combinedRecommendations,
        reportAnalyses: allAnalyses,
        generatedAt: Date.now(),
      }

      const updatedCheckup = { ...checkup, aiSummary }
      await storage.saveCheckup(updatedCheckup)

      setResults(prev => prev.map(r =>
        r.checkup.id === checkupId ? { ...r, checkup: updatedCheckup } : r
      ))
    } catch (e) {
      console.log('Regenerate failed:', e.message)
    } finally {
      setRegeneratingId(null)
    }
  }

  async function handleQa() {
    if (!qaQuestion.trim() || !selectedCheckup) return
    setQaLoading(true)
    setQaAnswer('')

    try {
      const answer = await askAboutReports(selectedCheckup, qaQuestion)
      setQaAnswer(answer)
    } catch (e) {
      setQaAnswer('抱歉，解答失败：' + e.message)
    } finally {
      setQaLoading(false)
    }
  }

  function removeFile(id) {
    setFiles(prev => prev.filter(f => f.id !== id))
    if (grouped) {
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
              disabled={processing || saving}
            />
          </label>
          <p className="text-xs text-slate-400 text-center mt-2">支持 JPG/PNG/PDF，可上传多张报告</p>
        </div>

        {/* File list */}
        {files.length > 0 && !grouped && !saving && (
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
                <p className="text-sm font-medium text-slate-700">正在提取报告信息...</p>
                <p className="text-xs text-slate-400">{progress.message}</p>
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-rose-500 h-2 rounded-full transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-1 text-center">{progress.current} / {progress.total}</p>
          </div>
        )}

        {/* Grouped preview */}
        {grouped && !saving && !results && (
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-slate-700">将创建 {Object.keys(grouped).length} 条产检记录</p>
              <button onClick={() => setGrouped(null)} className="text-sm text-rose-500 active:text-rose-600">
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
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-xs text-slate-500">
                        {item.status === 'done' ? <CheckCircle size={12} className="text-emerald-400" /> : <AlertCircle size={12} className="text-amber-400" />}
                        <span className="truncate flex-1">{item.file.name}</span>
                        {item.info?.type && <span className="text-rose-400">{item.info.type}</span>}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-50 text-xs text-slate-400">
                    {items[0]?.info?.hospital || '霍山县医院'}
                    {items[0]?.info?.week ? (
                      <span className="text-rose-400"> · 孕{items[0].info.week}周</span>
                    ) : (
                      <span className="text-amber-500"> · 孕周待确认</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleSaveAll}
              className="w-full mt-4 py-3 bg-rose-500 text-white rounded-xl font-medium active:bg-rose-600 flex items-center justify-center gap-2"
            >
              <Sparkles size={18} />
              保存并生成报告解析
            </button>
          </div>
        )}

        {/* Saving state */}
        {saving && (
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="text-sm font-medium text-slate-700">正在保存并生成报告解析...</p>
                <p className="text-xs text-slate-400">{saveProgress.message}</p>
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-rose-500 h-2 rounded-full transition-all" style={{ width: `${(saveProgress.current / saveProgress.total) * 100}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-1 text-center">{saveProgress.current} / {saveProgress.total}</p>
          </div>
        )}

        {/* Results */}
        {results && !saving && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-slate-700">已处理 {results.length} 条产检记录</p>
                <button onClick={() => { setResults(null); setGrouped(null); setFiles([]) }} className="text-sm text-rose-500">
                  上传更多
                </button>
              </div>
            </div>

            {results.map(({ checkup, success, error }) => {
              const hasAiSummary = checkup.aiSummary && checkup.aiSummary.summary
              return (
              <div key={checkup.id} className="bg-white rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-slate-700">{checkup.date}</p>
                    <p className="text-xs text-slate-400">
                      {checkup.reports?.length || 0}份报告 · 孕{checkup.week}周
                      {!hasAiSummary && <span className="text-amber-500 ml-1">· 待生成报告解析</span>}
                    </p>
                  </div>
                  {hasAiSummary ? (
                    <CheckCircle size={20} className="text-emerald-500" />
                  ) : (
                    <AlertCircle size={20} className="text-amber-500" />
                  )}
                </div>

                {hasAiSummary && (
                  <div className="space-y-2 mb-3">
                    {checkup.aiSummary.summary && (
                      <div className="p-3 bg-violet-50 rounded-xl">
                        <p className="text-sm text-violet-700">{checkup.aiSummary.summary}</p>
                      </div>
                    )}
                    {checkup.aiSummary.indicators?.length > 0 && (
                      <div className="space-y-1">
                        {checkup.aiSummary.indicators.slice(0, 3).map((ind, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className={`w-1.5 h-1.5 rounded-full ${ind.status === 'normal' ? 'bg-green-400' : ind.status === 'warning' ? 'bg-amber-400' : 'bg-red-400'}`} />
                            <span className="text-slate-600">{ind.name}: {ind.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <p className="text-xs text-red-500 mb-2">分析失败: {error}</p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleRegenerate(checkup.id)}
                    disabled={regeneratingId === checkup.id}
                    className="flex-1 py-2 bg-rose-50 text-rose-500 rounded-xl text-sm flex items-center justify-center gap-1 active:bg-rose-100 disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={regeneratingId === checkup.id ? 'animate-spin' : ''} />
                    {regeneratingId === checkup.id ? '重新生成中...' : '重新生成'}
                  </button>
                  <button
                    onClick={() => { setSelectedCheckup(checkup); setQaQuestion(''); setQaAnswer('') }}
                    className="flex-1 py-2 bg-violet-50 text-violet-500 rounded-xl text-sm flex items-center justify-center gap-1 active:bg-violet-100"
                  >
                    <MessageSquare size={14} />
                    提问
                  </button>
                </div>

                {selectedCheckup?.id === checkup.id && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-2">关于此报告提问：</p>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={qaQuestion}
                        onChange={e => setQaQuestion(e.target.value)}
                        placeholder="例如：这个报告有什么需要注意的吗？"
                        className="flex-1 px-3 py-2 bg-slate-50 rounded-xl text-sm"
                        onKeyDown={e => e.key === 'Enter' && handleQa()}
                      />
                      <button
                        onClick={handleQa}
                        disabled={qaLoading}
                        className="px-3 py-2 bg-rose-500 text-white rounded-xl disabled:opacity-50"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                    {qaLoading && (
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                        分析中...
                      </div>
                    )}
                    {qaAnswer && (
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{qaAnswer}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
