package com.abid.zara;

final class OfflineNative {
    private static boolean loaded;
    static boolean available() {
        if (!android.os.Process.is64Bit() || android.os.Build.VERSION.SDK_INT < 28) return false;
        if (!loaded) try { System.loadLibrary("zara_offline"); loaded=true; } catch (UnsatisfiedLinkError error) { return false; }
        return true;
    }
    interface Listener { void onText(byte[] text); }
    static native long epoch();
    static native void cancel();
    static native byte[] generate(String modelPath, byte[] prompt, long epoch, Listener listener);
}
