export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // The standalone server never loads next.config.js, so validate the environment here. Next
    // only logs a failing hook and keeps serving, so exit: an invalid environment (for example
    // production without a client-IP source) must stop the server.
    try {
      await import('./env');
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
    const { clientIpSourceWarning } = await import('./server/rate-limit');
    const warning = clientIpSourceWarning();
    if (warning) console.warn(`\n${'!'.repeat(80)}\n${warning}\n${'!'.repeat(80)}\n`);
  }
}
