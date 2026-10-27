package com.abid.zara;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
public final class OfflinePromptProbe {
    public static void main(String[] args)throws Exception{
        String[] samples={"kia hai ap ka","mera din bohat mushkil guzra, bas mujh se thori baat karo","mujhe chai pasand hai. Tum mujh se aik chhota sawal poocho"};
        for(int i=0;i<samples.length;i++)Files.write(Paths.get(args[0],"case-"+i+".txt"),OfflinePrompt.build(samples[i],Collections.emptyList(),"Roman Urdu").getBytes(StandardCharsets.UTF_8));
    }
}
