# Quick Deployment Checklist for MindVerse

## Files Prepared ✅

- [x] `backend/package.json` - Dependencies ready
- [x] `ocr/requirements.txt` - Python dependencies pinned
- [x] `summarizer/requirements.txt` - Python dependencies pinned
- [x] `ocr/ocr_service.py` - Updated for PORT env var
- [x] `summarizer/summarizer_service.py` - Updated for PORT env var
- [x] `render.yaml` - Blueprint configuration ready

## Choose Your Strategy

### 🆓 FREE TIER (Best for Testing)

All services as **Web Services** → Total: **$0/month**

**Service URLs:**

```
Backend: https://mindverse-backend.onrender.com
OCR: https://mindverse-ocr-service.onrender.com
Summarizer: https://mindverse-summarizer-service.onrender.com
```

**Backend Environment Variables:**

```
OCR_SERVICE_URL=https://mindverse-ocr-service.onrender.com
SUMMARIZER_SERVICE_URL=https://mindverse-summarizer-service.onrender.com
```

### 💰 PRODUCTION (Best for Real Users)

Backend as **Web Service** + OCR/Summarizer as **Private Services** → Total: **$14/month**

**Service URLs:**

```
Backend: https://mindverse-backend.onrender.com (PUBLIC)
OCR: http://mindverse-ocr-service.render.internal:5000 (PRIVATE)
Summarizer: http://mindverse-summarizer-service.render.internal:5001 (PRIVATE)
```

**Backend Environment Variables:**

```
OCR_SERVICE_URL=http://mindverse-ocr-service.render.internal:5000
SUMMARIZER_SERVICE_URL=http://mindverse-summarizer-service.render.internal:5001
```

---

## Deployment Steps

1. **Push to GitHub:**

   ```bash
   git add .
   git commit -m "Deploy: Add Render configuration for backend, OCR, and summarizer"
   git push origin ml-integration
   ```

2. **On render.com:**
   - Go to Dashboard → **New**
   - Select **Web Service** (or Private Service for production)
   - Connect GitHub repo → Select `ml-integration` branch
   - Set Root Directory: `backend` (or `ocr`, `summarizer`)
   - Add Build & Start Commands (from DEPLOYMENT_GUIDE.md)
   - Add Environment Variables
   - Click **Deploy**

3. **Deploy in order:**
   1. OCR Service
   2. Summarizer Service
   3. Backend (add OCR/Summarizer URLs as env vars)

4. **Test:**
   - Backend: `https://mindverse-backend.onrender.com/`
   - OCR: Send POST request to `/ocr`
   - Summarizer: Send POST request to `/summarize`

---

## Key Notes

❌ **Private Services are PAID** (minimum $7/month each)

- Free tier only has Web Services
- Web Services sleep after 15 minutes

✅ **Free tier works fine for testing**

- Just add wake-up logic to your frontend if needed
- Or upgrade to Private Services for production

🌐 **For Production:**

- Use Private Services for OCR/Summarizer
- Backend stays on Web Service (free tier with paid option)
- Total: $14/month for reliable setup

---

## Environment Variable Reference

| Service    | Variable               | FREE Value                                          | PRODUCTION Value                                           |
| ---------- | ---------------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| Backend    | OCR_SERVICE_URL        | `https://mindverse-ocr-service.onrender.com`        | `http://mindverse-ocr-service.render.internal:5000`        |
| Backend    | SUMMARIZER_SERVICE_URL | `https://mindverse-summarizer-service.onrender.com` | `http://mindverse-summarizer-service.render.internal:5001` |
| OCR        | PORT                   | `5000`                                              | `5000`                                                     |
| Summarizer | PORT                   | `5001`                                              | `5001`                                                     |
| All        | FLASK_ENV              | `production`                                        | `production`                                               |

---

## Common Issues

| Issue                      | Solution                                                        |
| -------------------------- | --------------------------------------------------------------- |
| Services can't communicate | Check environment variables match the URLs you set up           |
| Build fails                | Ensure `requirements.txt` is in the correct directory           |
| "Services not responding"  | Check Render logs for Python/Node errors                        |
| Services go to sleep       | Use Free Web Services (expected) or upgrade to Private Services |
