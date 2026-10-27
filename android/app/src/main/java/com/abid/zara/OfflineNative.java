package com.abid.zara;

final class OfflineNative {
    private static boolean loaded;
    private static String issue="";
    static boolean available() {
        if (android.os.Build.VERSION.SDK_INT < 28) { issue="Offline chat ke liye Android 9 ya naya chahiye.";return false; }
        if (!loaded) try { System.loadLibrary("zara_offline"); runtimeBits(); loaded=true; issue=""; }
        catch (LinkageError error) { issue="Offline engine load nahi hua: "+error.getMessage();return false; }
        return true;
    }
    static String diagnostic() {
        String device="Android "+android.os.Build.VERSION.RELEASE+" · "+(android.os.Process.is64Bit()?"64":"32")+"-bit app · "+android.os.Build.SUPPORTED_ABIS[0];
        return loaded?device+" · Offline engine "+runtimeBits()+"-bit tayyar":device+"\n"+issue;
    }
    interface Listener { void onText(byte[] text); }
    static native long epoch();
    static native int runtimeBits();
    static native void cancel();
    static native byte[] generate(String modelPath, byte[] prompt, long epoch, Listener listener);
}
