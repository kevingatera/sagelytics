// Mirrors the jest bin: default NODE_ENV to "test" so services disable Redis caching.
// pnpm also forwards a literal "--" to package scripts. Jest reads everything after it
// as a test path pattern, so `pnpm test -- --runInBand` would match nothing.
const { run } = require('jest');

process.env.NODE_ENV ??= 'test';
run(process.argv.slice(2).filter((arg) => arg !== '--'));
