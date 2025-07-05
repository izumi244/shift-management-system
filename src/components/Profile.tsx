import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { User, Mail, Briefcase, Calendar, Save, CheckCircle, AlertCircle, Edit3, Shield } from 'lucide-react'

interface ProfileForm {
  name: string
  email: string
  role: string
}

interface ProfileProps {
  session: Session
}

export default function Profile({ session }: ProfileProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<ProfileForm>()

  // フォームの値を監視
  const watchedValues = watch()

  // 現在のユーザー情報を取得
  useEffect(() => {
    getProfile()
  }, [])

  const getProfile = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('users')
        .select('name, email, role')
        .eq('id', session.user.id)
        .single()

      if (error) {
        // ユーザーが存在しない場合は初期データを作成
        if (error.code === 'PGRST116') {
          await createInitialProfile()
        } else {
          throw error
        }
      } else {
        // フォームに既存データを設定
        setValue('name', data.name || '')
        setValue('email', data.email || session.user.email || '')
        setValue('role', data.role || '')
      }
    } catch (error) {
      console.error('プロフィール取得エラー:', error)
      setMessage('プロフィール情報の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const createInitialProfile = async () => {
    try {
      const { error } = await supabase
        .from('users')
        .insert({
          id: session.user.id,
          email: session.user.email,
          name: '',
          role: ''
        })

      if (error) throw error

      // 初期値をフォームに設定
      setValue('email', session.user.email || '')
      setValue('name', '')
      setValue('role', '')
    } catch (error) {
      console.error('初期プロフィール作成エラー:', error)
    }
  }

  const onSubmit = async (formData: ProfileForm) => {
    try {
      setSaving(true)
      setMessage('')

      const { error } = await supabase
        .from('users')
        .upsert({
          id: session.user.id,
          name: formData.name,
          email: formData.email,
          role: formData.role,
        })

      if (error) throw error

      setMessage('プロフィールを更新しました！')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('プロフィール更新エラー:', error)
      setMessage('更新に失敗しました。もう一度お試しください。')
    } finally {
      setSaving(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case '院長': return 'from-purple-500 to-pink-500'
      case '看護師長': return 'from-blue-500 to-cyan-500'
      case '主任看護師': return 'from-green-500 to-emerald-500'
      case '看護師': return 'from-gray-500 to-slate-500'
      case '事務': return 'from-yellow-500 to-orange-500'
      default: return 'from-gray-400 to-gray-500'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case '院長': return Shield
      case '看護師長': return Briefcase
      case '主任看護師': return Edit3
      case '看護師': return User
      case '事務': return Mail
      default: return User
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <span className="text-white text-xl font-medium">プロフィールを読み込み中...</span>
          </div>
        </div>
      </div>
    )
  }

  const RoleIcon = getRoleIcon(watchedValues.role)

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ヘッダーカード */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
          <div className="p-8">
            <div className="flex items-center space-x-6 mb-8">
              <div className={`h-20 w-20 bg-gradient-to-br ${getRoleColor(watchedValues.role)} rounded-3xl flex items-center justify-center shadow-2xl`}>
                <RoleIcon className="h-10 w-10 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                  {watchedValues.name || '職員情報管理'}
                </h1>
                <p className="text-white/70 text-lg mt-1">
                  あなたの基本情報を管理します
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-white/60 text-sm">オンライン</span>
                </div>
              </div>
            </div>

            {/* アカウント情報カード */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                <div className="flex items-center space-x-3 mb-2">
                  <User className="h-6 w-6 text-blue-400" />
                  <h3 className="text-white font-semibold">ユーザーID</h3>
                </div>
                <p className="text-white/70 text-sm font-mono bg-white/10 rounded-lg p-2">
                  {session.user.id.slice(0, 8)}...
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                <div className="flex items-center space-x-3 mb-2">
                  <Calendar className="h-6 w-6 text-green-400" />
                  <h3 className="text-white font-semibold">登録日</h3>
                </div>
                <p className="text-white/70">
                  {new Date(session.user.created_at).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* メッセージ表示 */}
            {message && (
              <div className={`mt-6 p-4 rounded-2xl backdrop-blur-lg border ${
                message.includes('成功') || message.includes('更新しました')
                  ? 'bg-green-500/20 border-green-400/30 text-green-100'
                  : 'bg-red-500/20 border-red-400/30 text-red-100'
              }`}>
                <div className="flex items-center space-x-2">
                  {message.includes('成功') || message.includes('更新しました') ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                  <span className="font-medium">{message}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* プロフィール編集フォーム */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
          <div className="p-8">
            <div className="flex items-center space-x-3 mb-8">
              <Edit3 className="h-8 w-8 text-orange-400" />
              <h2 className="text-2xl font-bold text-white">プロフィール編集</h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* 職員名 */}
              <div className="space-y-2">
                <label htmlFor="name" className="flex items-center space-x-2 text-white font-semibold">
                  <User className="h-5 w-5 text-blue-400" />
                  <span>職員名</span>
                  <span className="text-red-400">*</span>
                </label>
                <input
                  {...register('name', { required: '職員名は必須です' })}
                  type="text"
                  className="w-full px-6 py-4 bg-white/90 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 transition-all duration-200"
                  placeholder="山田 太郎"
                />
                {errors.name && (
                  <p className="text-red-400 text-sm flex items-center space-x-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.name.message}</span>
                  </p>
                )}
              </div>

              {/* メールアドレス */}
              <div className="space-y-2">
                <label htmlFor="email" className="flex items-center space-x-2 text-white font-semibold">
                  <Mail className="h-5 w-5 text-green-400" />
                  <span>メールアドレス</span>
                  <span className="text-red-400">*</span>
                </label>
                <input
                  {...register('email', { 
                    required: 'メールアドレスは必須です',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: '正しいメールアドレスを入力してください'
                    }
                  })}
                  type="email"
                  className="w-full px-6 py-4 bg-white/90 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 placeholder-gray-500 transition-all duration-200"
                  placeholder="example@hospital.com"
                />
                {errors.email && (
                  <p className="text-red-400 text-sm flex items-center space-x-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.email.message}</span>
                  </p>
                )}
              </div>

              {/* 役職 */}
              <div className="space-y-2">
                <label htmlFor="role" className="flex items-center space-x-2 text-white font-semibold">
                  <Briefcase className="h-5 w-5 text-purple-400" />
                  <span>役職</span>
                  <span className="text-red-400">*</span>
                </label>
                <select
  {...register('role', { required: '役職は必須です' })}
  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
>
  <option value="">選択してください</option>
  <option value="常勤">常勤</option>
  <option value="パート">パート</option>
</select>
                {errors.role && (
                  <p className="text-red-400 text-sm flex items-center space-x-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.role.message}</span>
                  </p>
                )}
              </div>

              {/* 送信ボタン */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-4 px-8 rounded-2xl hover:from-blue-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200 font-semibold text-lg shadow-2xl"
                >
                  {saving ? (
                    <div className="flex items-center justify-center space-x-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      <span>保存中...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-3">
                      <Save className="h-6 w-6" />
                      <span>プロフィール更新</span>
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}