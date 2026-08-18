/**
 * Envío de mails vía Resend.
 *
 * Degrada limpio: si no hay RESEND_API_KEY, `send` devuelve `skipped` en vez
 * de tirar. Un avance de obra tiene que poder publicarse aunque todavía no
 * haya proveedor de mail configurado — el aviso es un extra, no un requisito.
 */

export interface SendResult {
  sent: number
  skipped: boolean
  error?: string
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM)
}

interface SendInput {
  to: string[]
  subject: string
  html: string
  replyTo?: string
}

export async function send(input: SendInput): Promise<SendResult> {
  if (!isEmailConfigured()) {
    return { sent: 0, skipped: true }
  }
  if (input.to.length === 0) {
    return { sent: 0, skipped: false }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM,
        // Recipients go in BCC so investors don't see each other's addresses.
        to: process.env.RESEND_FROM,
        bcc: input.to,
        subject: input.subject,
        html: input.html,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { sent: 0, skipped: false, error: `Resend ${res.status}: ${body.slice(0, 120)}` }
    }

    return { sent: input.to.length, skipped: false }
  } catch (error) {
    return {
      sent: 0,
      skipped: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildProgressEmail(input: {
  projectName: string
  title: string
  body?: string | null
  progressPercent?: number | null
  publicUrl: string
  imageUrl?: string
}): string {
  const paragraphs = (input.body ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p style="margin:0 0 12px;line-height:1.6">${escapeHtml(line)}</p>`)
    .join('')

  const progressBar =
    typeof input.progressPercent === 'number'
      ? `<div style="margin:20px 0">
           <div style="font-size:13px;color:#666;margin-bottom:6px">Avance de obra: ${input.progressPercent}%</div>
           <div style="background:#eee;border-radius:99px;height:8px;overflow:hidden">
             <div style="background:#5b47e0;height:8px;width:${Math.min(100, Math.max(0, input.progressPercent))}%"></div>
           </div>
         </div>`
      : ''

  const image = input.imageUrl
    ? `<img src="${input.imageUrl}" alt="" style="width:100%;border-radius:12px;margin:16px 0" />`
    : ''

  // Inline styles and a table-free layout: most email clients strip <style>
  // blocks and handle modern CSS badly.
  return `<!doctype html>
<html lang="es"><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <div style="background:#fff;border-radius:16px;padding:32px">
      <p style="margin:0 0 4px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:.08em">
        ${escapeHtml(input.projectName)}
      </p>
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25">${escapeHtml(input.title)}</h1>
      ${image}
      ${progressBar}
      ${paragraphs}
      <a href="${input.publicUrl}"
         style="display:inline-block;margin-top:20px;background:#5b47e0;color:#fff;text-decoration:none;padding:12px 24px;border-radius:99px;font-weight:600;font-size:15px">
        Ver el proyecto
      </a>
    </div>
    <p style="text-align:center;font-size:12px;color:#999;margin-top:20px">
      Recibís este aviso porque consultaste por ${escapeHtml(input.projectName)}.
    </p>
  </div>
</body></html>`
}
