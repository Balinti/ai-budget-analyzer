'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCents } from '@/lib/forecast/utils'

interface ParsedRow {
  date: string
  description: string
  amount_cents: number
  account: string | null
  pending: boolean
}

interface ParseResult {
  rows: ParsedRow[]
  errors: { row: number; message: string }[]
  headers: string[]
  needsMapping?: boolean
  mapping?: Record<string, string>
}

const CSV_TEMPLATE = `date,description,amount,account,pending
2024-01-15,Paycheck,2500.00,Checking,false
2024-01-16,Rent Payment,-1500.00,Checking,false
2024-01-17,Electric Bill,-125.50,Checking,false
2024-01-18,Grocery Store,-85.45,Checking,false
2024-01-19,Netflix,-15.99,Checking,false`

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ParseResult | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
      setError(null)
      setSuccess(false)
    }
  }

  const handleParse = async () => {
    if (!file) return

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (Object.keys(mapping).length > 0) {
        formData.append('mapping', JSON.stringify(mapping))
      }

      const response = await fetch('/api/csv/parse', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse CSV')
      }

      if (data.needsMapping) {
        setResult(data)
        setMapping(data.mapping || {})
      } else {
        setResult(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV')
    } finally {
      setLoading(false)
    }
  }

  const handleMappingChange = (field: string, header: string) => {
    setMapping((prev) => ({
      ...prev,
      [field]: header,
    }))
  }

  const handleImport = async () => {
    if (!result?.rows.length) return

    setImporting(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Insert transactions
      const transactions = result.rows.map((row) => ({
        user_id: user.id,
        txn_date: row.date,
        description: row.description,
        amount_cents: row.amount_cents,
        account: row.account,
        pending: row.pending,
        source: 'csv' as const,
      }))

      const { error: insertError } = await (supabase
        .from('transactions') as any)
        .insert(transactions)

      if (insertError) throw insertError

      setSuccess(true)

      // Redirect to anchors page after a brief delay
      setTimeout(() => {
        router.push('/app/anchors')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import transactions')
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'budget-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Import Transactions
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Upload a CSV file from your bank to import transactions.
        </p>
      </div>

      {/* Success message */}
      {success && (
        <div className="bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-medium">Transactions imported successfully!</p>
              <p className="text-sm">Redirecting to detect recurring bills...</p>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Upload section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Upload CSV File
          </h2>
          <button onClick={downloadTemplate} className="btn-ghost text-sm">
            Download Template
          </button>
        </div>

        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="cursor-pointer">
            <svg
              className="w-12 h-12 mx-auto text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            {file ? (
              <p className="text-gray-900 dark:text-white font-medium">
                {file.name}
              </p>
            ) : (
              <>
                <p className="text-gray-600 dark:text-gray-300">
                  Drop your CSV file here or click to browse
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Supports most bank export formats
                </p>
              </>
            )}
          </label>
        </div>

        {file && !result && (
          <button
            onClick={handleParse}
            disabled={loading}
            className="btn-primary w-full mt-4"
          >
            {loading ? 'Parsing...' : 'Parse CSV'}
          </button>
        )}
      </div>

      {/* Column mapping */}
      {result?.needsMapping && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Map Columns
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            We couldn&apos;t auto-detect all columns. Please map them manually.
          </p>

          <div className="space-y-4">
            {['date', 'description', 'amount'].map((field) => (
              <div key={field}>
                <label className="label capitalize">{field} *</label>
                <select
                  value={mapping[field] || ''}
                  onChange={(e) => handleMappingChange(field, e.target.value)}
                  className="input"
                >
                  <option value="">Select column</option>
                  {result.headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            {['account', 'pending'].map((field) => (
              <div key={field}>
                <label className="label capitalize">{field} (optional)</label>
                <select
                  value={mapping[field] || ''}
                  onChange={(e) => handleMappingChange(field, e.target.value)}
                  className="input"
                >
                  <option value="">Not mapped</option>
                  {result.headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <button
            onClick={handleParse}
            disabled={!mapping.date || !mapping.description || !mapping.amount}
            className="btn-primary w-full mt-4"
          >
            Re-parse with Mapping
          </button>
        </div>
      )}

      {/* Preview */}
      {result && !result.needsMapping && result.rows.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Preview ({result.rows.length} transactions)
            </h2>
            {result.errors.length > 0 && (
              <span className="text-sm text-warning-600">
                {result.errors.length} row(s) skipped due to errors
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400">
                    Date
                  </th>
                  <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400">
                    Description
                  </th>
                  <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.rows.slice(0, 10).map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    <td className="py-2 px-3 text-gray-900 dark:text-white">
                      {row.date}
                    </td>
                    <td className="py-2 px-3 text-gray-900 dark:text-white">
                      {row.description}
                    </td>
                    <td
                      className={`py-2 px-3 text-right ${
                        row.amount_cents >= 0
                          ? 'text-primary-600'
                          : 'text-danger-600'
                      }`}
                    >
                      {formatCents(row.amount_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.rows.length > 10 && (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-3">
                And {result.rows.length - 10} more transactions...
              </p>
            )}
          </div>

          <button
            onClick={handleImport}
            disabled={importing}
            className="btn-primary w-full mt-4"
          >
            {importing
              ? 'Importing...'
              : `Import ${result.rows.length} Transactions`}
          </button>
        </div>
      )}

      {/* Template info */}
      <div className="card p-6 bg-gray-50 dark:bg-gray-800/50">
        <h3 className="font-medium text-gray-900 dark:text-white mb-2">
          CSV Format
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Your CSV should have at minimum these columns:
        </p>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>
            <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">date</code> -
            Transaction date (YYYY-MM-DD or MM/DD/YYYY)
          </li>
          <li>
            <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">description</code> -
            Transaction description/merchant
          </li>
          <li>
            <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">amount</code> -
            Amount (negative for expenses, positive for income)
          </li>
        </ul>
      </div>
    </div>
  )
}
