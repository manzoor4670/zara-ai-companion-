#include <jni.h>
#include "inference.h"
#include <exception>
#include <stdexcept>
extern "C" JNIEXPORT jint JNICALL Java_com_abid_zara_OfflineNative_runtimeBits(JNIEnv *,jclass){return sizeof(void*)*8;}
extern "C" JNIEXPORT jlong JNICALL Java_com_abid_zara_OfflineNative_epoch(JNIEnv *,jclass){return static_cast<jlong>(zara_epoch());}
extern "C" JNIEXPORT void JNICALL Java_com_abid_zara_OfflineNative_cancel(JNIEnv *,jclass){zara_cancel();}
extern "C" JNIEXPORT jbyteArray JNICALL Java_com_abid_zara_OfflineNative_generate(JNIEnv *env,jclass,jstring path,jbyteArray prompt,jlong epoch,jobject listener){
    try{
        const char *p=env->GetStringUTFChars(path,nullptr);if(!p)return nullptr;
        std::string model_path(p);env->ReleaseStringUTFChars(path,p);
        const auto length=env->GetArrayLength(prompt);std::string input(length,'\0');
        env->GetByteArrayRegion(prompt,0,length,reinterpret_cast<jbyte *>(input.data()));
        if(env->ExceptionCheck())return nullptr;
        jclass klass=env->GetObjectClass(listener);jmethodID method=env->GetMethodID(klass,"onText","([B)V");
        if(!method)return nullptr;
        const auto answer=zara_generate(model_path,input,static_cast<uint64_t>(epoch),[&](const std::string &s){
            jbyteArray bytes=env->NewByteArray(s.size());if(!bytes)throw std::runtime_error("out-of-memory");
            env->SetByteArrayRegion(bytes,0,s.size(),reinterpret_cast<const jbyte *>(s.data()));
            env->CallVoidMethod(listener,method,bytes);env->DeleteLocalRef(bytes);
            if(env->ExceptionCheck())throw std::runtime_error("callback-failed");
        });
        jbyteArray bytes=env->NewByteArray(answer.size());
        if(bytes)env->SetByteArrayRegion(bytes,0,answer.size(),reinterpret_cast<const jbyte *>(answer.data()));
        return bytes;
    }catch(const std::exception &e){if(!env->ExceptionCheck())env->ThrowNew(env->FindClass("java/lang/IllegalStateException"),e.what());return nullptr;}
    catch(...){if(!env->ExceptionCheck())env->ThrowNew(env->FindClass("java/lang/IllegalStateException"),"native-failed");return nullptr;}
}
