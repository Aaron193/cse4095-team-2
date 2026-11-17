// The client's own Vite environment variables (read through `import.meta.env`).
interface ImportMetaEnv {
  /** "1" answers the API from the in-browser mocks in src/mocks (task P1-D2). Development only. */
  readonly VITE_USE_MOCKS?: string;
}
