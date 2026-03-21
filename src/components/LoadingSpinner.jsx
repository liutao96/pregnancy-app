export default function LoadingSpinner({ text = '加载中...', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 ${className}`}>
      <div className="w-8 h-8 border-3 border-rose-200 border-t-rose-500 rounded-full animate-spin"
        style={{ borderWidth: 3 }} />
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  )
}

export function InlineSpinner({ size = 16 }) {
  return (
    <span
      className="inline-block border-2 border-current border-t-transparent rounded-full animate-spin opacity-60"
      style={{ width: size, height: size }}
    />
  )
}
