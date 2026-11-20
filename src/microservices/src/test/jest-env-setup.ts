import { envSchema } from '../env';

// Specs must not change behaviour because of ambient keys or tuning variables. Jest gives each
// test file its own copy of process.env, so clearing here only affects that file. NODE_ENV is
// kept because scripts/run-jest.js pins it to 'test'.
for (const key of Object.keys(envSchema.shape)) {
  if (key !== 'NODE_ENV') {
    delete process.env[key];
  }
}
