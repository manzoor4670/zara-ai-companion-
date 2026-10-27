package com.abid.zara;

import java.util.List;

final class OfflinePrompt {
    static final class Turn {
        final String user,answer;
        Turn(String user,String answer){this.user=user;this.answer=answer;}
    }
    static String safe(String text,int limit){String s=text==null?"":text.replace("<|","＜|").replace("|>","|＞");return s.substring(0,Math.min(limit,s.length()));}
    static String build(String user,List<Turn> history) {
        StringBuilder p=new StringBuilder("<|im_start|>system\nYou are Zara, a helpful offline AI companion. Reply briefly in the user's language. For Roman Urdu use simple natural words. Be warm and accurate. Do not claim to be human or to have a body. You cannot see images or access the internet.\n<|im_end|>\n");
        for(int i=Math.max(0,history.size()-2);i<history.size();i++){
            Turn t=history.get(i);p.append("<|im_start|>user\n").append(safe(t.user,240)).append("<|im_end|>\n<|im_start|>assistant\n").append(safe(t.answer,400)).append("<|im_end|>\n");
        }
        return p.append("<|im_start|>user\n").append(safe(user,500)).append("<|im_end|>\n<|im_start|>assistant\n").toString();
    }
}
