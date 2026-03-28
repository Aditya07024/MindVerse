# Keep-Alive Service Guide for Render Free Tier

Render's free tier services **sleep after 15 minutes of inactivity**. To prevent this, you need to ping the `/health` endpoint every 5 minutes.

---

## Option 1: Render Background Worker (Recommended) ⭐

### Setup:

1. **Deploy the Keep-Alive Worker:**
   - Go to **render.com → Dashboard → New → Background Worker**
   - Connect your GitHub repo
   - Name: `mindverse-keep-alive`
   - Runtime: Node
   - Branch: `ml-integration`
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `node keepAlive.js`
   - Instance Type: **Free tier** (only runs when called)

2. **Add Environment Variables:**

   ```
   BACKEND_URL=https://mindverse-backend.onrender.com
   OCR_SERVICE_URL=https://mindverse-ocr-service.onrender.com
   SUMMARIZER_SERVICE_URL=https://mindverse-summarizer-service.onrender.com
   ```

3. **Add Cron Trigger:**
   - After deployment, go to **Service Settings → Cron**
   - Add new cron job:
     - Schedule: `*/5 * * * *` (every 5 minutes)
     - Command: Default (HTTP GET to your service)

---

## Option 2: UptimeRobot (Free & Easy) ⭐⭐

**No Render configuration needed!** Just use the free tier of UptimeRobot.

### Setup:

1. Go to **uptimerobot.com** → Sign up (free)
2. **Add Monitor → HTTP(s) Uptime**
3. Create 3 monitors (one for each service):

   **Monitor 1 - Backend:**
   - URL: `https://mindverse-backend.onrender.com/health`
   - Monitor Interval: 5 minutes
   - Name: MindVerse Backend

   **Monitor 2 - OCR:**
   - URL: `https://mindverse-ocr-service.onrender.com/health`
   - Monitor Interval: 5 minutes
   - Name: MindVerse OCR Service

   **Monitor 3 - Summarizer:**
   - URL: `https://mindverse-summarizer-service.onrender.com/health`
   - Monitor Interval: 5 minutes
   - Name: MindVerse Summarizer

✅ **Benefits:** Free forever, no configuration needed on Render

---

## Option 3: Frontend-Based Heartbeat

Call health endpoints from your frontend (runs when users visit):

```javascript
// Add to your frontend's App.jsx or main component
useEffect(() => {
  const interval = setInterval(
    async () => {
      try {
        // Ping backend and services to keep them awake
        await fetch(`${process.env.REACT_APP_API_URL}/health`).catch(() => {});
        await fetch(`${process.env.REACT_APP_OCR_URL}/health`).catch(() => {});
        await fetch(`${process.env.REACT_APP_SUMMARIZER_URL}/health`).catch(
          () => {},
        );
      } catch (err) {
        console.log("Keep-alive ping completed");
      }
    },
    5 * 60 * 1000,
  ); // Every 5 minutes

  return () => clearInterval(interval);
}, []);
```

⚠️ **Downside:** Only keeps services alive when frontend is open

---

## Option 4: External Cron Service (Free)

Use **cron-job.org** (free):

1. Go to **cron-job.org** → Sign up
2. Create 3 cron jobs to hit the health endpoints:
   - `https://mindverse-backend.onrender.com/health`
   - `https://mindverse-ocr-service.onrender.com/health`
   - `https://mindverse-summarizer-service.onrender.com/health`
3. Set interval to **every 5 minutes**

---

## Verification

After setup, check if services stay awake:

```bash
# Monitor backend logs
curl https://mindverse-backend.onrender.com/health

# Should return:
{
  "status": "✅ Backend is alive",
  "timestamp": "2024-03-28T12:00:00.000Z"
}
```

---

## Recommended Setup

### For Development:

- **Option 2: UptimeRobot** (easiest, no additional services)

### For Production:

- **Option 1: Render Background Worker** (integrated with Render)
- **Option 2: UptimeRobot** (as backup keep-alive)

---

## Pricing Impact

| Option                       | Cost           | Setup Time | Reliability             |
| ---------------------------- | -------------- | ---------- | ----------------------- |
| Option 1: Background Worker  | $0 (free tier) | 5 min      | Good (Render-native)    |
| Option 2: UptimeRobot        | $0 (free tier) | 2 min      | Excellent (external)    |
| Option 3: Frontend Heartbeat | $0             | 2 min      | Poor (only when active) |
| Option 4: Cron Job Service   | $0             | 3 min      | Good (external service) |

**Best Choice: Option 2 (UptimeRobot)** - Simplest and most reliable

---

## Testing the Keep-Alive

Once deployed, you should see in Render logs every 5 minutes:

```
✅ /health endpoint called
📍 [2024-03-28T12:00:00.000Z] Pinging services...
✅ Backend: 200 - ✅ Backend is alive
✅ OCR Service: 200 - ✅ OCR Service is alive
✅ Summarizer Service: 200 - ✅ Summarizer Service is alive
✅ Ping cycle complete
```

If you don't see these logs, the keep-alive isn't working.

---

## Troubleshooting

| Issue                   | Solution                                                 |
| ----------------------- | -------------------------------------------------------- |
| Services still sleeping | Check that `/health` endpoints exist (they're now added) |
| Keep-alive not pinging  | Check that URLs in environment variables are correct     |
| 404 errors              | Make sure services are deployed first                    |
| Timeout errors          | Services might be too slow; increase timeout to 15s      |
