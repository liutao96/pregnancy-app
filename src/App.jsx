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

export default function App() {
  return (
    <BrowserRouter>
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
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
