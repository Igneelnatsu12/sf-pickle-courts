
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUpRight,
  MapPin,
  Menu,
  Search,
  X,
  Send,
  CheckCircle2,
} from 'lucide-react'
import { STARTER_COURTS, type Court } from './courts'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import AdminApp from './AdminApp'
import './styles.css'

const DEVICE_ID_STORAGE_KEY = 'sf-pickle-courts-device-id'

function createDeviceUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16)
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16)
  })
}

type VenueClickType = 'website' | 'facebook' | 'location'

function getDeviceId(): string {
  try {
    const existingId = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY)
    if (existingId) return existingId

    const newId = createDeviceUuid()

    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, newId)
    return newId
  } catch {
    // Storage may be unavailable in private/restricted browser contexts.
    return createDeviceUuid()
  }
}

function getDeviceDetails() {
  const userAgent = navigator.userAgent || ''
  const platform = navigator.platform || ''
  const ua = userAgent.toLowerCase()

  let deviceType = 'desktop'
  if (/ipad|tablet|playbook|silk/.test(ua) ||
      (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    deviceType = 'tablet'
  } else if (/mobi|iphone|ipod|android/.test(ua)) {
    deviceType = 'mobile'
  }

  let operatingSystem = 'Unknown'
  if (/iphone|ipad|ipod/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    operatingSystem = 'iOS'
  } else if (/android/.test(ua)) {
    operatingSystem = 'Android'
  } else if (/windows/.test(ua)) {
    operatingSystem = 'Windows'
  } else if (/macintosh|mac os/.test(ua) || /mac/i.test(platform)) {
    operatingSystem = 'macOS'
  } else if (/linux/.test(ua) || /linux/i.test(platform)) {
    operatingSystem = 'Linux'
  }

  let browser = 'Unknown'
  if (/edg\//.test(ua)) browser = 'Edge'
  else if (/opr\//.test(ua) || /opera/.test(ua)) browser = 'Opera'
  else if (/samsungbrowser/.test(ua)) browser = 'Samsung Internet'
  else if (/crios|chrome\//.test(ua)) browser = 'Chrome'
  else if (/fxios|firefox\//.test(ua)) browser = 'Firefox'
  else if (/safari\//.test(ua)) browser = 'Safari'

  return { deviceType, operatingSystem, browser }
}

function PickleballMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="21" />
        <g fill="#183f30">
          <circle cx="17" cy="14" r="2.4" />
          <circle cx="29" cy="12" r="2.4" />
          <circle cx="34" cy="23" r="2.4" />
          <circle cx="25" cy="31" r="2.4" />
          <circle cx="13" cy="27" r="2.4" />
          <circle cx="23" cy="21" r="2.4" />
        </g>
      </svg>
    </span>
  )
}

type SuggestionForm = {
  venue_name: string
  location: string
  description: string
  website_url: string
  facebook_url: string
  location_url: string
  suggested_by: string
  contact_info: string
}

type FeedbackForm = {
  category: 'improvement' | 'bug' | 'feature' | 'other'
  message: string
  submitted_by: string
  contact_info: string
}

const initialSuggestion: SuggestionForm = {
  venue_name: '',
  location: '',
  description: '',
  website_url: '',
  facebook_url: '',
  location_url: '',
  suggested_by: '',
  contact_info: '',
}

const initialFeedback: FeedbackForm = {
  category: 'improvement',
  message: '',
  submitted_by: '',
  contact_info: '',
}

export default function App() {
  const [query, setQuery] = useState('')
  const [courts, setCourts] = useState<Court[]>(STARTER_COURTS)
  const [adminRoute, setAdminRoute] = useState(
    window.location.pathname === '/admin' || window.location.hash === '#admin'
  )
  const [directoryLoading, setDirectoryLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null)

  const [activeForm, setActiveForm] = useState<'suggestion' | 'feedback' | null>(null)
  const [suggestion, setSuggestion] = useState<SuggestionForm>(initialSuggestion)
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false)
  const [suggestionMessage, setSuggestionMessage] = useState('')
  const [suggestionSuccess, setSuggestionSuccess] = useState(false)

  const [feedback, setFeedback] = useState<FeedbackForm>(initialFeedback)
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackSuccess, setFeedbackSuccess] = useState(false)

  const searchRef = useRef<HTMLInputElement>(null)

  const trackVenueClick = (venueName: string, clickType: VenueClickType) => {
    if (!supabase || !isSupabaseConfigured) return

    const device = getDeviceDetails()
    const event = {
      device_id: getDeviceId(),
      venue_name: venueName,
      click_type: clickType,
      device_type: device.deviceType,
      operating_system: device.operatingSystem,
      browser: device.browser,
    }

    // Fire the analytics insert without delaying the visitor's navigation.
    void supabase.from('venue_click_events').insert(event).then(({ error }) => {
      if (error) console.error('Could not record venue click:', error.message)
    })
  }

  const filteredCourts = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    if (!normalized) return courts

    return courts.filter((court) =>
      [court.name, court.location, court.description, court.tag]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    )
  }, [query, courts])

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return

    setDirectoryLoading(true)

    supabase
      .from('courts')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .order('name')
      .then(({ data, error }) => {
        if (error) {
          console.error('Could not load court directory:', error.message)
          return
        }

        if (data) {
          setCourts(
            data.map((c: any) => ({
              id: c.id,
              name: c.name,
              location: c.location || '',
              description: c.description || '',
              url: c.website_url || undefined,
              facebookUrl: c.facebook_url || undefined,
              locationUrl: c.location_url || undefined,
              logo:
                c.logo_url ||
                STARTER_COURTS.find((starter) => starter.name === c.name)?.logo ||
                '',
              tag: c.tag || 'Visit website',
              initials: c.initials || c.name.slice(0, 2).toUpperCase(),
              accent: c.accent || 'lime',
            }))
          )
        }
      })
      .then(
  () => setDirectoryLoading(false),
  () => setDirectoryLoading(false)
)
  }, [])

  useEffect(() => {
    const onPopState = () =>
      setAdminRoute(
        window.location.pathname === '/admin' ||
        window.location.hash === '#admin'
      )

    window.addEventListener('popstate', onPopState)

    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedCourt(null)
        setActiveForm(null)
      }

      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === 'k'
      ) {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const goAdmin = () => {
    window.history.pushState({}, '', '/admin')
    setAdminRoute(true)
    window.scrollTo(0, 0)
  }

  const goPublic = () => {
    window.history.pushState({}, '', '/')
    setAdminRoute(false)
    window.scrollTo(0, 0)
  }

  const closeMenu = () => setMenuOpen(false)

  const updateSuggestion = (field: keyof SuggestionForm, value: string) => {
    setSuggestion((current) => ({ ...current, [field]: value }))
  }

  const submitSuggestion = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSuggestionMessage('')
    setSuggestionSuccess(false)

    if (!supabase || !isSupabaseConfigured) {
      setSuggestionMessage('The suggestion service is currently unavailable. Please try again later.')
      return
    }

    setSubmittingSuggestion(true)
    try {
      const { error } = await supabase.from('court_suggestions').insert({
        venue_name: suggestion.venue_name.trim(),
        location: suggestion.location.trim(),
        description: suggestion.description.trim() || null,
        website_url: suggestion.website_url.trim() || null,
        facebook_url: suggestion.facebook_url.trim() || null,
        location_url: suggestion.location_url.trim() || null,
        suggested_by: suggestion.suggested_by.trim() || null,
        contact_info: suggestion.contact_info.trim() || null,
        status: 'pending',
      })

      if (error) throw error

      setSuggestion(initialSuggestion)
      setSuggestionSuccess(true)
      setSuggestionMessage('Thank you! Your venue suggestion has been submitted for review.')
    } catch (error) {
      console.error('Could not submit court suggestion:', error)
      setSuggestionSuccess(false)
      setSuggestionMessage('We could not submit your suggestion. Please try again.')
    } finally {
      setSubmittingSuggestion(false)
    }
  }

  const submitFeedback = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedbackMessage('')
    setFeedbackSuccess(false)

    if (!supabase || !isSupabaseConfigured) {
      setFeedbackMessage('The feedback service is currently unavailable. Please try again later.')
      return
    }

    setSubmittingFeedback(true)
    try {
      const { error } = await supabase.from('site_feedback').insert({
        category: feedback.category,
        message: feedback.message.trim(),
        submitted_by: feedback.submitted_by.trim() || null,
        contact_info: feedback.contact_info.trim() || null,
        status: 'new',
      })

      if (error) throw error

      setFeedback(initialFeedback)
      setFeedbackSuccess(true)
      setFeedbackMessage('Thank you! Your feedback has been submitted.')
    } catch (error) {
      console.error('Could not submit feedback:', error)
      setFeedbackSuccess(false)
      setFeedbackMessage('We could not submit your feedback. Please try again.')
    } finally {
      setSubmittingFeedback(false)
    }
  }

  if (adminRoute) return <AdminApp onBack={goPublic} />

  return (
    <>
      <header className={`site-header${menuOpen ? ' menu-open' : ''}`}>
        <a
          className="brand"
          href="#top"
          aria-label="SF Pickle Courts home"
          onClick={closeMenu}
        >
          <PickleballMark />
          <span className="brand-type">
            <strong>SF PICKLE</strong>
            <small>COURTS DIRECTORY</small>
          </span>
        </a>

        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#courts" onClick={closeMenu}>Find courts</a>
          <a className="nav-cta" href="#courts" onClick={closeMenu}>
            Explore venues <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </nav>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-text">
            <div className="eyebrow">
              <span className="eyebrow-dot" /> SAN FRANCISCO, AGUSAN DEL SUR
            </div>

            <h1>
              Main court full?<br />
              <em>Find your next game here.</em>
            </h1>

            <p className="hero-copy">
              Your go-to guide to San Francisco pickleball courts.
              Explore local venues, check their details, and find another
              place to play when your usual court is fully booked.
            </p>

            <a className="button button-light" href="#courts">
              Explore all courts <ArrowDown size={16} />
            </a>

            <div className="hero-note">
              <span className="note-icon">✳</span>
              <span>
                More courts. More options.<br />
                <strong>Never miss your next game.</strong>
              </span>
            </div>
          </div>

          <div className="hero-art" aria-label="Illustration of a pickleball court">
            <div className="art-sun" />
            <div className="court-lines">
              <div className="court-center" />
              <div className="court-net" />
              <div className="kitchen kitchen-left" />
              <div className="kitchen kitchen-right" />
            </div>
            <div className="ball ball-one">
              <span /><span /><span /><span /><span />
            </div>
            <div className="art-stamp">PLAY<br />LOCAL <b>↗</b></div>
            <div className="art-caption">GOOD GAMES<br />HAPPEN HERE.</div>
          </div>

          <div className="hero-bottom">
            <span>01 / DISCOVER</span>
            <span>02 / CHOOSE A COURT</span>
            <span>03 / BOOK DIRECT</span>
          </div>
        </section>

        <section className="directory section-wrap" id="courts">
          <div className="section-heading">
            <div>
              <div className="eyebrow dark-eyebrow">THE LOCAL LINEUP</div>
              <h2>Find your <em>court.</em></h2>
              <p className="section-copy">
                Browse the courts around San Francisco and head straight to
                their official page to make a booking.
              </p>
            </div>

            <div className="court-count">
              <strong>{String(filteredCourts.length).padStart(2, '0')}</strong>
              <span>VENUES<br />TO EXPLORE</span>
            </div>
          </div>

          <div className="toolbar">
            <label className="search-box">
              <Search className="search-icon" size={19} aria-hidden="true" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search courts by name…"
                aria-label="Search courts by name"
              />
              <kbd>⌘ K</kbd>
            </label>

            <div className="toolbar-label">
              <span className="live-dot" />
              {directoryLoading ? 'LOADING COURTS…' : 'DIRECT LINKS · NO MIDDLEMAN'}
            </div>
          </div>

          {filteredCourts.length > 0 ? (
            <div className="court-grid" aria-live="polite">
              {filteredCourts.map((court, index) => (
                <article
                  className="court-card court-card-clickable"
                  style={{ '--card-index': index } as React.CSSProperties}
                  key={court.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`View links for ${court.name}`}
                  onClick={() => setSelectedCourt(court)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedCourt(court)
                    }
                  }}
                >
                  <div className="card-topline">
                    <span className="venue-index">
                      COURT {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="venue-tag"><i />{court.tag}</span>
                  </div>

                  <div className="venue-identity">
                    <img
                      className="venue-logo"
                      src={court.logo}
                      alt={`${court.name} logo`}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none'
                      }}
                    />
                    <div className="venue-details">
                      <h3>{court.name}</h3>
                      <p className="venue-location">
                        <MapPin size={13} aria-hidden="true" /> {court.location}
                      </p>
                    </div>
                  </div>

                  <p className="venue-description">{court.description}</p>

                  <div className="card-footer">
                    <span className="direct-label">
                      <ArrowUpRight size={13} aria-hidden="true" /> View venue links
                    </span>
                    <span className="visit-button">
                      View details <ArrowUpRight size={14} aria-hidden="true" />
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-ball">●</div>
              <h3>No courts found</h3>
              <p>Try another name or clear your search.</p>
              <button
                className="text-button"
                onClick={() => {
                  setQuery('')
                  searchRef.current?.focus()
                }}
              >
                Clear search ↗
              </button>
            </div>
          )}

          <section className="community-section" aria-label="Community contributions">
            <div className="community-intro">
              <div className="eyebrow dark-eyebrow">BUILT WITH THE COMMUNITY</div>
              <h2>Help us make this <em>better.</em></h2>
              <p className="section-copy">
                Know a venue we're missing or have an idea to improve this directory?
                We'd love to hear from you.
              </p>
            </div>

            <div className="community-actions">
              <div className="community-action-card">
                <span className="community-action-icon"><MapPin size={21} /></span>
                <div>
                  <strong>Know a court we're missing?</strong>
                  <p>Suggest a new pickleball venue to add to the directory.</p>
                </div>
                <button type="button" className="button button-dark" onClick={() => {
                  setSuggestionMessage('')
                  setSuggestionSuccess(false)
                  setActiveForm('suggestion')
                }}>
                  Suggest a court <ArrowUpRight size={14} />
                </button>
              </div>

              <div className="community-action-card">
                <span className="community-action-icon"><Send size={20} /></span>
                <div>
                  <strong>Have feedback or an idea?</strong>
                  <p>Tell us what to improve, report a problem, or suggest a feature.</p>
                </div>
                <button type="button" className="button button-dark" onClick={() => {
                  setFeedbackMessage('')
                  setFeedbackSuccess(false)
                  setActiveForm('feedback')
                }}>
                  Send feedback <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          </section>
</section>
      </main>

      {activeForm && (
        <div className="community-modal-backdrop" role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !submittingSuggestion && !submittingFeedback) {
              setActiveForm(null)
            }
          }}>
          <section className="community-modal" role="dialog" aria-modal="true"
            aria-labelledby="community-modal-title">
            <button className="community-modal-close" type="button"
              onClick={() => setActiveForm(null)}
              aria-label="Close form"
              disabled={submittingSuggestion || submittingFeedback}>
              <X size={20} />
            </button>

            {activeForm === 'suggestion' ? (
              <>
                <div className="community-modal-kicker">GROW THE LOCAL LINEUP</div>
                <h2 id="community-modal-title">Suggest a <em>court.</em></h2>
                <p className="community-modal-copy">
                  Know a pickleball venue that isn't listed yet? Share its details below.
                </p>

                <form className="community-modal-form" onSubmit={submitSuggestion}>
                  <div className="community-form-grid">
                    <label className="suggestion-field">
                      <span>Venue name *</span>
                      <input type="text" value={suggestion.venue_name}
                        onChange={(event) => updateSuggestion('venue_name', event.target.value)}
                        placeholder="e.g. New pickleball court" required maxLength={150} />
                    </label>
                    <label className="suggestion-field">
                      <span>Location *</span>
                      <input type="text" value={suggestion.location}
                        onChange={(event) => updateSuggestion('location', event.target.value)}
                        placeholder="Street, barangay, or municipality" required maxLength={250} />
                    </label>
                    <label className="suggestion-field community-field-full">
                      <span>Description (optional)</span>
                      <textarea value={suggestion.description}
                        onChange={(event) => updateSuggestion('description', event.target.value)}
                        placeholder="Tell us a little about this venue..." rows={3} maxLength={1000} />
                    </label>
                    <label className="suggestion-field">
                      <span>Website / booking link</span>
                      <input type="url" value={suggestion.website_url}
                        onChange={(event) => updateSuggestion('website_url', event.target.value)}
                        placeholder="https://..." />
                    </label>
                    <label className="suggestion-field">
                      <span>Facebook page</span>
                      <input type="url" value={suggestion.facebook_url}
                        onChange={(event) => updateSuggestion('facebook_url', event.target.value)}
                        placeholder="https://facebook.com/..." />
                    </label>
                    <label className="suggestion-field community-field-full">
                      <span>Google Maps link</span>
                      <input type="url" value={suggestion.location_url}
                        onChange={(event) => updateSuggestion('location_url', event.target.value)}
                        placeholder="Paste the Google Maps link" />
                    </label>
                    <label className="suggestion-field">
                      <span>Your name (optional)</span>
                      <input type="text" value={suggestion.suggested_by}
                        onChange={(event) => updateSuggestion('suggested_by', event.target.value)}
                        placeholder="Your name" maxLength={150} />
                    </label>
                    <label className="suggestion-field">
                      <span>Contact information (optional)</span>
                      <input type="text" value={suggestion.contact_info}
                        onChange={(event) => updateSuggestion('contact_info', event.target.value)}
                        placeholder="Email or phone number" maxLength={200} />
                    </label>
                  </div>

                  {suggestionMessage && (
                    <div className={`suggestion-feedback ${suggestionSuccess ? 'suggestion-feedback-success' : 'suggestion-feedback-error'}`} role="status">
                      {suggestionSuccess ? <CheckCircle2 size={18} /> : <X size={18} />}
                      <span>{suggestionMessage}</span>
                    </div>
                  )}
                  <div className="community-form-footer">
                    <span>Suggestions are reviewed before appearing in the directory.</span>
                    <button className="button button-dark" type="submit" disabled={submittingSuggestion}>
                      {submittingSuggestion ? 'Submitting...' : 'Submit suggestion'}
                      <Send size={15} />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="community-modal-kicker">YOUR VOICE MATTERS</div>
                <h2 id="community-modal-title">Send us <em>feedback.</em></h2>
                <p className="community-modal-copy">
                  Tell us what could be better, report an issue, or share an idea.
                </p>
                <form className="community-modal-form" onSubmit={submitFeedback}>
                  <label className="suggestion-field">
                    <span>Feedback category *</span>
                    <select value={feedback.category}
                      onChange={(event) => setFeedback((current) => ({
                        ...current,
                        category: event.target.value as FeedbackForm['category'],
                      }))}>
                      <option value="improvement">Improvement</option>
                      <option value="bug">Bug / Problem</option>
                      <option value="feature">New feature idea</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label className="suggestion-field community-feedback-message">
                    <span>Your feedback *</span>
                    <textarea value={feedback.message}
                      onChange={(event) => setFeedback((current) => ({ ...current, message: event.target.value }))}
                      placeholder="What should we improve? Share as much detail as you like..."
                      rows={6} required maxLength={3000} />
                  </label>
                  <div className="community-form-grid">
                    <label className="suggestion-field">
                      <span>Your name (optional)</span>
                      <input type="text" value={feedback.submitted_by}
                        onChange={(event) => setFeedback((current) => ({ ...current, submitted_by: event.target.value }))}
                        placeholder="Your name" maxLength={150} />
                    </label>
                    <label className="suggestion-field">
                      <span>Contact information (optional)</span>
                      <input type="text" value={feedback.contact_info}
                        onChange={(event) => setFeedback((current) => ({ ...current, contact_info: event.target.value }))}
                        placeholder="Email or phone number" maxLength={200} />
                    </label>
                  </div>
                  {feedbackMessage && (
                    <div className={`suggestion-feedback ${feedbackSuccess ? 'suggestion-feedback-success' : 'suggestion-feedback-error'}`} role="status">
                      {feedbackSuccess ? <CheckCircle2 size={18} /> : <X size={18} />}
                      <span>{feedbackMessage}</span>
                    </div>
                  )}
                  <div className="community-form-footer">
                    <span>Thank you for helping improve SF Pickle Courts.</span>
                    <button className="button button-dark" type="submit" disabled={submittingFeedback}>
                      {submittingFeedback ? 'Submitting...' : 'Send feedback'}
                      <Send size={15} />
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      )}

      {selectedCourt && (
        <div
          className="venue-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedCourt(null)
            }
          }}
        >
          <section
            className="venue-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="venue-modal-title"
          >
            <button
              className="venue-modal-close"
              type="button"
              onClick={() => setSelectedCourt(null)}
              aria-label="Close venue details"
            >
              <X size={20} />
            </button>

            <div className="venue-modal-heading">
              <img
                src={selectedCourt.logo}
                alt=""
                className="venue-modal-logo"
              />
              <div>
                <span className="venue-modal-kicker">VENUE DETAILS</span>
                <h2 id="venue-modal-title">{selectedCourt.name}</h2>
                <p><MapPin size={14} /> {selectedCourt.location}</p>
              </div>
            </div>

            <p className="venue-modal-description">
              {selectedCourt.description}
            </p>

            <div className="venue-link-list">
              {selectedCourt.url ? (
                <a
                  className="venue-link-row venue-link-primary"
                  href={selectedCourt.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackVenueClick(selectedCourt.name, 'website')}
                >
                  <span className="venue-link-icon">
                    <ArrowUpRight size={18} />
                  </span>
                  <span>
                    <strong>Website Booking</strong>
                    <small>Visit the venue's official page or book directly</small>
                  </span>
                  <ArrowUpRight size={17} />
                </a>
              ) : (
                <div className="venue-link-row venue-link-unavailable">
                  <span className="venue-link-icon">
                    <ArrowUpRight size={18} />
                  </span>
                  <span>
                    <strong>Website Booking</strong>
                    <small>Booking link will be added when available</small>
                  </span>
                  <span className="link-pending">Coming soon</span>
                </div>
              )}

              {selectedCourt.facebookUrl ? (
                <a
                  className="venue-link-row"
                  href={selectedCourt.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackVenueClick(selectedCourt.name, 'facebook')}
                >
                  <span className="venue-link-icon facebook-icon">f</span>
                  <span>
                    <strong>Facebook</strong>
                    <small>Visit the venue's Facebook page</small>
                  </span>
                  <ArrowUpRight size={17} />
                </a>
              ) : (
                <div className="venue-link-row venue-link-unavailable">
                  <span className="venue-link-icon facebook-icon">f</span>
                  <span>
                    <strong>Facebook</strong>
                    <small>Link will be added when available</small>
                  </span>
                  <span className="link-pending">Coming soon</span>
                </div>
              )}

              <a
                className="venue-link-row"
                href={
                  selectedCourt.locationUrl ||
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${selectedCourt.name}, ${selectedCourt.location}, Philippines`
                  )}`
                }
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackVenueClick(selectedCourt.name, 'location')}
              >
                <span className="venue-link-icon">
                  <MapPin size={18} />
                </span>
                <span>
                  <strong>Location</strong>
                  <small>Open directions in Google Maps</small>
                </span>
                <ArrowUpRight size={17} />
              </a>
            </div>

            <p className="venue-modal-note">
              SF Pickle Courts is a directory. Bookings are handled directly
              by each venue.
            </p>
          </section>
        </div>
      )}

      <footer className="site-footer">
        <a className="brand footer-brand" href="#top">
          <PickleballMark />
          <span className="brand-type">
            <strong>SF PICKLE</strong>
            <small>COURTS DIRECTORY</small>
          </span>
        </a>

        <p>
          Made for the love of the game.{' '}
          <span>© {new Date().getFullYear()} SF Pickle Courts</span>
        </p>

        <div className="footer-actions">
          <button
            type="button"
            className="admin-footer-link"
            onClick={goAdmin}
          >
            Admin
          </button>
          <a href="#top" className="back-top">BACK TO TOP ↑</a>
        </div>
      </footer>
    </>
  )
}
