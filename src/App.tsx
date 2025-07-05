import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { User, Calendar, Users, LogOut, Sparkles } from 'lucide-react'
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 border border-blue-200/50 shadow-2xl">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="text-gray-700 text-xl font-medium">読み込み中...</span>
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
      gradient: 'from-blue-400 via-indigo-400 to-purple-400',
      shadowColor: 'shadow-blue-500/30',
      description: 'シフト生成・管理'
    },
    {
      id: 'leave-request' as ViewType,
      label: '休み希望',
      icon: Sparkles,
      gradient: 'from-pink-400 via-rose-400 to-red-400',
      shadowColor: 'shadow-pink-500/30',
      description: '休暇申請・カレンダー'
    },
    {
      id: 'staff-list' as ViewType,
      label: '職員一覧',
      icon: Users,
      gradient: 'from-green-400 via-emerald-400 to-teal-400',
      shadowColor: 'shadow-green-500/30',
      description: 'スタッフ管理'
    },
    {
      id: 'profile' as ViewType,
      label: '職員情報',
      icon: User,
      gradient: 'from-purple-400 via-violet-400 to-indigo-400',
      shadowColor: 'shadow-purple-500/30',
      description: 'プロフィール設定'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* 動的背景パターン */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/4 left-1/6 w-72 h-72 bg-gradient-to-br from-blue-300 to-indigo-300 rounded-full filter blur-3xl opacity-60 animate-pulse"></div>
          <div className="absolute top-3/4 right-1/6 w-96 h-96 bg-gradient-to-br from-pink-300 to-rose-300 rounded-full filter blur-3xl opacity-50 animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-gradient-to-br from-purple-300 to-violet-300 rounded-full filter blur-3xl opacity-40 animate-pulse" style={{animationDelay: '4s'}}></div>
        </div>
      </div>

      {/* グラスモーフィズム ナビゲーションヘッダー */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* ロゴ・タイトル */}
            <div className="flex items-center space-x-4">
              <div className="relative h-12 w-12 group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-400 rounded-2xl shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-300"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-300 to-purple-300 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
                <div className="relative z-10 h-full w-full flex items-center justify-center">
                  <Calendar className="h-7 w-7 text-white drop-shadow-lg" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-700 via-blue-600 to-purple-600 bg-clip-text text-transparent drop-shadow-sm">
                  シフト管理システム
                </h1>
                <p className="text-gray-600/80 text-sm font-medium">Modern Workflow Management</p>
              </div>
            </div>

            {/* ユーザー情報 */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-right">
                <p className="text-gray-700 font-medium">{session.user.email}</p>
                <p className="text-gray-500/70 text-sm flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                  オンライン
                </p>
              </div>
              <div className="relative h-10 w-10 group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-300"></div>
                <div className="relative z-10 h-full w-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
              </div>
              <button
                onClick={() => supabase.auth.signOut()}
                className="relative h-10 w-10 bg-white/60 hover:bg-white/80 backdrop-blur-lg rounded-xl flex items-center justify-center transition-all duration-300 border border-gray-200/50 hover:border-gray-300/50 group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <LogOut className="h-5 w-5 text-gray-600 relative z-10" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* メインナビゲーションカード */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
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
                    ? 'bg-white/90 backdrop-blur-xl border-2 border-gray-300/60 shadow-2xl shadow-gray-500/20' 
                    : 'bg-white/60 backdrop-blur-lg border border-gray-200/50 hover:bg-white/80 hover:border-gray-300/50 hover:shadow-xl hover:shadow-gray-500/10'
                }`}
              >
                {/* 動的グラデーション背景 */}
                <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-10 transition-all duration-500`}></div>
                
                {/* アクティブ時のオーラ効果 */}
                {isActive && (
                  <>
                    <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-10 blur-xl`}></div>
                    <div className={`absolute -inset-1 bg-gradient-to-br ${item.gradient} opacity-20 blur-2xl`}></div>
                  </>
                )}
                
                <div className="relative z-10">
                  <div className={`relative h-12 w-12 mb-4 group-hover:mb-5 transition-all duration-300 ${
                    isActive ? 'scale-110' : 'group-hover:scale-105'
                  }`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} rounded-2xl ${item.shadowColor} shadow-lg transform transition-all duration-300`}></div>
                    <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} rounded-2xl opacity-0 group-hover:opacity-50 transition-opacity duration-300 blur-sm`}></div>
                    <div className="relative z-10 h-full w-full flex items-center justify-center">
                      <Icon className="h-6 w-6 text-white drop-shadow-lg" />
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-700 mb-1 group-hover:text-gray-800 transition-colors duration-300">{item.label}</h3>
                  <p className="text-gray-500/70 text-sm group-hover:text-gray-600/80 transition-colors duration-300">{item.description}</p>
                  
                  {/* アクティブインジケーター */}
                  {isActive && (
                    <div className="absolute top-4 right-4">
                      <div className="relative">
                        <div className="h-3 w-3 bg-blue-400 rounded-full animate-pulse"></div>
                        <div className="absolute inset-0 h-3 w-3 bg-blue-400 rounded-full animate-ping opacity-75"></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ホバー時のシマー効果 */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </div>

                {/* ボーダーライト効果 */}
                <div className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 border bg-gradient-to-br ${item.gradient} p-px`}>
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-transparent via-white/10 to-transparent"></div>
                </div>
              </button>
            )
          })}
        </div>

        {/* メインコンテンツエリア */}
        <div className="relative">
          {/* コンテンツ背景のオーラ効果 */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-3xl blur-3xl"></div>
          
          <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 shadow-2xl shadow-gray-500/10 overflow-hidden">
            {/* コンテンツ上部のライト効果 */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"></div>
            
            <main className="relative z-10">
              {currentView === 'profile' && <Profile session={session} />}
              {currentView === 'leave-request' && <LeaveRequest session={session} />}
              {currentView === 'shift-management' && <ShiftManagement session={session} />}
              {currentView === 'staff-list' && <StaffList session={session} />}
            </main>
          </div>
        </div>
      </div>

      {/* 浮遊する装飾要素 */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        {/* 回転する装飾リング */}
        <div className="absolute top-1/4 right-1/4 w-64 h-64 border border-blue-200/30 rounded-full animate-spin" style={{animationDuration: '20s'}}></div>
        <div className="absolute bottom-1/3 left-1/5 w-48 h-48 border border-pink-200/30 rounded-full animate-spin" style={{animationDuration: '15s', animationDirection: 'reverse'}}></div>
        
        {/* グリッド背景 */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}></div>
        </div>
      </div>
    </div>
  )
}

export default App