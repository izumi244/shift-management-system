import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Calendar, Mail, Lock, LogIn, UserPlus, Eye, EyeOff, Sparkles, Shield, Zap } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isLogin, setIsLogin] = useState(true) // ログイン/サインアップの切り替え
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('確認メールを送信しました。メールボックスを確認してください。')
      console.log('サインアップ成功:', data)
    }
    setLoading(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage(error.message)
    } else {
      console.log('ログイン成功:', data)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* 装飾的な背景要素 */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full filter blur-3xl opacity-70 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/30 rounded-full filter blur-3xl opacity-70 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/20 rounded-full filter blur-3xl opacity-50 animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-3xl flex items-center justify-center shadow-2xl">
              <Calendar className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent mb-2">
            シフト管理システム
          </h1>
          <p className="text-white/70 text-lg">
            次世代ワークフロー管理
          </p>
          <div className="mt-6 flex items-center justify-center space-x-8">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-yellow-400" />
              <span className="text-white/60 text-sm">AI搭載</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-green-400" />
              <span className="text-white/60 text-sm">セキュア</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-blue-400" />
              <span className="text-white/60 text-sm">高速</span>
            </div>
          </div>
        </div>

        {/* メインフォームカード */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
          {/* タブヘッダー */}
          <div className="flex bg-white/5">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-4 px-6 text-center font-semibold transition-all duration-300 ${
                isLogin 
                  ? 'bg-white/10 text-white border-b-2 border-blue-400' 
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <LogIn className="h-5 w-5" />
                <span>ログイン</span>
              </div>
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-4 px-6 text-center font-semibold transition-all duration-300 ${
                !isLogin 
                  ? 'bg-white/10 text-white border-b-2 border-purple-400' 
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <UserPlus className="h-5 w-5" />
                <span>新規登録</span>
              </div>
            </button>
          </div>

          {/* フォームコンテンツ */}
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                {isLogin ? 'アカウントにサインイン' : '新規アカウントを作成'}
              </h2>
              <p className="text-white/60">
                {isLogin ? 'お帰りなさい！ログインしてシフト管理を開始' : 'アカウントを作成してシフト管理を始めましょう'}
              </p>
            </div>

            {/* メッセージ表示 */}
            {message && (
              <div className={`mb-6 p-4 rounded-2xl backdrop-blur-lg border ${
                message.includes('確認メール') || message.includes('成功')
                  ? 'bg-green-500/20 border-green-400/30 text-green-100'
                  : 'bg-red-500/20 border-red-400/30 text-red-100'
              }`}>
                <div className="flex items-center space-x-2">
                  {message.includes('確認メール') || message.includes('成功') ? (
                    <Sparkles className="h-5 w-5" />
                  ) : (
                    <Shield className="h-5 w-5" />
                  )}
                  <span className="font-medium">{message}</span>
                </div>
              </div>
            )}

            <form className="space-y-6" onSubmit={isLogin ? handleLogin : handleSignUp}>
              {/* メールアドレス */}
              <div className="space-y-2">
                <label htmlFor="email" className="flex items-center space-x-2 text-white font-semibold">
                  <Mail className="h-5 w-5 text-blue-400" />
                  <span>メールアドレス</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-6 py-4 bg-white/90 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 transition-all duration-200"
                  placeholder="your@email.com"
                />
              </div>

              {/* パスワード */}
              <div className="space-y-2">
                <label htmlFor="password" className="flex items-center space-x-2 text-white font-semibold">
                  <Lock className="h-5 w-5 text-purple-400" />
                  <span>パスワード</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-6 py-4 pr-14 bg-white/90 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500 transition-all duration-200"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* 送信ボタン */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 px-8 rounded-2xl font-semibold text-lg shadow-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                    isLogin
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white focus:ring-blue-500'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white focus:ring-purple-500'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      <span>{isLogin ? 'ログイン中...' : 'アカウント作成中...'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-3">
                      {isLogin ? (
                        <>
                          <LogIn className="h-6 w-6" />
                          <span>ログイン</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-6 w-6" />
                          <span>アカウント作成</span>
                        </>
                      )}
                    </div>
                  )}
                </button>
              </div>
            </form>

            {/* フッター */}
            <div className="mt-8 text-center">
              <p className="text-white/60 text-sm">
                {isLogin ? 'まだアカウントをお持ちでない方は' : 'すでにアカウントをお持ちの方は'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setMessage('')
                }}
                className="mt-2 text-white font-semibold hover:text-blue-300 transition-colors duration-200"
              >
                {isLogin ? 'アカウントを作成' : 'ログインに戻る'}
              </button>
            </div>
          </div>
        </div>

        {/* フッター情報 */}
        <div className="mt-8 text-center">
          <p className="text-white/40 text-sm">
            © 2025 シフト管理システム. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}