import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Header({ title, back = false, right = null, className = '' }) {
  const navigate = useNavigate()
  return (
    <header className={`sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-rose-50 ${className}`}>
      <div className="flex items-center h-14 px-4">
        {back && (
          <button
            onClick={() => navigate(-1)}
            className="mr-2 p-1.5 -ml-1.5 rounded-full text-slate-500 hover:bg-rose-50 active:bg-rose-100"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        <h1 className="flex-1 text-base font-semibold text-slate-800">{title}</h1>
        {right && <div>{right}</div>}
      </div>
    </header>
  )
}
