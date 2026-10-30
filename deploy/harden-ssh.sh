#!/usr/bin/env bash
# Tắt đăng nhập SSH bằng mật khẩu và tắt đăng nhập thẳng bằng root.
#
# Chỉ chạy SAU KHI đã đăng nhập thành công bằng tài khoản deploy (không bị hỏi mật khẩu):
#
#   ssh deploy@<IP-server>
#   sudo bash /opt/sign_management/deploy/harden-ssh.sh
#
# Vì sao cần: server có IP công khai bị dò mật khẩu SSH liên tục. Tắt hẳn đăng nhập bằng mật
# khẩu thì việc dò đó vô nghĩa — chỉ ai giữ file SSH key mới vào được.
#
# Vì sao tách khỏi server-setup.sh: làm bước này khi key chưa dùng được là tự khoá mình ngoài
# server. Script chỉ cho chạy từ phiên đăng nhập bằng deploy — tức là key đã được chứng minh
# dùng được, vì deploy không có mật khẩu.
set -euo pipefail

DEPLOY_USER=deploy
CONF=/etc/ssh/sshd_config.d/01-hardening.conf

die() { echo "LỖI: $*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "phải chạy bằng sudo."
[ "${SUDO_USER:-}" = "$DEPLOY_USER" ] || die "hãy đăng nhập bằng  ssh $DEPLOY_USER@<IP>  rồi chạy lại bằng sudo.
Chạy từ tài khoản $DEPLOY_USER là cách để chắc chắn SSH key của nó dùng được trước khi tắt mật khẩu."
[ -s "/home/$DEPLOY_USER/.ssh/authorized_keys" ] || die "tài khoản $DEPLOY_USER chưa có SSH key nào."

# Tên bắt đầu bằng 01- là CÓ CHỦ Ý. Với mỗi tuỳ chọn, sshd dùng giá trị ĐẦU TIÊN nó đọc được,
# và đọc các file trong sshd_config.d theo thứ tự tên. Ảnh VPS Ubuntu thường có sẵn
# 50-cloud-init.conf chứa "PasswordAuthentication yes" — đặt tên 99-... thì dòng đó thắng,
# và việc tắt mật khẩu âm thầm không có tác dụng.
cat > "$CONF" <<'EOF'
# Tạo bởi deploy/harden-ssh.sh
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
EOF

rollback() {
    rm -f "$CONF"
    systemctl reload ssh 2>/dev/null || true
    die "$1 Đã hoàn tác, cấu hình SSH giữ nguyên như trước."
}

sshd -t 2>/dev/null || rollback "cấu hình SSH sai cú pháp."

# Đọc lại cấu hình sshd SẼ THỰC SỰ dùng, thay vì tin là file vừa ghi đã có tác dụng.
effective="$(sshd -T 2>/dev/null)"
for opt in passwordauthentication kbdinteractiveauthentication permitrootlogin; do
    echo "$effective" | grep -qx "$opt no" || rollback "tuỳ chọn $opt vẫn chưa thành \"no\" (có file cấu hình khác đang ghi đè)."
done

# reload không cắt các phiên đang mở, kể cả phiên bạn đang dùng.
systemctl reload ssh

echo "Đã tắt đăng nhập bằng mật khẩu và đăng nhập bằng root."
echo
echo "QUAN TRỌNG — chưa đóng cửa sổ này vội:"
echo "  Mở một cửa sổ PowerShell MỚI trên máy bạn và gõ:  ssh $DEPLOY_USER@<IP-server>"
echo "  Vào được thì xong. Không vào được thì quay lại cửa sổ này và gõ:"
echo "      sudo rm $CONF && sudo systemctl reload ssh"
