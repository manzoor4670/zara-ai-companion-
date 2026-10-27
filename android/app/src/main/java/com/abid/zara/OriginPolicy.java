package com.abid.zara;

import java.net.URI;
import java.util.Locale;

final class OriginPolicy {
    static final String START_URL = "https://manzoor4670.github.io/zara-ai-companion-/";
    static final String ORIGIN = "https://manzoor4670.github.io";
    static final String BASE_PATH = "/zara-ai-companion-";

    static boolean isTrustedOrigin(String value) {
        try {
            URI uri = new URI(value);
            return "https".equalsIgnoreCase(uri.getScheme())
                && "manzoor4670.github.io".equalsIgnoreCase(uri.getHost())
                && uri.getRawUserInfo() == null && (uri.getPort() == -1 || uri.getPort() == 443);
        } catch (Exception ignored) { return false; }
    }

    static boolean isAppPage(String value) {
        if (!isTrustedOrigin(value)) return false;
        try {
            URI uri = new URI(value);
            String raw = uri.getRawPath().toLowerCase(Locale.ROOT);
            if (raw.contains("%")) return false;
            String path = uri.getPath();
            if (path.contains("\\") || path.contains("/../") || path.contains("/./") || path.endsWith("/..") || path.endsWith("/.")) return false;
            return path.equals(BASE_PATH) || path.startsWith(BASE_PATH + "/");
        } catch (Exception ignored) { return false; }
    }

    static boolean canOpenExternally(String value) {
        try {
            URI uri = new URI(value);
            return "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null && uri.getRawUserInfo() == null;
        } catch (Exception ignored) { return false; }
    }
    private OriginPolicy() {}
}
