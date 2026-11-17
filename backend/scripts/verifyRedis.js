/**
 * Flowdesk Redis Cloud Connectivity Verification Script
 *
 * Safely verifies live Redis Cloud connectivity using REDIS_URL.
 * NEVER prints or logs connection URLs, tokens, or credentials.
 * Does not execute FLUSHDB or any destructive operations.
 */

const { initRedis, getRedisClient, closeRedis, sanitizeRedisErrorMessage } = require('../src/redis/client');

const runVerification = async () => {
  console.log('[Redis Verification] Starting safe connection test...');
  const testKey = `flowdesk:test:verify_${Date.now()}`;

  try {
    const client = await initRedis();
    if (!client) {
      console.error('[Redis Verification Failed] Client could not be initialized or REDIS_URL is not configured.');
      process.exit(1);
    }

    const pong = await client.ping();
    if (pong !== 'PONG') {
      console.error(`[Redis Verification Failed] Unexpected PING response: ${pong}`);
      process.exit(1);
    }
    console.log('[Redis Verification] PING -> PONG: SUCCESS');

    await client.set(testKey, 'flowdesk_verification_token', 'EX', 15);
    const readVal = await client.get(testKey);

    if (readVal !== 'flowdesk_verification_token') {
      console.error('[Redis Verification Failed] Key write/read verification mismatch.');
      process.exit(1);
    }
    console.log('[Redis Verification] Namespaced SET/GET: SUCCESS');

    await client.del(testKey);
    console.log('[Redis Verification] Test key cleanup: SUCCESS');

    await closeRedis();
    console.log('[Redis Verification] Graceful disconnect: SUCCESS');
    console.log('\x1b[32m[Redis Verification] All live Redis Cloud checks passed successfully.\x1b[0m');
    process.exit(0);
  } catch (err) {
    const safeError = sanitizeRedisErrorMessage(err?.message || 'Verification error');
    console.error(`\x1b[31m[Redis Verification Failed] Error: ${safeError}\x1b[0m`);
    try {
      await closeRedis();
    } catch (_) {}
    process.exit(1);
  }
};

if (require.main === module) {
  runVerification();
}

module.exports = runVerification;
