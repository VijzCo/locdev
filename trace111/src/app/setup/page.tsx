// Shown when Firebase env vars aren't configured yet.
export default function SetupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="max-w-lg rounded-lg border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Welcome to Trace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Firebase is not configured yet. Create a Firebase project on the Spark (free) plan,
          then fill in your config in <code className="rounded bg-muted px-1.5 py-0.5">.env.local</code>.
        </p>
        <ol className="mt-4 space-y-2 text-sm">
          <li>1. Go to <a className="text-primary underline" href="https://console.firebase.google.com" target="_blank" rel="noreferrer">console.firebase.google.com</a></li>
          <li>2. Create a project (Spark plan)</li>
          <li>3. Enable Authentication → Email/Password</li>
          <li>4. Create Firestore Database (production mode)</li>
          <li>5. Project Settings → General → add Web app, copy config into <code className="rounded bg-muted px-1.5 py-0.5">.env.local</code></li>
          <li>6. Restart <code className="rounded bg-muted px-1.5 py-0.5">npm run dev</code></li>
        </ol>
      </div>
    </div>
  );
}
