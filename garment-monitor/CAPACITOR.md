# Building the PROMIS Android APK (Capacitor)

**Capacitor is already installed and the `android/` native project is already
scaffolded** (appId `com.promis.factory`, plugins `@capacitor/device` +
`@capacitor/app`). You just build the web app, sync, and compile in Android
Studio. No `cap init` / `cap add` needed.

## One time, after unzipping
```bash
npm install            # restores node_modules incl. Capacitor
npm run build          # produces dist/
npx cap sync android   # copies dist/ + plugins into android/
```

## Open & build the APK
```bash
npx cap open android   # opens the android/ project in Android Studio
```
In Android Studio:
- First run may prompt to install/match the Android SDK + Gradle — accept.
- **Build → Generate Signed Bundle / APK → APK** → create a keystore the first
  time → outputs `app-release.apk`.

Command-line alternative (after `local.properties` has your SDK path, which
Android Studio sets automatically):
```bash
cd android && ./gradlew assembleDebug      # quick test APK (no signing)
# → android/app/build/outputs/apk/debug/app-debug.apk
./gradlew assembleRelease                  # release (configure signing first)
```

## Every release after a web change
```bash
npm run build && npx cap sync android      # then rebuild in Android Studio
```

## Already wired for you
- **Device Home (kiosk):** on the APK (native), launch opens a **Device Home**.
  A fresh device shows **Device Setup** (a Manage-Devices user signs in →
  Factory→Department→Section→Module **+ which apps this device runs**), saved to
  the device record (visible in Device Management). After that, Home shows **only
  the enabled apps as icons** — PROMIS → module tab, Downtime → downtime-only
  view, Quality → coming soon. If only one app is enabled it opens straight into
  it. A **Home** button returns to the launcher.
- **Central, live control:** the tablet listens to its own device record, so
  reassigning the module, toggling apps, or **disabling** the device from the web
  reflects on the tablet within seconds (disabled → "Device disabled" screen).
- **Floor use needs no login;** only setup/reconfigure needs a Manage-Devices
  sign-in (username like `vijan.b`; domain set in Settings).
- **Native device id + model** flow into the Audit Log + Device Management.

## Optional polish
- **Icon / splash:** `npm i -D @capacitor/assets`, put a 1024×1024 `icon.png`
  (and optional `splash.png`) in a `resources/` folder, run
  `npx capacitor-assets generate --android`, then `npx cap sync android`.
- **Kiosk deep-link:** point a tablet straight at a screen by changing the start
  URL, e.g. `/module?module=Q01` or `/downtime/display?factory=<id>`, and lock
  the device with a kiosk launcher.
- **Live URL instead of bundled web:** set `server.url` in
  `capacitor.config.json` to your Firebase Hosting URL so the APK always loads
  the latest deployed app (needs network on launch). Leave it unset to ship the
  built web app inside the APK.
- **App name:** change `appName` / `appId` in `capacitor.config.json` before the
  first real release if you want something other than PROMIS / com.promis.factory
  (changing appId after publishing to Play Store is not possible).

## iOS later
Same flow with `npm i @capacitor/ios && npx cap add ios`, built in Xcode on a Mac.
