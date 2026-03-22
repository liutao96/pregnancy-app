import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Edit2, Trash2, Sparkles, ChevronDown, ChevronUp, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react'
import Header from '../components/Header'
import LoadingSpinner from '../components/LoadingSpinner'
import { storage } from '../utils/storage'
import { analyzeReport } from '../utils/ai'

export default function CheckupDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [checkup, setCheckup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analyzingId, setAnalyzingId] = useState(null)
  const [expandedReport, setExpandedReport] = useState(null)
  const [allCheckups, setAllCheckups] = useState([])

  useEffect(() => {
    async function load() {
      const [c, all] = await Promise.all([
        storage.getCheckupById(id),
        storage.getCheckups()
      ])
      setCheckup(c)
      setAllCheckups(all)
      setLoading(false)
      if (c?.reports?.length > 0) setExpandedReport(c.reports[0].id)
    }
    load()
  }, [id])

  async function analyzeReportItem(reportId) {
    setAnalyzingId(reportId)
    try {
      const report = checkup.reports.find(r => r.id === reportId)

      // Get previous analysis for context
      const prevCheckup = allCheckups.find(c =>
        c.id !== checkup.id &&
        new Date(c.date) < new Date(checkup.date) &&
        c.reports?.some(r => r.aiAnalysis)
      )
      const prevAnalysis = prevCheckup?.reports?.find(r => r.aiAnalysis)?.aiAnalysis?.summary

      const analysis = await analyzeReport(report.imageData, checkup.week, prevAnalysis)

      const updatedReports = checkup.reports.map(r =>
        r.id === reportId ? { ...r, aiAnalysis: analysis, analyzedAt: new Date().toISOString() } : r
      )
      const updatedCheckup = { ...checkup, reports: updatedReports }
      await storage.saveCheckup(updatedCheckup)
      setCheckup(updatedCheckup)
    } catch (e) {
      alert('解析失败：' + e.message)
    } finally {
      setAnalyzingId(null)
    }
  }

  async function handleDelete() {
    if (!confirm('确认删除这条产检记录？')) return
    await storage.deleteCheckup(id)
    navigate('/checkups', { replace: true })
  }

  if (loading) return <div className="min-h-screen bg-rose-50"><LoadingSpinner /></div>
  if (!checkup) return <div className="min-h-screen bg-rose-50 flex items-center justify-center"><p className="text-slate-400">记录不存在</p></div>

  return (
    <div className="min-h-screen bg-rose-50 pb-nav">
      <Header
        title="产检详情"
        back
        right={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/checkups/edit/${id}`)} className="p-1.5 text-slate-500 active:text-rose-500">
              <Edit2 size={17} />
            </button>
            <button onClick={handleDelete} className="p-1.5 text-slate-500 active:text-red-500">
              <Trash2 size={17} />
            </button>
          </div>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Info card */}
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-rose-50 text-rose-600 text-sm font-semibold px-3 py-1 rounded-full">
              孕{checkup.week}周
            </span>
            <span className="text-sm text-slate-500">{checkup.date}</span>
          </div>
          <h2 className="text-lg font-bold text-slate-800">{(checkup.types || checkup.type ? [checkup.type] : ['常规产检']).join('、')}</h2>
          {checkup.hospital && (
            <p className="text-sm text-slate-500 mt-1">{checkup.hospital}</p>
          )}
          {checkup.notes && (
            <div className="mt-3 p-3 bg-rose-50 rounded-xl">
              <p className="text-sm text-slate-600">{checkup.notes}</p>
            </div>
          )}
        </div>

        {/* Reports */}
        {checkup.reports?.length > 0 ? (
          <div className="space-y-4">
            {checkup.reports.map(report => (
              <ReportCard
                key={report.id}
                report={report}
                checkupWeek={checkup.week}
                isExpanded={expandedReport === report.id}
                onToggle={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
                onAnalyze={() => analyzeReportItem(report.id)}
                analyzing={analyzingId === report.id}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 text-center">
            <p className="text-slate-400 text-sm">暂无上传报告</p>
            <button
              onClick={() => navigate(`/checkups/edit/${id}`)}
              className="mt-3 text-rose-500 text-sm font-medium"
            >
              去上传报告
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ReportCard({ report, checkupWeek, isExpanded, onToggle, onAnalyze, analyzing }) {
  const { aiAnalysis } = report

  return (
    <div className="bg-white rounded-2xl overflow-hidden">
      {/* Report image */}
      <img
        src={`data:${report.mimeType || 'image/jpeg'};base64,${report.imageData}`}
        alt={report.name}
        className="w-full max-h-64 object-contain bg-slate-50"
      />

      {/* Report header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800">{report.name}</p>
            {report.analyzedAt && (
              <p className="text-xs text-slate-400 mt-0.5">
                已解析 · {new Date(report.analyzedAt).toLocaleDateString('zh-CN')}
              </p>
            )}
          </div>

          {!aiAnalysis ? (
            <button
              onClick={onAnalyze}
              disabled={analyzing}
              className="flex items-center gap-1.5 bg-rose-500 text-white px-3 py-2 rounded-xl text-sm font-medium active:bg-rose-600 disabled:opacity-60"
            >
              <Sparkles size={14} />
              <span>{analyzing ? '解析中...' : 'AI解析'}</span>
            </button>
          ) : (
            <button
              onClick={onToggle}
              className="p-2 text-slate-400 active:text-rose-500"
            >
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          )}
        </div>

        {/* Analysis summary always visible */}
        {aiAnalysis && (
          <div className="mt-3 p-3 bg-emerald-50 rounded-xl">
            <p className="text-sm text-emerald-700 font-medium">{aiAnalysis.examName}</p>
            <p className="text-xs text-emerald-600 mt-1">{aiAnalysis.summary}</p>
          </div>
        )}

        {/* Concerns */}
        {aiAnalysis?.concerns?.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {aiAnalysis.concerns.map((c, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 bg-amber-50 rounded-xl">
                <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">{c}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expanded analysis */}
      {aiAnalysis && isExpanded && (
        <div className="border-t border-rose-50 p-4 space-y-4">
          {/* Indicators table */}
          {aiAnalysis.indicators?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">指标详情</p>
              <div className="space-y-2">
                {aiAnalysis.indicators.map((ind, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-rose-50 last:border-0">
                    <StatusIcon status={ind.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-700">{ind.name}</p>
                        <p className={`text-sm font-semibold flex-shrink-0 ${
                          ind.status === 'normal' ? 'text-emerald-600' :
                          ind.status === 'warning' ? 'text-amber-600' : 'text-red-600'
                        }`}>{ind.value}</p>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">参考范围：{ind.reference}</p>
                      {ind.explanation && (
                        <p className="text-xs text-slate-500 mt-1">{ind.explanation}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {aiAnalysis.recommendations?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">建议</p>
              <div className="space-y-1.5">
                {aiAnalysis.recommendations.map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle size={14} className="text-rose-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-600">{r}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dad tips */}
          {aiAnalysis.dadTips?.length > 0 && (
            <div className="bg-violet-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-violet-600 mb-2">准爸爸贴士</p>
              <div className="space-y-1">
                {aiAnalysis.dadTips.map((t, i) => (
                  <p key={i} className="text-xs text-violet-700">· {t}</p>
                ))}
              </div>
            </div>
          )}

          {/* Re-analyze button */}
          <button
            onClick={onAnalyze}
            className="w-full py-2.5 border border-rose-200 rounded-xl text-sm text-rose-500 font-medium active:bg-rose-50 flex items-center justify-center gap-1.5"
          >
            <Sparkles size={14} />
            重新解析
          </button>
        </div>
      )}
    </div>
  )
}

function StatusIcon({ status }) {
  if (status === 'normal') return <CheckCircle size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
  if (status === 'warning') return <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
  return <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
}
