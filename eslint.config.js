import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // This project fetches API data in `useEffect(() => { void load() })`.
      // React 19's new compiler-oriented rule flags the resulting setState calls
      // as errors; for this (non-compiler) app it is a performance hint, not a
      // correctness bug, so keep it visible as a warning instead of failing CI.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // AuthContext intentionally exports a provider plus the `useAuth` hook, and
    // main.tsx exports the small role-guard components rendered by the router.
    // Fast-refresh boundaries are irrelevant for these two entry files.
    files: ['src/context/AuthContext.tsx', 'src/main.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
