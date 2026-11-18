package com.hospital.signage.application.service;

import java.text.Collator;
import java.util.Comparator;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Thứ tự tên "như người đọc": phần số so theo giá trị, phần chữ theo tiếng Việt.
 * "Tầng 2" < "Tầng 10" (so chuỗi thường ra ngược lại), "Tòa A" < "Tòa B" < "Tòa Đ".
 */
public final class NaturalNameOrder implements Comparator<String> {

    public static final NaturalNameOrder INSTANCE = new NaturalNameOrder();

    private static final Pattern CHUNK = Pattern.compile("\\d+|\\D+");

    private final Collator collator;

    private NaturalNameOrder() {
        collator = Collator.getInstance(Locale.forLanguageTag("vi"));
        // Bỏ qua khác biệt hoa/thường; vẫn phân biệt dấu (a < á).
        collator.setStrength(Collator.SECONDARY);
    }

    @Override
    public int compare(String a, String b) {
        if (a == null || b == null) {
            return a == null ? (b == null ? 0 : 1) : -1; // tên trống xếp cuối
        }
        Matcher ma = CHUNK.matcher(a.trim());
        Matcher mb = CHUNK.matcher(b.trim());
        while (true) {
            boolean hasA = ma.find();
            boolean hasB = mb.find();
            if (!hasA || !hasB) {
                return hasA ? 1 : (hasB ? -1 : 0);
            }
            String ca = ma.group();
            String cb = mb.group();
            boolean numA = Character.isDigit(ca.charAt(0));
            boolean numB = Character.isDigit(cb.charAt(0));
            int c;
            if (numA && numB) {
                c = compareNumbers(ca, cb);
            } else if (numA != numB) {
                c = numA ? -1 : 1; // số đứng trước chữ: "1A" < "A1"
            } else {
                c = collator.compare(ca, cb);
            }
            if (c != 0) {
                return c;
            }
        }
    }

    // So theo giá trị mà không ép kiểu (chuỗi số dài bao nhiêu cũng được): bỏ số 0 đầu,
    // số nhiều chữ số hơn thì lớn hơn, bằng nhau thì so từng chữ số.
    private static int compareNumbers(String a, String b) {
        String x = a.replaceFirst("^0+(?=\\d)", "");
        String y = b.replaceFirst("^0+(?=\\d)", "");
        if (x.length() != y.length()) {
            return Integer.compare(x.length(), y.length());
        }
        return x.compareTo(y);
    }
}
