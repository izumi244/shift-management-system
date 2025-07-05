import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'

interface Staff {
  id: string
  name: string
  email: string
  role: string
  created_at: string
}

interface StaffListProps {
  session: Session
}

export default function StaffList({ session }: StaffListProps) {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [message, setMessage] = useState('')

  // コンポーネント読み込み時に職員データを取得
  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error

      setStaff(data || [])
    } catch (error) {
      console.error('職員一覧取得エラー:', error)
      setMessage('職員情報の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 検索・フィルタ機能
  const filteredStaff = staff.filter(member => {
    const matchesSearch = 
      member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = filterRole === '' || member.role === filterRole

    return matchesSearch && matchesRole
  })

  // 役職の種類を取得（フィルタ用）
  const uniqueRoles = Array.from(new Set(staff.map(member => member.role).filter(Boolean)))

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">職員一覧を読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* ヘッダー */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">職員一覧</h1>
                <p className="mt-1 text-sm text-gray-600">
                  登録されている職員の情報を表示しています
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span>総職員数:</span>
                  <span className="font-semibold text-indigo-600">{staff.length}名</span>
                </div>
              </div>
            </div>
          </div>

          {message && (
            <div className="mx-6 mt-4 p-3 rounded bg-red-100 text-red-700">
              {message}
            </div>
          )}

          {/* 検索・フィルタエリア */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* 検索ボックス */}
              <div className="flex-1">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  名前・メールアドレスで検索
                </label>
                <input
                  id="search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="職員名またはメールアドレスを入力"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* 役職フィルタ */}
              <div className="flex-shrink-0">
                <label htmlFor="role-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  役職で絞り込み
                </label>
                <select
                  id="role-filter"
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">すべての役職</option>
                  {uniqueRoles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* フィルタ結果の表示 */}
            {(searchTerm || filterRole) && (
              <div className="mt-3 text-sm text-gray-600">
                {filteredStaff.length}名の職員が見つかりました
                {searchTerm && <span>（検索: "{searchTerm}"）</span>}
                {filterRole && <span>（役職: {filterRole}）</span>}
              </div>
            )}
          </div>

          {/* 職員一覧テーブル */}
          <div className="overflow-x-auto">
            {filteredStaff.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="text-gray-500">
                  {staff.length === 0 ? (
                    <>
                      <p className="text-lg font-medium">登録された職員がいません</p>
                      <p className="mt-1">職員情報の登録から始めてください</p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-medium">条件に一致する職員が見つかりません</p>
                      <p className="mt-1">検索条件を変更してお試しください</p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      職員名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      メールアドレス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      役職
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      登録日
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状態
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStaff.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {member.name ? member.name.charAt(0) : '?'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {member.name || '未設定'}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {member.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{member.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          member.role === '院長' ? 'bg-purple-100 text-purple-800' :
                          member.role === '看護師長' ? 'bg-blue-100 text-blue-800' :
                          member.role === '主任看護師' ? 'bg-green-100 text-green-800' :
                          member.role === '看護師' ? 'bg-gray-100 text-gray-800' :
                          member.role === '事務' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {member.role || '未設定'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(member.created_at).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          member.id === session.user.id 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {member.id === session.user.id ? '自分' : 'アクティブ'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* フッター */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <div>
                {filteredStaff.length > 0 && (
                  <span>
                    {filteredStaff.length}名中 1-{filteredStaff.length}名を表示
                  </span>
                )}
              </div>
              <button
                onClick={fetchStaff}
                className="text-indigo-600 hover:text-indigo-500 font-medium"
              >
                更新
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}