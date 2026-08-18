'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable — the link is still selectable as text.
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy} className="shrink-0">
      {copied ? 'Copiado ✓' : 'Copiar link'}
    </Button>
  )
}
