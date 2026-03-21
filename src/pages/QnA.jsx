import { useState, useEffect, useRef } from 'react'
import { Send, Trash2, Sparkles } from 'lucide-react'
import Header from '../components/Header'
import { storage } from '../utils/storage'
import { askQuestionStream } from '../utils/ai'
import { getCurrentWeek } from '../utils/pregnancyCalc'

const SUGGESTED_QUESTIONS = [
  '孕19周需要注意什么？',
  '孕中期胎动是什么感觉，什么时候能感受到？',
  '孕期腰酸背痛怎么缓解？',
  '哪些食物孕期绝对不能吃？',
  '什么时候需要立即去医院？',
  '准爸爸怎么更好地陪伴妻子？',
  '孕期可以同房吗？',
  '水肿严重怎么办？',
]

export default function QnA() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [settings, setSettings] = useState(null)
  const [currentWeek, setCurrentWeek] = useState(19)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    async function load() {
      const [s, history] = await Promise.all([
        storage.getSettings(),
        storage.getQAHistory()
      ])
      setSettings(s)
      setCurrentWeek(getCurrentWeek(s.dueDate, new Date(), s))
      setMessages(history)
    }
    load()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text) {
    const q = text || input.trim()
    if (!q || sending) return

    const userMsg = { role: 'user', content: q }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setSending(true)

    // Add empty assistant message
    const assistantMsg = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const context = {
        week: currentWeek,
        dueDate: settings?.dueDate,
        babyNickname: settings?.babyNickname || '宝宝',
      }

      // Build history without the empty assistant msg
      const historyForAI = updatedMessages.map(m => ({ role: m.role, content: m.content }))

      let fullContent = ''
      await askQuestionStream(q, historyForAI, context, (delta, full) => {
        fullContent = full
        setMessages(prev => {
          const msgs = [...prev]
          msgs[msgs.length - 1] = { role: 'assistant', content: full }
          return msgs
        })
      })

      const finalMessages = [...updatedMessages, { role: 'assistant', content: fullContent }]
      await storage.saveQAHistory(finalMessages)
    } catch (e) {
      setMessages(prev => {
        const msgs = [...prev]
        msgs[msgs.length - 1] = { role: 'assistant', content: `抱歉，出错了：${e.message}` }
        return msgs
      })
    } finally {
      setSending(false)
    }
  }

  async function clearHistory() {
    if (!confirm('确认清空所有对话记录？')) return
    await storage.clearQAHistory()
    setMessages([])
  }

  return (
    <div className="flex flex-col min-h-screen bg-rose-50">
      <Header
        title="孕期问答"
        right={
          messages.length > 0 && (
            <button onClick={clearHistory} className="p-1.5 text-slate-400 active:text-rose-500">
              <Trash2 size={17} />
            </button>
          )
        }
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32 space-y-4">
        {messages.length === 0 && (
          <div className="pt-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-rose-100 rounded-3xl flex items-center justify-center mx-auto mb-3">
                <Sparkles size={28} className="text-rose-400" />
              </div>
              <p className="font-semibold text-slate-700">孕期AI顾问</p>
              <p className="text-sm text-slate-400 mt-1">随时解答你的孕期疑问</p>
              <p className="text-xs text-slate-300 mt-1">当前孕周：第{currentWeek}周</p>
            </div>

            <p className="text-xs font-medium text-slate-400 mb-3">你可以问我：</p>
            <div className="space-y-2">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="w-full text-left px-4 py-3 bg-white rounded-xl text-sm text-slate-600 active:bg-rose-50 border border-rose-100"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {/* Suggestions after conversation */}
        {messages.length > 0 && !sending && (
          <div className="pt-2">
            <p className="text-xs text-slate-400 mb-2">相关问题：</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.slice(0, 3).map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="text-xs bg-white text-rose-500 border border-rose-100 px-3 py-1.5 rounded-full active:bg-rose-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-rose-100 px-4 py-3 safe-bottom"
        style={{ paddingBottom: 'calc(68px + env(safe-area-inset-bottom, 0px) + 8px)', maxWidth: 480, margin: '0 auto', left: '50%', transform: 'translateX(-50%)', width: '100%' }}>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="输入你的问题..."
            className="flex-1 bg-rose-50 rounded-2xl px-4 py-3 text-sm outline-none text-slate-700 placeholder-slate-300"
            disabled={sending}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || sending}
            className="w-10 h-10 bg-rose-500 text-white rounded-2xl flex items-center justify-center active:bg-rose-600 disabled:opacity-40 flex-shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-1">
          <Sparkles size={14} className="text-rose-500" />
        </div>
      )}
      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-rose-500 text-white rounded-tr-sm'
            : 'bg-white text-slate-700 rounded-tl-sm shadow-sm'
        }`}
      >
        {message.content ? (
          <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'text-white' : 'text-slate-700'}`}>
            {message.content}
          </p>
        ) : (
          <div className="flex gap-1 py-1">
            <span className="w-1.5 h-1.5 bg-rose-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-rose-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-rose-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
    </div>
  )
}
