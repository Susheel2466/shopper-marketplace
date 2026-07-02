// TTL cache for hot, rarely-changing reads (e.g. the catalog).
//
// Two interchangeable backends behind one async interface (get/set/clear):
//   • default  — in-memory Map (fine for a single process)
//   • Redis    — used automatically when REDIS_URL is set (survives restarts,
//                shared across instances when you scale horizontally)
//
// To turn on Redis later — no caller changes needed:
//   1. cd backend && npm i ioredis
//   2. add to .env:  REDIS_URL=redis://127.0.0.1:6379
//   3. restart the server
//
// The interface is async so both backends look the same to callers. Redis
// calls fail open (a connection blip is treated as a cache miss, never an
// error), so the app keeps serving from Mongo if Redis is down.

const redisUrl = process.env.REDIS_URL;

// ---- In-memory backend (default) --------------------------------------
const store = new Map();

const memory = {
  async get(key) {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      store.delete(key);
      return null;
    }
    return entry.value;
  },
  async set(key, value, ttlMs = 60000) {
    store.set(key, { value, expires: Date.now() + ttlMs });
  },
  async clear() {
    store.clear();
  },
};

// ---- Redis backend (lazy) ---------------------------------------------
// ioredis is only require()d when REDIS_URL is set, so the app runs without
// the dependency installed unless you actually opt into Redis.
const PREFIX = "shopper:cache:";
let clientPromise = null;

let warned = false;
const getRedis = () => {
  if (!clientPromise) {
    clientPromise = Promise.resolve().then(() => {
      const Redis = require("ioredis");
      const client = new Redis(redisUrl, {
        // Fail a command after 2 retries instead of hanging when Redis is down;
        // the offline queue (left on) lets cold-start commands wait for the
        // initial connection so caching works from the first request.
        maxRetriesPerRequest: 2,
        retryStrategy: (times) => Math.min(times * 200, 2000),
      });
      // An 'error' event with no listener can crash the process. Attach one so
      // outages stay a warning (commands still fail open via get/set/clear).
      client.on("error", (err) => {
        if (!warned) {
          warned = true;
          console.warn(`[cache] Redis unavailable, serving from source: ${err.message}`);
        }
      });
      client.on("ready", () => {
        warned = false;
      });
      return client;
    });
  }
  return clientPromise;
};

const redis = {
  async get(key) {
    try {
      const client = await getRedis();
      const raw = await client.get(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null; // fail open: treat as a cache miss
    }
  },
  async set(key, value, ttlMs = 60000) {
    try {
      const client = await getRedis();
      await client.set(PREFIX + key, JSON.stringify(value), "PX", ttlMs);
    } catch {
      /* ignore — caching is best-effort */
    }
  },
  async clear() {
    try {
      const client = await getRedis();
      const keys = await client.keys(PREFIX + "*");
      if (keys.length) await client.del(keys);
    } catch {
      /* ignore */
    }
  },
};

module.exports = redisUrl ? redis : memory;
