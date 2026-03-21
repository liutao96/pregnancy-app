import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronRight, FileText, Image } from 'lucide-react'
import Header from '../components/Header'
import { storage } from '../utils/storage'
import { getTrimesterLabel } from '../utils/pregnancyCalc'

export default function Checkups() {
  const [checkups, setCheckups] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    storage.getCheckups().then(c => {
      setCheckups(c)
      setLoading(false)
    })
  }, [])

  // Group by trimester
  const grouped = checkups.reduce((acc, c) => {
    const label = getTrimesterLabel(c.week)
    if (!acc[label]) acc[label] = []
    acc[label].push(c)
    return acc
  }, {})

  const order = ['孕晚期', '孕中期', '孕早期']
  const sortedGroups = order.filter(k => grouped[k])

  return (
    <div className="min-h-screen bg-rose-50 pb-nav">
      <Header
        title="孕检档案"
        right={
          <button
            onClick={() => navigate('/checkups/new')}
            className="flex items-center gap-1 bg-rose-500 text-white px-3 py-1.5 rounded-full text-sm font-medium active:bg-rose-600"
          >
            <Plus size={14} />
            <span>新增</span>
          </button>
        }
      />

      <div className="px-4 py-4">
        {loading ? (
          <p className="text-center text-slate-400 py-10">加载中...</p>
        ) : checkups.length === 0 ? (
          <EmptyState onAdd={() => navigate('/checkups/new')} />
        ) : (
          <div className="space-y-6">
            {sortedGroups.map(group => (
              <div key={group}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 px-1">
                  {group} · {grouped[group].length} 次
                </p>
                <div className="space-y-3">
                  {grouped[group].map(checkup => (
                    <CheckupCard
                      key={checkup.id}
                      checkup={checkup}
                      onClick={() => navigate(`/checkups/${checkup.id}`)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/checkups/new')}
        className="fixed bottom-20 right-5 w-14 h-14 bg-rose-500 text-white rounded-full shadow-lg flex items-center justify-center active:bg-rose-600 active:scale-95 transition-transform z-30"
        style={{ bottom: 'calc(68px + env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <Plus size={24} />
      </button>
    </div>
  )
}

function CheckupCard({ checkup, onClick }) {
  const hasReports = checkup.reports?.length > 0
  const hasAnalysis = checkup.reports?.some(r => r.aiAnalysis)

  return (
    <div
      className="bg-white rounded-2xl p-4 cursor-pointer active:bg-rose-50"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-medium">
              孕{checkup.week}周
            </span>
            {hasAnalysis && (
              <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                已解析
              </span>
            )}
          </div>
          <p className="font-semibold text-slate-800">{checkup.type || '常规产检'}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {checkup.date} · {checkup.hospital || '未填写医院'}
          </p>
          {checkup.notes && (
            <p className="text-xs text-slate-400 mt-1 truncate">{checkup.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-1 ml-3 flex-shrink-0">
          {hasReports && (
            <div className="flex items-center gap-1 text-slate-400">
              <Image size={14} />
              <span className="text-xs">{checkup.reports.length}</span>
            </div>
          )}
          <ChevronRight size={16} className="text-slate-300" />
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mb-4">
        <FileText size={28} className="text-rose-400" />
      </div>
      <p className="font-semibold text-slate-600 mb-1">暂无孕检记录</p>
      <p className="text-sm text-slate-400 mb-6">添加你的第一条产检记录，上传报告让AI为你解析</p>
      <button
        onClick={onAdd}
        className="bg-rose-500 text-white px-6 py-3 rounded-2xl font-medium active:bg-rose-600"
      >
        添加第一条记录
      </button>
    </div>
  )
}
