# Zara Android 0.1.0

An online Android app for the existing Zara website at
`https://manzoor4670.github.io/zara-ai-companion-/`. The web app and Worker
continue to own chat, modes, memory and image interpretation. No API key or
offline language model is bundled.

## Features

- Android WebView with persistent app-local browser storage.
- Existing image upload through the Android file chooser.
- Voice input through the system speech-recognition activity; its recognized
  text returns to the existing reviewable draft before Send.
- Spoken replies through Android TextToSpeech and the existing voice controls.
- JSON chat/settings exports through Android's document-save picker.
- Reload, external-browser fallback, and a connection-error/Retry notice.

Voice needs a system recognition service and a suitable installed TTS voice.
Some voices/recognition services require internet. The app does not request
microphone, camera, contacts or broad file-storage permission itself; selected
file/document access and recognition are provided by Android system activities.
This first version does not provide direct camera capture, a local AI model or
offline inference. It does not automatically import Chrome's chat/settings;
use the existing JSON export/import controls when moving data.

## Build and validation

JDK 17, Gradle 8.9, Android platform 35 and Build Tools 35.0.0:

```sh
node android/tests/native-bridge.test.mjs
gradle -p android :app:testReleaseUnitTest :app:lintRelease :app:assembleRelease
```

The GitHub workflow uploads an **unsigned** release APK and `apksigner.jar`.
Signing occurs outside GitHub using a private key that is never committed or
uploaded to workflow artifacts. The unsigned workflow artifact cannot be
installed directly. A signed package must pass `apksigner verify` before delivery.
Keep the same private signing key and increase versionCode for later updates.

The JavaScript tests use a mocked native channel; Java URL-policy unit tests,
Android lint and compilation run in CI. They do not replace testing on an
Android handset. Installation, Urdu speech recognition, TTS playback, Android
file-picker behavior, keyboard sizing and low-memory process restart must be
checked on the user's device.

## Native bridge boundaries

Only the owned HTTPS origin receives the AndroidX web-message object. Native
actions require a main-frame message and an owned Zara page URL; other origins,
subframes and unrelated GitHub Pages paths are rejected. The bridge does not
use addJavascriptInterface. Recognition requires a foreground user gesture in
the JavaScript adapter and launches Android's visible speech UI. Third-party
page permissions are denied, mixed content is blocked, file URL access is
disabled, and SSL errors are cancelled. External HTTPS links open in a browser.

App data remains separate from Chrome and follows the existing web app's
storage and configured-provider behavior. Saved-facts sharing remains off by
default and requires the existing explicit opt-in. Backups remain user-selected
files. No server setting, login protection or provider configuration is changed
by this Android wrapper.
