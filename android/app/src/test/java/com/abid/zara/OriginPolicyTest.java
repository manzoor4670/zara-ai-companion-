package com.abid.zara;
import org.junit.Test;
import static org.junit.Assert.*;

public class OriginPolicyTest {
    @Test public void allowsOwnedPagesAndRelativeSections() {
        for (String url : new String[]{OriginPolicy.START_URL, OriginPolicy.START_URL + "index.html", OriginPolicy.START_URL + "admin.html", OriginPolicy.START_URL + "?mode=romantic#chat"}) assertTrue(url, OriginPolicy.isAppPage(url));
    }
    @Test public void rejectsUnrelatedOriginsAndPaths() {
        for (String url : new String[]{"http://manzoor4670.github.io/zara-ai-companion-/", "https://evil.example/zara-ai-companion-/", "https://manzoor4670.github.io/other-repo/", "https://manzoor4670.github.io/zara-ai-companion-evil/", "https://manzoor4670.github.io.evil.example/zara-ai-companion-/", "https://user@manzoor4670.github.io/zara-ai-companion-/", "https://manzoor4670.github.io:444/zara-ai-companion-/", "javascript:alert(1)", "file:///etc/passwd", "content://files/private", "invalid"}) assertFalse(url, OriginPolicy.isAppPage(url));
    }
    @Test public void rejectsEncodedAndLiteralPathTraversal() {
        for (String path : new String[]{"../other", "%2e%2e/other", "%252e%252e/other", "%2fother", "%5cother", "%00", "./index.html"}) assertFalse(path, OriginPolicy.isAppPage(OriginPolicy.START_URL + path));
    }
    @Test public void onlyHttpsLinksLeaveTheApp() {
        assertTrue(OriginPolicy.canOpenExternally("https://huggingface.co/"));
        for (String value : new String[]{"http://example.com", "intent://example", "javascript:alert(1)", "file:///tmp/a", "https://user:password@example.com"}) assertFalse(value, OriginPolicy.canOpenExternally(value));
    }
}
