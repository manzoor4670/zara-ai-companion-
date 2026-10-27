package com.abid.zara;

import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// Small, explicit local intents. Unrelated questions still go to the model.
final class OfflineReplies {
    static String line(String language,String roman,String urdu,String english){return "English".equals(language)?english:"Urdu".equals(language)?urdu:roman;}
    private static String normalize(String input){
        return input.toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N} ]"," ").replaceAll("\\s+"," ").trim()
            .replaceAll("\\b(?:kia|kiya)\\b","kya").replaceAll("\\b(?:ap|aap)\\b","aap")
            .replaceAll("\\b(?:tm|tum)\\b","tum").replaceAll("\\b(?:hy|h)\\b","hai").replaceAll("\\bapka\\b","aapka").replaceAll("\\btmhara\\b","tumhara");
    }
    static String reply(String input,String language,List<OfflinePrompt.Turn> history){
        if(input==null||input.length()>120)return null;
        String q=normalize(input);
        if(q.matches("(?:kya hai (?:aap ka|aapka|tumhara)|aap ka kya|aapka kya)"))
            return line(language,"Tum mera naam pooch rahe ho ya kuch aur?","تم میرا نام پوچھ رہے ہو یا کچھ اور؟","Are you asking my name or something else?");
        if(q.matches("(?:(?:aap ka|aapka|tumhara|tera) naam(?: kya)?(?: hai)?|(?:kya|what) (?:hai )?(?:aap ka|aapka|tumhara) naam(?: hai)?|what is your name|what s your name|who are you)"))
            return line(language,"Mera naam Zara hai. Tum kis bare mein baat karna chahte ho?","میرا نام زارا ہے۔ تم کس بارے میں بات کرنا چاہتے ہو؟","My name is Zara. What would you like to talk about?");
        if(q.matches("(?:(?:salam|assalamualaikum|assalam o alaikum|hello|hi)(?: zara)?|سلام|السلام علیکم)"))
            return alternate(language,history,new String[]{"Salam! Kaise ho?","Salam! Aaj tumhara din kaisa guzra?"},new String[]{"سلام! کیسے ہو؟","سلام! آج تمہارا دن کیسا گزرا؟"},new String[]{"Hello! How are you?","Hello! How has your day been?"});
        Matcher intro=Pattern.compile("^(?:(?:salam|hello|hi)(?: zara)? )?(?:mera|mara) naam ([\\p{L}][\\p{L} ]{0,34}?)(?: hai)?$").matcher(q);
        if(intro.matches()){
            String name=intro.group(1);name=name.substring(0,1).toUpperCase(Locale.ROOT)+name.substring(1);
            return line(language,"Salam "+name+"! Tumse milkar achha laga. Kaise ho?","سلام "+name+"! تم سے مل کر اچھا لگا۔ کیسے ہو؟","Hello "+name+"! Nice to meet you. How are you?");
        }
        if(q.matches("(?:(?:aap|tum) )?(?:kaise|kaisay|kese|kesy|kaisi) (?:ho|hain|hai)|(?:kya|kaisa) (?:haal|hal)(?: hai)?(?: (?:aap ka|aapka|tumhara))?|how are you"))
            return alternate(language,history,new String[]{"Main tumhari baat sunne ke liye tayyar hoon. Tum kaise ho?","Main yahin hoon. Aaj tumhara mood kaisa hai?"},new String[]{"میں تمہاری بات سننے کے لیے تیار ہوں۔ تم کیسے ہو؟","میں یہیں ہوں۔ آج تمہارا موڈ کیسا ہے؟"},new String[]{"I'm here and ready to listen. How are you?","I'm here. How are you feeling today?"});
        if(q.matches("(?:tum|aap) kya kar (?:sakti|sakte|skty|skti) (?:ho|hain|hai)|what can you do"))
            return line(language,"Main offline text mein baat aur chhote sawalon mein madad kar sakti hoon. Yeh offline model tasveer nahi dekh sakta aur dress ki image nahi bana sakta.","میں آف لائن بات اور چھوٹے سوالوں میں مدد کر سکتی ہوں۔ یہ آف لائن ماڈل تصویر نہیں دیکھ سکتا اور لباس کی تصویر نہیں بنا سکتا۔","I can chat and help with short text questions offline. This offline model cannot see images or generate dress images.");
        return null;
    }
    private static String alternate(String language,List<OfflinePrompt.Turn> history,String[] roman,String[] urdu,String[] english){
        String first=line(language,roman[0],urdu[0],english[0]);
        if(!history.isEmpty()&&first.equals(history.get(history.size()-1).answer))return line(language,roman[1],urdu[1],english[1]);
        return first;
    }
}
