package com.abid.zara;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognizerIntent;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.widget.Toast;
import androidx.webkit.JavaScriptReplyProxy;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

final class NativeBridge {
    static final int REQUEST_SPEECH = 7821, REQUEST_EXPORT = 7822;
    private final Activity activity;
    private TextToSpeech tts;
    private boolean ttsReady;
    private JavaScriptReplyProxy voicesProxy, recognitionProxy;
    private String recognitionId, exportText;
    private final Map<String, JavaScriptReplyProxy> speaking = new HashMap<>();

    NativeBridge(Activity activity) {
        this.activity = activity;
        tts = new TextToSpeech(activity, status -> activity.runOnUiThread(() -> {
            ttsReady = status == TextToSpeech.SUCCESS;
            if (ttsReady && tts != null) installTtsListener();
            if (voicesProxy != null) publishVoices(voicesProxy);
        }));
    }

    void handle(String json, JavaScriptReplyProxy proxy) {
        if (json == null || json.length() > 1100000) return;
        try {
            JSONObject data = new JSONObject(json);
            String action = data.optString("action"), id = data.optString("id");
            if (id.length() > 80) return;
            switch (action) {
                case "getVoices": voicesProxy = proxy; publishVoices(proxy); break;
                case "startSpeech": if (!id.isEmpty()) startRecognition(data, proxy); break;
                case "stopSpeech":
                case "abortSpeech": if (id.equals(recognitionId)) cancelRecognition(); break;
                case "speak": if (!id.isEmpty()) speak(data, proxy); break;
                case "stopTts": stopTts(); break;
                case "exportJson": exportJson(data); break;
                default: break;
            }
        } catch (Exception ignored) { /* Malformed page messages have no native side effect. */ }
    }

    private void startRecognition(JSONObject data, JavaScriptReplyProxy proxy) {
        if (recognitionId != null) { event(proxy, "recognition-error", data.optString("id"), "aborted"); event(proxy, "recognition-end", data.optString("id"), null); return; }
        String lang = data.optString("lang", "ur-PK");
        if (!lang.matches("[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8}){0,2}")) lang = "ur-PK";
        recognitionId = data.optString("id"); recognitionProxy = proxy;
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang);
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Bolein; text dekh kar Send dabayein");
        try {
            activity.startActivityForResult(intent, REQUEST_SPEECH);
            event(proxy, "recognition-start", recognitionId, null);
        } catch (ActivityNotFoundException error) { recognitionFailed("service-not-allowed"); }
        catch (SecurityException error) { recognitionFailed("not-allowed"); }
    }

    private void recognitionFailed(String error) {
        JavaScriptReplyProxy proxy = recognitionProxy; String id = recognitionId;
        recognitionId = null; recognitionProxy = null;
        if (proxy != null) { event(proxy, "recognition-error", id, error); event(proxy, "recognition-end", id, null); }
    }

    private void cancelRecognition() {
        if (recognitionId == null) return;
        try { activity.finishActivity(REQUEST_SPEECH); } catch (Exception ignored) {}
        recognitionFailed("aborted");
    }

    boolean onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQUEST_SPEECH) {
            JavaScriptReplyProxy proxy = recognitionProxy; String id = recognitionId;
            recognitionId = null; recognitionProxy = null;
            if (proxy == null) return true;
            ArrayList<String> results = data == null ? null : data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if (resultCode == Activity.RESULT_OK && results != null && !results.isEmpty()) {
                try { JSONObject message = new JSONObject(); message.put("type", "recognition-result"); message.put("id", id); message.put("text", results.get(0)); publish(proxy, message); } catch (Exception ignored) {}
            } else { event(proxy, "recognition-error", id, resultCode == Activity.RESULT_CANCELED ? "aborted" : "no-speech"); }
            event(proxy, "recognition-end", id, null); return true;
        }
        if (requestCode == REQUEST_EXPORT) {
            String text = exportText; exportText = null;
            if (resultCode == Activity.RESULT_OK && data != null && data.getData() != null && text != null) {
                try (OutputStream output = activity.getContentResolver().openOutputStream(data.getData())) {
                    if (output == null) throw new IllegalStateException();
                    output.write(text.getBytes(StandardCharsets.UTF_8));
                    toast("Backup save ho gaya.");
                } catch (Exception error) { toast("Backup save nahi ho saka."); }
            }
            return true;
        }
        return false;
    }

    private void speak(JSONObject data, JavaScriptReplyProxy proxy) {
        String id = data.optString("id"), text = data.optString("text");
        if (text.trim().isEmpty()) { event(proxy, "tts-end", id, null); return; }
        if (!ttsReady || tts == null) { event(proxy, "tts-error", id, "synthesis-unavailable"); return; }
        if (text.length() > TextToSpeech.getMaxSpeechInputLength() || speaking.size() >= 8) { event(proxy, "tts-error", id, "text-too-long"); return; }
        try {
            boolean selected = false; String voiceName = data.optString("voiceURI");
            Set<Voice> available = tts.getVoices();
            if (!voiceName.isEmpty() && available != null) for (Voice voice : available) if (voice.getName().equals(voiceName)) { tts.setVoice(voice); selected = true; break; }
            if (!selected) {
                int language = tts.setLanguage(Locale.forLanguageTag(data.optString("lang", "ur-PK")));
                if (language == TextToSpeech.LANG_MISSING_DATA || language == TextToSpeech.LANG_NOT_SUPPORTED) { event(proxy, "tts-error", id, "language-unavailable"); return; }
            }
            tts.setSpeechRate(clamp(data.optDouble("rate", 1), .5f, 2f));
            tts.setPitch(clamp(data.optDouble("pitch", 1), .5f, 2f));
            Bundle options = new Bundle(); options.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, clamp(data.optDouble("volume", 1), 0f, 1f));
            speaking.put(id, proxy);
            if (tts.speak(text, TextToSpeech.QUEUE_ADD, options, id) == TextToSpeech.ERROR) { speaking.remove(id); event(proxy, "tts-error", id, "synthesis-failed"); }
        } catch (Exception error) { speaking.remove(id); event(proxy, "tts-error", id, "synthesis-failed"); }
    }

    private static float clamp(double value, float min, float max) { return !Double.isNaN(value) && !Double.isInfinite(value) ? Math.max(min, Math.min(max, (float) value)) : 1f; }

    private void installTtsListener() {
        tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override public void onStart(String id) { activity.runOnUiThread(() -> { JavaScriptReplyProxy p = speaking.get(id); if (p != null) event(p, "tts-start", id, null); }); }
            @Override public void onDone(String id) { activity.runOnUiThread(() -> { JavaScriptReplyProxy p = speaking.remove(id); if (p != null) event(p, "tts-end", id, null); }); }
            @Override public void onError(String id) { activity.runOnUiThread(() -> { JavaScriptReplyProxy p = speaking.remove(id); if (p != null) event(p, "tts-error", id, "synthesis-failed"); }); }
            @Override public void onStop(String id, boolean interrupted) { activity.runOnUiThread(() -> { JavaScriptReplyProxy p = speaking.remove(id); if (p != null) event(p, "tts-error", id, "canceled"); }); }
            @Override public void onRangeStart(String id, int start, int end, int frame) {
                activity.runOnUiThread(() -> { JavaScriptReplyProxy p = speaking.get(id); if (p == null) return; try { JSONObject message = new JSONObject(); message.put("type", "tts-boundary"); message.put("id", id); message.put("index", start); publish(p, message); } catch (Exception ignored) {} });
            }
        });
    }

    void stopTts() {
        if (tts != null) tts.stop();
        Map<String, JavaScriptReplyProxy> stopped = new HashMap<>(speaking); speaking.clear();
        for (Map.Entry<String, JavaScriptReplyProxy> entry : stopped.entrySet()) event(entry.getValue(), "tts-error", entry.getKey(), "canceled");
    }

    private void publishVoices(JavaScriptReplyProxy proxy) {
        JSONArray voices = new JSONArray();
        try {
            if (ttsReady && tts != null) {
                Set<Voice> installed = tts.getVoices(); Set<Voice> available = installed == null ? new HashSet<>() : new HashSet<>(installed);
                Voice preferred = tts.getDefaultVoice(); if (available.isEmpty() && preferred != null) available.add(preferred);
                for (Voice voice : available) {
                    JSONObject item = new JSONObject(); item.put("voiceURI", voice.getName()); item.put("name", voice.getName()); item.put("lang", voice.getLocale().toLanguageTag()); item.put("localService", !voice.isNetworkConnectionRequired()); item.put("default", preferred != null && voice.getName().equals(preferred.getName())); voices.put(item);
                }
            }
            JSONObject message = new JSONObject(); message.put("type", "voices"); message.put("voices", voices); publish(proxy, message);
        } catch (Exception ignored) {}
    }

    private void exportJson(JSONObject data) {
        String text = data.optString("text"); if (exportText != null || text.length() > 1000000) return;
        try { new JSONObject(text); } catch (Exception error) { toast("Backup JSON sahi nahi hai."); return; }
        String filename = data.optString("filename", "zara-backup.json").replaceAll("[^A-Za-z0-9._-]", "_");
        if (!filename.endsWith(".json")) filename = "zara-backup.json";
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT); intent.addCategory(Intent.CATEGORY_OPENABLE); intent.setType("application/json"); intent.putExtra(Intent.EXTRA_TITLE, filename);
        exportText = text;
        try { activity.startActivityForResult(intent, REQUEST_EXPORT); } catch (Exception error) { exportText = null; toast("Files app available nahi. Chrome mein export karein."); }
    }

    void onResume() { if (voicesProxy != null && ttsReady) publishVoices(voicesProxy); }
    void onPageChanging() { cancelRecognition(); stopTts(); voicesProxy = null; }
    void close() { onPageChanging(); exportText = null; if (tts != null) { tts.shutdown(); tts = null; } }
    private void toast(String text) { Toast.makeText(activity, text, Toast.LENGTH_LONG).show(); }
    private void event(JavaScriptReplyProxy proxy, String type, String id, String error) { try { JSONObject value = new JSONObject(); value.put("type", type); value.put("id", id); if (error != null) value.put("error", error); publish(proxy, value); } catch (Exception ignored) {} }
    private void publish(JavaScriptReplyProxy proxy, JSONObject value) { if (!activity.isFinishing() && !activity.isDestroyed()) try { proxy.postMessage(value.toString()); } catch (Exception ignored) {} }
}
