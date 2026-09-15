# CathNote

Mobile-first PWA for writing a PTCA (coronary angioplasty) procedure note while the case is happening. Local-first and fully offline. Optional Amazon S3 sync keeps the same cases on every device.

**Not a medical device — documentation aid only. Verify all entries before signing.**

## Run

```bash
npm install
npm run dev
```

- `npm test` — note-generation and sync unit tests
- `npm run build` — production build with offline service worker

Install from the browser to the home screen. Data stays in IndexedDB on the device unless you enable S3 sync.

## S3 sync (optional)

Uses private bucket [`cathnote-bucket`](https://ap-south-1.console.aws.amazon.com/s3/buckets/cathnote-bucket?region=ap-south-1&bucketType=general&tab=accesspoints) in `ap-south-1` (Mumbai) through access point **cathnote-bucket-vercel**. IndexedDB remains the working copy; S3 is the shared folder across devices.

The app talks to the access point alias:

`cathnote-bucket-verc-8ju83tr675qbbkrch3ppbq7xz19araps3b-s3alias`

1. Keep the bucket private (block all public access).
2. Add a CORS rule on the **bucket** that allows your app origins (`http://localhost:5173` for dev, plus `https://ptca-report-rhwa.vercel.app` with **no trailing slash**):

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedOrigins": ["http://localhost:5173", "https://ptca-report-rhwa.vercel.app"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

3. Create an IAM user that can use both the bucket and the access point. Policy is on the Settings page. Allow that user on the access point policy as well.
4. Create an access key for that user.
5. In CathNote, open Settings, turn on **Sync with S3**, paste the keys, then **Test connection**. Repeat on each device. Alias and region are already filled in.

Keys are stored in that browser only. Do not commit them. Objects are written with SSE-S3 (`AES256`).

If the same case is edited on two devices at once, the later `updatedAt` wins. Demo seed cases stay on the device and are not uploaded.
