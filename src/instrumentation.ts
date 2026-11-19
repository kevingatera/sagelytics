export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { clientIpSourceWarning } = await import('./server/rate-limit');
    const warning = clientIpSourceWarning();
    if (warning) console.warn(`\n${'!'.repeat(80)}\n${warning}\n${'!'.repeat(80)}\n`);
  }
}
