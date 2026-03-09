import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // Alias peer dependencies that may not be built during tests
      '@hololand/world': path.resolve(__dirname, 'src/__tests__/__mocks__/world.ts'),
      // React is available in the pnpm store but not directly linked due to
      // a broken dependency in apps/brittney-mobile blocking pnpm install.
      // Resolve from the pnpm store until the broken dep is fixed.
      'react': path.resolve(__dirname, '../../../node_modules/.pnpm/react@18.3.1/node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../../node_modules/.pnpm/react-dom@18.3.1_react@18.3.1/node_modules/react-dom'),
      'react-router-dom': path.resolve(__dirname, '../../../node_modules/.pnpm/react-router-dom@6.30.3_rea_8738f2f356869a9d467b32612b8c1bd5/node_modules/react-router-dom'),
      'react-router': path.resolve(__dirname, '../../../node_modules/.pnpm/react-router@6.30.3_react@18.3.1/node_modules/react-router'),
      '@testing-library/react': path.resolve(__dirname, '../../../node_modules/.pnpm/@testing-library+react@14.3_74c3128c78ade5a5140014720e7753bf/node_modules/@testing-library/react'),
      '@testing-library/dom': path.resolve(__dirname, '../../../node_modules/.pnpm/@testing-library+dom@9.3.4/node_modules/@testing-library/dom'),
      '@testing-library/user-event': path.resolve(__dirname, '../../../node_modules/.pnpm/@testing-library+user-event@14.5.2_@testing-library+dom@9.3.4/node_modules/@testing-library/user-event'),
      '@holoscript/mvc-schema': path.resolve(__dirname, 'src/__tests__/__mocks__/mvc-schema.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
    ],
  },
});
