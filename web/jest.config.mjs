/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          // Minimal tsconfig for jest — no DOM types needed for unit tests
          target: 'ES2022',
          module: 'commonjs',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
        },
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    // Alias @/ to src/ for imports (matches tsconfig paths)
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/lib/**/*.ts',
    'src/hooks/**/*.ts',
    '!src/**/*.d.ts',
  ],
};

export default config;
