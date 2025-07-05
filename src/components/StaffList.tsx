import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { Users, Search, Filter, RefreshCw, User, Mail, Briefcase, Calendar, Crown, Shield, Edit3, UserCheck } from 'lucide-react'

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
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [message, setMessage] = useState('')

  // コンポーネント読み込み時に職員データを取得
  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true)
      else setLoading(true)
      
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
      setRefreshing(false)
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
      case '院長': return Crown
      case '看護師長': return Shield
      case '主任看護師': return Edit3
      case '看護師': return User
      case '事務': return Briefcase
      default: return User
    }
  }

  const getBadgeStyle = (role: string) => {
    switch (role) {
      case '院長': return 'bg-purple-500/20 text-purple-100 border-purple-400/30'
      case '看護師長': return 'bg-blue-500/20 text-blue-100 border-blue-400/30'
      case '主任看護師': return 'bg-green-500/20 text-green-100 border-green-400/30'
      case '看護師': return 'bg-gray-500/20 text-gray-100 border-gray-400/30'
      case '事務': return 'bg-yellow-500/20 text-yellow-100 border-yellow-400/30'
      default: return 'bg-gray-500/20 text-gray-300 border-gray-400/30'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <span className="text-white text-xl font-medium">職員一覧を読み込み中...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ヘッダーカード */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
          <div className="p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
              <div className="flex items-center space-x-6">
                <div className="h-16 w-16 bg-gradient-to-br from-green-400 to-emerald-400 rounded-3xl flex items-center justify-center shadow-2xl">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                    職員一覧
                  </h1>
                  <p className="text-white/70 text-lg mt-1">
                    登録されている職員の情報を管理します
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl px-6 py-4 border border-white/10">
                  <div className="flex items-center space-x-3">
                    <UserCheck className="h-6 w-6 text-green-400" />
                    <div>
                      <p className="text-white/60 text-sm">総職員数</p>
                      <p className="text-white text-2xl font-bold">{staff.length}名</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => fetchStaff(true)}
                  disabled={refreshing}
                  className="bg-white/10 hover:bg-white/20 backdrop-blur-lg rounded-2xl p-4 border border-white/20 transition-all duration-200 group"
                >
                  <RefreshCw className={`h-6 w-6 text-white transition-transform duration-500 ${refreshing ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                </button>
              </div>
            </div>

            {message && (
              <div className="mt-6 p-4 rounded-2xl bg-red-500/20 border border-red-400/30 text-red-100">
                <div className="flex items-center space-x-2">
                  <Mail className="h-5 w-5" />
                  <span className="font-medium">{message}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 検索・フィルタカード */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
          <div className="p-8">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* 検索ボックス */}
              <div className="flex-1 space-y-2">
                <label className="flex items-center space-x-2 text-white font-semibold">
                  <Search className="h-5 w-5 text-blue-400" />
                  <span>名前・メールアドレスで検索</span>
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="職員名またはメールアドレスを入力"
                  className="w-full px-6 py-4 bg-white/90 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 transition-all duration-200"
                />
              </div>

              {/* 役職フィルタ */}
              <div className="flex-shrink-0 lg:w-64 space-y-2">
                <label className="flex items-center space-x-2 text-white font-semibold">
                  <Filter className="h-5 w-5 text-purple-400" />
                  <span>役職で絞り込み</span>
                </label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full px-6 py-4 bg-white/90 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 transition-all duration-200"
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
              <div className="mt-4 p-4 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10">
                <p className="text-white/80">
                  <span className="font-semibold text-white">{filteredStaff.length}名</span>の職員が見つかりました
                  {searchTerm && <span className="ml-2 text-blue-300">（検索: "{searchTerm}"）</span>}
                  {filterRole && <span className="ml-2 text-purple-300">（役職: {filterRole}）</span>}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 職員カードリスト */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
          <div className="p-8">
            {filteredStaff.length === 0 ? (
              <div className="text-center py-16">
                <div className="h-20 w-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Users className="h-10 w-10 text-white/50" />
                </div>
                <div className="text-white/70">
                  {staff.length === 0 ? (
                    <>
                      <h3 className="text-2xl font-bold text-white mb-2">登録された職員がいません</h3>
                      <p>職員情報の登録から始めてください</p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-2xl font-bold text-white mb-2">条件に一致する職員が見つかりません</h3>
                      <p>検索条件を変更してお試しください</p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredStaff.map((member) => {
                  const RoleIcon = getRoleIcon(member.role)
                  const isCurrentUser = member.id === session.user.id
                  
                  return (
                    <div 
                      key={member.id} 
                      className={`bg-white/5 backdrop-blur-lg rounded-3xl p-6 border transition-all duration-300 hover:scale-105 hover:bg-white/10 ${
                        isCurrentUser 
                          ? 'border-green-400/50 ring-2 ring-green-400/20' 
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      {/* ヘッダー */}
                      <div className="flex items-center space-x-4 mb-6">
                        <div className={`h-14 w-14 bg-gradient-to-br ${getRoleColor(member.role)} rounded-2xl flex items-center justify-center shadow-xl`}>
                          <RoleIcon className="h-7 w-7 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-white truncate">
                            {member.name || '未設定'}
                          </h3>
                          <p className="text-white/60 text-sm font-mono">
                            ID: {member.id.slice(0, 8)}...
                          </p>
                        </div>
                        {isCurrentUser && (
                          <div className="h-3 w-3 bg-green-400 rounded-full animate-pulse"></div>
                        )}
                      </div>

                      {/* 情報 */}
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <Mail className="h-5 w-5 text-blue-400 flex-shrink-0" />
                          <span className="text-white/80 text-sm truncate">{member.email}</span>
                        </div>

                        <div className="flex items-center space-x-3">
                          <Calendar className="h-5 w-5 text-green-400 flex-shrink-0" />
                          <span className="text-white/80 text-sm">
                            {new Date(member.created_at).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </span>
                        </div>

                        {/* 役職バッジ */}
                        <div className="flex items-center justify-between pt-4">
                          <span className={`inline-flex items-center px-3 py-2 text-sm font-semibold rounded-2xl border backdrop-blur-sm ${getBadgeStyle(member.role)}`}>
                            <RoleIcon className="h-4 w-4 mr-2" />
                            {member.role || '未設定'}
                          </span>

                          {isCurrentUser && (
                            <span className="inline-flex items-center px-3 py-2 text-sm font-semibold rounded-2xl bg-green-500/20 text-green-100 border border-green-400/30">
                              <UserCheck className="h-4 w-4 mr-1" />
                              自分
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* フッター統計 */}
            {filteredStaff.length > 0 && (
              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="text-center text-white/60">
                  <span className="text-white font-semibold">{filteredStaff.length}名</span>中 
                  <span className="mx-2">1-{filteredStaff.length}名</span>を表示
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}