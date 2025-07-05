import { useState, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { Calendar, Users, Trash2, Save, X, AlertTriangle, Clock, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Staff {
  id: string
  name: string
  email: string
  role: string
}

interface ShiftPattern {
  id: string
  pattern_name: string
  start_time: string
  end_time: string
  working_hours: number
}

interface Shift {
  id?: string
  user_id: string
  shift_date: string
  pattern_id: string
  staff?: Staff
  pattern?: ShiftPattern
}

interface LeaveRequest {
  id: string
  user_id: string
  request_date: string
  reason: string
  staff?: Staff
}

interface ShiftManagementProps {
  session: Session
}

export default function ShiftManagement({ session: _session }: ShiftManagementProps) {
  const [staff, setStaff] = useState<Staff[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [shiftPatterns, setShiftPatterns] = useState<ShiftPattern[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [constraints, setConstraints] = useState<string[]>([])

  useEffect(() => {
    fetchStaff()
    fetchShifts()
    fetchShiftPatterns()
    fetchLeaveRequests()
  }, [])

  const fetchStaff = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
    if (data) setStaff(data)
  }

  const fetchShifts = async () => {
    const { data } = await supabase
      .from('shifts')
      .select(`
        *,
        staff:users(name, role),
        pattern:shift_patterns(pattern_name, start_time, end_time, working_hours)
      `)
    if (data) setShifts(data)
  }

  const fetchShiftPatterns = async () => {
    const { data } = await supabase
      .from('shift_patterns')
      .select('*')
    if (data) setShiftPatterns(data)
  }

  const fetchLeaveRequests = async () => {
    const { data } = await supabase
      .from('leave_requests')
      .select(`
        *,
        staff:users(name)
      `)
    if (data) setLeaveRequests(data)
  }

  const checkConstraints = (userId: string, date: string, _patternId: string) => {
    const constraintMessages: string[] = []

    // 休み希望チェック
    const hasLeaveRequest = leaveRequests.some(
      leave => leave.user_id === userId && leave.request_date === date
    )
    if (hasLeaveRequest) {
      constraintMessages.push('この日は休み希望が出されています')
    }

    // 連続勤務チェック
    const userShifts = shifts.filter(s => s.user_id === userId).sort((a, b) => a.shift_date.localeCompare(b.shift_date))
    const currentIndex = userShifts.findIndex(s => s.shift_date === date)
    let consecutiveDays = 1

    // 前の日から連続勤務をカウント
    for (let i = currentIndex - 1; i >= 0; i--) {
      const prevDate = new Date(userShifts[i].shift_date)
      const expectedDate = new Date(date)
      expectedDate.setDate(expectedDate.getDate() - (currentIndex - i))
      
      if (prevDate.toISOString().slice(0, 10) === expectedDate.toISOString().slice(0, 10)) {
        consecutiveDays++
      } else {
        break
      }
    }

    if (consecutiveDays >= 3) {
      constraintMessages.push(`${consecutiveDays}日連続勤務となります`)
    }

    return constraintMessages
  }

  const generateShifts = async () => {
    if (!selectedMonth) return

    const [year, month] = selectedMonth.split('-').map(Number)
    const daysInMonth = new Date(year, month, 0).getDate()
    const generatedShifts: Omit<Shift, 'id'>[] = []

    // 既存のシフトを削除
    await supabase
      .from('shifts')
      .delete()
      .gte('shift_date', `${selectedMonth}-01`)
      .lte('shift_date', `${selectedMonth}-${daysInMonth.toString().padStart(2, '0')}`)

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${selectedMonth}-${day.toString().padStart(2, '0')}`
      const dayOfWeek = new Date(year, month - 1, day).getDay()

      // 日曜日はスキップ
      if (dayOfWeek === 0) continue

      // その日の休み希望を取得
      const dayLeaveRequests = leaveRequests.filter(leave => leave.request_date === date)
      const unavailableStaffIds = dayLeaveRequests.map(leave => leave.user_id)

      // 利用可能な職員を取得
      let availableStaff = staff.filter(s => !unavailableStaffIds.includes(s.id))

      // 役職で並び替え（常勤を優先）
      availableStaff = availableStaff.sort((a, b) => {
        if (a.role === '常勤' && b.role !== '常勤') return -1
        if (a.role !== '常勤' && b.role === '常勤') return 1
        return 0
      })

      // 曜日別の必要人員
      let targetStaff: number
      if (dayOfWeek === 3) { // 水曜日
        targetStaff = 3
      } else if (dayOfWeek === 6) { // 土曜日
        targetStaff = Math.min(4, availableStaff.length) // 最大4名、利用可能人員に応じて
      } else { // 月・火・木・金
        targetStaff = 4
      }

      const shiftsPerDay = Math.min(targetStaff, availableStaff.length)

      // シフトパターンの配置ルール
      const assignedStaff: { staff: Staff, pattern: ShiftPattern }[] = []

      for (let i = 0; i < shiftsPerDay; i++) {
        const staffMember = availableStaff[i]
        if (!staffMember) continue

        let pattern: ShiftPattern | undefined

        if (staffMember.role === '常勤') {
          // 常勤は早番・遅番
          if (i % 2 === 0) {
            pattern = shiftPatterns.find(p => p.pattern_name === '早番')
          } else {
            pattern = shiftPatterns.find(p => p.pattern_name === '遅番')
          }
        } else {
          // パートはパート1・パート2
          if (i % 2 === 0) {
            pattern = shiftPatterns.find(p => p.pattern_name === 'パート1')
          } else {
            pattern = shiftPatterns.find(p => p.pattern_name === 'パート2')
          }
        }

        if (pattern) {
          assignedStaff.push({ staff: staffMember, pattern })
        }
      }

      // シフトを生成
      assignedStaff.forEach(({ staff: staffMember, pattern }) => {
        generatedShifts.push({
          user_id: staffMember.id,
          shift_date: date,
          pattern_id: pattern.id
        })
      })
    }

    // データベースに保存
    if (generatedShifts.length > 0) {
      await supabase
        .from('shifts')
        .insert(generatedShifts)
    }

    fetchShifts()
  }

  const handleEventClick = (clickInfo: any) => {
    const shift = shifts.find(s => 
      s.user_id === clickInfo.event.extendedProps.user_id &&
      s.shift_date === clickInfo.event.startStr
    )
    
    if (shift) {
      setEditingShift(shift)
      setShowEditModal(true)
      
      const constraintMessages = checkConstraints(shift.user_id, shift.shift_date, shift.pattern_id)
      setConstraints(constraintMessages)
    }
  }

  const handleDateClick = (dateClickInfo: any) => {
    const clickedDate = dateClickInfo.dateStr
    const existingShift = shifts.find(s => s.shift_date === clickedDate)
    
    if (!existingShift) {
      const confirmAdd = window.confirm(`${clickedDate} に新しいシフトを追加しますか？`)
      if (confirmAdd && staff.length > 0 && shiftPatterns.length > 0) {
        const newShift: Shift = {
          user_id: staff[0].id,
          shift_date: clickedDate,
          pattern_id: shiftPatterns[0].id,
          staff: staff[0],
          pattern: shiftPatterns[0]
        }
        setEditingShift(newShift)
        setShowEditModal(true)
        setConstraints([])
      }
    }
  }

  const saveShift = async () => {
    if (!editingShift) return

    const constraintMessages = checkConstraints(editingShift.user_id, editingShift.shift_date, editingShift.pattern_id)
    setConstraints(constraintMessages)

    try {
      if (editingShift.id) {
        // 更新
        await supabase
          .from('shifts')
          .update({
            user_id: editingShift.user_id,
            shift_date: editingShift.shift_date,
            pattern_id: editingShift.pattern_id
          })
          .eq('id', editingShift.id)
      } else {
        // 新規作成
        await supabase
          .from('shifts')
          .insert({
            user_id: editingShift.user_id,
            shift_date: editingShift.shift_date,
            pattern_id: editingShift.pattern_id
          })
      }
      
      setShowEditModal(false)
      setEditingShift(null)
      fetchShifts()
    } catch (error) {
      console.error('Error saving shift:', error)
    }
  }

  const deleteShift = async () => {
    if (!editingShift?.id) return

    const confirmDelete = window.confirm('このシフトを削除しますか？')
    if (confirmDelete) {
      await supabase
        .from('shifts')
        .delete()
        .eq('id', editingShift.id)
      
      setShowEditModal(false)
      setEditingShift(null)
      fetchShifts()
    }
  }

  const generateCalendarData = () => {
    const events = shifts.map(shift => {
      const staffName = shift.staff?.name || '未設定'
      const patternName = shift.pattern?.pattern_name || '未設定'
      const startTime = shift.pattern?.start_time || ''
      const endTime = shift.pattern?.end_time || ''
      
      let backgroundColor = '#3b82f6' // デフォルト青
      if (patternName === '早番') backgroundColor = '#3b82f6' // 青
      else if (patternName === '遅番') backgroundColor = '#8b5cf6' // 紫
      else if (patternName === 'パート1') backgroundColor = '#10b981' // 緑
      else if (patternName === 'パート2') backgroundColor = '#f59e0b' // オレンジ

      return {
        title: `${staffName}\n${patternName}\n${startTime}-${endTime}`,
        start: shift.shift_date,
        backgroundColor,
        borderColor: backgroundColor,
        textColor: 'white',
        extendedProps: {
          user_id: shift.user_id,
          pattern_id: shift.pattern_id
        }
      }
    })

    // 休み希望も表示
    const leaveEvents = leaveRequests.map(leave => ({
      title: `${leave.staff?.name || ''}(休み希望)`,
      start: leave.request_date,
      backgroundColor: '#ef4444',
      borderColor: '#ef4444',
      textColor: 'white'
    }))

    return [...events, ...leaveEvents]
  }

  // Excel出力機能
  const exportToExcel = () => {
    if (shifts.length === 0) {
      alert('出力するシフトデータがありません')
      return
    }

    // ワークブック作成
    const wb = XLSX.utils.book_new()

    // 1. シフト表シート
    const shiftData: any[] = []
    const [year, month] = selectedMonth.split('-').map(Number)
    const daysInMonth = new Date(year, month, 0).getDate()

    // ヘッダー行
    const headerRow = ['日付', '曜日', ...staff.map(s => s.name)]
    shiftData.push(headerRow)

    // 日付ごとのデータ
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${selectedMonth}-${day.toString().padStart(2, '0')}`
      const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][new Date(year, month - 1, day).getDay()]
      
      const row: any[] = [`${month}/${day}`, dayOfWeek]
      
      staff.forEach(staffMember => {
        const shift = shifts.find(s => s.shift_date === date && s.user_id === staffMember.id)
        if (shift) {
          const pattern = shift.pattern?.pattern_name || ''
          const time = shift.pattern ? `${shift.pattern.start_time}-${shift.pattern.end_time}` : ''
          row.push(`${pattern}\n${time}`)
        } else {
          row.push('')
        }
      })
      
      shiftData.push(row)
    }

    const shiftSheet = XLSX.utils.aoa_to_sheet(shiftData)
    XLSX.utils.book_append_sheet(wb, shiftSheet, 'シフト表')

    // 2. 職員別統計シート
    const statsData: any[] = [['職員名', '役職', '勤務日数', '労働時間', '平均時間/日']]
    
    staff.forEach(staffMember => {
      const staffShifts = shifts.filter(s => s.user_id === staffMember.id)
      const workDays = staffShifts.length
      const totalHours = staffShifts.reduce((sum, shift) => sum + (shift.pattern?.working_hours || 0), 0)
      const avgHours = workDays > 0 ? (totalHours / workDays).toFixed(1) : '0'
      
      statsData.push([
        staffMember.name,
        staffMember.role,
        workDays,
        totalHours,
        avgHours
      ])
    })

    const statsSheet = XLSX.utils.aoa_to_sheet(statsData)
    XLSX.utils.book_append_sheet(wb, statsSheet, '職員別統計')

    // 3. シフトパターンシート
    const patternData: any[] = [['パターン名', '開始時間', '終了時間', '労働時間']]
    shiftPatterns.forEach(pattern => {
      patternData.push([
        pattern.pattern_name,
        pattern.start_time,
        pattern.end_time,
        pattern.working_hours
      ])
    })

    const patternSheet = XLSX.utils.aoa_to_sheet(patternData)
    XLSX.utils.book_append_sheet(wb, patternSheet, 'シフトパターン')

    // ファイル出力
    const fileName = `シフト表_${year}年${month.toString().padStart(2, '0')}月.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // 月間労働時間計算
  const calculateMonthlyHours = () => {
    return shifts.reduce((total, shift) => {
      return total + (shift.pattern?.working_hours || 0)
    }, 0)
  }

  return (
    <div className="p-6">
      {/* ヘッダーセクション */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <Calendar className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">シフト管理</h1>
            <p className="text-gray-600">シフトの自動生成・手動編集・制約チェック</p>
          </div>
        </div>

        {/* 統計情報 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-blue-600 font-semibold">登録職員数</p>
                <p className="text-2xl font-bold text-gray-800">{staff.length}名</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-2xl p-4 border border-green-200">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 bg-green-500 rounded-xl flex items-center justify-center">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-green-600 font-semibold">今月のシフト</p>
                <p className="text-2xl font-bold text-gray-800">{shifts.length}件</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-2xl p-4 border border-purple-200">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-purple-600 font-semibold">月間労働時間</p>
                <p className="text-2xl font-bold text-gray-800">{calculateMonthlyHours()}時間</p>
              </div>
            </div>
          </div>
        </div>

        {/* 操作ボタン */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">対象月:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            />
          </div>
          
          <button
            onClick={generateShifts}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Calendar className="h-4 w-4 inline mr-2" />
            シフト自動生成
          </button>

          <button
            onClick={exportToExcel}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <FileSpreadsheet className="h-4 w-4 inline mr-2" />
            Excel出力
          </button>
        </div>
      </div>

      {/* カレンダー表示 */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">シフトカレンダー</h2>
          
          {/* パターン凡例 */}
          <div className="flex flex-wrap gap-4 mb-4 p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm text-gray-700">早番</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <span className="text-sm text-gray-700">遅番</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-700">パート1</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span className="text-sm text-gray-700">パート2</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm text-gray-700">休み希望</span>
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
            events={generateCalendarData()}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            height="auto"
            locale="ja"
            firstDay={0}
            dayMaxEvents={3}
            eventDisplay="block"
            displayEventTime={false}
            eventTextColor="white"
            className="text-sm"
          />
        </div>
      </div>

      {/* 編集モーダル */}
      {showEditModal && editingShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-800">シフト編集</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* 制約警告 */}
              {constraints.length > 0 && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">制約違反の警告</h4>
                      <ul className="mt-1 text-sm text-yellow-700">
                        {constraints.map((constraint, index) => (
                          <li key={index}>• {constraint}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* 職員選択 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">職員</label>
                  <select
                    value={editingShift.user_id}
                    onChange={(e) => setEditingShift({ ...editingShift, user_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                  >
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>

                {/* パターン選択 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">シフトパターン</label>
                  <select
                    value={editingShift.pattern_id}
                    onChange={(e) => setEditingShift({ ...editingShift, pattern_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                  >
                    {shiftPatterns.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.pattern_name} ({p.start_time}-{p.end_time})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 日付選択 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">日付</label>
                  <input
                    type="date"
                    value={editingShift.shift_date}
                    onChange={(e) => setEditingShift({ ...editingShift, shift_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                  />
                </div>
              </div>

              <div className="flex justify-between mt-6">
                {editingShift.id && (
                  <button
                    onClick={deleteShift}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>削除</span>
                  </button>
                )}
                
                <div className="flex space-x-3 ml-auto">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={saveShift}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>保存</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}