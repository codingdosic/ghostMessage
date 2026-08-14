package com.ghostMessage.util;

import java.security.SecureRandom;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public final class SecurityCodeHasher {

    private static final BCryptPasswordEncoder ENCODER = new BCryptPasswordEncoder();
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    private SecurityCodeHasher() {
    }

    public static String generateCode(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(CHARACTERS.charAt(RANDOM.nextInt(CHARACTERS.length())));
        }
        return sb.toString();
    }

    public static String hash(String plainCode) {
        return ENCODER.encode(plainCode);
    }

    public static boolean matches(String plainCode, String storedValue) {
        if (plainCode == null || storedValue == null) {
            return false;
        }
        if (isBcryptHash(storedValue)) {
            return ENCODER.matches(plainCode, storedValue);
        }
        return storedValue.equals(plainCode);
    }

    public static boolean isLegacyPlainText(String storedValue) {
        return storedValue != null && !isBcryptHash(storedValue);
    }

    private static boolean isBcryptHash(String value) {
        return value.startsWith("$2a$") || value.startsWith("$2b$");
    }
}
