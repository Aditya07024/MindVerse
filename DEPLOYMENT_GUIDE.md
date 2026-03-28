# Deployment Guide for MindVerse on Render

Your application consists of three independent services that need separate deployments on Render:

1. **Node.js Backend** (Main API)
2. **Python OCR Service** (OCR Processing)
3. **Python Summarizer Service** (Text Summarization)

---

## Deployment Options

### Option 1: FREE TIER (Recommended for Testing)

- **Backend**: Web Service (Free)
- **OCR**: Web Service (Free)
- **Summarizer**: Web Service (Free)
- **Total Cost**: $0/month
- **Downside**: Services sleep after 15 min of inactivity

### Option 2: PRODUCTION (Recommended for Production)

- **Backend**: Web Service (Free) - Public API
- **OCR**: Private Service (Starter - $7/mo) - Internal only
- **Summarizer**: Private Service (Starter - $7/mo) - Internal only
- **Total Cost**: $14/month
- **Benefit**: Always running, private internal networking, faster

### Option 3: HYBRID (Budget Production)

- **Backend**: Web Service (Free) - Public API
- **OCR**: Web Service (Free) - Accessible externally (not ideal, but cheap)
- **Summarizer**: Web Service (Free) - Accessible externally (not ideal, but cheap)
- **Total Cost**: $0/month
- **Note**: Services will sleep, but you control them via API

---

## Prerequisites

- Render account (render.com)
- GitHub repository connected to Render
- Environment variables prepared (API keys, DB credentials, etc.)

---

## Service 1: Deploy Node.js Backend

### Configuration:

| Field              | Value                                                |
| ------------------ | ---------------------------------------------------- |
| **Name**           | `mindverse-backend`                                  |
| **Type**           | Web Service (Free tier available)                    |
| **Language**       | Node                                                 |
| **Branch**         | `ml-integration` (or your working branch)            |
| **Root Directory** | `backend`                                            |
| **Build Command**  | `npm install`                                        |
| **Start Command**  | `npm start`                                          |
| **Region**         | Oregon (US West) - Keep consistent                   |
| **Instance Type**  | Free (for testing) or Starter ($7/mo) for production |

### Environment Variables:

**For FREE TIER (Public URLs):**

```
DATABASE_URL=<your-neon-postgres-url>
JWT_SECRET=<your-jwt-secret>
CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud>
CLOUDINARY_API_KEY=<your-cloudinary-api-key>
CLOUDINARY_API_SECRET=<your-cloudinary-api-secret>
OCR_SERVICE_URL=https://mindverse-ocr-service.onrender.com
SUMMARIZER_SERVICE_URL=https://mindverse-summarizer-service.onrender.com
FIREBASE_CONFIG=<your-firebase-config-json>
```

**For PRODUCTION (Private Service URLs):**

```
DATABASE_URL=<your-neon-postgres-url>
JWT_SECRET=<your-jwt-secret>
CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud>
CLOUDINARY_API_KEY=<your-cloudinary-api-key>
CLOUDINARY_API_SECRET=<your-cloudinary-api-secret>
OCR_SERVICE_URL=http://mindverse-ocr-service.render.internal:5000
SUMMARIZER_SERVICE_URL=http://mindverse-summarizer-service.render.internal:5001
FIREBASE_CONFIG=<your-firebase-config-json>
```

---

## Service 2: Deploy Python OCR Service

### Option A: FREE TIER (Web Service)

| Field              | Value                                            |
| ------------------ | ------------------------------------------------ |
| **Name**           | `mindverse-ocr-service`                          |
| **Type**           | **Web Service** (Public, Free tier)              |
| **Language**       | Python 3                                         |
| **Branch**         | `ml-integration`                                 |
| **Root Directory** | `ocr`                                            |
| **Build Command**  | `pip install --no-cache-dir -r requirements.txt` |
| **Start Command**  | `python ocr_service.py`                          |
| **Region**         | Oregon (US West) - Same as backend               |
| **Instance Type**  | Free (services sleep after 15 min)               |
| **Cost**           | $0/month                                         |

### Option B: PRODUCTION (Private Service)

| Field              | Value                                            |
| ------------------ | ------------------------------------------------ |
| **Name**           | `mindverse-ocr-service`                          |
| **Type**           | **Private Service** (Internal, Paid)             |
| **Language**       | Python 3                                         |
| **Branch**         | `ml-integration`                                 |
| **Root Directory** | `ocr`                                            |
| **Build Command**  | `pip install --no-cache-dir -r requirements.txt` |
| **Start Command**  | `python ocr_service.py`                          |
| **Region**         | Oregon (US West) - Same as backend               |
| **Instance Type**  | Starter ($7/mo) - Always running                 |
| **Cost**           | $7/month                                         |

### Environment Variables (Both Options):

```
FLASK_ENV=production
PORT=5000
```

---

## Service 3: Deploy Python Summarizer Service

### Option A: FREE TIER (Web Service)

| Field              | Value                                            |
| ------------------ | ------------------------------------------------ |
| **Name**           | `mindverse-summarizer-service`                   |
| **Type**           | **Web Service** (Public, Free tier)              |
| **Language**       | Python 3                                         |
| **Branch**         | `ml-integration`                                 |
| **Root Directory** | `summarizer`                                     |
| **Build Command**  | `pip install --no-cache-dir -r requirements.txt` |
| **Start Command**  | `python summarizer_service.py`                   |
| **Region**         | Oregon (US West) - Same as backend               |
| **Instance Type**  | Free (services sleep after 15 min)               |
| **Cost**           | $0/month                                         |

### Option B: PRODUCTION (Private Service)

| Field              | Value                                            |
| ------------------ | ------------------------------------------------ |
| **Name**           | `mindverse-summarizer-service`                   |
| **Type**           | **Private Service** (Internal, Paid)             |
| **Language**       | Python 3                                         |
| **Branch**         | `ml-integration`                                 |
| **Root Directory** | `summarizer`                                     |
| **Build Command**  | `pip install --no-cache-dir -r requirements.txt` |
| **Start Command**  | `python summarizer_service.py`                   |
| **Region**         | Oregon (US West) - Same as backend               |
| **Instance Type**  | Starter ($7/mo) - Always running                 |
| **Cost**           | $7/month                                         |

### Environment Variables (Both Options):

```
FLASK_ENV=production
PORT=5001
```

---

## Step-by-Step Deployment Instructions

### 1. Prepare Your Backend

Update your backend services to use environment variables for internal URLs. Check your files and ensure you're calling the service URLs from environment variables.

**Example (summaryController.js):**

```javascript
const summarizerURL = process.env.SUMMARIZER_SERVICE_URL;
const ocrURL = process.env.OCR_SERVICE_URL;

// Make requests using these URLs
await axios.post(`${summarizerURL}/summarize`, { text });
```

### 2. Choose Your Deployment Strategy

**Option 1: FREE TIER (Recommended for Testing)**

- All 3 services as **Web Services**
- Use public `.onrender.com` URLs
- Cost: $0/month
- Downside: Services sleep after 15 minutes

**Option 2: PRODUCTION (Recommended for Production)**

- Backend: **Web Service** (Free or Paid)
- OCR: **Private Service** (Starter $7/mo)
- Summarizer: **Private Service** (Starter $7/mo)
- Use `.render.internal` private networking
- Cost: $14/month minimum
- Benefit: Always running, faster internal network

### 3. Deploy on Render

**For All Services:**

1. Go to **render.com → Dashboard → New**
2. Choose **Web Service** (for free tier) OR **Private Service** (for production)
3. Connect your GitHub repo and select `ml-integration` branch
4. Set the **Root Directory** (e.g., `backend`, `ocr`, `summarizer`)
5. Set **Build & Start Commands** (from the configuration tables above)
6. Add **Environment Variables** (from the configuration tables)
7. Click **Deploy**

**Order to Deploy:**

1. Deploy OCR Service first (independent)
2. Deploy Summarizer Service (independent)
3. Deploy Backend last (depends on both services)

### 4. Verify Deployment

After all services are deployed:

1. Check Render Dashboard logs for errors
2. For **Web Services**, test public endpoints:
   - Backend: `https://mindverse-backend.onrender.com/`
   - OCR: `https://mindverse-ocr-service.onrender.com/ocr` (with POST data)
   - Summarizer: `https://mindverse-summarizer-service.onrender.com/summarize` (with POST data)

3. For **Private Services**, monitor via Render Dashboard only

---

## Networking Explained

### FREE TIER (Web Services):

```
Frontend ──HTTPS──> Backend (Public URL)
                    ├──HTTPS──> OCR Service (Public URL)
                    └──HTTPS──> Summarizer (Public URL)
```

- All services are **publicly accessible**
- Services **sleep after 15 minutes** of inactivity
- First request after sleep takes ~30 seconds to wake up
- Cost: **$0/month**

### PRODUCTION (Web Service + Private Services):

```
Frontend ──HTTPS──> Backend (Public URL)
                    ├──Internal Network──> OCR (Private)
                    └──Internal Network──> Summarizer (Private)
```

- Only backend is **publicly accessible**
- Private services use `.render.internal` domain (faster, free internal network)
- Services **always running**
- Better security (services not exposed to internet)
- Cost: **$14/month**

---

## Alternative: Docker Approach (Advanced)

For a cleaner deployment, consider creating Docker images:

```dockerfile
# backend/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY backend/ .
RUN npm install
CMD ["npm", "start"]

# ocr/Dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY ocr/ .
RUN pip install -r requirements.txt
CMD ["python", "ocr_service.py"]

# summarizer/Dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY summarizer/ .
RUNPricing Comparison

| Setup | Backend | OCR Service | Summarizer | Total/Month | Notes |
|-------|---------|-------------|------------|------------|-------|
| **Free Tier** | $0 (Web) | $0 (Web) | $0 (Web) | **$0** | Services sleep after 15 min |
| **Hybrid** | $0 (Web) | $7 (Private) | $7 (Private) | **$14** | Backend public, services private |
| **Premium** | $7 (Starter) | $7 (Private) | $7 (Private) | **$21** | All services always running |
| **Enterprise** | $25+ (Standard) | $25+ (Standard) | $25+ (Standard) | **$75+** | High performance guaranteed |

**Recommended:**
- **Development**: Free Tier (test deployment)
- **Production**: Hybrid ($14/month minimum)
- **High Traffic**: Premium or Enterprise

## Troubleshooting

| Issue                      | Solution                                                              |
| -------------------------- | --------------------------------------------------------------------- |
| Services can't communicate | Check internal URLs use `.render.internal` and ports match            |
| Memory errors              | Upgrade instance type or optimize dependencies                        |
| Build fails                | Check `requirements.txt` and `package.json` are up to date            |
| Port conflicts             | Ensure each service uses different ports (5000, 5001, 10000 for Node) |

---

## Estimated Pricing

- **Free Tier**: All 3 services × $0 = $0/month (but services sleep after 15 min inactivity)
- **Starter**: All 3 services × $7 = $21/month (always running)
- **Production Setup**: Varies based on usage

For production, recommend at least Starter instances.
```
