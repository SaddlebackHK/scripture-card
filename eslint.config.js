import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

// Clean Architecture dependency rule:
//   domain        → no inward deps
//   application   → may use domain, shared
//   infrastructure→ may use domain, application, shared
//   presentation  → may use application, domain (types), shared; infrastructure only at composition root
//   shared        → no layer deps
const layerBoundaries = {
  domain: {
    forbidden: ['@application/*', '@infrastructure/*', '@presentation/*'],
    message: 'domain must not depend on outer layers',
  },
  application: {
    forbidden: ['@infrastructure/*', '@presentation/*'],
    message: 'application must not depend on infrastructure or presentation',
  },
  infrastructure: {
    forbidden: ['@presentation/*'],
    message: 'infrastructure must not depend on presentation',
  },
  shared: {
    forbidden: ['@domain/*', '@application/*', '@infrastructure/*', '@presentation/*'],
    message: 'shared must remain layer-agnostic',
  },
};

const layerRule = (layer) => ({
  files: [`src/${layer}/**/*.{ts,tsx}`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: layerBoundaries[layer].forbidden.map((pattern) => ({
          group: [pattern],
          message: layerBoundaries[layer].message,
        })),
      },
    ],
  },
});

export default defineConfig([
  globalIgnores(['dist', 'coverage', '.firebase', 'ref']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      prettierConfig,
    ],
    plugins: { prettier: prettierPlugin },
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      // Forbid `style={{ ... }}` on DOM elements (lowercase JSX tags).
      // Use a class from src/presentation/styles/global.css with tokens
      // (var(--space-*), var(--ink), etc.) instead. React components and
      // motion.* elements (uppercase tags) are unaffected.
      // To override for genuinely dynamic dimensions, add an inline
      // `// eslint-disable-next-line no-restricted-syntax -- reason`.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "JSXOpeningElement[name.type='JSXIdentifier'][name.name=/^[a-z]/] > JSXAttribute[name.name='style']",
          message:
            'Avoid inline `style` on DOM elements. Add a semantic class to global.css and use design tokens (var(--space-*), var(--ink), etc.).',
        },
      ],
    },
  },
  layerRule('domain'),
  layerRule('application'),
  layerRule('infrastructure'),
  layerRule('shared'),
  {
    files: ['**/*.{test,spec}.{ts,tsx}', 'src/test/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['*.config.{js,ts}', 'vite.config.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
]);
