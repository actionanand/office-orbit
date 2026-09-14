export const environment = {
  production: false,
  // Switch to http://localhost:8787 when developing the Worker locally.
  // Android emulator: use http://10.0.2.2:8787 with a development-only cleartext policy.
  apiBaseUrl: 'https://work-tracker-api.techie-ar.workers.dev',
  deployUrl: 'https://actionanand.github.io/office-orbit/',
  // Client validation only; the Worker enforces its own import limit.
  // Examples:
  // 150 bytes = 150
  // 200 KB = 200 * 1024
  // 1 MB = 1 * 1024 * 1024
  // 10 MB = 10 * 1024 * 1024
  // 1 GB = 1 * 1024 * 1024 * 1024
  markdownFileMaxBytes: 4_500_000,
  // Shared public-sheet configuration from the local office-pulse environment.
  GOOGLE_SHEET_ID: '1YxH6WgNo9F8ZN4aaWRQVhfodup-pcuxX346rY9IjuGs',
  HOLIDAY_SHEET_GID: 1338469281,
  IMP_DAYS_SHEET_GID: 1294772822,
  ROTA_SHEET_GID: 381539897,
};
