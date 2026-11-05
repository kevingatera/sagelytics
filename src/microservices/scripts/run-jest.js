// Jest runs with NODE_ENV=test so services skip Redis caching; a shell-exported
// NODE_ENV must not turn caching on during tests.
// pnpm also forwards a literal "--" to package scripts. Jest reads everything after it
// as a test path pattern, so `pnpm test -- --runInBand` would match nothing.
const { run } = require('jest');

process.env.NODE_ENV = 'test';
run(process.argv.slice(2).filter((arg) => arg !== '--'));
