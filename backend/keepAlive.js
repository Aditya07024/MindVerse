/**
 * Health Check Pinger - Keeps Render free tier services alive
 * Pings /health endpoint every 5 minutes to prevent service sleep
 *
 * Usage: node keepAlive.js
 * Or add to Render as a Background Worker with cron
 */

require("dotenv").config();

// Service URLs to keep alive
const SERVICES = [
  {
    name: "Backend",
    url: process.env.BACKEND_URL || "https://mindverse-backend.onrender.com",
  },
  {
    name: "OCR Service",
    url:
      process.env.OCR_SERVICE_URL ||
      "https://mindverse-ocr-service.onrender.com",
  },
  {
    name: "Summarizer Service",
    url:
      process.env.SUMMARIZER_SERVICE_URL ||
      "https://mindverse-summarizer-service.onrender.com",
  },
];

const PING_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Ping a service's health endpoint
 */
async function pingService(service) {
  try {
    const response = await fetch(`${service.url}/health`, {
      method: "GET",
      timeout: 10000,
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${service.name}: ${response.status} - ${data.status}`);
      return true;
    } else {
      console.warn(`⚠️  ${service.name}: Returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ ${service.name}: ${error.message}`);
    return false;
  }
}

/**
 * Ping all services
 */
async function pingAllServices() {
  console.log(`\n📍 [${new Date().toISOString()}] Pinging services...`);

  for (const service of SERVICES) {
    await pingService(service);
  }

  console.log("✅ Ping cycle complete\n");
}

/**
 * Start the keep-alive scheduler
 */
function startKeepAlive() {
  console.log("🚀 Keep-Alive Service Started");
  console.log(
    `📋 Will ping services every ${PING_INTERVAL / 1000 / 60} minutes`,
  );
  console.log("📡 Services to monitor:");
  SERVICES.forEach((s) => console.log(`   - ${s.name}: ${s.url}`));
  console.log("");

  // Initial ping
  pingAllServices();

  // Ping every 5 minutes
  setInterval(pingAllServices, PING_INTERVAL);
}

// Start the service
startKeepAlive();

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Shutting down Keep-Alive Service...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 Shutting down Keep-Alive Service...");
  process.exit(0);
});
