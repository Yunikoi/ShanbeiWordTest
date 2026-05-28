import { useEffect, useMemo, useState } from 'react'
import {
  buildGlossMap,
  formatDayKey,
  formatMonthTitle,
  formatSessionTime,
  groupSessionsByDay,
  summarizeSession,
} from './studyHistory.js'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

/**
 * @param {number} year
 * @param {number} month 0-based
 */
function buildCalendarCells(year, month) {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startPad = (first.getDay() + 6) % 7
  /** @type {{ day: number | null, key: string | null }[]} */
  const cells = []
  for (let i = 0; i < startPad; i++) cells.push({ day: null, key: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const m = String(month + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    cells.push({ day: d, key: `${year}-${m}-${dd}` })
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, key: null })
  return cells
}

/** @returns {string} */
function todayKey() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   sessions: import('./studyHistory.js').StudySession[],
 *   entries: { word: string, senses?: { zh?: string }[] }[],
 * }} props
 */
export function StudyHistoryModal({ open, onClose, sessions, entries }) {
  const [selectedId, setSelectedId] = useState(null)
  const [selectedDate, setSelectedDate] = useState(/** @type {string | null} */ (null))
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())

  const glossMap = useMemo(() => buildGlossMap(entries), [entries])
  const byDay = useMemo(() => groupSessionsByDay(sessions), [sessions])
  const cells = useMemo(() => buildCalendarCells(viewYear, viewMonth), [viewYear, viewMonth])
  const today = todayKey()

  useEffect(() => {
    if (!open) {
      setSelectedId(null)
      setSelectedDate(null)
      return
    }
    if (sessions.length) {
      const d = new Date(sessions[0].endedAt || sessions[0].startedAt)
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    } else {
      const now = new Date()
      setViewYear(now.getFullYear())
      setViewMonth(now.getMonth())
    }
  }, [open, sessions])

  const selected = sessions.find((s) => s.id === selectedId)
  const selectedSummary = selected ? summarizeSession(selected) : null
  const unknownSet = useMemo(
    () => new Set(selectedSummary?.unknown ?? []),
    [selectedSummary],
  )

  const dayBucket = selectedDate ? byDay.get(selectedDate) : null

  const goBack = () => {
    if (selectedId) setSelectedId(null)
    else if (selectedDate) setSelectedDate(null)
    else onClose()
  }

  const title = selected
    ? '本次测试详情'
    : selectedDate
      ? formatDayKey(selectedDate)
      : '测试历史'

  const subtitle = selected
    ? formatSessionTime(selected.endedAt || selected.startedAt)
    : selectedDate
      ? dayBucket
        ? `共 ${dayBucket.sessionCount} 次 · 测试 ${dayBucket.testedTotal} 词 · 不会 ${dayBucket.unknownTotal} 词`
        : '当日无记录'
      : '点击日期查看当天各次测试'

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 sm:justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="study-history-title"
    >
      <div className="mx-auto flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 id="study-history-title" className="text-lg font-bold text-slate-900">
              {title}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={goBack}
            className="rounded-full px-3 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            {selectedId || selectedDate ? '返回' : '关闭'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {selected && selectedSummary ? (
            <SessionDetail
              summary={selectedSummary}
              unknownSet={unknownSet}
              glossMap={glossMap}
            />
          ) : selectedDate ? (
            dayBucket?.sessions.length ? (
              <ul className="space-y-2">
                {dayBucket.sessions.map((s) => {
                  const sum = summarizeSession(s)
                  const time = formatSessionTime(s.endedAt || s.startedAt).split(' ')[1] || ''
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(s.id)}
                        className="w-full rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/50"
                      >
                        <div className="text-sm font-semibold text-slate-900">
                          {time || formatSessionTime(s.endedAt || s.startedAt)}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          测试 {sum.testedCount} 词 · 不会 {sum.unknownCount} 词
                          {sum.unknownCount > 0 ? (
                            <span className="ml-2 text-rose-600">（不熟悉 / 不认识）</span>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="py-12 text-center text-sm text-slate-500">该日暂无测试记录。</p>
            )
          ) : sessions.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">暂无记录，完成一次「开始学习」后会出现在这里。</p>
          ) : (
            <HistoryCalendar
              cells={cells}
              byDay={byDay}
              today={today}
              viewYear={viewYear}
              viewMonth={viewMonth}
              onPrevMonth={() => {
                if (viewMonth === 0) {
                  setViewYear((y) => y - 1)
                  setViewMonth(11)
                } else setViewMonth((m) => m - 1)
              }}
              onNextMonth={() => {
                if (viewMonth === 11) {
                  setViewYear((y) => y + 1)
                  setViewMonth(0)
                } else setViewMonth((m) => m + 1)
              }}
              onPickDate={setSelectedDate}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * @param {{
 *   cells: { day: number | null, key: string | null }[],
 *   byDay: Map<string, { testedTotal: number, sessionCount: number }>,
 *   today: string,
 *   viewYear: number,
 *   viewMonth: number,
 *   onPrevMonth: () => void,
 *   onNextMonth: () => void,
 *   onPickDate: (key: string) => void,
 * }} props
 */
function HistoryCalendar({ cells, byDay, today, viewYear, viewMonth, onPrevMonth, onNextMonth, onPickDate }) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          aria-label="上一月"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-slate-900">{formatMonthTitle(viewYear, viewMonth)}</span>
        <button
          type="button"
          onClick={onNextMonth}
          className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          aria-label="下一月"
        >
          ›
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-slate-400">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell.day || !cell.key) {
            return <div key={`empty-${i}`} className="aspect-square" />
          }
          const stats = byDay.get(cell.key)
          const isToday = cell.key === today
          const hasData = !!stats
          return (
            <button
              key={cell.key}
              type="button"
              disabled={!hasData}
              onClick={() => hasData && onPickDate(cell.key)}
              className={`flex aspect-square flex-col items-center justify-center rounded-xl border text-center transition ${
                hasData
                  ? 'border-indigo-100 bg-indigo-50/80 hover:border-indigo-300 hover:bg-indigo-100/80'
                  : 'border-transparent bg-slate-50/50 text-slate-400'
              } ${isToday ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}`}
            >
              <span className={`text-sm font-semibold ${hasData ? 'text-slate-900' : 'text-slate-400'}`}>
                {cell.day}
              </span>
              {hasData ? (
                <span className="mt-0.5 text-[10px] font-medium leading-tight text-indigo-700">
                  {stats.testedTotal}词
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <p className="mt-4 text-center text-[10px] text-slate-400">有记录的日期可点击查看各次测试 · 悬浮单词可查看释义</p>
    </div>
  )
}

/**
 * @param {{
 *   summary: ReturnType<typeof summarizeSession>,
 *   unknownSet: Set<string>,
 *   glossMap: Map<string, string>,
 * }} props
 */
function SessionDetail({ summary, unknownSet, glossMap }) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2 text-xs text-slate-600">
        <span className="rounded-full bg-slate-100 px-2.5 py-1">共 {summary.testedCount} 词</span>
        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-800">不会 {summary.unknownCount} 词</span>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">
          认识 {summary.testedCount - summary.unknownCount} 词
        </span>
      </div>

      {summary.unknownCount > 0 ? (
        <>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-600">不会的</h4>
          <WordChipGrid words={summary.unknown} highlight glossMap={glossMap} />
        </>
      ) : null}

      <h4 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">全部测试词</h4>
      <WordChipGrid words={summary.tested} unknownSet={unknownSet} glossMap={glossMap} />
    </div>
  )
}

/**
 * @param {{
 *   words: string[],
 *   highlight?: boolean,
 *   unknownSet?: Set<string>,
 *   glossMap: Map<string, string>,
 * }} props
 */
function WordChipGrid({ words, highlight, unknownSet, glossMap }) {
  return (
    <div className="flex flex-wrap gap-2">
      {words.map((word) => {
        const isUnknown = highlight || unknownSet?.has(word)
        const gloss = glossMap.get(word) || '（无释义）'
        return (
          <span
            key={word}
            title={gloss}
            className={`cursor-default rounded-xl px-3 py-1.5 text-sm font-medium ${
              isUnknown
                ? 'bg-rose-100 text-rose-900 ring-1 ring-rose-200'
                : 'bg-slate-100 text-slate-800 ring-1 ring-slate-200'
            }`}
          >
            {word}
          </span>
        )
      })}
    </div>
  )
}
