'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Address autocomplete field. Talks only to our own /api/delivery/address/*
 * proxy (key stays server-side), debounces suggestions, and on selection hands
 * the parent a structured address + placeId. Degrades to a plain text input if
 * the API returns nothing, so a manual address is always possible.
 */

export interface SelectedAddress {
  address1: string
  city: string
  state: string
  /** Postal/ZIP code — populated for CA; '' for NG. */
  postalCode: string
  placeId: string
  formattedAddress: string
}

interface Suggestion {
  placeId: string
  primary: string
  secondary: string
}

interface Props {
  regionCode?: 'ng' | 'ca'
  /** Current address1 text (controlled by the parent). */
  value: string
  /** Fired on every keystroke; the parent should clear any stored placeId. */
  onInputChange: (text: string) => void
  /** Fired when a suggestion is chosen and resolved. */
  onSelect: (address: SelectedAddress) => void
  inputId?: string
  inputClassName?: string
  placeholder?: string
}

function newSessionToken(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

export default function AddressAutocomplete({
  regionCode = 'ng',
  value,
  onInputChange,
  onSelect,
  inputId = 'address1',
  inputClassName,
  placeholder,
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [resolving, setResolving] = useState(false)
  const sessionToken = useRef<string>(newSessionToken())
  // Set true right after a pick so the resulting value change doesn't re-query.
  const justPicked = useRef(false)

  useEffect(() => {
    if (justPicked.current) {
      justPicked.current = false
      return
    }
    const query = value.trim()
    if (query.length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/delivery/address/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: query, regionCode, sessionToken: sessionToken.current }),
          signal: controller.signal,
        })
        const data = await res.json()
        const list: Suggestion[] = data.suggestions ?? []
        setSuggestions(list)
        setOpen(list.length > 0)
      } catch {
        // Network/abort: stay silent, manual entry still works.
      }
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [value, regionCode])

  async function pick(s: Suggestion) {
    justPicked.current = true
    setOpen(false)
    setSuggestions([])
    setResolving(true)
    try {
      const res = await fetch('/api/delivery/address/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: s.placeId, sessionToken: sessionToken.current }),
      })
      const data = await res.json()
      if (data.ok && data.address) {
        onSelect({
          address1: data.address.address1 || s.primary,
          city: data.address.city || '',
          state: data.address.state || '',
          postalCode: data.address.postalCode || '',
          placeId: s.placeId,
          formattedAddress: data.address.formattedAddress || `${s.primary}, ${s.secondary}`,
        })
      } else {
        // Details failed — keep what they picked as free text so they can proceed.
        onInputChange(s.primary)
      }
    } catch {
      onInputChange(s.primary)
    } finally {
      setResolving(false)
      // A details lookup closes the billing session; start a fresh one.
      sessionToken.current = newSessionToken()
    }
  }

  return (
    <div className="relative">
      <input
        id={inputId}
        type="text"
        autoComplete="off"
        value={value}
        onChange={(e) => onInputChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
        }}
        className={inputClassName}
        placeholder={placeholder}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${inputId}-listbox`}
      />
      {resolving && <p className="mt-1 text-small text-stone">Loading address…</p>}
      {open && suggestions.length > 0 && (
        <ul
          id={`${inputId}-listbox`}
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto border border-stone/30 bg-ink shadow-lg"
          role="listbox"
        >
          {suggestions.map((s) => (
            <li key={s.placeId} role="option" aria-selected={false}>
              <button
                type="button"
                // onMouseDown (not onClick) so it fires before the input blur.
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(s)
                }}
                className="block w-full px-4 py-3 text-left transition-colors hover:bg-white/5"
              >
                <span className="block text-small text-bone">{s.primary}</span>
                {s.secondary && <span className="block text-small text-stone">{s.secondary}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
