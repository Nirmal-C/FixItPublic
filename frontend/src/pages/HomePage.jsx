import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Construction, ArrowRight, Building2,
  ShieldCheck, MapPin, Bell, Users, Clock,
  CheckCircle2, Search, AlertCircle, Loader2,
  ChevronRight, FileText, Phone, Zap, LogIn, KeyRound,
} from 'lucide-react'
import { requestsApi, statsApi } from '../api/client'
import StatusBadge from '../components/StatusBadge'
import { useCitizenAuth } from '../contexts/CitizenAuthContext'

// Inline ticket tracker widget used in both the hero panel and the services section
function IssueTracker() {
  const [ticketId, setTicketId] = useState('')
  const [result,   setResult]   = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [loading,  setLoading]  = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    const id = ticketId.trim()
    if (!id) return
    setLoading(true); setResult(null); setNotFound(false)
    try {
      const res = await requestsApi.get(id)
      const t = res.data
      if (t?.id) setResult({ title: t.title, status: t.status, category: t.category, location: t.location_description })
      else setNotFound(true)
    } catch {
      setNotFound(true)
    } finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={ticketId}
            onChange={(e) => { setTicketId(e.target.value); setResult(null); setNotFound(false) }}
            placeholder="Enter ticket ID (e.g. 42)"
            className="form-input pl-9 text-sm"
            maxLength={20}
          />
        </div>
        <button type="submit" className="btn-primary px-4 text-sm gap-1.5" disabled={loading || !ticketId.trim()}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
          {loading ? '…' : 'Track'}
        </button>
      </form>

      {result && (
        <div className="rounded p-3 flex flex-col gap-2 animate-slide-up" style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)' }}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>{result.title}</p>
            <StatusBadge status={result.status} size="sm" />
          </div>
          <div className="flex flex-wrap gap-x-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {result.category && <span>Category: <strong>{result.category}</strong></span>}
            {result.location  && <span>Location: <strong>{result.location}</strong></span>}
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {result.status === 'resolved' || result.status === 'closed'
              ? '✅ Resolved — thank you for your report!'
              : result.status === 'in_progress'
                ? '🔧 A maintenance crew is working on this.'
                : '⏳ In the queue — will be assigned soon.'}
          </p>
        </div>
      )}
      {notFound && (
        <div className="flex items-center gap-2 text-sm animate-slide-up" style={{ color: '#ef4444' }}>
          <AlertCircle size={14} /><span>No report found with that ID.</span>
        </div>
      )}
    </div>
  )
}

// Service tile data — each entry maps to one card in the services section
const SERVICES = [
  {
    to: '/report', icon: FileText, color: '#0077C8', bg: 'rgba(0,119,200,0.10)', topColor: '#0077C8',
    maori: 'Pūrongo i Tētahi Take',
    title: 'Report an Issue',
    description: 'Submit a new maintenance request for broken streetlights, damaged footpaths, graffiti, or any public facility problem.',
    linkLabel: 'Submit Report',
  },
  {
    to: '/requests', icon: MapPin, color: '#10b981', bg: 'rgba(16,185,129,0.10)', topColor: '#10b981',
    maori: 'Tirohia Ngā Pūrongo',
    title: 'View Community Reports',
    description: 'Browse all public facility reports in your area. Filter by category, status, or location.',
    linkLabel: 'Browse Reports',
  },
  {
    to: null, icon: Search, color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', topColor: '#f59e0b',
    maori: 'Aroturuki i Tō Pūrongo',
    title: 'Track Your Report',
    description: 'Enter your ticket ID to check the latest progress. No login required.',
    linkLabel: null,
  },
]

// The three steps shown in the "How It Works" stepper
const HOW_IT_WORKS = [
  {
    num: '01', icon: Zap, color: '#0077C8',
    maori: 'Kite i te Take',
    title: 'Spot the Issue',
    description: 'Notice a broken streetlight, damaged footpath, graffiti, or any public facility issue in your area.',
  },
  {
    num: '02', icon: Construction, color: '#10b981',
    maori: 'Tuku Pūrongo',
    title: 'Submit a Report',
    description: 'Fill out our simple form with a description, location, and optional photo. Takes under 2 minutes.',
  },
  {
    num: '03', icon: CheckCircle2, color: '#f59e0b',
    maori: 'Ka Mahi te Kaunihera',
    title: 'Council Acts',
    description: 'Your local council reviews your report, assigns a maintenance crew, and updates you in real time.',
  },
]

// Builds the 4 stat cards from live API data (or falls back to placeholder dashes while loading)
function buildStats(data) {
  const fmtDays = (d) => d === null || d === undefined ? '—' : `${d} day${d === 1 ? '' : 's'}`
  const fmtNum  = (n) => n === null || n === undefined ? '—' : n.toLocaleString()
  return [
    { label: 'Issues Reported',    value: fmtNum(data?.total_reports),     icon: MapPin,       color: '#0077C8', bg: 'rgba(0,119,200,0.10)' },
    { label: 'Issues Resolved',    value: fmtNum(data?.resolved_count),    icon: CheckCircle2, color: '#10b981', bg: 'rgba(16,185,129,0.10)' },
    { label: 'Avg. Response Time', value: fmtDays(data?.avg_response_days),icon: Clock,        color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
    { label: 'Community Members',  value: fmtNum(data?.community_members), icon: Users,        color: '#0066BB', bg: 'rgba(0,102,187,0.10)' },
  ]
}

const FEATURES = [
  { icon: MapPin,      maori: 'Māramatanga Wāhi',   title: 'Location-Aware',   description: 'Pinpoint the exact location on a map so maintenance crews find the issue instantly.',             color: '#0077C8', bg: 'rgba(0,119,200,0.10)' },
  { icon: Bell,        maori: 'Whakahou Tūnga',      title: 'Status Updates',   description: 'Track your report from Pending through to Resolved — no need to phone the council.',              color: '#10b981', bg: 'rgba(16,185,129,0.10)' },
  { icon: ShieldCheck, maori: 'Tiaki Tūmataiti',     title: 'Privacy-First',    description: 'Report anonymously or with your name. Personal information is never shared without your consent.', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
  { icon: Users,       maori: 'Nā te Hapori',        title: 'Community Driven', description: 'Built in alignment with Te Tiriti o Waitangi — partnership, participation, and protection.',       color: '#0066BB', bg: 'rgba(0,102,187,0.10)' },
]

// Reusable bilingual section header — used across all sections on this page.
// Shows English and Māori label side by side with an accent stripe on the left.
function SectionLabel({ en, mi, heading }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="w-1 h-6 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
      <div>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
          {en} <span className="font-normal opacity-60">· {mi}</span>
        </p>
        <h2 className="text-xl font-extrabold mt-0.5" style={{ color: 'var(--text-primary)' }}>{heading}</h2>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { user } = useCitizenAuth()
  const [statsData, setStatsData]   = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    statsApi.public()
      .then((res) => setStatsData(res.data))
      .catch(() => setStatsData(null))   // silently fall back — UI shows '—'
      .finally(() => setStatsLoading(false))
  }, [])

  const STATS = buildStats(statsData)

  return (
    <div>

      {/* Hero */}
      <section style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--divider)' }}>
        <div className="section-container py-14">
          <div className="grid lg:grid-cols-5 gap-10 items-start">

            {/* Left column — heading, CTAs, quick stats */}
            <div className="lg:col-span-3 flex flex-col gap-6 animate-slide-up">
              <span
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded self-start text-xs font-semibold"
                style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)', color: 'var(--accent-text)' }}
              >
                <Building2 size={11} />
                New Zealand Public Infrastructure Services
                <span className="opacity-60 font-normal">· Ngā Ratonga Hanganga o Aotearoa</span>
              </span>

              <div>
                <h1 className="text-4xl sm:text-5xl font-extrabold leading-[1.1] tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Public Facility<br />
                  <span style={{ color: 'var(--accent)' }}>Maintenance Portal</span>
                </h1>
                <p className="text-xs italic mt-1" style={{ color: 'var(--text-muted)' }}>
                  He Pūnaha Kaitiaki Tūāhu Tūmatanui
                </p>
                <p className="mt-3 text-base leading-relaxed max-w-lg" style={{ color: 'var(--text-secondary)' }}>
                  Report broken streetlights, damaged footpaths, graffiti, and infrastructure issues
                  directly to local council maintenance teams across New Zealand.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/report"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded font-bold text-sm transition-all duration-150"
                  style={{ background: '#FFC72C', color: '#002040' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#FFD45C'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#FFC72C'}
                >
                  <FileText size={15} />
                  Report an Issue
                  <ArrowRight size={14} />
                </Link>
                <Link to="/requests" className="btn-secondary px-7 py-3 text-sm">
                  Browse Reports
                </Link>
                {!user && (
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded font-semibold text-sm transition-all duration-150"
                    style={{ border: '1px solid var(--card-border)', color: 'var(--text-secondary)', background: 'transparent' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#818cf8' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                  >
                    <LogIn size={14} />
                    Sign In
                  </Link>
                )}
              </div>

              {/* Admin portal link — subtle entry point for council staff, keeps them out of the citizen login */}
              <div className="flex items-center gap-2 pt-1">
                <div className="h-px flex-1 max-w-[60px]" style={{ background: 'var(--divider)' }} />
                <Link
                  to="/admin/login"
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded transition-all duration-150"
                  style={{ color: 'var(--text-muted)', border: '1px solid transparent' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#FFC72C'; e.currentTarget.style.borderColor = 'rgba(255,199,44,0.3)'; e.currentTarget.style.background = 'rgba(255,199,44,0.06)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
                >
                  <KeyRound size={11} />
                  Council / Admin Sign In
                </Link>
                <div className="h-px flex-1 max-w-[60px]" style={{ background: 'var(--divider)' }} />
              </div>

              {/* Quick stats strip at the bottom of the hero */}
              <div className="grid grid-cols-3 gap-5 pt-5 mt-1" style={{ borderTop: '1px solid var(--divider)' }}>
                {[
                  { label: 'Reports Filed', value: statsLoading ? '…' : (statsData?.total_reports?.toLocaleString() ?? '—') },
                  { label: 'Resolved',      value: statsLoading ? '…' : (statsData?.resolved_count?.toLocaleString() ?? '—') },
                  { label: 'Avg. Response', value: statsLoading ? '…' : (statsData?.avg_response_days != null ? `${statsData.avg_response_days} days` : '—') },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-xl sm:text-2xl font-extrabold leading-none" style={{ color: 'var(--accent)' }}>{s.value}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column — ticket tracker panel */}
            <div className="lg:col-span-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="glass overflow-hidden">
                <div
                  className="px-5 py-4 flex items-center gap-3"
                  style={{ backgroundColor: '#002040', borderBottom: '2px solid #FFC72C' }}
                >
                  <Search size={15} className="text-white/60" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Track Your Report</h3>
                    <p className="text-[10px] text-white/50 mt-0.5 italic">Aroturuki i Tō Pūrongo · No login required</p>
                  </div>
                </div>
                <div className="p-5">
                  <IssueTracker />
                  <p className="text-xs mt-4 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <ShieldCheck size={11} />
                    Your data is kept private and secure.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs px-1" style={{ color: 'var(--text-muted)' }}>
                <Phone size={11} />
                <span>Emergency? Call: <strong style={{ color: 'var(--text-secondary)' }}>09 301 0101</strong></span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-14" style={{ borderBottom: '1px solid var(--divider)' }}>
        <div className="section-container">
          <SectionLabel en="Our Services" mi="Ā Mātou Ratonga" heading="How can we help you today?" />

          <div className="grid sm:grid-cols-3 gap-5">
            {SERVICES.map((svc, i) => {
              const Icon = svc.icon
              return (
                <div
                  key={svc.title}
                  className="service-tile animate-slide-up"
                  style={{ animationDelay: `${i * 0.08}s`, borderTopColor: svc.topColor }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded flex items-center justify-center shrink-0" style={{ background: svc.bg }}>
                      <Icon size={20} style={{ color: svc.color }} />
                    </div>
                    <div>
                      <p className="text-[10px] italic" style={{ color: svc.color }}>{svc.maori}</p>
                      <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{svc.title}</h3>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{svc.description}</p>
                  {svc.to ? (
                    <Link
                      to={svc.to}
                      className="inline-flex items-center gap-1 text-xs font-semibold transition-colors self-start mt-1"
                      style={{ color: svc.color }}
                    >
                      {svc.linkLabel} <ChevronRight size={12} />
                    </Link>
                  ) : (
                    // Third tile embeds the tracker widget directly instead of a link
                    <div className="mt-1 pt-3" style={{ borderTop: '1px solid var(--divider)' }}>
                      <IssueTracker />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-14" style={{ borderBottom: '1px solid var(--divider)', backgroundColor: 'var(--bg-secondary)' }}>
        <div className="section-container">
          <SectionLabel en="Simple Process" mi="He Ara Māmā" heading="Three steps to get it fixed" />

          {/*
            Desktop step indicator — a flex row where each non-last item
            is flex-1 so the gradient connector line fills the space between circles.
            On mobile this row is hidden and the circles render above each content block instead.
          */}
          <div className="hidden sm:flex items-center mb-10">
            {HOW_IT_WORKS.map((step, i) => (
              <div
                key={step.num}
                className={`flex items-center ${i < HOW_IT_WORKS.length - 1 ? 'flex-1' : ''}`}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black text-white shrink-0"
                  style={{ background: step.color }}
                >
                  {step.num}
                </div>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div
                    className="flex-1 h-0.5"
                    style={{
                      background: `linear-gradient(90deg, ${step.color}, ${HOW_IT_WORKS[i + 1].color})`,
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Content grid — 3 columns on desktop, stacked on mobile */}
          <div className="grid sm:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step, i) => (
              <div
                key={step.num}
                className="flex flex-col gap-3 animate-slide-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {/* Circle only shows here on mobile since desktop has the row above */}
                <div
                  className="sm:hidden w-14 h-14 rounded-full flex items-center justify-center text-xl font-black text-white shrink-0"
                  style={{ background: step.color }}
                >
                  {step.num}
                </div>

                <div>
                  <p className="text-xs font-semibold italic tracking-wide mb-0.5" style={{ color: step.color }}>
                    {step.maori}
                  </p>
                  <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed mt-2" style={{ color: 'var(--text-secondary)' }}>
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="py-10" style={{ borderBottom: '1px solid var(--divider)' }}>
        <div className="section-container">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map((stat, i) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="glass p-5 flex items-center gap-4 animate-slide-up" style={{ animationDelay: `${i * 0.06}s` }}>
                  <div className="w-11 h-11 rounded flex items-center justify-center shrink-0" style={{ background: stat.bg }}>
                    <Icon size={20} style={{ color: stat.color }} />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold leading-none" style={{ color: stat.color }}>{stat.value}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-14" style={{ borderBottom: '1px solid var(--divider)', backgroundColor: 'var(--bg-secondary)' }}>
        <div className="section-container">
          <SectionLabel en="Platform Features" mi="Ngā Āhuatanga" heading="Built for every community" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon
              return (
                <div key={feat.title} className="glass glass-hover p-5 flex flex-col gap-3 animate-slide-up" style={{ animationDelay: `${i * 0.07}s` }}>
                  <div className="w-10 h-10 rounded flex items-center justify-center" style={{ background: feat.bg }}>
                    <Icon size={18} style={{ color: feat.color }} />
                  </div>
                  <div>
                    <p className="text-[10px] italic mb-0.5" style={{ color: feat.color }}>{feat.maori}</p>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{feat.title}</h3>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{feat.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA band — dark navy with gold accent to stand out from the rest of the page */}
      <section className="py-14">
        <div className="section-container">
          <div
            className="rounded-lg p-10 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-8"
            style={{ backgroundColor: '#002040', borderLeft: '4px solid #FFC72C' }}
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#FFC72C' }}>
                New Zealand Public Infrastructure Services · Ngā Ratonga Hanganga
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white text-balance">
                See something that needs fixing?
              </h2>
              <p className="mt-0.5 text-sm italic" style={{ color: 'rgba(255,199,44,0.6)' }}>
                He mea kia whakatikaina?
              </p>
              <p className="mt-2 text-sm text-white/55 max-w-md text-balance">
                Your report takes less than 2 minutes and directly helps your local community.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link
                to="/report"
                className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded font-bold text-sm transition-all duration-150"
                style={{ background: '#FFC72C', color: '#002040' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#FFD45C'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#FFC72C'}
              >
                Report Now · Pūrongo Ināianei <ChevronRight size={15} />
              </Link>
              <Link
                to="/requests"
                className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded font-bold text-sm border border-white/20 text-white hover:border-white/40 hover:bg-white/5 transition-all duration-150"
              >
                View All Reports
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
