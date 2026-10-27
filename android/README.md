# Zara Android 0.2.0

## Offline text chat

Tap **Offline** in the native toolbar. Import the official Qwen2.5-0.5B-Instruct
Q4_K_M GGUF using the system document picker. The download button opens the
official model URL in a browser; reuse the same file if already downloaded.
The file is about 491 MB and is not bundled in the APK. Import copies it to
app-private storage, verifies its GGUF header and pinned SHA-256, and leaves an
existing model untouched if the new import fails. Keep at least 600 MB free for
the import in addition to the downloaded file. Uninstalling the app removes
its private model copy. No chat is sent to a server by this offline screen.

Offline inference uses the CPU through llama.cpp v0.7.0, pinned to commit
620d2225cc436ab0b001e3200e590e3b286ef9ab. It requires a 64-bit Android process
on Android 9+. The APK also retains a 32-bit online fallback; the offline button
explains the requirement on unsupported phones. RAM and speed still require
handset validation. For a 4 GB device the context is limited to 1024 tokens,
two short previous exchanges, 128 output tokens, two CPU threads and a
90-second inference deadline. A small model may struggle with Urdu/Roman Urdu
and complex requests. Context overflow asks for a shorter message/new chat.

This first offline screen supports text only. It has independent session-only
chat history; online chats, saved facts, voice, image understanding and dress
generation are not transferred to it. Stop/backgrounding cancels pending work.
The pinned model and native license remain separate from provider settings.

Builds check out the pinned llama.cpp source into `android/llama.cpp` and install
NDK 27.2.12479018 plus CMake 3.22.1. The source/model are ignored in git.
CI runs the shared C++ inference core against the checksum-verified real model
on a host CPU, including cancellation and prompt-limit checks. Android builds
and Java unit tests cover packaging/import/prompt helpers. These are not
physical-device tests.

An Android app with an online screen for the existing Zara website at
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
The online screen does not provide direct camera capture. The separate Offline
screen uses the imported local text model described above. The online screen
does not automatically import Chrome's chat/settings;
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
