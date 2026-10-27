#include <jni.h>
extern "C" JNIEXPORT jlong JNICALL Java_com_abid_zara_OfflineNative_epoch(JNIEnv *,jclass){return 0;}
extern "C" JNIEXPORT void JNICALL Java_com_abid_zara_OfflineNative_cancel(JNIEnv *,jclass){}
extern "C" JNIEXPORT jbyteArray JNICALL Java_com_abid_zara_OfflineNative_generate(JNIEnv *e,jclass,jstring,jbyteArray,jlong,jobject){e->ThrowNew(e->FindClass("java/lang/IllegalStateException"),"64-bit-android-required");return nullptr;}
