'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useDataAccess } from '@/lib/hooks/useDataAccess'
import { detectRecurring, groupToAnchorSuggestion } from '@/lib/forecast/detection'
import { formatCents, CADENCE_LABELS } from '@/lib/forecast/utils'
import { getMaxAnchors } from '@/lib/forecast/engine'
import type { Anchor, AnchorType, AnchorCadence, PlanTier } from '@/types/database'

export default function AnchorsPage() {
  const [anchors, setAnchors] = useState<Anchor[]>([])
  const [suggestions, setSuggestions] = useState<Anchor[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingAnchor, setEditingAnchor] = useState<Anchor | null>(null)

  const { isLoading: authLoading } = useAuth()
  const {
    getAnchors,
    getTransactions,
    insertAnchor,
    updateAnchor: updateAnchorData,
    deleteAnchor: deleteAnchorData,
    isGuest,
  } = useDataAccess()

  // Guests are on free tier
  const tier: PlanTier = 'free'

  useEffect(() => {
    if (authLoading) return
    loadData()
  }, [authLoading])

  const loadData = async () => {
    try {
      // Load existing anchors
      const existingAnchors = await getAnchors()
      setAnchors(existingAnchors)

      // Load transactions for detection
      const transactions = await getTransactions(200)

      if (transactions && transactions.length > 0) {
        // Detect recurring patterns
        const detected = detectRecurring(transactions)

        // Convert to anchor suggestions
        const newSuggestions = detected
          .filter((group) => {
            // Filter out patterns that match existing anchors
            const existingNames = existingAnchors?.map((a) => a.name.toLowerCase()) || []
            return !existingNames.some(
              (name) =>
                group.description.toLowerCase().includes(name) ||
                name.includes(group.description.toLowerCase().split(' ')[0])
            )
          })
          .map((group) => groupToAnchorSuggestion(group, 'temp_user'))
          .slice(0, 10) // Limit suggestions

        setSuggestions(newSuggestions as Anchor[])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const confirmAnchor = async (anchor: Partial<Anchor>) => {
    setSaving(true)
    try {
      // Check limit
      const confirmedCount = anchors.filter((a) => a.confirmed).length
      const maxAnchors = getMaxAnchors(tier)

      if (confirmedCount >= maxAnchors) {
        alert(
          `You've reached the limit of ${maxAnchors} bills/income on the ${tier} plan. Upgrade to add more.`
        )
        return
      }

      const newAnchor = await insertAnchor({
        type: anchor.type!,
        name: anchor.name!,
        cadence: anchor.cadence!,
        due_day: anchor.due_day ?? null,
        next_due_date: anchor.next_due_date ?? null,
        amount_min_cents: anchor.amount_min_cents!,
        amount_max_cents: anchor.amount_max_cents!,
        required: anchor.required ?? true,
        variable: anchor.variable ?? false,
        confirmed: true,
        last_matched_txn_id: null,
      })

      setAnchors((prev) => [...prev, newAnchor])
      setSuggestions((prev) => prev.filter((s) => s.name !== anchor.name))
    } catch (error) {
      console.error('Failed to confirm anchor:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateAnchor = async (id: string, updates: Partial<Anchor>) => {
    setSaving(true)
    try {
      await updateAnchorData(id, updates)
      setAnchors((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)))
      setEditingAnchor(null)
    } catch (error) {
      console.error('Failed to update anchor:', error)
    } finally {
      setSaving(false)
    }
  }

  const deleteAnchor = async (id: string) => {
    if (!confirm('Are you sure you want to delete this?')) return

    try {
      await deleteAnchorData(id)
      setAnchors((prev) => prev.filter((a) => a.id !== id))
    } catch (error) {
      console.error('Failed to delete anchor:', error)
    }
  }

  const dismissSuggestion = (name: string) => {
    setSuggestions((prev) => prev.filter((s) => s.name !== name))
  }

  const confirmedAnchors = anchors.filter((a) => a.confirmed)
  const maxAnchors = getMaxAnchors(tier)
  const bills = confirmedAnchors.filter((a) => a.type === 'bill')
  const income = confirmedAnchors.filter((a) => a.type === 'income')

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bills & Income</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your recurring bills and income sources.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={confirmedAnchors.length >= maxAnchors}
          className="btn-primary"
        >
          Add Manually
        </button>
      </div>

      {/* Limit warning */}
      {tier === 'free' && confirmedAnchors.length >= maxAnchors && (
        <div className="bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300 p-4 rounded-lg">
          <p className="font-medium">Free plan limit reached</p>
          <p className="text-sm mt-1">
            Upgrade to Plus or Pro to add more bills and income sources.
          </p>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Detected Recurring Patterns
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            We found these potential recurring bills/income in your transactions. Confirm the ones
            you want to track.
          </p>
          <div className="space-y-3">
            {suggestions.map((suggestion, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${
                        suggestion.type === 'income'
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                          : 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300'
                      }`}
                    >
                      {suggestion.type}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {suggestion.name}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {CADENCE_LABELS[suggestion.cadence]} &middot;{' '}
                    {formatCents(Math.abs(suggestion.amount_min_cents))}
                    {suggestion.amount_min_cents !== suggestion.amount_max_cents &&
                      ` - ${formatCents(Math.abs(suggestion.amount_max_cents))}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => dismissSuggestion(suggestion.name)} className="btn-ghost text-sm">
                    Dismiss
                  </button>
                  <button
                    onClick={() => confirmAnchor(suggestion)}
                    disabled={saving || confirmedAnchors.length >= maxAnchors}
                    className="btn-primary text-sm"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed Bills */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Bills ({bills.length})
        </h2>
        {bills.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No bills added yet. Add manually or import transactions to detect them.
          </p>
        ) : (
          <div className="space-y-3">
            {bills.map((anchor) => (
              <AnchorRow
                key={anchor.id}
                anchor={anchor}
                onEdit={() => setEditingAnchor(anchor)}
                onDelete={() => deleteAnchor(anchor.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirmed Income */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Income ({income.length})
        </h2>
        {income.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No income sources added yet.
          </p>
        ) : (
          <div className="space-y-3">
            {income.map((anchor) => (
              <AnchorRow
                key={anchor.id}
                anchor={anchor}
                onEdit={() => setEditingAnchor(anchor)}
                onDelete={() => deleteAnchor(anchor.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingAnchor) && (
        <AnchorModal
          anchor={editingAnchor}
          onSave={async (data) => {
            if (editingAnchor) {
              await updateAnchor(editingAnchor.id, data)
            } else {
              await confirmAnchor(data)
            }
            setShowAddModal(false)
          }}
          onClose={() => {
            setShowAddModal(false)
            setEditingAnchor(null)
          }}
        />
      )}
    </div>
  )
}

function AnchorRow({
  anchor,
  onEdit,
  onDelete,
}: {
  anchor: Anchor
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white">{anchor.name}</span>
          {!anchor.required && (
            <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 rounded">
              optional
            </span>
          )}
          {anchor.variable && (
            <span className="px-2 py-0.5 text-xs bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300 rounded">
              variable
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {CADENCE_LABELS[anchor.cadence]}
          {anchor.due_day && ` on day ${anchor.due_day}`} &middot;{' '}
          {formatCents(Math.abs(anchor.amount_min_cents))}
          {anchor.amount_min_cents !== anchor.amount_max_cents &&
            ` - ${formatCents(Math.abs(anchor.amount_max_cents))}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onEdit} className="btn-ghost text-sm">
          Edit
        </button>
        <button onClick={onDelete} className="text-danger-600 hover:text-danger-700 p-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

function AnchorModal({
  anchor,
  onSave,
  onClose,
}: {
  anchor: Anchor | null
  onSave: (data: Partial<Anchor>) => Promise<void>
  onClose: () => void
}) {
  const [type, setType] = useState<AnchorType>(anchor?.type || 'bill')
  const [name, setName] = useState(anchor?.name || '')
  const [cadence, setCadence] = useState<AnchorCadence>(anchor?.cadence || 'monthly')
  const [dueDay, setDueDay] = useState(anchor?.due_day?.toString() || '')
  const [amount, setAmount] = useState(
    anchor ? (Math.abs(anchor.amount_min_cents) / 100).toString() : ''
  )
  const [required, setRequired] = useState(anchor?.required ?? true)
  const [variable, setVariable] = useState(anchor?.variable ?? false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const amountCents = Math.round(parseFloat(amount || '0') * 100)

    await onSave({
      type,
      name,
      cadence,
      due_day: dueDay ? parseInt(dueDay) : null,
      amount_min_cents: type === 'bill' ? -amountCents : amountCents,
      amount_max_cents: type === 'bill' ? -amountCents : amountCents,
      required,
      variable,
      confirmed: true,
    })

    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {anchor ? 'Edit' : 'Add'} {type === 'bill' ? 'Bill' : 'Income'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('bill')}
                className={`flex-1 py-2 px-4 rounded-lg border ${
                  type === 'bill'
                    ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/30'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                Bill
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`flex-1 py-2 px-4 rounded-lg border ${
                  type === 'income'
                    ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/30'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                Income
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="name" className="label">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="e.g., Rent, Paycheck"
              required
            />
          </div>

          <div>
            <label htmlFor="amount" className="label">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input pl-7"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="cadence" className="label">
              Frequency
            </label>
            <select
              id="cadence"
              value={cadence}
              onChange={(e) => setCadence(e.target.value as AnchorCadence)}
              className="input"
            >
              {Object.entries(CADENCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="dueDay" className="label">
              Due Day (optional)
            </label>
            <input
              id="dueDay"
              type="number"
              min="1"
              max="31"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              className="input"
              placeholder="1-31 for monthly"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Required</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={variable}
                onChange={(e) => setVariable(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Variable amount</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name || !amount}
              className="btn-primary flex-1"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
