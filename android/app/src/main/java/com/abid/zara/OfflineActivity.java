package com.abid.zara;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputFilter;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Spinner;
import android.widget.ArrayAdapter;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class OfflineActivity extends Activity {
    private static final int PICK_MODEL=7840;
    private static final ExecutorService WORK=Executors.newSingleThreadExecutor();
    private TextView status,chat;
    private EditText input;
    private Button send,choose,download,clear,stop;
    private ScrollView scroll;
    private Spinner language;
    private boolean supported,busy,destroyed;
    private int operation;
    private String transcript="";
    private final ArrayList<OfflinePrompt.Turn> history=new ArrayList<>();

    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        supported=OfflineNative.available();
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(dp(14),dp(8),dp(14),dp(12));root.setFitsSystemWindows(true);root.setBackgroundColor(Color.rgb(23,19,30));
        TextView title=label("Zara · Offline text chat",21);root.addView(title);
        TextView note=label("Model import hone ke baad internet band karke baat karein. Yeh chhota text model hai; photo aur dress generation online hain. Offline chat is session tak rehti hai.",13);root.addView(note);
        root.addView(label("Salam, naam aur haal-chaal ke sawal seedhay samjhe jate hain. Baqi jawab chhota model banata hai.",12));
        root.addView(label("Zuban / Language",13));language=new Spinner(this);String[] languages={"Roman Urdu","Urdu","English"};language.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,languages));
        String savedLanguage=getPreferences(MODE_PRIVATE).getString("language","Roman Urdu");for(int i=0;i<languages.length;i++)if(languages[i].equals(savedLanguage))language.setSelection(i);root.addView(language);
        LinearLayout tools=new LinearLayout(this);
        Button online=button("Online");online.setOnClickListener(v->finish());tools.addView(online);
        download=button("Model download");download.setOnClickListener(v->{try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(OfflineModel.DOWNLOAD_URL)));}catch(Exception error){status.setText("Browser available nahi.");}});tools.addView(download);
        root.addView(tools);
        root.addView(label(OfflineNative.diagnostic(),13));
        choose=button("GGUF model chunein (491 MB)");choose.setOnClickListener(v->{if(!supported){status.setText(OfflineNative.diagnostic());return;}Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("*/*");try{startActivityForResult(intent,PICK_MODEL);}catch(Exception error){status.setText("Files app available nahi.");}});root.addView(choose);
        status=label("",14);status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);root.addView(status);
        scroll=new ScrollView(this);chat=label("",16);chat.setTextIsSelectable(true);scroll.addView(chat);root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
        input=new EditText(this);input.setTextColor(Color.WHITE);input.setHintTextColor(Color.LTGRAY);input.setHint("Yahan likhein · max 500 letters");input.setMaxLines(3);input.setFilters(new InputFilter[]{new InputFilter.LengthFilter(500)});root.addView(input,new LinearLayout.LayoutParams(-1,-2));
        LinearLayout controls=new LinearLayout(this);send=button("Send");send.setOnClickListener(v->send());controls.addView(send);stop=button("Stop");stop.setOnClickListener(v->{OfflineNative.cancel();status.setText("Rok rahi hoon...");});controls.addView(stop);clear=button("Nayi chat");clear.setOnClickListener(v->{history.clear();transcript="";chat.setText("");status.setText("Nayi offline chat tayyar hai.");});controls.addView(clear);root.addView(controls);
        setContentView(root);setBusy(false);
        status.setText(!supported?OfflineNative.diagnostic():modelFile().isFile()?"Model tayyar hai. Internet band karke test kar sakte hain.":"Pehle Model download dabayein (491 MB), phir GGUF model chunein. Agar yeh file pehle se phone mein hai to seedha chunein. Kam az kam 600 MB khali storage chahiye.");
    }
    private File modelFile(){return new File(getFilesDir(),OfflineModel.FILE_NAME);}
    private int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
    private TextView label(String text,int size){TextView v=new TextView(this);v.setText(text);v.setTextSize(size);v.setTextColor(Color.rgb(239,215,231));v.setPadding(0,dp(5),0,dp(5));return v;}
    private Button button(String text){Button b=new Button(this);b.setText(text);b.setAllCaps(false);b.setTextSize(12);return b;}
    private void setBusy(boolean value){busy=value;choose.setEnabled(!value);download.setEnabled(!value);language.setEnabled(!value);send.setEnabled(supported&&!value&&modelFile().isFile());clear.setEnabled(!value);input.setEnabled(!value);stop.setEnabled(value&&supported);}
    private void preview(String text){chat.setText(text);scroll.post(()->scroll.fullScroll(View.FOCUS_DOWN));}
    @Override protected void onActivityResult(int code,int result,Intent data){super.onActivityResult(code,result,data);if(code==PICK_MODEL&&result==RESULT_OK&&data!=null&&data.getData()!=null&&!busy&&supported)importModel(data.getData());}
    private void importModel(Uri uri){
        if(getFilesDir().getUsableSpace()<550_000_000L){status.setText("Model copy ke liye kam az kam 600 MB khali storage karein. Purana model mehfooz hai.");return;}
        setBusy(true);final int id=++operation;final long epoch=OfflineNative.epoch();status.setText("Model phone mein copy aur verify ho raha hai. Is screen par rahein...");
        WORK.execute(()->{File temp=null;String error=null;
            try{
                temp=File.createTempFile("zara-model-",".part",getFilesDir());
                try(InputStream in=getContentResolver().openInputStream(uri);FileOutputStream out=new FileOutputStream(temp)){
                    if(in==null)throw new IllegalStateException("read-failed");final long[] last={0};
                    OfflineModel.copyVerified(in,out,OfflineModel.SHA256,OfflineModel.MAX_BYTES,()->OfflineNative.epoch()!=epoch,bytes->{if(bytes-last[0]>8_000_000L){last[0]=bytes;runOnUiThread(()->{if(!destroyed&&operation==id)status.setText("Model verify: "+(bytes/1_000_000)+" MB / takreeban 491 MB");});}});
                    out.getFD().sync();
                }
                if(OfflineNative.epoch()!=epoch)throw new IllegalStateException("cancelled");
                if(!temp.renameTo(modelFile()))throw new IllegalStateException("save-failed");
            }catch(Exception e){error=e.getMessage();}finally{if(temp!=null)temp.delete();}
            final String failure=error;runOnUiThread(()->{if(destroyed||operation!=id)return;setBusy(false);status.setText(failure==null?"✓ Asli Qwen model verify aur save ho gaya. Ab internet band karke Send karein.":"Model import nahi hua: "+friendly(failure)+" Purana model ho to woh mehfooz hai.");});
        });
    }
    private void send(){
        if(busy||!supported||!modelFile().isFile())return;
        final String user=input.getText().toString().trim();if(user.isEmpty())return;
        final String selectedLanguage=language.getSelectedItem().toString();getPreferences(MODE_PRIVATE).edit().putString("language",selectedLanguage).apply();
        final String quick=OfflineReplies.reply(user,selectedLanguage,history);
        if(quick!=null){input.setText("");finishReply(user,quick);status.setText("✓ Chhote sawal ka local offline jawab tayyar.");return;}
        final String prompt=OfflinePrompt.build(user,history,selectedLanguage);final int id=++operation;final long epoch=OfflineNative.epoch();
        final String before=transcript;input.setText("");setBusy(true);status.setText("Offline Zara model load karke soch rahi hai... Stop se rok sakte hain.");preview(before+"Tum: "+user+"\n\nZara: …");
        WORK.execute(()->{String answer=null,error=null;
            try{answer=new String(OfflineNative.generate(modelFile().getAbsolutePath(),prompt.getBytes(StandardCharsets.UTF_8),epoch,bytes->{final String partial=new String(bytes,StandardCharsets.UTF_8);runOnUiThread(()->{if(!destroyed&&busy&&operation==id&&OfflineNative.epoch()==epoch)preview(before+"Tum: "+user+"\n\nZara: "+partial);});}),StandardCharsets.UTF_8).trim();}
            catch(Exception e){error=e.getMessage();}catch(OutOfMemoryError e){error="out-of-memory";}
            final String reply=answer,failure=error;runOnUiThread(()->{if(destroyed||operation!=id)return;setBusy(false);
                if(failure!=null||reply==null||reply.isEmpty()){input.setText(user);preview(before);status.setText("Jawab mukammal nahi hua: "+friendly(failure));return;}
                finishReply(user,reply);status.setText("✓ Model ka offline jawab tayyar. Koi chat server ko nahi bheji gayi.");
            });
        });
    }
    private void finishReply(String user,String reply){history.add(new OfflinePrompt.Turn(user,reply));while(history.size()>2)history.remove(0);transcript+="Tum: "+user+"\n\nZara: "+reply+"\n\n";if(transcript.length()>16000)transcript=transcript.substring(transcript.length()-12000);preview(transcript);}
    private static String friendly(String error){
        if("cancelled".equals(error))return "Rok diya gaya ya waqt khatam hua. Dobara Send karein.";
        if("wrong-model".equals(error))return "Yeh supported Qwen file nahi, ya download adhoora hai. Model download button wali file chunein.";
        if("not-gguf".equals(error))return "Yeh GGUF model file nahi.";
        if("model-too-large".equals(error))return "Model bohat bara hai. Di hui 0.5B file chunein.";
        if("prompt-too-long".equals(error))return "Message chhota karein ya Nayi chat dabayein.";
        if("out-of-memory".equals(error))return "Phone ki RAM kam par gayi. Doosri apps band karke dobara koshish karein.";
        return "Model read/load nahi hua. Khali storage check karein aur dobara import karein.";
    }
    @Override protected void onStop(){if(supported&&busy)OfflineNative.cancel();super.onStop();}
    @Override protected void onDestroy(){destroyed=true;if(supported&&busy)OfflineNative.cancel();super.onDestroy();}
}
