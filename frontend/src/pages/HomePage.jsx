import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Zap, Trees, Construction, ArrowRight,
  ShieldCheck, MapPin, Bell, Users,
  ChevronRight, Star, Clock, CheckCircle2,
  Search, AlertCircle, Loader2,
} from 'lucide-react'
import { requestsApi } from '../api/client'
import StatusBadge from '../components/StatusBadge'

// Same mock records used on the ViewRequestsPage — lets the tracker work in demo mode
// when the backend is offline. In Sprint 3 this will call the live API.
const MOCK_LOOKUP = {
  1: { title: 'Broken streetlight on Queen St near No. 42', status: 'in_progress', category: 'Streetlight', location: 'Queen St, Auckland CBD' },
  2: { title: 'Deep pothole on Ponsonby Rd causing tyre damage', status: 'pending', category: 'Road', location: 'Ponsonby Rd' },
  3: { title: 'Playground slide damaged at Victoria Park', status: 'resolved', category: 'Park', location: 'Victoria Park' },
  4: { title: 'Footpath cracked and uneven near bus stop', status: 'pending', category: 'Footpath', location: 'Dominion Rd, Mount Eden' },
  5: { title: 'Graffiti on public toilet block', status: 'resolved', category: 'Graffiti', location: 'Myers Park, Auckland' },
  6: { title: 'Bus shelter roof collapsed — safety hazard', status: 'in_progress', category: 'Bus Stop', location: 'Great North Rd, Grey Lynn' },
}

// Inline public issue tracker — citizens paste their ticket ID to see the current status
// without needing to sign in or visit the admin panel.
function IssueTracker() {
  const [ticketId, setTicketId] = useState('')
  const [result, setResult] = useState(null)     // found ticket data
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    const id = ticketId.trim()
    if (!id) return
    setLoading(true)
    setResult(null)
    setNotFound(false)
    try {
      // Try the real API first — if it's offline, fall back to local mock data
      const res = await requestsApi.get(id)
      const t = res.data
      if (t && t.id) {
        setResult({ title: t.title, status: t.status, category: t.category, location: t.location_description })
      } else {
        setNotFound(true)
      }
    } catch {
      // Backend offline — check our local mock lookup table
      const numericId = parseInt(id, 10)
      if (MOCK_LOOKUP[numericId]) {
        setResult(MOCK_LOOKUP[numericId])
      } else {
        setNotFound(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="glass p-7 flex flex-col gap-5"
      style={{ border: '1px solid rgba(102,126,234,0.25)' }}
    >
      <div>
        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Track Your Report</h3>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Enter your ticket ID to check the current status of your report.
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={ticketId}
            onChange={(e) => {
              setTicketId(e.target.value)
              setResult(null)
              setNotFound(false)
            }}
            placeholder="e.g. 42 or DEMO-1234"
            className="form-input pl-10 pr-4 text-sm"
            maxLength={20}
          />
        </div>
        <button type="submit" className="btn-primary px-5 text-sm gap-1.5" disabled={loading || !ticketId.trim()}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          {loading ? 'Searching…' : 'Track'}
        </button>
      </form>

      {/* Result card */}
      {result && (
        <div className="glass-sm p-4 flex flex-col gap-3 animate-slide-up">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
              {result.title}
            </p>
            <StatusBadge status={result.status} size="sm" />
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
            {result.category && <span>Category: <strong className="text-slate-300">{result.category}</strong></span>}
            {result.location  && <span>Location: <strong className="text-slate-300">{result.location}</strong></span>}
          </div>
          <p className="text-xs text-slate-500">
            {result.status === 'resolved' || result.status === 'closed'
              ? '✅ This issue has been resolved. Thank you for your report!'
              : result.status === 'in_progress'
                ? '🔧 A crew has been assigned and is working on this issue.'
                : '⏳ Your report is in the queue and will be assigned to a crew soon.'
            }
          </p>
        </div>
      )}

      {/* Not found state */}
      {notFound && (
        <div className="flex items-center gap-2 text-sm text-rose-400 animate-slide-up">
          <AlertCircle size={15} />
          <span>No report found with that ID. Please double-check and try again.</span>
        </div>
      )}
    </div>
  )
}

const STATS = [
  { label: 'Issues Reported', value: '1,240+', icon: MapPin, color: '#667eea', bg: 'rgba(102,126,234,0.1)' },
  { label: 'Issues Resolved', value: '980+', icon: CheckCircle2, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { label: 'Avg. Response Time', value: '3 days', icon: Clock, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  { label: 'Community Members', value: '5,000+', icon: Users, color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
]

const FEATURES = [
  {
    icon: MapPin,
    title: 'Location-Aware Reporting',
    description: 'Pin the exact location of any public facility issue on an interactive map so crews can find it instantly.',
    color: '#667eea',
    bg: 'rgba(102,126,234,0.1)',
  },
  {
    icon: Bell,
    title: 'Real-Time Notifications',
    description: 'Get email updates when your report is acknowledged, assigned, and resolved by the council team.',
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.1)',
  },
  {
    icon: ShieldCheck,
    title: 'Privacy-First Design',
    description: 'Report anonymously or with your details. We never share your personal information without consent.',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
  },
  {
    icon: Users,
    title: 'Community Driven',
    description: 'Built in alignment with Te Tiriti o Waitangi — partnership, participation, and protection for all.',
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.1)',
  },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Spot the Issue',
    description: 'Find a broken streetlight, damaged footpath, or any public facility problem.',
    icon: Zap,
    color: '#667eea',
  },
  {
    step: '02',
    title: 'Submit a Report',
    description: 'Fill out our simple form with a description, location, and optional photo.',
    icon: Construction,
    color: '#06b6d4',
  },
  {
    step: '03',
    title: 'Track Progress',
    description: 'Monitor your report status from Pending through to Resolved in real time.',
    icon: CheckCircle2,
    color: '#10b981',
  },
]

const RECENT_CATEGORIES = [
  { label: 'Streetlights', icon: Zap, count: 142, color: '#f59e0b' },
  { label: 'Parks', icon: Trees, count: 98, color: '#10b981' },
  { label: 'Roads', icon: Construction, count: 210, color: '#ef4444' },
]

export default function HomePage() {
  return (
    <div className="animate-fade-in">

      <section className="relative pt-24 pb-20 overflow-hidden">
        <div className="section-container relative z-10">
          <div className="flex flex-col items-center text-center gap-8 max-w-3xl mx-auto">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold text-indigo-300 animate-slide-up"
              style={{ background: 'rgba(102,126,234,0.1)', borderColor: 'rgba(102,126,234,0.3)' }}
            >
              <Star size={12} fill="currentColor" />
              Public Facility Maintenance Platform — Aotearoa New Zealand
            </div>

            <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <h1
                className="text-5xl sm:text-6xl font-extrabold leading-[1.1] tracking-tight text-balance"
                style={{ color: 'var(--text-primary)' }}
              >
                Report Public Issues.{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 40%, #06b6d4 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Drive Real Change.
                </span>
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-balance max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
                FixItPublic connects communities with local councils to report, track, and resolve
                public facility maintenance issues — from broken streetlights to damaged footpaths.
              </p>
            </div>

            <div
              className="flex flex-col sm:flex-row items-center gap-4 animate-slide-up"
              style={{ animationDelay: '0.2s' }}
            >
              <Link to="/report" className="btn-primary text-base px-8 py-4 gap-2">
                Report an Issue
                <ArrowRight size={18} />
              </Link>
              <Link to="/requests" className="btn-secondary text-base px-8 py-4">
                Browse Reports
              </Link>
            </div>

            <div
              className="flex flex-wrap justify-center gap-6 pt-4 animate-fade-in"
              style={{ animationDelay: '0.3s' }}
            >
              {RECENT_CATEGORIES.map((cat) => {
                const Icon = cat.icon
                return (
                  <div key={cat.label} className="flex items-center gap-2 text-sm text-slate-400">
                    <Icon size={14} style={{ color: cat.color }} />
                    <span className="font-semibold text-slate-200">{cat.count}</span>
                    <span>{cat.label} reported</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(102,126,234,0.12) 0%, transparent 70%)' }}
        />
      </section>

      <section className="py-12 border-y border-white/[0.05]">
        <div className="section-container">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map((stat) => {
              const Icon = stat.icon
              return (
                <div
                  key={stat.label}
                  className="glass p-6 flex flex-col gap-3 hover:scale-[1.02] transition-transform duration-200"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: stat.bg }}
                  >
                    <Icon size={20} style={{ color: stat.color }} />
                  </div>
                  <div>
                    <p
                      className="text-2xl font-extrabold"
                      style={{ color: stat.color }}
                    >
                      {stat.value}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="section-container">
          <div className="text-center mb-12">
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: '#667eea' }}
            >
              Simple Process
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
              How it works
            </h2>
            <p className="mt-3 max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Three simple steps to turn a community problem into a council priority.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 relative">
            <div
              className="hidden sm:block absolute top-[52px] left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-px"
              style={{ background: 'linear-gradient(90deg, rgba(102,126,234,0.3), rgba(6,182,212,0.3))' }}
            />

            {HOW_IT_WORKS.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={step.step} className="glass p-7 flex flex-col gap-4 relative animate-slide-up"
                  style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${step.color}20, ${step.color}10)`,
                        border: `1px solid ${step.color}40`,
                      }}
                    >
                      <Icon size={22} style={{ color: step.color }} />
                    </div>
                    <span
                      className="text-6xl font-black select-none leading-none"
                      style={{
                        background: `linear-gradient(135deg, ${step.color}, ${step.color}80)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        filter: `drop-shadow(0 0 12px ${step.color}50)`,
                      }}
                    >
                      {step.step}
                    </span>
                  </div>
                  <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{step.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-white/[0.05]">
        <div className="section-container">
          <div className="text-center mb-12">
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: '#06b6d4' }}
            >
              Why FixItPublic
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
              Built for every community
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon
              return (
                <div
                  key={feat.title}
                  className="glass glass-hover p-6 flex flex-col gap-4 animate-slide-up"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: feat.bg }}
                  >
                    <Icon size={20} style={{ color: feat.color }} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-100">{feat.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{feat.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Public issue tracker section — lets citizens check their report status
          without logging in, improving transparency and reducing support enquiries. */}
      <section className="py-20 border-t border-white/[0.05]">
        <div className="section-container">
          <div className="max-w-2xl mx-auto flex flex-col gap-8">
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#a855f7' }}>
                Transparency
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
                Already submitted a report?
              </h2>
              <p className="mt-3" style={{ color: 'var(--text-secondary)' }}>
                Use your ticket ID to see the latest status — no account needed.
              </p>
            </div>
            <IssueTracker />
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="section-container">
          <div
            className="relative rounded-3xl overflow-hidden p-10 sm:p-16 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(102,126,234,0.15) 0%, rgba(168,85,247,0.1) 50%, rgba(6,182,212,0.08) 100%)',
              border: '1px solid rgba(102,126,234,0.25)',
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at center, rgba(102,126,234,0.12) 0%, transparent 70%)' }}
            />
            <div className="relative z-10 flex flex-col items-center gap-6">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100 text-balance">
                See something that needs fixing?
              </h2>
              <p className="text-slate-400 max-w-md text-balance">
                Your report takes less than 2 minutes and directly helps your local community.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/report" className="btn-primary px-8 py-4 text-base gap-2">
                  Report Now
                  <ChevronRight size={18} />
                </Link>
                <Link to="/requests" className="btn-secondary px-8 py-4 text-base">
                  View All Reports
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
