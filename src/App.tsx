import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { User, Calendar, Users, Settings, LogOut, Sparkles } from 'lucide-react'
import Login from './components/Login'
import Profile from './components/Profile'
import LeaveRequest from './components/LeaveRequest'
import StaffList from './components/StaffList'
import ShiftManagement from './components/ShiftManagement'
import './App.css'

type ViewType = 'profile' | 'leave-request' | 'staff-list' | 'shift-management'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState<ViewType>('shift-management')

  useEffect(() => {
    // 現在のセッションを取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // 認証状態の変化を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <span className="text-white text-xl font-medium">読み込み中...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  const navigationItems = [
    {
      id: 'shift-management' as ViewType,
      label: 'シフト管理',
      icon: Calendar,
      gradient: 'from-purple-500 to-pink-500',
      description: 'シフト生成・管理'
    },
    {
      id: 'leave-request' as ViewType,
      label: '休み希望',
      icon: Sparkles,
      gradient: 'from-blue-500 to-cyan-500',
      description: '休暇申請・カレンダー'
    },
    {
      id: 'staff-list' as ViewType,
      label: '職員一覧',
      icon: Users,
      gradient: 'from-green-500 to-emerald-500',
      description: 'スタッフ管理'
    },
    {
      id: 'profile' as ViewType,
      label: '職員情報',
      icon: User,
      gradient: 'from-orange-500 to-red-500',
      description: 'プロフィール設定'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* グラスモーフィズム ナビゲーションヘッダー */}
      <nav className="sticky top-0 z-50 bg-white/10 backdrop-blur-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* ロゴ・タイトル */}
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center shadow-lg">
                <Calendar className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                  シフト管理システム
                </h1>
                <p className="text-white/70 text-sm">次世代ワークフロー管理</p>
              </div>
            </div>

            {/* ユーザー情報 */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-right">
                <p className="text-white font-medium">{session.user.email}</p>
                <p className="text-white/60 text-sm">オンライン</p>
              </div>
              <div className="h-10 w-10 bg-gradient-to-br from-green-400 to-blue-400 rounded-xl flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <button
                onClick={() => supabase.auth.signOut()}
                className="h-10 w-10 bg-white/10 hover:bg-white/20 backdrop-blur-lg rounded-xl flex items-center justify-center transition-all duration-300 border border-white/20 hover:border-white/30"
              >
                <LogOut className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* メインナビゲーションカード */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = currentView === item.id
            
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`group relative overflow-hidden rounded-3xl p-6 transition-all duration-500 transform hover:scale-105 ${
                  isActive 
                    ? 'bg-white/20 backdrop-blur-xl border-2 border-white/40 shadow-2xl' 
                    : 'bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/15 hover:border-white/30'
                }`}
              >
                {/* グラデーション背景 */}
                <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500`}></div>
                
                {/* アクティブ時のグロー効果 */}
                {isActive && (
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-30 blur-xl`}></div>
                )}
                
                <div className="relative z-10">
                  <div className={`h-12 w-12 bg-gradient-to-br ${item.gradient} rounded-2xl flex items-center justify-center mb-4 shadow-lg transform transition-transform duration-300 ${
                    isActive ? 'scale-110' : 'group-hover:scale-105'
                  }`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  
                  <h3 className="text-lg font-bold text-white mb-1">{item.label}</h3>
                  <p className="text-white/70 text-sm">{item.description}</p>
                  
                  {/* アクティブインジケーター */}
                  {isActive && (
                    <div className="absolute top-4 right-4">
                      <div className="h-3 w-3 bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>

                {/* ホバー時のシマー効果 */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </div>
              </button>
            )
          })}
        </div>

        {/* メインコンテンツエリア */}
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
          <main>
            {currentView === 'profile' && <Profile session={session} />}
            {currentView === 'leave-request' && <LeaveRequest session={session} />}
            {currentView === 'shift-management' && <ShiftManagement session={session} />}
            {currentView === 'staff-list' && <StaffList session={session} />}
          </main>
        </div>
      </div>

      {/* 装飾的な背景要素 */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full filter blur-3xl opacity-70 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/30 rounded-full filter blur-3xl opacity-70 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/20 rounded-full filter blur-3xl opacity-50 animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>
    </div>
  )
}

export default App