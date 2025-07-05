import { useState, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { Calendar, X, Plus, Heart, Sparkles, Clock } from 'lucide-react'

interface LeaveRequestData {
  id: string
  user_id: string
  request_date: string
  reason: string
  created_at: string
}

interface CalendarEvent {
  id: string
  title: string
  date: string
  backgroundColor: string
  borderColor: string
}

interface LeaveRequestProps {
  session: Session
}

export default function LeaveRequest({ session }: LeaveRequestProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  // コンポーネント読み込み時に休み希望データを取得
  useEffect(() => {
    fetchLeaveRequests()
  }, [])

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', session.user.id)
        .order('request_date', { ascending: true })

      if (error) throw error

      // FullCalendar用のイベント形式に変換
      const calendarEvents: CalendarEvent[] = data.map((request: LeaveRequestData) => ({
        id: request.id,
        title: `休み希望${request.reason ? ': ' + request.reason : ''}`,
        date: request.request_date,
        backgroundColor: '#ef4444',
        borderColor: '#dc2626'
      }))

      setEvents(calendarEvents)
    } catch (error) {
      console.error('休み希望取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  // 日付クリック時の処理
  const handleDateClick = (arg: any) => {
    const clickedDate = arg.dateStr
    const today = new Date().toISOString().split('T')[0]
    
    // 過去の日付はクリックできない
    if (clickedDate < today) {
      alert('過去の日付には休み希望を申請できません')
      return
    }

    // 既に休み希望がある日付かチェック
    const existingRequest = events.find(event => event.date === clickedDate)
    if (existingRequest) {
      if (confirm('この日の休み希望を削除しますか？')) {
        deleteLeaveRequest(existingRequest.id)
      }
      return
    }

    // 新しい休み希望申請のモーダルを表示
    setSelectedDate(clickedDate)
    setReason('')
    setShowModal(true)
  }

  // 休み希望を申請
  const submitLeaveRequest = async () => {
    if (!selectedDate) return

    try {
      setSubmitting(true)
      setMessage('')

      const { error } = await supabase
        .from('leave_requests')
        .insert({
          user_id: session.user.id,
          request_date: selectedDate,
          reason: reason.trim()
        })

      if (error) throw error

      setMessage('休み希望を申請しました！')
      setShowModal(false)
      fetchLeaveRequests() // カレンダーを更新
      
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('休み希望申請エラー:', error)
      setMessage('申請に失敗しました。もう一度お試しください。')
    } finally {
      setSubmitting(false)
    }
  }

  // 休み希望を削除
  const deleteLeaveRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('leave_requests')
        .delete()
        .eq('id', requestId)

      if (error) throw error

      setMessage('休み希望を削除しました')
      fetchLeaveRequests() // カレンダーを更新
      
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('休み希望削除エラー:', error)
      setMessage('削除に失敗しました')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <span className="text-white text-xl font-medium">カレンダーを読み込み中...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ヘッダーカード */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
          <div className="p-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="h-14 w-14 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-2xl flex items-center justify-center shadow-xl">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                  休み希望申請
                </h1>
                <p className="text-white/70 text-lg">
                  カレンダーの日付をクリックして休み希望を申請してください
                </p>
              </div>
            </div>

            {/* 統計情報 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-4 border border-white/10">
                <div className="flex items-center space-x-3">
                  <Heart className="h-6 w-6 text-red-400" />
                  <div>
                    <p className="text-white/60 text-sm">現在の休み希望</p>
                    <p className="text-white text-2xl font-bold">{events.length}件</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-4 border border-white/10">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-6 w-6 text-blue-400" />
                  <div>
                    <p className="text-white/60 text-sm">今月の表示</p>
                    <p className="text-white text-lg font-semibold">
                      {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-4 border border-white/10">
                <div className="flex items-center space-x-3">
                  <Clock className="h-6 w-6 text-green-400" />
                  <div>
                    <p className="text-white/60 text-sm">操作方法</p>
                    <p className="text-white text-sm">日付クリックで申請/削除</p>
                  </div>
                </div>
              </div>
            </div>

            {/* メッセージ表示 */}
            {message && (
              <div className={`mt-6 p-4 rounded-2xl backdrop-blur-lg border ${
                message.includes('成功') || message.includes('申請しました') || message.includes('削除しました')
                  ? 'bg-green-500/20 border-green-400/30 text-green-100'
                  : 'bg-red-500/20 border-red-400/30 text-red-100'
              }`}>
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5" />
                  <span className="font-medium">{message}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 凡例カード */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-6">
          <h3 className="text-white text-lg font-semibold mb-4">カレンダー凡例</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded-full shadow-lg"></div>
              <span className="text-white/80">休み希望</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-white/20 rounded-full border border-white/40"></div>
              <span className="text-white/80">クリックで申請/削除</span>
            </div>
          </div>
        </div>

        {/* カレンダーカード */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
          <div className="p-8">
            <div className="bg-white/90 rounded-2xl p-6 shadow-xl">
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth'
                }}
                events={events}
                dateClick={handleDateClick}
                height="auto"
                locale="ja"
                firstDay={1} // 月曜日始まり
                buttonText={{
                  today: '今日',
                  month: '月'
                }}
                dayMaxEvents={true}
                moreLinkText="他"
                eventClassNames="rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 休み希望申請モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full border border-white/20">
            {/* モーダルヘッダー */}
            <div className="p-8 border-b border-gray-200/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <Plus className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      休み希望申請
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {new Date(selectedDate).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long'
                      })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="h-10 w-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors duration-200"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* モーダルコンテンツ */}
            <div className="p-8">
              <label htmlFor="reason" className="block text-sm font-semibold text-gray-700 mb-3">
                理由（任意）
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="block w-full px-4 py-3 border border-gray-300 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80 backdrop-blur-sm transition-all duration-200"
                placeholder="例：私用、通院、家族の用事など"
              />
            </div>

            {/* モーダルフッター */}
            <div className="p-8 bg-gray-50/80 border-t border-gray-200/50 flex justify-end space-x-4">
              <button
                onClick={() => setShowModal(false)}
                disabled={submitting}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-2xl hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 transition-all duration-200 font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={submitLeaveRequest}
                disabled={submitting}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl hover:from-blue-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200 font-medium shadow-lg"
              >
                {submitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>申請中...</span>
                  </div>
                ) : (
                  '申請する'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}