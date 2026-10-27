package com.abid.zara;

import java.util.List;

final class OfflinePrompt {
    static final class Turn {
        final String user,answer;
        Turn(String user,String answer){this.user=user;this.answer=answer;}
    }
    static String safe(String text,int limit){String s=text==null?"":text.replace("<|","＜|").replace("|>","|＞");return s.substring(0,Math.min(limit,s.length()));}
    static String build(String user,List<Turn> history) {
        return build(user,history,"Roman Urdu");
    }
    static String build(String user,List<Turn> history,String language) {
        String instruction="English".equals(language)?"Reply only in simple English.":"Urdu".equals(language)?"Reply only in simple Urdu, using Urdu script.":"Reply only in natural Pakistani Roman Urdu using English letters. Do not reply in English.";
        StringBuilder p=new StringBuilder("<|im_start|>system\nYou are Zara, a warm offline AI companion. "+instruction+" Use 1-2 short sentences. In Roman Urdu, kia/kya means what and aap/ap means you. Do not interpret these as brand or place names unless the user explicitly asks about brands or places. If unclear, ask one short question. Do not invent facts. Do not claim a human body. No image or internet access.\n<|im_end|>\n");
        example(p,"ap ka naam kia hai",OfflineReplies.line(language,"Mera naam Zara hai. Tumhara naam kya hai?","میرا نام زارا ہے۔ تمہارا نام کیا ہے؟","My name is Zara. What is your name?"));
        example(p,"kia hai ap ka",OfflineReplies.line(language,"Tum mera naam pooch rahe ho ya kuch aur?","تم میرا نام پوچھ رہے ہو یا کچھ اور؟","Are you asking my name or something else?"));
        for(int i=Math.max(0,history.size()-2);i<history.size();i++){
            Turn t=history.get(i);p.append("<|im_start|>user\n").append(safe(t.user,120)).append("<|im_end|>\n<|im_start|>assistant\n").append(safe(t.answer,160)).append("<|im_end|>\n");
        }
        return p.append("<|im_start|>user\n").append(safe(user,500)).append("<|im_end|>\n<|im_start|>assistant\n").toString();
    }
    private static void example(StringBuilder p,String user,String answer){p.append("<|im_start|>user\n").append(user).append("<|im_end|>\n<|im_start|>assistant\n").append(answer).append("<|im_end|>\n");}
}
