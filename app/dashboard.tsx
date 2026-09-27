'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  ChevronDown,
  ChevronRight,
  LoaderCircle,
  LogOut,
  Plus,
  RefreshCw,
  Trash2,
  Undo2,
  UserRound,
  Wallet,
} from 'lucide-react';
import { Brand } from '@/components/brand';
import { Sheet } from '@/components/sheet';
import { entryDate, money, monthKey, parseAmount } from '@/lib/money';
import type { Entry, EntryKind, Profile, Snapshot } from '@/lib/types';

type Draft = { id: string; kind: EntryKind; customer: string; description: string; price: string };
type Notice = { text: string; undo?: Entry; error?: boolean };
const blank = (kind: EntryKind): Draft => ({
  id: crypto.randomUUID(),
  kind,
  customer: '',
  description: '',
  price: '',
});
export function Dashboard({
  initial,
  profile,
  email,
}: {
  initial: Snapshot;
  profile: Profile;
  email: string;
}) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const dataRef = useRef(initial);
  const busyRef = useRef(false);
  const revision = useRef(0);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const replace = useCallback((next: Snapshot) => {
    dataRef.current = next;
    setData(next);
  }, []);
  const refresh = useCallback(
    async (manual = false) => {
      if (busyRef.current) return;
      const current = revision.current;
      if (manual) setRefreshing(true);
      try {
        const response = await fetch('/api/dashboard', {
          cache: 'no-store',
          signal: AbortSignal.timeout(15000),
        });
        if (response.status === 401) {
          router.replace('/login');
          router.refresh();
          return;
        }
        if (!response.ok) throw new Error('Refresh failed');
        const next = (await response.json()) as Snapshot;
        if (current === revision.current && !busyRef.current) {
          replace(next);
          if (manual) setNotice(null);
        }
      } catch {
        if (current === revision.current && !busyRef.current)
          setNotice({
            text: 'Your numbers could not refresh. Check your connection and retry.',
            error: true,
          });
      } finally {
        if (manual) setRefreshing(false);
      }
    },
    [replace, router],
  );
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    const timer = setInterval(onFocus, 60000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
      clearInterval(timer);
    };
  }, [refresh]);

  function openEntry(kind: EntryKind) {
    if (busyRef.current) return;
    setDraft(blank(kind));
    setFormError('');
    setFormOpen(true);
    setNotice(null);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || busyRef.current) return;
    const cents = parseAmount(draft.price);
    if (
      !cents ||
      !draft.description.trim() ||
      (draft.kind === 'income' && !draft.customer.trim())
    ) {
      setFormError('Enter the details and an amount from $0.01 to $1,000,000.');
      return;
    }
    if (dataRef.current.month_key !== monthKey()) {
      setFormError(
        'A new month has started. Close this form and refresh your numbers before saving.',
      );
      void refresh(true);
      return;
    }
    busyRef.current = true;
    revision.current++;
    setBusy(true);
    setNotice(null);
    setFormError('');
    const before = dataRef.current;
    const entry: Entry = {
      id: draft.id,
      kind: draft.kind,
      customer: draft.kind === 'income' ? draft.customer.trim() : null,
      description: draft.description.trim(),
      amount_cents: cents,
      occurred_at: new Date().toISOString(),
      pending: true,
    };
    const alreadyPresent = before.entries.some((item) => item.id === entry.id);
    const optimistic: Snapshot = alreadyPresent
      ? before
      : {
          ...before,
          in_cents: before.in_cents + (entry.kind === 'income' ? cents : 0),
          out_cents: before.out_cents + (entry.kind === 'expense' ? cents : 0),
          entry_count: before.entry_count + 1,
          entries: [entry, ...before.entries].slice(0, 20),
        };
    replace(optimistic);
    setFormOpen(false);
    try {
      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: entry.id,
          kind: entry.kind,
          customer: entry.customer,
          description: entry.description,
          amount_cents: cents,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || 'This entry could not be saved. Please try again.');
      replace(
        result.snapshot ?? {
          ...optimistic,
          entries: optimistic.entries.map((item) => ({ ...item, pending: false })),
        },
      );
      setNotice({
        text: `${entry.kind === 'income' ? 'Job' : 'Expense'} saved. ${money(cents)} added.`,
        undo: { ...entry, pending: false },
      });
      setDraft(null);
    } catch (error) {
      replace(before);
      setFormOpen(true);
      setFormError(
        error instanceof Error && !['TimeoutError', 'TypeError'].includes(error.name)
          ? error.message
          : 'Connection interrupted. Your details are safe here. Try saving again.',
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function remove(entry: Entry) {
    if (busyRef.current) return;
    busyRef.current = true;
    revision.current++;
    setBusy(true);
    const before = dataRef.current;
    const inThisMonth = monthKey(new Date(entry.occurred_at)) === before.month_key;
    const optimistic = {
      ...before,
      in_cents: before.in_cents - (inThisMonth && entry.kind === 'income' ? entry.amount_cents : 0),
      out_cents:
        before.out_cents - (inThisMonth && entry.kind === 'expense' ? entry.amount_cents : 0),
      entry_count: before.entry_count - (inThisMonth ? 1 : 0),
      entries: before.entries.filter((item) => item.id !== entry.id),
    };
    replace(optimistic);
    setSelected(null);
    setConfirmRemove(false);
    setNotice(null);
    try {
      const response = await fetch(`/api/entries/${entry.id}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      replace(result.snapshot ?? optimistic);
      setNotice({ text: 'Entry removed. Your numbers are up to date.' });
    } catch {
      replace(before);
      setNotice({
        text: 'Could not confirm the removal. Refresh your numbers before trying again.',
        error: true,
      });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function signOut() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error();
      router.replace('/login');
      router.refresh();
    } catch {
      setNotice({ text: 'Could not sign out. Please try again.', error: true });
      setAccountOpen(false);
      busyRef.current = false;
      setBusy(false);
    }
  }
  const profit = data.in_cents - data.out_cents;
  const tone = profit < 0 ? 'loss' : profit > 0 ? 'positive' : 'zero';
  const status = profit < 0 ? 'In the red' : profit > 0 ? 'In the black' : 'Breaking even';
  const visibleEntries = expanded ? data.entries : data.entries.slice(0, 3);
  return (
    <main className="app-shell">
      <header className="app-header">
        <Brand />
        <div className="header-actions">
          {profile.is_demo && <span className="demo-label">Demo business</span>}
          <button
            className="icon-button account-button"
            aria-label="Account"
            onClick={() => setAccountOpen(true)}
          >
            <UserRound size={19} />
          </button>
        </div>
      </header>
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">{data.month_label}</p>
          <h1>This month</h1>
        </div>
        <span className="business-name">{profile.business_name}</span>
      </div>
      <section className="numbers" aria-label="This month's financial position" aria-busy={busy}>
        <div className="profit-wrap">
          <div className="profit-panel" data-tone={tone}>
            <span className="pixel metric-label">Profit</span>
            <strong className="profit-value" data-testid="profit">
              {money(profit)}
            </strong>
            <span className="profit-status">{status}</span>
          </div>
        </div>
        <div className="cash-totals">
          <div>
            <span className="metric-label">Money in</span>
            <strong data-testid="money-in">{money(data.in_cents)}</strong>
          </div>
          <div>
            <span className="metric-label">Money out</span>
            <strong data-testid="money-out">{money(data.out_cents)}</strong>
          </div>
        </div>
      </section>
      <div className="expense-action">
        <button className="text-button" onClick={() => openEntry('expense')} disabled={busy}>
          <Plus size={15} /> Add expense
        </button>
      </div>
      <button
        className="primary-button job-button"
        onClick={() => openEntry('income')}
        disabled={busy}
      >
        {busy ? (
          <>
            <LoaderCircle size={20} className="spin" /> Saving…
          </>
        ) : (
          <>
            <Check size={21} strokeWidth={2.3} /> Job done
          </>
        )}
      </button>
      <div className="feedback-slot" aria-live="polite" aria-atomic="true">
        {notice && (
          <div className={`notice ${notice.error ? 'notice-error' : ''}`}>
            <span>{notice.text}</span>
            {notice.undo && (
              <button className="text-button" onClick={() => remove(notice.undo!)} disabled={busy}>
                <Undo2 size={15} /> Undo
              </button>
            )}
            {notice.error && (
              <button
                className="text-button"
                disabled={refreshing || busy}
                onClick={() => void refresh(true)}
              >
                <RefreshCw size={15} className={refreshing ? 'spin' : ''} /> Retry
              </button>
            )}
          </div>
        )}
      </div>
      <section className="activity" aria-labelledby="activity-title">
        <div className="section-heading">
          <h2 className="pixel" id="activity-title">
            Latest activity
          </h2>
          <span>
            {data.entry_count} {data.entry_count === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        {visibleEntries.length ? (
          <ul className="entry-list">
            {visibleEntries.map((entry) => (
              <li key={entry.id}>
                <button
                  className="entry-row"
                  disabled={busy || entry.pending}
                  onClick={() => {
                    setSelected(entry);
                    setConfirmRemove(false);
                  }}
                  aria-label={`View ${entry.kind === 'income' ? `job for ${entry.customer}` : `expense: ${entry.description}`}`}
                >
                  <span className={`entry-icon ${entry.kind}`} aria-hidden="true">
                    {entry.kind === 'income' ? <Check size={16} /> : <Wallet size={16} />}
                  </span>
                  <span className="entry-copy">
                    <span className="entry-name">{entry.customer || entry.description}</span>
                    <span className="entry-description">
                      {entry.kind === 'income' ? entry.description : 'Expense'}
                      <span className="entry-date"> · {entryDate(entry.occurred_at)}</span>
                    </span>
                  </span>
                  <span className="entry-amount">
                    {entry.kind === 'income' ? '+' : '−'}
                    {money(entry.amount_cents)}
                    {entry.pending && <span className="pending-label">Saving</span>}
                  </span>
                  <ChevronRight className="entry-chevron" size={15} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <span className="empty-icon">
              <Check size={23} />
            </span>
            <h3>A fresh start.</h3>
            <p>Your first paid job starts the month.</p>
          </div>
        )}
        {data.entries.length > 3 && (
          <button className="text-button activity-toggle" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Show less' : `Show ${Math.min(data.entry_count, 20)} recent entries`}
            <ChevronDown size={16} className={expanded ? 'rotate' : ''} />
          </button>
        )}
        {expanded && data.entry_count > 20 && (
          <p className="small-note">
            Showing the latest 20 entries. Totals include every entry this month.
          </p>
        )}
      </section>
      <footer className="app-footer">
        <span>AUD · Based on recorded payments</span>
        <span className="footer-mark" aria-hidden="true" />
      </footer>
      <Sheet
        open={formOpen}
        onOpenChange={setFormOpen}
        title={draft?.kind === 'expense' ? 'Add expense' : 'Job done'}
        description={draft?.kind === 'expense' ? 'Money paid out · AUD' : 'Paid job · AUD'}
      >
        {draft && (
          <form className="entry-form" onSubmit={save}>
            {draft.kind === 'income' && (
              <label>
                Customer
                <input
                  name="customer"
                  autoComplete="off"
                  placeholder="e.g. Alex Taylor"
                  maxLength={80}
                  required
                  value={draft.customer}
                  onChange={(e) => setDraft({ ...draft, customer: e.target.value })}
                />
              </label>
            )}
            <label>
              {draft.kind === 'income' ? 'Job' : 'What was it for?'}
              <input
                name="description"
                autoComplete="off"
                placeholder={draft.kind === 'income' ? 'e.g. Tap replacement' : 'e.g. Materials'}
                maxLength={120}
                required
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </label>
            <label>
              {draft.kind === 'income' ? 'Price (AUD)' : 'Amount (AUD)'}
              <div className="amount-field">
                <span aria-hidden="true">$</span>
                <input
                  name="price"
                  aria-label={draft.kind === 'income' ? 'Price (AUD)' : 'Amount (AUD)'}
                  autoComplete="off"
                  inputMode="decimal"
                  placeholder="0.00"
                  maxLength={10}
                  required
                  value={draft.price}
                  onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                />
              </div>
            </label>
            {formError && (
              <p className="error-message" role="alert">
                {formError}
              </p>
            )}
            <button className="primary-button" disabled={busy}>
              {draft.kind === 'income' ? 'Save job' : 'Save expense'}
              <Check size={19} />
            </button>
          </form>
        )}
      </Sheet>
      <Sheet
        open={accountOpen}
        onOpenChange={setAccountOpen}
        title="Your account"
        description={profile.business_name}
      >
        <p className="account-email">{email}</p>
        {profile.is_demo && (
          <p className="small-note">This business uses sample data. Your changes are saved.</p>
        )}
        <button className="secondary-button account-signout" disabled={busy} onClick={signOut}>
          <LogOut size={18} />
          {busy ? 'Signing out…' : 'Sign out'}
        </button>
      </Sheet>
      <Sheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={
          confirmRemove
            ? 'Remove this entry?'
            : selected?.kind === 'income'
              ? 'Paid job'
              : 'Expense'
        }
        description={selected ? entryDate(selected.occurred_at) : ''}
      >
        {selected && (
          <>
            <strong className="detail-amount">{money(selected.amount_cents)}</strong>
            <h3 className="detail-name">{selected.customer || selected.description}</h3>
            {selected.customer && <p className="detail-description">{selected.description}</p>}
            {confirmRemove ? (
              <>
                <p className="small-note">This amount will be removed from your month’s figures.</p>
                <button
                  className="danger-button"
                  onClick={() => void remove(selected)}
                  disabled={busy}
                >
                  Remove entry
                </button>
                <button className="secondary-button" onClick={() => setConfirmRemove(false)}>
                  Keep entry
                </button>
              </>
            ) : (
              <button className="text-button remove-button" onClick={() => setConfirmRemove(true)}>
                <Trash2 size={16} /> Remove entry
              </button>
            )}
          </>
        )}
      </Sheet>
    </main>
  );
}
