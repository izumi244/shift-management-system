import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'

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
    formState: { errors }
  } = useForm<ProfileForm>()

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              職員情報管理
            </h2>

            {message && (
              <div className={`mb-4 p-3 rounded ${
                message.includes('成功') || message.includes('更新しました')
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  職員名 <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('name', { required: '職員名は必須です' })}
                  type="text"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="山田 太郎"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  メールアドレス <span className="text-red-500">*</span>
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="example@hospital.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  役職 <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('role', { required: '役職は必須です' })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">選択してください</option>
                  <option value="看護師">看護師</option>
                  <option value="主任看護師">主任看護師</option>
                  <option value="看護師長">看護師長</option>
                  <option value="院長">院長</option>
                  <option value="事務">事務</option>
                </select>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                )}
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {saving ? '保存中...' : 'プロフィール更新'}
                </button>
                
                <button
                  type="button"
                  onClick={() => supabase.auth.signOut()}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  ログアウト
                </button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-2">アカウント情報</h3>
              <p className="text-sm text-gray-600">
                ユーザーID: {session.user.id}
              </p>
              <p className="text-sm text-gray-600">
                登録日: {new Date(session.user.created_at).toLocaleDateString('ja-JP')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}