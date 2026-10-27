package com.abid.zara;

import java.io.InputStream;
import java.io.OutputStream;
import java.io.IOException;
import java.security.MessageDigest;

final class OfflineModel {
    static final String SHA256="74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db";
    static final String FILE_NAME="qwen-74a4da8c.gguf";
    static final String DOWNLOAD_URL="https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf?download=true";
    static final long MAX_BYTES=650_000_000L;
    interface Progress { void update(long bytes); }
    interface CancelCheck { boolean getAsBoolean(); }
    static long copyVerified(InputStream input, OutputStream output, String hash, long limit, CancelCheck cancelled, Progress progress) throws Exception {
        MessageDigest digest=MessageDigest.getInstance("SHA-256");
        byte[] buffer=new byte[65536],magic=new byte[4];long total=0;
        for(int read;(read=input.read(buffer))!=-1;) {
            if(cancelled.getAsBoolean())throw new IOException("cancelled");
            if(read==0)continue;
            if(total+read>limit)throw new IOException("model-too-large");
            for(int i=0;i<read&&total+i<4;i++)magic[(int)total+i]=buffer[i];
            total+=read;digest.update(buffer,0,read);output.write(buffer,0,read);progress.update(total);
        }
        if(total<4 || magic[0]!='G' || magic[1]!='G' || magic[2]!='U' || magic[3]!='F')throw new IOException("not-gguf");
        StringBuilder actual=new StringBuilder();for(byte b:digest.digest())actual.append(String.format(java.util.Locale.ROOT,"%02x",b&255));
        if(!actual.toString().equals(hash))throw new IOException("wrong-model");
        if(cancelled.getAsBoolean())throw new IOException("cancelled");
        return total;
    }
}
