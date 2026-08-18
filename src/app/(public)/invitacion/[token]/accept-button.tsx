'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'

export function AcceptButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? 'Sumándote…' : 'Aceptar invitación'}
    </Button>
  )
}
