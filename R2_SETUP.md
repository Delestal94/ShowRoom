# R2 + CDN Setup Guide

This guide walks you through setting up Cloudflare R2 for ShowRoom's tour asset storage and direct browser uploads.

## Why R2?

- **Egress cost = $0** — crucial for high-volume asset delivery (tours are 50-500MB each)
- **Presigned URLs** — browsers upload directly to R2, bypassing our servers
- **Cloudflare CDN** — instant global distribution, 100+ edge locations
- **S3 compatible API** — standard AWS SDK support

## Prerequisites

- Cloudflare account (free tier works, but paid recommended for larger storage)
- Not using Cloudflare Pages? Add R2 standalone

## Step 1: Create R2 Bucket

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Left sidebar → **R2**
3. Click **Create bucket**
   - Name: `showroom-assets` (or your choice)
   - Region: Auto (Cloudflare recommends this)
4. Click **Create bucket**

## Step 2: Create API Credentials

1. Sidebar → R2 → **API Tokens** tab
2. Click **Create API token**
3. **Recommended settings**:
   - Token name: `ShowRoom API`
   - Permissions: **Object Read/Write**
   - Bucket access: Select your bucket
   - TTL: 1 year (or longer)
4. Click **Create API Token**
5. **IMPORTANT**: Copy and save these immediately:
   - Account ID (shown at top, looks like: `abc123xyz`)
   - Access Key ID
   - Secret Access Key

⚠️ **This is your only chance to copy the secret key.** Save it securely.

## Step 3: Setup CDN (Cloudflare Docs)

### Option A: Native R2 Domain (Free, Recommended)

1. R2 bucket page → **Settings**
2. Scroll to **Public access**
3. Click **Allow access**
4. Copy the **Public R2 URL** shown
5. Use this URL format: `https://your-bucket.your-account-id.r2.cloudflarestorage.com`

### Option B: Custom Domain with CDN (Paid)

1. R2 bucket → **Settings**
2. **Custom domain** section
3. Connect your own domain (requires Cloudflare-managed domain)
4. Add CNAME record pointing to R2
5. CDN is automatically applied

For MVP, **Option A** is fine. CDN is automatic with Cloudflare.

## Step 4: Configure Environment Variables

Update `.env.local`:

```bash
# R2 Bucket Details
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=showroom-assets

# CDN URL (from Step 3)
NEXT_PUBLIC_R2_CDN_URL=https://showroom-assets.your-account-id.r2.cloudflarestorage.com
```

## Step 5: Test Upload Flow

### Step 1: Create a project

```bash
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Dev",
    "slug": "test-dev",
    "planId": "plan-lite-v1"
  }'
```

Get `projectId` from response.

### Step 2: Access admin dashboard

Navigate to: `http://test-dev.localhost:3000/dashboard/test-dev/`
(Or configure subdomains in your hosts file)

### Step 3: Create a project

1. Click "New Project"
2. Fill in details
3. Create

### Step 4: Upload a tour

1. View project detail
2. Click "Upload Tour"
3. Select tour type (start with GLB or Image)
4. Select a small test file
5. Click **Upload Tour**

**Expected flow**:
1. Frontend requests presigned URL from `/api/uploads/presign`
2. Frontend uploads file directly to R2 via presigned URL (browser → R2)
3. Frontend calls `/api/dashboard/.../tours` with storageKey + cdnUrl
4. Backend creates Tour record with ready status
5. Storefront loads CDN URL → tour appears in viewer

## Troubleshooting

### "Missing R2 configuration"

- Check all 4 env vars are in `.env.local`
- Restart dev server after adding env vars
- Double-check for typos (Account ID especially)

### "Upload failed"

Check browser DevTools → Network tab:
- **Presign request** (to `/api/uploads/presign`): should return `presignedUrl`
- **PUT request** (to R2): should be `HTTP 200`
- If presign returns 400/403: check tenant slug matches

### "CDN URL not loading"

- Verify `NEXT_PUBLIC_R2_CDN_URL` is correct
- Try accessing the CDN URL directly in browser
- If 403 Forbidden: bucket isn't public (re-check Step 3)

### Presigned URL expired

By default, valid for 1 hour. Change in `src/modules/storage/r2-client.ts`:
```typescript
// In generatePresignedUrl() method
const presignedUrl = r2.generatePresignedUrl(
  storageKey,
  contentType,
  7200  // 2 hours instead of 1
)
```

## Security Notes

- ✅ Presigned URLs are time-limited (1 hour)
- ✅ Only PUT permission, not DELETE/LIST
- ✅ URLs are single-use per file
- ✅ Bucket is public for reading (CDN serves files)
- ⚠️ Store secrets in `.env.local` (git-ignored)

## Monitoring & Costs

### Check usage:

1. Cloudflare Dashboard → R2
2. View bandwidth used, requests, storage
3. Costs shown in real-time

### Estimate for MVP:

- Storage: ~10GB (100 tours @ 100MB avg) = ~$0.15/month
- Bandwidth: ~500GB/month egress = $0 (free on R2!)
- **Total: ~$0.15/month** (negligible)

Compare to S3:
- Same 500GB egress on S3 = ~$50/month

## Next Steps

Once R2 is working:

1. ✅ Test with different file types (GLB, PNG 360°, MP4)
2. ✅ Verify CDN URLs load in storefront
3. ✅ Upload a full test tour
4. ✅ Check 3D viewer renders correctly

Then Phase 2 continues (search filters, comparator).

## References

- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [Presigned URLs Guide](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [S3 Compatibility](https://developers.cloudflare.com/r2/api/s3/api-token-management/)
