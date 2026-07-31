import crypto from 'crypto'

interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  cdnUrl: string
}

// Generate AWS Signature Version 4 for R2
function generateSignature(
  secretAccessKey: string,
  dateStamp: string,
  region: string,
  service: string,
  stringToSign: string
) {
  const kDate = crypto
    .createHmac('sha256', `AWS4${secretAccessKey}`)
    .update(dateStamp)
    .digest()
  const kRegion = crypto.createHmac('sha256', kDate).update(region).digest()
  const kService = crypto.createHmac('sha256', kRegion).update(service).digest()
  const kSigning = crypto
    .createHmac('sha256', kService)
    .update('aws4_request')
    .digest()
  return crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex')
}

export class R2Client {
  private config: R2Config

  constructor(config: R2Config) {
    this.config = config
  }

  /**
   * Generate a presigned URL for direct browser upload to R2
   * Valid for 1 hour by default
   */
  generatePresignedUrl(
    key: string,
    _contentType: string = 'application/octet-stream',
    expiresIn: number = 3600
  ): string {
    const algorithm = 'AWS4-HMAC-SHA256'
    const service = 's3'
    const region = 'auto'

    const now = new Date()
    const amzDate = now.toISOString().replace(/[:-]g/g, '').split('.')[0] + 'Z'
    const dateStamp = amzDate.substring(0, 8)

    const host = `${this.config.bucketName}.${this.config.accountId}.r2.cloudflarestorage.com`
    const canonicalUri = `/${key}`

    // Build canonical request
    const canonicalHeaders = [
      `host:${host}`,
      `x-amz-content-sha256:UNSIGNED-PAYLOAD`,
      `x-amz-date:${amzDate}`,
    ].join('\n')

    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'

    const canonicalQuerystring = [
      `X-Amz-Algorithm=${encodeURIComponent(algorithm)}`,
      `X-Amz-Credential=${encodeURIComponent(
        `${this.config.accessKeyId}/${dateStamp}/${region}/${service}/aws4_request`
      )}`,
      `X-Amz-Date=${amzDate}`,
      `X-Amz-Expires=${expiresIn}`,
      `X-Amz-SignedHeaders=${encodeURIComponent(signedHeaders)}`,
    ]
      .sort()
      .join('&')

    const canonicalRequest = [
      'PUT',
      canonicalUri,
      canonicalQuerystring,
      canonicalHeaders,
      '',
      signedHeaders,
      'UNSIGNED-PAYLOAD',
    ].join('\n')

    const canonicalRequestHash = crypto
      .createHash('sha256')
      .update(canonicalRequest)
      .digest('hex')

    const stringToSign = [
      algorithm,
      amzDate,
      `${dateStamp}/${region}/${service}/aws4_request`,
      canonicalRequestHash,
    ].join('\n')

    const signature = generateSignature(
      this.config.secretAccessKey,
      dateStamp,
      region,
      service,
      stringToSign
    )

    return `https://${host}${canonicalUri}?${canonicalQuerystring}&X-Amz-Signature=${signature}`
  }

  /**
   * Get a CDN URL for a file already in R2
   */
  getCdnUrl(key: string): string {
    return `${this.config.cdnUrl}/${key}`
  }

  /**
   * Build a storage key path for organizing uploads
   */
  buildStorageKey(
    tenantId: string,
    projectId: string,
    tourKind: string,
    filename: string
  ): string {
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const ext = filename.split('.').pop() || 'bin'

    return `tours/${tenantId}/${projectId}/${tourKind}/${timestamp}-${randomId}.${ext}`
  }
}

// Singleton instance
let r2Client: R2Client | null = null

export function getR2Client(): R2Client {
  if (!r2Client) {
    const accountId = process.env.R2_ACCOUNT_ID
    const accessKeyId = process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
    const bucketName = process.env.R2_BUCKET_NAME
    const cdnUrl = process.env.NEXT_PUBLIC_R2_CDN_URL

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !cdnUrl) {
      throw new Error('Missing R2 configuration in environment variables')
    }

    r2Client = new R2Client({
      accountId,
      accessKeyId,
      secretAccessKey,
      bucketName,
      cdnUrl,
    })
  }

  return r2Client
}
