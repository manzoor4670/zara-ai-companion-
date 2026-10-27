package com.abid.zara;
import org.junit.Test;
import static org.junit.Assert.*;
import java.util.*;
public class OfflineRepliesTest {
    private String reply(String q){return OfflineReplies.reply(q,"Roman Urdu",Collections.emptyList());}
    @Test public void screenshotFragmentAsksClarification(){for(String q:new String[]{"kia hai ap ka","Kya hai aapka?","kia hai apka"}){String r=reply(q);assertNotNull(r);assertTrue(r.contains("pooch rahe ho"));assertFalse(r.contains("brand"));}}
    @Test public void nameQuestionsDoNotBecomeEncyclopediaAnswers(){for(String q:new String[]{"ap ka naam kia hai","aapka naam kya hai","tmhara naam kya hai","what is your name"}){assertNotNull(q,reply(q));assertTrue(reply(q).startsWith("Mera naam Zara hai"));}}
    @Test public void wellbeingVariantsStayConversational(){for(String q:new String[]{"kia haal hai ap ka","kya hal hai","kaise ho","aap kaisay hain","how are you"})assertNotNull(q,reply(q));}
    @Test public void brandAndPlaceQuestionsRemainModelQuestions(){for(String q:new String[]{"Kia car kis mulk ki hai?","Kia Sonet ka engine kaisa hai?","Mumbai kis mulk mein hai?","Zara clothing brand kahan ka hai?"})assertNull(q,reply(q));}
    @Test public void greetingsRotateWithoutRepeatingConsecutively(){List<OfflinePrompt.Turn> h=new ArrayList<>();String previous="";for(int i=0;i<4;i++){String r=OfflineReplies.reply("salam zara","Roman Urdu",h);assertNotEquals(previous,r);h.add(new OfflinePrompt.Turn("salam",r));previous=r;}}
    @Test public void introductionUsesOnlyProvidedName(){String r=reply("Salam Zara, mera naam Abid hai");assertTrue(r.contains("Abid"));assertFalse(r.contains("Mumbai"));}
    @Test public void EnglishSelectionChangesReplyLanguage(){assertTrue(OfflineReplies.reply("ap ka naam kia hai","English",Collections.emptyList()).startsWith("My name is Zara"));}
    @Test public void UrduSelectionUsesUrduScript(){assertTrue(OfflineReplies.reply("ap ka naam kia hai","Urdu",Collections.emptyList()).startsWith("میرا نام زارا"));}
    @Test public void UnrelatedAndLongMessagesAreNotCanned(){assertNull(reply("mera din bohat mushkil guzra, kya main tumse baat kar sakta hun"));assertNull(reply(String.join("",Collections.nCopies(130,"a"))));}
    @Test public void modelPromptHasExplicitLanguageAndBoundedHistory(){List<OfflinePrompt.Turn> h=Arrays.asList(new OfflinePrompt.Turn("old-user","old-answer"));String p=OfflinePrompt.build("chai ke bare mein baat karo",h,"Roman Urdu");assertTrue(p.contains("Do not reply in English"));assertTrue(p.contains("If unclear, ask one short question"));assertTrue(p.contains("old-user"));assertTrue(p.endsWith("<|im_start|>assistant\n"));}
}
