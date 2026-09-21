/// <reference types="vite/client" />

interface ImportMetaEnv {
  // PROMIS's own vars (add any others you already use)
  readonly VITE_FB_API_KEY: string;
  readonly VITE_FB_AUTH_DOMAIN: string;
  readonly VITE_FB_PROJECT_ID: string;
  readonly VITE_FB_STORAGE_BUCKET: string;
  readonly VITE_FB_MESSAGING_SENDER_ID: string;
  readonly VITE_FB_APP_ID: string;

  // OnTrack integration vars
  readonly VITE_ONTRACK_API_KEY: string;
  readonly VITE_ONTRACK_AUTH_DOMAIN: string;
  readonly VITE_ONTRACK_PROJECT_ID: string;
  readonly VITE_ONTRACK_STORAGE_BUCKET: string;
  readonly VITE_ONTRACK_SENDER_ID: string;
  readonly VITE_ONTRACK_APP_ID: string;
  readonly VITE_ONTRACK_SYNC_EMAIL: string;
  readonly VITE_ONTRACK_SYNC_PASSWORD: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}