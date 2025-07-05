import { useState, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { Calendar, Users, Settings, Trash2, Edit3, Save, X, AlertTriangle, CheckCircle, Clock, UserX, Plus, Download, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Staff {
  id: string
  name: string
  role: string
}

interface ShiftPattern {
  id: string
  pattern_name: string
  start_time: string
  end_time: string
  working_hours: number
}

interface LeaveRequest {
  id: string
  user_id: string
  request_date: string
  reason: string
}

interface Shift {
  id: string
  user_id: string
  shift_date: string
  pattern_id: string
  staff_name?: string
  pattern_name?: string
  users?: { name: string }
  shift_patterns?: { pattern_name: string; start_time: string; end_time: string }
}

interface CalendarEvent {
  id: string
  title: string
  date: string
  backgroundColor: string
  borderColor: string
  extendedProps?: any
}

interface ShiftManagementProps {
  session: Session
}

export default function ShiftManagement({ session }: ShiftManagementProps) {
  const [staff, setStaff] = useState<Staff[]>([])
  const [shiftPatterns, setShiftPatterns] = useState<ShiftPattern[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [message, setMessage] = useState('')
  
  // 手動編集機能の状態
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [editFormData, setEditFormData] = useState({
    user_id: '',
    pattern_id: '',
    shift_date: ''
  })
  const [saving, setSaving] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])

  useEffect(() => {
    initializeData()
  }, [])

  useEffect(() => {
    if (selectedMonth) {
      fetchShiftsForMonth(selectedMonth)
    }
  }, [selectedMonth])

  const initializeData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchStaff(),
        fetchShiftPatterns(),
        fetchLeaveRequests()
      ])
    } catch (error) {
      console.error('初期化エラー:', error)
      setMessage('データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const fetchStaff = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, role')
      .order('name')

    if (error) throw error
    setStaff(data || [])
  }

  const fetchShiftPatterns = async () => {
    const { data, error } = await supabase
      .from('shift_patterns')
      .select('*')
      .order('pattern_name')

    if (error) throw error
    setShiftPatterns(data || [])
  }

  const fetchLeaveRequests = async () => {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')

    if (error) throw error
    setLeaveRequests(data || [])
  }

  const fetchShiftsForMonth = async (month: string) => {
    try {
      const startDate = `${month}-01`
      const endDate = `${month}-31`

      const { data, error } = await supabase
        .from('shifts')
        .select(`
          *,
          users(name),
          shift_patterns(pattern_name, start_time, end_time)
        `)
        .gte('shift_date', startDate)
        .lte('shift_date', endDate)
        .order('shift_date')

      if (error) throw error

      const shiftsWithDetails = (data || []).map(shift => ({
        ...shift,
        staff_name: shift.users?.name || '不明',
        pattern_name: shift.shift_patterns?.pattern_name || '不明'
      }))

      setShifts(shiftsWithDetails)
      updateCalendarEvents(shiftsWithDetails)
    } catch (error) {
      console.error('シフト取得エラー:', error)
    }
  }

  const updateCalendarEvents = (shiftData: Shift[]) => {
    const shiftEvents: CalendarEvent[] = shiftData.map(shift => ({
      id: shift.id,
      title: `${shift.staff_name || '不明'} - ${shift.pattern_name || '不明'}`,
      date: shift.shift_date,
      backgroundColor: getShiftColor(shift.pattern_name || ''),
      borderColor: getShiftColor(shift.pattern_name || ''),
      extendedProps: {
        staffName: shift.staff_name,
        patternName: shift.pattern_name,
        userId: shift.user_id,
        shiftData: shift
      }
    }))

    // 休み希望も表示
    const leaveEvents: CalendarEvent[] = leaveRequests
      .filter(leave => leave.request_date.startsWith(selectedMonth))
      .map(leave => {
        const staffMember = staff.find(s => s.id === leave.user_id)
        return {
          id: `leave-${leave.id}`,
          title: `${staffMember?.name || '不明'} - 休み希望`,
          date: leave.request_date,
          backgroundColor: '#ef4444',
          borderColor: '#dc2626',
          extendedProps: {
            type: 'leave',
            reason: leave.reason
          }
        }
      })

    setEvents([...shiftEvents, ...leaveEvents])
  }

  const getShiftColor = (patternName: string): string => {
    switch (patternName) {
      case '早番': return '#10b981'
      case '遅番': return '#3b82f6'  
      case '夜勤': return '#8b5cf6'
      case '日勤': return '#f59e0b'
      default: return '#6b7280'
    }
  }

  // カレンダーイベントクリック時の処理
  const handleEventClick = (clickInfo: any) => {
    const { extendedProps } = clickInfo.event
    
    // 休み希望の場合は編集不可
    if (extendedProps.type === 'leave') {
      setMessage('休み希望は休み希望タブから編集してください')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    // シフト編集モーダルを開く
    const shift = extendedProps.shiftData
    setEditingShift(shift)
    setEditFormData({
      user_id: shift.user_id,
      pattern_id: shift.pattern_id,
      shift_date: shift.shift_date
    })
    setShowEditModal(true)
    checkConstraints(shift.shift_date, shift.user_id, shift.pattern_id, shift.id)
  }

  // 制約チェック機能
  const checkConstraints = (date: string, userId: string, patternId: string, excludeShiftId?: string) => {
    const newWarnings: string[] = []

    // 休み希望チェック
    const hasLeaveRequest = leaveRequests.some(leave => 
      leave.request_date === date && leave.user_id === userId
    )
    if (hasLeaveRequest) {
      newWarnings.push('この日は休み希望が申請されています')
    }

    // その日の人数チェック
    const dayShifts = shifts.filter(shift => 
      shift.shift_date === date && shift.id !== excludeShiftId
    )
    if (dayShifts.length >= 3) {
      newWarnings.push('この日は既に3名のシフトが割り当てられています')
    }

    // 連続勤務チェック（簡易版）
    const previousDay = new Date(date)
    previousDay.setDate(previousDay.getDate() - 1)
    const nextDay = new Date(date)
    nextDay.setDate(nextDay.getDate() + 1)

    const prevDayShift = shifts.some(shift => 
      shift.shift_date === previousDay.toISOString().split('T')[0] && 
      shift.user_id === userId &&
      shift.id !== excludeShiftId
    )
    const nextDayShift = shifts.some(shift => 
      shift.shift_date === nextDay.toISOString().split('T')[0] && 
      shift.user_id === userId &&
      shift.id !== excludeShiftId
    )

    if (prevDayShift && nextDayShift) {
      newWarnings.push('3日連続勤務になる可能性があります')
    }

    setWarnings(newWarnings)
  }

  // シフト更新
  const updateShift = async () => {
    if (!editingShift) return

    try {
      setSaving(true)
      setMessage('')

      const { error } = await supabase
        .from('shifts')
        .update({
          user_id: editFormData.user_id,
          pattern_id: editFormData.pattern_id,
          shift_date: editFormData.shift_date
        })
        .eq('id', editingShift.id)

      if (error) throw error

      setMessage('シフトを更新しました！')
      setShowEditModal(false)
      setEditingShift(null)
      await fetchShiftsForMonth(selectedMonth)
      
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('シフト更新エラー:', error)
      setMessage('更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  // シフト削除
  const deleteShift = async () => {
    if (!editingShift) return

    if (!confirm('このシフトを削除しますか？')) return

    try {
      setSaving(true)
      setMessage('')

      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', editingShift.id)

      if (error) throw error

      setMessage('シフトを削除しました')
      setShowEditModal(false)
      setEditingShift(null)
      await fetchShiftsForMonth(selectedMonth)
      
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('シフト削除エラー:', error)
      setMessage('削除に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  // 新しいシフト追加
  const addNewShift = async (date: string) => {
    if (!staff.length || !shiftPatterns.length) return

    try {
      setSaving(true)
      setMessage('')

      const { error } = await supabase
        .from('shifts')
        .insert({
          user_id: staff[0].id, // デフォルトで最初の職員
          pattern_id: shiftPatterns[0].id, // デフォルトで最初のパターン
          shift_date: date
        })

      if (error) throw error

      setMessage('新しいシフトを追加しました！')
      await fetchShiftsForMonth(selectedMonth)
      
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('シフト追加エラー:', error)
      setMessage('追加に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  // 日付クリック時の処理（新しいシフト追加）
  const handleDateClick = (arg: any) => {
    const clickedDate = arg.dateStr
    
    if (confirm(`${clickedDate}に新しいシフトを追加しますか？`)) {
      addNewShift(clickedDate)
    }
  }

  const generateShifts = async () => {
    if (!selectedMonth || staff.length === 0 || shiftPatterns.length === 0) {
      setMessage('必要なデータが不足しています')
      return
    }

    try {
      setGenerating(true)
      setMessage('')

      // 選択された月の日数を取得
      const year = parseInt(selectedMonth.split('-')[0])
      const month = parseInt(selectedMonth.split('-')[1])
      const daysInMonth = new Date(year, month, 0).getDate()

      // 既存のシフトを削除
      await supabase
        .from('shifts')
        .delete()
        .gte('shift_date', `${selectedMonth}-01`)
        .lte('shift_date', `${selectedMonth}-31`)

      // シンプルなシフト生成ロジック
      const generatedShifts = []

      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${selectedMonth}-${day.toString().padStart(2, '0')}`
        
        // その日の休み希望を取得
        const dayLeaveRequests = leaveRequests.filter(leave => leave.request_date === date)
        const unavailableStaffIds = dayLeaveRequests.map(leave => leave.user_id)

        // 利用可能な職員を取得
        const availableStaff = staff.filter(s => !unavailableStaffIds.includes(s.id))

        // 最低2名のシフトを作成（利用可能な場合）
        const shiftsPerDay = Math.min(2, availableStaff.length)
        
        for (let i = 0; i < shiftsPerDay; i++) {
          const staffMember = availableStaff[i]
          const pattern = shiftPatterns[i % shiftPatterns.length] // ローテーション

          if (staffMember && pattern) {
            generatedShifts.push({
              user_id: staffMember.id,
              shift_date: date,
              pattern_id: pattern.id
            })
          }
        }
      }

      // Supabaseに保存
      if (generatedShifts.length > 0) {
        const { error } = await supabase
          .from('shifts')
          .insert(generatedShifts)

        if (error) throw error

        setMessage(`${generatedShifts.length}件のシフトを生成しました！`)
        await fetchShiftsForMonth(selectedMonth)
      } else {
        setMessage('生成可能なシフトがありませんでした')
      }

    } catch (error) {
      console.error('シフト生成エラー:', error)
      setMessage('シフト生成に失敗しました')
    } finally {
      setGenerating(false)
      setTimeout(() => setMessage(''), 5000)
    }
  }

  const calculateMonthlyHours = () => {
    const staffHours = new Map<string, number>()

    shifts.forEach(shift => {
      const pattern = shiftPatterns.find(p => p.id === shift.pattern_id)
      if (pattern && shift.user_id) {
        const currentHours = staffHours.get(shift.user_id) || 0
        staffHours.set(shift.user_id, currentHours + pattern.working_hours)
      }
    })

    return Array.from(staffHours.entries()).map(([userId, hours]) => {
      const staffMember = staff.find(s => s.id === userId)
      return {
        name: staffMember?.name || '不明',
        hours: hours
      }
    })
  }

  // Excel出力機能
  const exportToExcel = () => {
    try {
      setMessage('Excelファイルを生成中...')

      // 新しいワークブックを作成
      const workbook = XLSX.utils.book_new()

      // Sheet 1: カレンダー形式のシフト表
      const calendarData = generateCalendarData()
      const calendarWorksheet = XLSX.utils.aoa_to_sheet(calendarData)

      // セルの幅を調整
      const columnWidths = [
        { wch: 8 },  // 日付列
        { wch: 12 }, // 月曜日
        { wch: 12 }, // 火曜日
        { wch: 12 }, // 水曜日
        { wch: 12 }, // 木曜日
        { wch: 12 }, // 金曜日
        { wch: 12 }, // 土曜日
        { wch: 12 }  // 日曜日
      ]
      calendarWorksheet['!cols'] = columnWidths

      // Sheet 2: 職員別統計
      const statsData = generateStatsData()
      const statsWorksheet = XLSX.utils.aoa_to_sheet(statsData)
      statsWorksheet['!cols'] = [
        { wch: 15 }, // 職員名
        { wch: 8 },  // 役職
        { wch: 10 }, // 勤務日数
        { wch: 12 }, // 労働時間
        { wch: 10 }  // 平均時間/日
      ]

      // Sheet 3: シフトパターン一覧
      const patternData = generatePatternData()
      const patternWorksheet = XLSX.utils.aoa_to_sheet(patternData)
      patternWorksheet['!cols'] = [
        { wch: 12 }, // パターン名
        { wch: 10 }, // 開始時間
        { wch: 10 }, // 終了時間
        { wch: 8 }   // 労働時間
      ]

      // ワークブックにシートを追加
      XLSX.utils.book_append_sheet(workbook, calendarWorksheet, `${selectedMonth}シフト表`)
      XLSX.utils.book_append_sheet(workbook, statsWorksheet, '職員別統計')
      XLSX.utils.book_append_sheet(workbook, patternWorksheet, 'シフトパターン')

      // ファイル名を生成
      const fileName = `シフト表_${selectedMonth.replace('-', '年')}月.xlsx`

      // ファイルをダウンロード
      XLSX.writeFile(workbook, fileName)

      setMessage('Excelファイルをダウンロードしました！')
      setTimeout(() => setMessage(''), 3000)

    } catch (error) {
      console.error('Excel出力エラー:', error)
      setMessage('Excel出力に失敗しました')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  // カレンダーデータ生成
  const generateCalendarData = () => {
    const year = parseInt(selectedMonth.split('-')[0])
    const month = parseInt(selectedMonth.split('-')[1])
    const daysInMonth = new Date(year, month, 0).getDate()
    const firstDay = new Date(year, month - 1, 1).getDay()
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1 // 月曜日を0にする

    // ヘッダー行
    const headers = ['日付', '月', '火', '水', '木', '金', '土', '日']
    const data = [headers]

    // タイトル行を追加
    data.unshift([`${year}年${month}月 シフト表`, '', '', '', '', '', '', ''])

    let currentWeek = ['', '', '', '', '', '', '', '']
    let dateCounter = 1

    // 月の最初の週の空白を埋める
    for (let i = 0; i < adjustedFirstDay; i++) {
      currentWeek[i + 1] = ''
    }

    // カレンダーを生成
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${selectedMonth}-${day.toString().padStart(2, '0')}`
      const dayOfWeek = (adjustedFirstDay + day - 1) % 7

      // 日付を設定
      if (dayOfWeek === 0) {
        currentWeek[0] = `第${Math.ceil(day / 7)}週`
      }

      // その日のシフトを取得
      const dayShifts = shifts.filter(shift => shift.shift_date === date)
      const shiftText = dayShifts.length > 0 
        ? dayShifts.map(shift => 
            `${shift.staff_name || '不明'}\n(${shift.pattern_name || '不明'})`
          ).join('\n\n')
        : ''

      currentWeek[dayOfWeek + 1] = `${day}日\n${shiftText}`

      // 週の終わり（日曜日）または月の最後の日
      if (dayOfWeek === 6 || day === daysInMonth) {
        data.push([...currentWeek])
        currentWeek = ['', '', '', '', '', '', '', '']
      }
    }

    return data
  }

  // 統計データ生成
  const generateStatsData = () => {
    const headers = ['職員名', '役職', '勤務日数', '月間労働時間', '平均時間/日']
    const data = [headers]

    // タイトル行
    data.unshift([`${selectedMonth} 職員別統計`, '', '', '', ''])

    staff.forEach(member => {
      const memberShifts = shifts.filter(shift => shift.user_id === member.id)
      const workDays = memberShifts.length
      const totalHours = memberShifts.reduce((sum, shift) => {
        const pattern = shiftPatterns.find(p => p.id === shift.pattern_id)
        return sum + (pattern ? pattern.working_hours : 0)
      }, 0)
      const avgHours = workDays > 0 ? (totalHours / workDays).toFixed(1) : '0'

      data.push([
        member.name || '未設定',
        member.role || '未設定',
        `${workDays}日`,
        `${totalHours}時間`,
        `${avgHours}時間`
      ])
    })

    // 合計行
    const totalWorkDays = shifts.length
    const totalWorkHours = shifts.reduce((sum, shift) => {
      const pattern = shiftPatterns.find(p => p.id === shift.pattern_id)
      return sum + (pattern ? pattern.working_hours : 0)
    }, 0)

    data.push(['', '', '', '', ''])
    data.push(['合計', '', `${totalWorkDays}日`, `${totalWorkHours}時間`, ''])

    return data
  }

  // パターンデータ生成
  const generatePatternData = () => {
    const headers = ['シフトパターン', '開始時間', '終了時間', '労働時間']
    const data = [headers]

    // タイトル行
    data.unshift(['シフトパターン一覧', '', '', ''])

    shiftPatterns.forEach(pattern => {
      data.push([
        pattern.pattern_name,
        pattern.start_time,
        pattern.end_time,
        `${pattern.working_hours}時間`
      ])
    })

    return data
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <span className="text-white text-xl font-medium">シフト管理システムを読み込み中...</span>
          </div>
        </div>
      </div>
    )
  }

  const monthlyHours = calculateMonthlyHours()

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ヘッダーカード */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
          <div className="p-8">
            <div className="flex items-center space-x-6 mb-6">
              <div className="h-16 w-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-3xl flex items-center justify-center shadow-2xl">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                  シフト管理
                </h1>
                <p className="text-white/70 text-lg mt-1">
                  シフトの自動生成・手動編集・制約チェック
                </p>
              </div>
            </div>

            {/* 機能説明カード */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-4 border border-white/10">
                <div className="flex items-center space-x-3">
                  <Settings className="h-6 w-6 text-blue-400" />
                  <div>
                    <p className="text-white font-semibold">自動生成</p>
                    <p className="text-white/60 text-sm">休み希望を考慮して自動作成</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-4 border border-white/10">
                <div className="flex items-center space-x-3">
                  <Edit3 className="h-6 w-6 text-green-400" />
                  <div>
                    <p className="text-white font-semibold">手動編集</p>
                    <p className="text-white/60 text-sm">シフトクリックで編集・削除</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-4 border border-white/10">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-6 w-6 text-yellow-400" />
                  <div>
                    <p className="text-white font-semibold">制約チェック</p>
                    <p className="text-white/60 text-sm">ルール違反を自動警告</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-4 border border-white/10">
                <div className="flex items-center space-x-3">
                  <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
                  <div>
                    <p className="text-white font-semibold">Excel出力</p>
                    <p className="text-white/60 text-sm">シフト表・統計をエクスポート</p>
                  </div>
                </div>
              </div>
            </div>

            {message && (
              <div className={`mt-6 p-4 rounded-2xl backdrop-blur-lg border ${
                message.includes('成功') || message.includes('生成しました') || message.includes('更新しました') || message.includes('削除しました') || message.includes('追加しました')
                  ? 'bg-green-500/20 border-green-400/30 text-green-100'
                  : 'bg-red-500/20 border-red-400/30 text-red-100'
              }`}>
                <div className="flex items-center space-x-2">
                  {message.includes('成功') || message.includes('生成しました') || message.includes('更新しました') || message.includes('削除しました') || message.includes('追加しました') ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5" />
                  )}
                  <span className="font-medium">{message}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* コントロールパネル */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
          <div className="p-8">
            <div className="flex flex-col lg:flex-row gap-6 items-end">
              <div className="flex-1">
                <label htmlFor="month" className="flex items-center space-x-2 text-white font-semibold mb-2">
                  <Calendar className="h-5 w-5 text-blue-400" />
                  <span>対象月</span>
                </label>
                <input
                  id="month"
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-6 py-4 bg-white/90 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-all duration-200"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={exportToExcel}
                  disabled={shifts.length === 0}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-4 rounded-2xl hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 transition-all duration-200 font-semibold shadow-2xl"
                >
                  <div className="flex items-center space-x-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    <span>Excel出力</span>
                  </div>
                </button>
                
                <button
                  onClick={generateShifts}
                  disabled={generating}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-2xl hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 transition-all duration-200 font-semibold shadow-2xl"
                >
                  {generating ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>生成中...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Settings className="h-5 w-5" />
                      <span>シフト自動生成</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 統計・パターン情報 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* 月間労働時間 */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
            <div className="p-8">
              <div className="flex items-center space-x-3 mb-6">
                <Clock className="h-8 w-8 text-green-400" />
                <h3 className="text-2xl font-bold text-white">月間労働時間</h3>
              </div>
              {monthlyHours.length > 0 ? (
                <div className="space-y-3">
                  {monthlyHours.map((staff, index) => (
                    <div key={index} className="bg-white/5 backdrop-blur-lg rounded-2xl p-4 border border-white/10">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-semibold">{staff.name}</span>
                        <span className="text-green-400 text-xl font-bold">{staff.hours}時間</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserX className="h-12 w-12 text-white/30 mx-auto mb-3" />
                  <p className="text-white/50">シフトが生成されていません</p>
                </div>
              )}
            </div>
          </div>

          {/* シフトパターン凡例 */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
            <div className="p-8">
              <div className="flex items-center space-x-3 mb-6">
                <Users className="h-8 w-8 text-purple-400" />
                <h3 className="text-2xl font-bold text-white">シフトパターン</h3>
              </div>
              <div className="space-y-3">
                {shiftPatterns.map(pattern => (
                  <div key={pattern.id} className="bg-white/5 backdrop-blur-lg rounded-2xl p-4 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-5 h-5 rounded-full shadow-lg"
                          style={{ backgroundColor: getShiftColor(pattern.pattern_name) }}
                        ></div>
                        <span className="text-white font-semibold">{pattern.pattern_name}</span>
                      </div>
                      <span className="text-white/70 text-sm">
                        {pattern.start_time}-{pattern.end_time} ({pattern.working_hours}h)
                      </span>
                    </div>
                  </div>
                ))}
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-4 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 rounded-full bg-red-500 shadow-lg"></div>
                      <span className="text-white font-semibold">休み希望</span>
                    </div>
                    <span className="text-white/70 text-sm">申請済み</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* カレンダー */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">
                シフトカレンダー ({selectedMonth})
              </h3>
              <div className="flex items-center space-x-2 text-white/60">
                <Plus className="h-5 w-5" />
                <span className="text-sm">空の日付をクリックで追加</span>
              </div>
            </div>
            <div className="bg-white/90 rounded-2xl p-6 shadow-xl">
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next',
                  center: 'title',
                  right: 'today'
                }}
                events={events}
                eventClick={handleEventClick}
                dateClick={handleDateClick}
                height="auto"
                locale="ja"
                firstDay={1}
                buttonText={{
                  today: '今月',
                  month: '月'
                }}
                dayMaxEvents={3}
                moreLinkText="他"
                initialDate={`${selectedMonth}-01`}
                eventClassNames="cursor-pointer hover:opacity-80 transition-opacity"
              />
            </div>
          </div>
        </div>
      </div>

      {/* シフト編集モーダル */}
      {showEditModal && editingShift && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full border border-white/20">
            {/* モーダルヘッダー */}
            <div className="p-8 border-b border-gray-200/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <Edit3 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">シフト編集</h3>
                    <p className="text-gray-600 text-sm">
                      {new Date(editFormData.shift_date).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long'
                      })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="h-10 w-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors duration-200"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* 警告表示 */}
            {warnings.length > 0 && (
              <div className="p-6 border-b border-gray-200/50">
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-yellow-800">制約違反の可能性</h4>
                      <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                        {warnings.map((warning, index) => (
                          <li key={index}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* フォームコンテンツ */}
            <div className="p-8 space-y-6">
              {/* 職員選択 */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">担当職員</label>
                <select
                  value={editFormData.user_id}
                  onChange={(e) => {
                    setEditFormData(prev => ({ ...prev, user_id: e.target.value }))
                    checkConstraints(editFormData.shift_date, e.target.value, editFormData.pattern_id, editingShift.id)
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200"
                >
                  {staff.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name || '未設定'} ({member.role || '役職未設定'})
                    </option>
                  ))}
                </select>
              </div>

              {/* シフトパターン選択 */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">シフトパターン</label>
                <select
                  value={editFormData.pattern_id}
                  onChange={(e) => {
                    setEditFormData(prev => ({ ...prev, pattern_id: e.target.value }))
                    checkConstraints(editFormData.shift_date, editFormData.user_id, e.target.value, editingShift.id)
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all duration-200"
                >
                  {shiftPatterns.map(pattern => (
                    <option key={pattern.id} value={pattern.id}>
                      {pattern.pattern_name} ({pattern.start_time}-{pattern.end_time})
                    </option>
                  ))}
                </select>
              </div>

              {/* 日付選択 */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">勤務日</label>
                <input
                  type="date"
                  value={editFormData.shift_date}
                  onChange={(e) => {
                    setEditFormData(prev => ({ ...prev, shift_date: e.target.value }))
                    checkConstraints(e.target.value, editFormData.user_id, editFormData.pattern_id, editingShift.id)
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200"
                />
              </div>
            </div>

            {/* モーダルフッター */}
            <div className="p-8 bg-gray-50/80 border-t border-gray-200/50 flex justify-between">
              <button
                onClick={deleteShift}
                disabled={saving}
                className="px-6 py-3 bg-red-500 text-white rounded-2xl hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 transition-all duration-200 font-medium"
              >
                <div className="flex items-center space-x-2">
                  <Trash2 className="h-4 w-4" />
                  <span>削除</span>
                </div>
              </button>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  disabled={saving}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-2xl hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 transition-all duration-200 font-medium"
                >
                  キャンセル
                </button>
                <button
                  onClick={updateShift}
                  disabled={saving}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl hover:from-blue-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200 font-medium shadow-lg"
                >
                  {saving ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>保存中...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Save className="h-4 w-4" />
                      <span>保存</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}