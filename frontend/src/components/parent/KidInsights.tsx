import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { getKidAnalytics, type DailyTrend } from '../../api/parent'
import { CATEGORY_STYLE, type KidStat, type TaskCategory } from '../../constants/categories'
import KidStatsPanel from './KidStatsPanel'

interface KidInsightsProps {
  kidId: string
  kidName?: string
  stats: KidStat[]
  statsLoading: boolean
}

const CATEGORY_ORDER = ['health', 'learning', 'responsibility', 'creativity'] as const
const STATUS_HEX = { confirmed: '#1D9E75', pending: '#EF9F27', rejected: '#E24B4A' }
const PRIMARY_HEX = '#8B5CF6'

/** Trailing streak, longest streak, and total distinct active days. */
function computeStreak(trend: DailyTrend[]): { current: number; best: number } {
  const dates = [...new Set(trend.map(d => d.date))].sort()
  if (dates.length === 0) return { current: 0, best: 0 }
  const diff = (a: string, b: string) =>
    Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86_400_000)

  let best = 1
  let run = 1
  for (let i = 1; i < dates.length; i++) {
    if (diff(dates[i - 1], dates[i]) === 1) { run++; best = Math.max(best, run) }
    else run = 1
  }
  let current = 1
  for (let i = dates.length - 1; i > 0; i--) {
    if (diff(dates[i - 1], dates[i]) === 1) current++
    else break
  }
  return { current, best }
}

// ─── CSV export ────────────────────────────────────────────────────────────────

function csvValue(v: string | number): string {
  const s = String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  // Lead with a BOM so Excel opens it as UTF-8 (keeps Arabic labels readable).
  const body = '﻿' + rows.map(r => r.map(csvValue).join(',')).join('\r\n')
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function StatTile({ icon, iconBg, value, label, caption, loading }: {
  icon: string
  iconBg: string
  value: string | number
  label: string
  caption?: string
  loading: boolean
}) {
  if (loading) return <div className="bg-white rounded-2xl h-[88px] animate-pulse" />
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg shrink-0 ${iconBg}`} aria-hidden="true">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-heading text-2xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="font-body text-xs font-semibold text-gray-500 mt-1 truncate">{label}</p>
        {caption && <p className="font-body text-[11px] text-gray-400 truncate">{caption}</p>}
      </div>
    </div>
  )
}

function CardShell({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="font-heading text-lg font-bold text-gray-900">{title}</p>
        {action}
      </div>
      {children}
    </section>
  )
}

const TREND_RANGES = [7, 30, 0] as const

function withinLastDays(dateStr: string, days: number): boolean {
  const day = new Date(dateStr + 'T00:00:00').getTime()
  return day >= Date.now() - days * 86_400_000
}

function RangeSelector({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const { t } = useTranslation()
  const label = (n: number) => (n === 0 ? t('parentDash.allTime') : t('parentDash.lastNDays', { n }))
  return (
    <div role="group" aria-label={t('parentDash.dateRange')} className="inline-flex rounded-lg border border-gray-200 overflow-hidden shrink-0">
      {TREND_RANGES.map(n => (
        <button
          key={n}
          type="button"
          aria-pressed={value === n}
          onClick={() => onChange(n)}
          className={`px-2.5 py-1 font-body text-xs font-semibold transition-colors focus-ring ${
            value === n ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          {label(n)}
        </button>
      ))}
    </div>
  )
}

function EmptyMini({ label, className = 'h-48' }: { label: string; className?: string }) {
  return (
    <div className={`${className} flex items-center justify-center font-body text-xs text-gray-400`}>
      {label}
    </div>
  )
}

export default function KidInsights({ kidId, kidName, stats, statsLoading }: KidInsightsProps) {
  const { t, i18n } = useTranslation()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['kidAnalytics', kidId],
    queryFn: () => getKidAnalytics(kidId),
  })

  const catLabel = (c: string) =>
    (CATEGORY_ORDER as readonly string[]).includes(c)
      ? t(`kidDash.categories.${c}` as `kidDash.categories.${TaskCategory}`)
      : c

  const breakdown = data?.category_breakdown ?? []
  const catMap: Record<string, number> = {}
  for (const c of breakdown) catMap[c.category] = c.total_points
  const radarData = CATEGORY_ORDER.map(cat => ({ category: catLabel(cat), points: catMap[cat] ?? 0 }))
  // Keep the radar web visible even with no data (all-zero points would collapse it).
  const radarMax = Math.max(10, ...radarData.map(d => d.points))

  const [trendDays, setTrendDays] = useState<number>(30)
  const visibleTrend = trendDays === 0
    ? (data?.daily_trend ?? [])
    : (data?.daily_trend ?? []).filter(d => withinLastDays(d.date, trendDays))
  const trendData = visibleTrend.map(d => {
    const [y, m, day] = d.date.split('-').map(Number)
    return {
      date: new Date(y, m - 1, day).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' }),
      points: d.points,
    }
  })
  // Give the empty line chart a sensible Y scale so its gridlines still show.
  const trendYMax = trendData.length > 0 ? ('auto' as const) : 5

  const rates = data?.completion_rates ?? null
  const pieData =
    rates && rates.total > 0
      ? [
          { name: t('parentDash.confirmed'), value: rates.confirmed, color: STATUS_HEX.confirmed },
          { name: t('parentDash.pending'),   value: rates.pending,   color: STATUS_HEX.pending },
          { name: t('parentDash.rejected'),  value: rates.rejected,  color: STATUS_HEX.rejected },
        ].filter(d => d.value > 0)
      : []

  const totalXp = breakdown.reduce((s, c) => s + c.total_points, 0)
  const tasksCompleted = rates?.confirmed ?? 0
  const approvalRate = rates?.rate ?? 0
  const { current: streak, best } = computeStreak(data?.daily_trend ?? [])

  const errText = <p className="font-body text-sm text-danger-700 py-6 text-center">{t('errors.generic')}</p>

  function exportCsv() {
    const rows: (string | number)[][] = []
    rows.push([`${kidName ?? t('parentDash.yourChild')} — ${t('parentDash.progressReport')}`])
    rows.push([t('parentDash.csvGenerated'), new Date().toLocaleDateString(i18n.language)])
    rows.push([])

    // Summary
    rows.push([t('parentDash.csvSummary')])
    rows.push([t('parentDash.csvMetric'), t('parentDash.csvValue')])
    rows.push([t('parentDash.tasksCompleted'), tasksCompleted])
    rows.push([t('parentDash.xpEarned'), totalXp])
    rows.push([t('parentDash.approvalRate'), `${approvalRate}%`])
    rows.push([t('parentDash.dayStreak'), streak])
    rows.push([])

    // Completion rate
    if (rates) {
      rows.push([t('parentDash.completionRate')])
      rows.push([t('parentDash.csvMetric'), t('parentDash.csvValue')])
      rows.push([t('parentDash.confirmed'), rates.confirmed])
      rows.push([t('parentDash.pending'), rates.pending])
      rows.push([t('parentDash.rejected'), rates.rejected])
      rows.push([t('parentDash.completionRate'), `${rates.rate}%`])
      rows.push([])
    }

    // Category progress
    rows.push([t('parentDash.categoryProgress')])
    rows.push([t('parentDash.csvCategory'), t('parentDash.csvTotalXp'), t('parentDash.csvLevel')])
    for (const cat of CATEGORY_ORDER) {
      const level = stats.find(s => s.category === cat)?.level ?? 0
      rows.push([catLabel(cat), catMap[cat] ?? 0, level])
    }
    rows.push([])

    // Daily XP
    rows.push([t('parentDash.weeklyProgress')])
    rows.push([t('parentDash.csvDate'), t('parentDash.csvXp')])
    for (const d of data?.daily_trend ?? []) rows.push([d.date, d.points])

    const safeName = (kidName ?? 'kid').replace(/[^\p{L}\p{N}_-]+/gu, '_')
    downloadCsv(`${safeName}-progress-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  return (
    <div id="insights-print" className="flex flex-col gap-4 sm:gap-6">

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-xl font-bold text-gray-900">{t('parentDash.insights')}</h2>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 font-body font-semibold text-sm px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 focus-ring transition-colors"
        >
          <span aria-hidden="true">⬇️</span> {t('parentDash.exportCsv')}
        </button>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatTile loading={isLoading} icon="✅" iconBg="bg-teal-50"    value={tasksCompleted}   label={t('parentDash.tasksCompleted')} />
        <StatTile loading={isLoading} icon="⭐" iconBg="bg-amber-50"   value={totalXp}          label={t('parentDash.xpEarned')} />
        <StatTile loading={isLoading} icon="🛡️" iconBg="bg-primary-50" value={`${approvalRate}%`} label={t('parentDash.approvalRate')} />
        <StatTile loading={isLoading} icon="🔥" iconBg="bg-danger-50"  value={streak}           label={t('parentDash.dayStreak')} caption={t('parentDash.bestStreak', { n: best })} />
      </div>

      {/* Weekly progress + completion */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <CardShell
            title={t('parentDash.weeklyProgress')}
            action={<RangeSelector value={trendDays} onChange={setTrendDays} />}
          >
            {isLoading ? (
              <div className="h-52 rounded-xl bg-gray-100 animate-pulse" />
            ) : isError ? errText : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PRIMARY_HEX} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={PRIMARY_HEX} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6D6C66' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6D6C66' }} tickLine={false} axisLine={false} allowDecimals={false} domain={[0, trendYMax]} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="points"
                      stroke={PRIMARY_HEX}
                      strokeWidth={2}
                      fill="url(#xpGrad)"
                      dot={{ r: 3, fill: PRIMARY_HEX, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardShell>
        </div>

        <div className="lg:col-span-1">
          <CardShell title={t('parentDash.completionRate')}>
            {isLoading ? (
              <div className="h-52 rounded-xl bg-gray-100 animate-pulse" />
            ) : isError ? errText : pieData.length > 0 && rates ? (
              <>
                <div className="relative h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={68} paddingAngle={2} stroke="none">
                        {pieData.map(d => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="font-heading text-2xl font-bold text-gray-900">{rates.rate}%</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 mt-1">
                  {pieData.map(d => (
                    <span key={d.name} className="inline-flex items-center gap-1.5 font-body text-xs text-gray-500">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} aria-hidden="true" />
                      {d.name}: {d.value}
                    </span>
                  ))}
                </div>
              </>
            ) : <EmptyMini label={t('parentDash.noData')} className="h-52" />}
          </CardShell>
        </div>
      </div>

      {/* Subject focus + category balance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <KidStatsPanel stats={stats} isLoading={statsLoading} />

        <CardShell title={t('parentDash.categoryBalance')}>
          {isLoading ? (
            <div className="h-52 rounded-xl bg-gray-100 animate-pulse" />
          ) : isError ? errText : (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="70%">
                    <PolarGrid stroke="#E5E7EB" />
                    <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: '#6D6C66' }} />
                    <PolarRadiusAxis tick={false} axisLine={false} domain={[0, radarMax]} />
                    <Radar dataKey="points" stroke={PRIMARY_HEX} fill={PRIMARY_HEX} fillOpacity={0.35} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex flex-col gap-2 mt-3 pt-3 border-t border-gray-100">
                {CATEGORY_ORDER.map(cat => {
                  const style = CATEGORY_STYLE[cat]
                  return (
                    <li key={cat} className="flex items-center justify-between font-body text-sm">
                      <span className="inline-flex items-center gap-2 text-gray-600">
                        <span aria-hidden="true">{style.icon}</span>
                        {catLabel(cat)}
                      </span>
                      <span className="font-semibold text-gray-900">{catMap[cat] ?? 0} XP</span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </CardShell>
      </div>

    </div>
  )
}
