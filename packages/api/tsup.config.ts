import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['cjs'],
  dts: true,
  platform: 'node',
  target: 'node20',
  // Иначе в Docker резолвится main → .ts и Node падает на import без расширения (.js)
  noExternal: ['@unity/shared'],
});
