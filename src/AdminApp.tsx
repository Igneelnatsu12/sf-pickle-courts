
import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  ArrowLeft,
  ImagePlus,
  LogOut,
  Plus,
  Save,
  Trash2,
  UploadCloud,
  MessageSquare,
  MapPin,
  RefreshCw,
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import './admin.css'

type DbCourt = {
  id: string
  name: string
  location: string
  description: string | null
  website_url: string | null
  facebook_url: string | null
  location_url: string | null
  logo_url: string | null
  tag: string | null
  initials: string | null
  accent: 'lime' | 'orange' | 'cream'
  is_active: boolean
  sort_order: number
}

type Draft = {
  id?: string
  name: string
  location: string
  description: string
  website_url: string
  facebook_url: string
  location_url: string
  logo_url: string
  tag: string
  initials: string
  accent: 'lime' | 'orange' | 'cream'
  is_active: boolean
  sort_order: number
}

const emptyDraft: Draft = {
  name: '',
  location: 'San Francisco, Agusan del Sur',
  description: '',
  website_url: '',
  facebook_url: '',
  location_url: '',
  logo_url: '',
  tag: 'Online booking',
  initials: '',
  accent: 'lime',
  is_active: true,
  sort_order: 1,
}

const toDraft = (c: DbCourt): Draft => ({
  id: c.id,
  name: c.name,
  location: c.location,
  description: c.description || '',
  website_url: c.website_url || '',
  facebook_url: c.facebook_url || '',
  location_url: c.location_url || '',
  logo_url: c.logo_url || '',
  tag: c.tag || 'Visit website',
  initials: c.initials || '',
  accent: c.accent,
  is_active: c.is_active,
  sort_order: c.sort_order,
})

type CourtSuggestion = {
  id: string
  venue_name: string
  location: string
  description: string | null
  website_url: string | null
  facebook_url: string | null
  location_url: string | null
  suggested_by: string | null
  contact_info: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

type SiteFeedback = {
  id: string
  category: 'improvement' | 'bug' | 'feature' | 'other'
  message: string
  submitted_by: string | null
  contact_info: string | null
  status: 'new' | 'reviewed' | 'resolved'
  created_at: string
}

const displayDate = (date: string) => new Date(date).toLocaleString('en-PH', {
  dateStyle: 'medium', timeStyle: 'short',
})

export default function AdminApp({ onBack }: { onBack: () => void }) {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [courts, setCourts] = useState<DbCourt[]>([])
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [suggestions, setSuggestions] = useState<CourtSuggestion[]>([])
  const [feedback, setFeedback] = useState<SiteFeedback[]>([])
  const [inboxTab, setInboxTab] = useState<'suggestions' | 'feedback'>('suggestions')
  const [inboxLoading, setInboxLoading] = useState(false)
  const [inboxBusyId, setInboxBusyId] = useState<string | null>(null)
  const [inboxError, setInboxError] = useState('')
  const [inboxNotice, setInboxNotice] = useState('')

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, next) => setSession(next)
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) {
      loadCourts()
      loadInbox()
    } else {
      setSuggestions([])
      setFeedback([])
    }
  }, [session])

  async function loadCourts() {
    if (!supabase) return

    setBusy(true)
    setError('')

    const { data, error: queryError } = await supabase
      .from('courts')
      .select('*')
      .order('sort_order')
      .order('name')

    if (queryError) {
      setError(queryError.message)
    } else {
      setCourts((data || []) as DbCourt[])
    }

    setBusy(false)
  }

  async function loadInbox() {
    if (!supabase) return
    setInboxLoading(true)
    setInboxError('')
    const [suggestionResult, feedbackResult] = await Promise.all([
      supabase.from('court_suggestions').select('*').order('created_at', { ascending: false }),
      supabase.from('site_feedback').select('*').order('created_at', { ascending: false }),
    ])
    if (suggestionResult.error || feedbackResult.error) {
      setInboxError([suggestionResult.error?.message, feedbackResult.error?.message]
        .filter(Boolean).join(' | '))
    }
    if (!suggestionResult.error) setSuggestions((suggestionResult.data || []) as CourtSuggestion[])
    if (!feedbackResult.error) setFeedback((feedbackResult.data || []) as SiteFeedback[])
    setInboxLoading(false)
  }

  async function updateInboxStatus(
    table: 'court_suggestions' | 'site_feedback',
    id: string,
    status: string
  ) {
    if (!supabase || inboxBusyId) return
    setInboxBusyId(id)
    setInboxError('')
    setInboxNotice('')
    const { error: updateError } = await supabase.from(table).update({ status }).eq('id', id)
    if (updateError) {
      setInboxError(updateError.message)
    } else {
      setInboxNotice('Submission status updated.')
      await loadInbox()
    }
    setInboxBusyId(null)
  }

  async function deleteInboxItem(
    table: 'court_suggestions' | 'site_feedback', id: string
  ) {
    if (!supabase || inboxBusyId || !window.confirm('Delete this submission permanently?')) return
    setInboxBusyId(id)
    setInboxError('')
    setInboxNotice('')
    const { error: deleteError } = await supabase.from(table).delete().eq('id', id)
    if (deleteError) {
      setInboxError(deleteError.message)
    } else {
      setInboxNotice('Submission deleted.')
      await loadInbox()
    }
    setInboxBusyId(null)
  }

  // Move a court to a new position and shift the other courts automatically.
  async function changeSortOrder(court: DbCourt, requestedPosition: number) {
    if (!supabase || busy) return

    const sorted = [...courts].sort(
      (a, b) => a.sort_order - b.sort_order
    )

    const position = Math.max(
      1,
      Math.min(sorted.length, Math.floor(requestedPosition))
    )

    if (!Number.isFinite(position) || position === court.sort_order) {
      return
    }

    setBusy(true)
    setError('')
    setNotice('')

    const reordered = sorted.filter((c) => c.id !== court.id)
    reordered.splice(position - 1, 0, court)

    for (let i = 0; i < reordered.length; i++) {
      const { error: updateError } = await supabase
        .from('courts')
        .update({ sort_order: i + 1 })
        .eq('id', reordered[i].id)

      if (updateError) {
        setError(`Could not reorder courts: ${updateError.message}`)
        await loadCourts()
        return
      }
    }

    setNotice(`${court.name} moved to position ${position}.`)
    await loadCourts()
  }

  async function signIn(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return

    setBusy(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) setError(error.message)

    setBusy(false)
  }

  async function uploadLogo(file?: File) {
    if (!file || !supabase) return

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Logo must be 5 MB or smaller.')
      return
    }

    setBusy(true)
    setError('')

    const safeName = `${crypto.randomUUID()}-${file.name.replace(
      /[^a-zA-Z0-9._-]/g,
      '-'
    )}`

    const { error: uploadError } = await supabase.storage
      .from('court-logos')
      .upload(safeName, file, { upsert: false })

    if (uploadError) {
      setError(uploadError.message)
    } else {
      const { data } = supabase.storage
        .from('court-logos')
        .getPublicUrl(safeName)

      setDraft((d) => ({ ...d, logo_url: data.publicUrl }))
      setNotice('Logo uploaded. Save the venue to publish it.')
    }

    setBusy(false)
  }

  async function saveCourt(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return

    if (!draft.name.trim()) {
      setError('Court name is required.')
      return
    }

    setBusy(true)
    setError('')
    setNotice('')

    // For a new court, make room at its requested position.
    if (!draft.id) {
      const { data: existing, error: fetchError } = await supabase
        .from('courts')
        .select('id, sort_order')
        .order('sort_order', { ascending: false })

      if (fetchError) {
        setError(fetchError.message)
        setBusy(false)
        return
      }

      const maxPosition = (existing || []).length + 1
      const position = Math.max(
        1,
        Math.min(maxPosition, Math.floor(draft.sort_order || maxPosition))
      )

      // Shift existing courts down, starting from the highest position.
      for (const court of existing || []) {
        if (court.sort_order >= position) {
          const { error: shiftError } = await supabase
            .from('courts')
            .update({ sort_order: court.sort_order + 1 })
            .eq('id', court.id)

          if (shiftError) {
            setError(`Could not make room for the new court: ${shiftError.message}`)
            await loadCourts()
            return
          }
        }
      }

      const payload = {
        name: draft.name.trim(),
        location: draft.location.trim(),
        description: draft.description.trim(),
        website_url: draft.website_url.trim() || null,
        facebook_url: draft.facebook_url.trim() || null,
        location_url: draft.location_url.trim() || null,
        logo_url: draft.logo_url || null,
        tag: draft.tag.trim() || 'Visit website',
        initials:
          draft.initials.trim() || draft.name.slice(0, 2).toUpperCase(),
        accent: draft.accent,
        is_active: draft.is_active,
        sort_order: position,
      }

      const { error: insertError } = await supabase
        .from('courts')
        .insert(payload)

      if (insertError) {
        setError(insertError.message)
      } else {
        setNotice(`Court added successfully at position ${position}.`)
        setEditing(false)
        setDraft(emptyDraft)
        await loadCourts()
      }

      setBusy(false)
      return
    }

    // Editing an existing court keeps its current position.
    const currentCourt = courts.find((c) => c.id === draft.id)

    const payload = {
      name: draft.name.trim(),
      location: draft.location.trim(),
      description: draft.description.trim(),
      website_url: draft.website_url.trim() || null,
      facebook_url: draft.facebook_url.trim() || null,
      location_url: draft.location_url.trim() || null,
      logo_url: draft.logo_url || null,
      tag: draft.tag.trim() || 'Visit website',
      initials:
        draft.initials.trim() || draft.name.slice(0, 2).toUpperCase(),
      accent: draft.accent,
      is_active: draft.is_active,
      sort_order: currentCourt?.sort_order ?? draft.sort_order,
    }

    const { error: updateError } = await supabase
      .from('courts')
      .update(payload)
      .eq('id', draft.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setNotice('Court saved successfully.')
      setEditing(false)
      setDraft(emptyDraft)
      await loadCourts()
    }

    setBusy(false)
  }

  async function deleteCourt(court: DbCourt) {
    if (
      !supabase ||
      !window.confirm(`Delete ${court.name}? This cannot be undone.`)
    ) {
      return
    }

    setBusy(true)
    setError('')
    setNotice('')

    const { error } = await supabase
      .from('courts')
      .delete()
      .eq('id', court.id)

    if (error) {
      setError(error.message)
    } else {
      setNotice(`${court.name} deleted.`)

      // Close the gap left by the deleted court.
      const remaining = courts
        .filter((c) => c.id !== court.id)
        .sort((a, b) => a.sort_order - b.sort_order)

      for (let i = 0; i < remaining.length; i++) {
        const { error: reorderError } = await supabase
          .from('courts')
          .update({ sort_order: i + 1 })
          .eq('id', remaining[i].id)

        if (reorderError) {
          setError(reorderError.message)
          break
        }
      }

      await loadCourts()
    }

    setBusy(false)
  }

  if (!isSupabaseConfigured) {
    return (
      <AdminShell onBack={onBack}>
        <div className="admin-panel">
          <h1>Connect Supabase</h1>
          <p>
            Add your Supabase project URL and anon key to the local{' '}
            <code>.env</code> file, then restart the dev server.
          </p>
          <pre>
            {'VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co\n'}
            {'VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY'}
          </pre>
          <p>Never put a service-role key in this website.</p>
        </div>
      </AdminShell>
    )
  }

  if (loading) {
    return (
      <AdminShell onBack={onBack}>
        <p className="admin-muted">Checking admin session…</p>
      </AdminShell>
    )
  }

  if (!session) {
    return (
      <AdminShell onBack={onBack}>
        <form className="admin-login" onSubmit={signIn}>
          <div className="admin-kicker">PRIVATE AREA</div>
          <h1>Admin <em>login.</em></h1>
          <p>
            Sign in with the admin account created in your Supabase project.
          </p>

          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          {error && <div className="admin-error">{error}</div>}

          <button className="admin-primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in securely'}
          </button>

          <small>
            Public account registration is disabled. Only invited admin
            accounts can sign in.
          </small>
        </form>
      </AdminShell>
    )
  }

  return (
    <AdminShell onBack={onBack}>
      <div className="admin-dashboard">
        <div className="admin-top">
          <div>
            <div className="admin-kicker">SF PICKLE COURTS</div>
            <h1>Manage <em>venues.</em></h1>
            <p>Signed in as {session.user.email}</p>
          </div>

          <button
            className="admin-logout"
            onClick={() => supabase?.auth.signOut()}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>

        {error && <div className="admin-error">{error}</div>}
        {notice && <div className="admin-notice">{notice}</div>}

        {editing ? (
          <form className="admin-editor" onSubmit={saveCourt}>
            <div className="admin-editor-head">
              <h2>{draft.id ? 'Edit court' : 'Add a court'}</h2>
              <button
                type="button"
                className="admin-quiet"
                onClick={() => {
                  setEditing(false)
                  setDraft(emptyDraft)
                }}
              >
                Cancel
              </button>
            </div>

            <div className="admin-form-grid">
              <label>
                Court name *
                <input
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, name: e.target.value }))
                  }
                  required
                />
              </label>

              <label>
                Location / address
                <input
                  value={draft.location}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, location: e.target.value }))
                  }
                />
              </label>

              <label>
                Website / booking URL (Optional)
                <input
                  type="url"
                  placeholder="https://"
                  value={draft.website_url}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, website_url: e.target.value }))
                  }
                />
              </label>

              <label>
                Facebook page URL
                <input
                  type="url"
                  placeholder="https://facebook.com/…"
                  value={draft.facebook_url}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, facebook_url: e.target.value }))
                  }
                />
              </label>

              <label>
                Google Maps / location link
                <input
                  type="url"
                  placeholder="https://maps.google.com/…"
                  value={draft.location_url}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, location_url: e.target.value }))
                  }
                />
              </label>

              <label>
                Short card label
                <input
                  value={draft.tag}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, tag: e.target.value }))
                  }
                  placeholder="Online booking"
                />
              </label>

              <label className="admin-full">
                Description
                <textarea
                  rows={3}
                  value={draft.description}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, description: e.target.value }))
                  }
                />
              </label>

              <div className="admin-full">
                <span className="admin-field-label">Venue logo</span>
                <div className="logo-upload">
                  {draft.logo_url && (
                    <img src={draft.logo_url} alt="Current venue logo" />
                  )}

                  <label className="upload-control">
                    <UploadCloud size={18} /> Upload logo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => uploadLogo(e.target.files?.[0])}
                    />
                  </label>

                  <small>PNG, JPG, SVG or WebP · maximum 5 MB</small>
                </div>
              </div>

              {draft.id ? (
                <label>
                  Sort order
                  <input
                    type="number"
                    value={draft.sort_order}
                    disabled
                  />
                  <small>Change the position directly in the court list.</small>
                </label>
              ) : (
                <label>
                  Sort order / position
                  <input
                    type="number"
                    min="1"
                    max={courts.length + 1}
                    value={draft.sort_order}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        sort_order: Number(e.target.value),
                      }))
                    }
                  />
                  <small>
                    Choose where this new court should appear.
                  </small>
                </label>
              )}

              <label>
                Logo accent
                <select
                  value={draft.accent}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      accent: e.target.value as Draft['accent'],
                    }))
                  }
                >
                  <option value="lime">Lime</option>
                  <option value="orange">Orange</option>
                  <option value="cream">Cream</option>
                </select>
              </label>

              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={draft.is_active}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      is_active: e.target.checked,
                    }))
                  }
                />
                Show this venue on the public directory
              </label>
            </div>

            <button className="admin-primary" disabled={busy}>
              <Save size={16} /> {busy ? 'Saving…' : 'Save court'}
            </button>
          </form>
        ) : (
          <>
            <div className="admin-summary">
              <strong>{courts.length}</strong>
              <span>registered venues</span>
              <button
                className="admin-primary"
                disabled={busy}
                onClick={() => {
                  const nextPosition =
                    Math.max(0, ...courts.map((c) => c.sort_order)) + 1

                  setDraft({
                    ...emptyDraft,
                    sort_order: nextPosition,
                  })
                  setEditing(true)
                  setError('')
                  setNotice('')
                }}
              >
                <Plus size={17} /> Add new court
              </button>
            </div>

            <div className="admin-list">
              {courts
                .slice()
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((c) => (
                  <article className="admin-court" key={c.id}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <label
                        style={{
                          fontSize: '11px',
                          color: '#64746a',
                          display: 'grid',
                          gap: '4px',
                        }}
                      >
                        POSITION
                        <input
                          type="number"
                          min="1"
                          max={courts.length}
                          defaultValue={c.sort_order}
                          disabled={busy}
                          aria-label={`Position of ${c.name}`}
                          style={{
                            width: '55px',
                            padding: '7px 4px',
                            border: '1px solid #d9ded7',
                            borderRadius: '5px',
                            textAlign: 'center',
                          }}
                          onBlur={(e) => {
                            const newPosition = Number(e.target.value)

                            if (
                              Number.isFinite(newPosition) &&
                              newPosition !== c.sort_order
                            ) {
                              changeSortOrder(c, newPosition)
                            } else {
                              e.target.value = String(c.sort_order)
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur()
                            }
                          }}
                        />
                      </label>
                    </div>

                    {c.logo_url ? (
                      <img src={c.logo_url} alt="" />
                    ) : (
                      <div className="admin-logo-placeholder">
                        <ImagePlus />
                      </div>
                    )}

                    <div className="admin-court-info">
                      <strong>{c.name}</strong>
                      <span>{c.location}</span>
                      <small>
                        {c.is_active
                          ? 'Visible on directory'
                          : 'Hidden from directory'}
                      </small>
                    </div>

                    <button
                      className="admin-quiet"
                      disabled={busy}
                      onClick={() => {
                        setDraft(toDraft(c))
                        setEditing(true)
                        setError('')
                        setNotice('')
                      }}
                    >
                      Edit
                    </button>

                    <button
                      className="admin-delete"
                      disabled={busy}
                      aria-label={`Delete ${c.name}`}
                      onClick={() => deleteCourt(c)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </article>
                ))}
            </div>
          </>
        )}

        <section className="community-inbox" aria-labelledby="community-inbox-title">
          <div className="community-inbox-header">
            <div>
              <div className="admin-kicker">COMMUNITY</div>
              <h2 id="community-inbox-title">Community Inbox</h2>
              <p>Review court suggestions and website feedback submitted by visitors.</p>
            </div>
            <button type="button" className="admin-quiet" onClick={loadInbox} disabled={inboxLoading}>
              <RefreshCw size={15} /> {inboxLoading ? 'Refreshing…' : 'Refresh inbox'}
            </button>
          </div>

          <div className="community-inbox-tabs" role="tablist" aria-label="Community submissions">
            <button type="button" role="tab" aria-selected={inboxTab === 'suggestions'}
              className={inboxTab === 'suggestions' ? 'active' : ''}
              onClick={() => setInboxTab('suggestions')}>
              <MapPin size={16} /> Court suggestions
              <span>{suggestions.filter(s => s.status === 'pending').length} pending</span>
            </button>
            <button type="button" role="tab" aria-selected={inboxTab === 'feedback'}
              className={inboxTab === 'feedback' ? 'active' : ''}
              onClick={() => setInboxTab('feedback')}>
              <MessageSquare size={16} /> Website feedback
              <span>{feedback.filter(f => f.status === 'new').length} new</span>
            </button>
          </div>

          {inboxError && <div className="admin-error" role="alert">{inboxError}</div>}
          {inboxNotice && <div className="admin-notice" role="status">{inboxNotice}</div>}
          {inboxLoading && <p className="admin-muted">Loading submissions…</p>}

          {inboxTab === 'suggestions' ? (
            <div className="community-inbox-list" role="tabpanel">
              {suggestions.length === 0 && !inboxLoading && (
                <p className="community-empty">No court suggestions received yet.</p>
              )}
              {suggestions.map(item => (
                <article className="community-entry" key={item.id}>
                  <div className="community-entry-top">
                    <div><h3>{item.venue_name}</h3><p>{item.location}</p></div>
                    <span className="community-status">{item.status}</span>
                  </div>
                  {item.description && <p className="community-message">{item.description}</p>}
                  <div className="community-meta">
                    <span>Submitted {displayDate(item.created_at)}</span>
                    {item.suggested_by && <span>By: {item.suggested_by}</span>}
                    {item.contact_info && <span>Contact: {item.contact_info}</span>}
                  </div>
                  <div className="community-links">
                    {item.website_url && <a href={item.website_url} target="_blank" rel="noopener noreferrer">Website / Booking ↗</a>}
                    {item.facebook_url && <a href={item.facebook_url} target="_blank" rel="noopener noreferrer">Facebook ↗</a>}
                    {item.location_url && <a href={item.location_url} target="_blank" rel="noopener noreferrer">Google Maps ↗</a>}
                  </div>
                  <div className="community-entry-actions">
                    <label>Status
                      <select value={item.status} disabled={inboxBusyId !== null}
                        onChange={e => updateInboxStatus('court_suggestions', item.id, e.target.value)}>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </label>
                    <button type="button" className="admin-delete" disabled={inboxBusyId !== null}
                      onClick={() => deleteInboxItem('court_suggestions', item.id)}
                      aria-label={`Delete suggestion for ${item.venue_name}`}><Trash2 size={16} /></button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="community-inbox-list" role="tabpanel">
              {feedback.length === 0 && !inboxLoading && (
                <p className="community-empty">No website feedback received yet.</p>
              )}
              {feedback.map(item => (
                <article className="community-entry" key={item.id}>
                  <div className="community-entry-top">
                    <h3>{({ improvement: 'Improvement idea', bug: 'Bug / Problem', feature: 'New feature', other: 'Other' } as Record<string, string>)[item.category] || item.category}</h3>
                    <span className="community-status">{item.status}</span>
                  </div>
                  <p className="community-message">{item.message}</p>
                  <div className="community-meta">
                    <span>Submitted {displayDate(item.created_at)}</span>
                    {item.submitted_by && <span>By: {item.submitted_by}</span>}
                    {item.contact_info && <span>Contact: {item.contact_info}</span>}
                  </div>
                  <div className="community-entry-actions">
                    <label>Status
                      <select value={item.status} disabled={inboxBusyId !== null}
                        onChange={e => updateInboxStatus('site_feedback', item.id, e.target.value)}>
                        <option value="new">New</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </label>
                    <button type="button" className="admin-delete" disabled={inboxBusyId !== null}
                      onClick={() => deleteInboxItem('site_feedback', item.id)}
                      aria-label="Delete feedback"><Trash2 size={16} /></button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <p className="community-hint">Approving a suggestion marks it as reviewed; it does not automatically publish a court. Use “Add new court” to publish it.</p>
        </section>
      </div>
    </AdminShell>
  )
}

function AdminShell({
  children,
  onBack,
}: {
  children: ReactNode
  onBack: () => void
}) {
  return (
    <div className="admin-page">
      <header className="admin-header">
        <button onClick={onBack}>
          <ArrowLeft size={16} /> Public directory
        </button>
        <strong>
          SF PICKLE <span>ADMIN</span>
        </strong>
      </header>
      <main>{children}</main>
    </div>
  )
}
