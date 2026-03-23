import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Dashboard from './pages/Dashboard'
import Checkups from './pages/Checkups'
import CheckupForm from './pages/CheckupForm'
import CheckupDetail from './pages/CheckupDetail'
import WeeklyGuide from './pages/WeeklyGuide'
import QnA from './pages/QnA'
import Products from './pages/Products'
import MealPlan from './pages/MealPlan'
import More from './pages/More'
import Preparation from './pages/Preparation'
import Postpartum from './pages/Postpartum'
import Settings from './pages/Settings'
import BatchUpload from './pages/BatchUpload'
import NamingCenter from './pages/NamingCenter'
import FormalName from './pages/FormalName'
import Nickname from './pages/Nickname'
import { storage } from './utils/storage'

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    storage.init().finally(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">正在同步数据...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter basename="/pregnancy-app">
      <div className="relative">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/checkups" element={<Checkups />} />
          <Route path="/checkups/new" element={<CheckupForm />} />
          <Route path="/checkups/edit/:id" element={<CheckupForm />} />
          <Route path="/checkups/:id" element={<CheckupDetail />} />
          <Route path="/weekly" element={<WeeklyGuide />} />
          <Route path="/qa" element={<QnA />} />
          <Route path="/products" element={<Products />} />
          <Route path="/meal" element={<MealPlan />} />
          <Route path="/more" element={<More />} />
          <Route path="/preparation" element={<Preparation />} />
          <Route path="/postpartum" element={<Postpartum />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/checkups/batch" element={<BatchUpload />} />
          <Route path="/naming" element={<NamingCenter />} />
          <Route path="/naming/formal" element={<FormalName />} />
          <Route path="/naming/nickname" element={<Nickname />} />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
