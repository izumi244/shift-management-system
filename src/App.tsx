import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import Login from './components/Login'
import Profile from './components/Profile'
import LeaveRequest from './components/LeaveRequest'
import StaffList from './components/StaffList'
import './App.css'

type ViewType = 'profile' | 'leave-request' | 'staff-list'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState<ViewType>('profile')

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">読み込み中...</div>
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  // ログイン後のナビゲーション付きメイン画面
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ナビゲーションヘッダー */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">
                  シフト管理システム
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <button
                  onClick={() => setCurrentView('profile')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    currentView === 'profile'
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  職員情報
                </button>
                <button
                  onClick={() => setCurrentView('leave-request')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    currentView === 'leave-request'
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  休み希望
                </button>
                <button
                  onClick={() => setCurrentView('staff-list')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    currentView === 'staff-list'
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  職員一覧
                </button>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4">
                {session.user.email}
              </span>
              <button
                onClick={() => supabase.auth.signOut()}
                className="bg-gray-600 text-white text-sm px-3 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* モバイル用ナビゲーション */}
      <div className="sm:hidden bg-white border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setCurrentView('profile')}
            className={`flex-1 py-3 px-2 text-center text-sm font-medium ${
              currentView === 'profile'
                ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            職員情報
          </button>
          <button
            onClick={() => setCurrentView('leave-request')}
            className={`flex-1 py-3 px-2 text-center text-sm font-medium ${
              currentView === 'leave-request'
                ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            休み希望
          </button>
          <button
            onClick={() => setCurrentView('staff-list')}
            className={`flex-1 py-3 px-2 text-center text-sm font-medium ${
              currentView === 'staff-list'
                ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            職員一覧
          </button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <main>
        {currentView === 'profile' && <Profile session={session} />}
        {currentView === 'leave-request' && <LeaveRequest session={session} />}
        {currentView === 'staff-list' && <StaffList session={session} />}
      </main>
    </div>
  )
}

export default App