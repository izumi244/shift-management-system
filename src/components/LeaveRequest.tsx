import { useState, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">カレンダーを読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">休み希望申請</h1>
            <p className="mt-1 text-sm text-gray-600">
              カレンダーの日付をクリックして休み希望を申請してください
            </p>
          </div>

          {message && (
            <div className={`mx-6 mt-4 p-3 rounded ${
              message.includes('成功') || message.includes('申請しました') || message.includes('削除しました')
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {message}
            </div>
          )}

          <div className="p-6">
            <div className="mb-4 flex flex-wrap gap-2 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                <span>休み希望</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-300 rounded mr-2"></div>
                <span>クリックで申請/削除</span>
              </div>
            </div>

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
            />
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                現在の休み希望: {events.length}件
              </div>
              <button
                onClick={() => window.history.back()}
                className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                戻る
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 休み希望申請モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                休み希望申請
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                {new Date(selectedDate).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })}
              </p>
            </div>

            <div className="px-6 py-4">
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                理由（任意）
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="例：私用、通院、家族の用事など"
              />
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={submitting}
                className="bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={submitLeaveRequest}
                disabled={submitting}
                className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {submitting ? '申請中...' : '申請する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}