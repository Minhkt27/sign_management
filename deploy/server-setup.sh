#!/usr/bin/env bash
# Cài đặt VPS Ubuntu 24.04 mới thuê. Chạy MỘT LẦN, bằng root:
#
#   bash /opt/sign_management/deploy/server-setup.sh
#
# Chạy lại nhiều lần cũng không sao — bước nào đã làm rồi thì bỏ qua.
#
# Làm 8 việc:
#   1. Cập nhật hệ điều hành + bật tự cài bản vá bảo mật mỗi ngày
#   2. Múi giờ Việt Nam
#   3. Cài Docker
#   4. Giới hạn dung lượng log của Docker
#   5. Tạo swap 2GB
#   6. Tạo tài khoản "deploy" để dùng hằng ngày thay cho root
#   7. Tường lửa: chỉ mở SSH, 80, 443
#   8. fail2ban: chặn IP dò mật khẩu SSH
#
# KHÔNG tắt đăng nhập bằng mật khẩu. Việc đó nằm ở deploy/harden-ssh.sh, chạy SAU KHI đã thử
# đăng nhập bằng tài khoản deploy thành công — làm sai bước đó là tự khoá mình ngoài server.
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
# Ubuntu 22.04+ có "needrestart" hỏi tương tác sau mỗi lần cài gói — không đặt biến này thì
# script đứng im chờ một câu trả lời không bao giờ tới.
export NEEDRESTART_MODE=a

DEPLOY_USER=deploy
REPO_DIR=/opt/sign_management

step() { echo; echo "==> $*"; }
warn() { echo "  [CẢNH BÁO] $*"; }
die()  { echo "LỖI: $*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "phải chạy bằng root."
. /etc/os-release
[ "${ID:-}" = "ubuntu" ] || die "script viết cho Ubuntu, máy này là ${PRETTY_NAME:-không rõ}."
[ "${VERSION_ID:-}" = "24.04" ] || warn "script viết cho Ubuntu 24.04, máy này là $VERSION_ID. Vẫn tiếp tục."

APT_OPTS=(-y -q -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold)

# ─────────────────────────────────────────────────────────────────────────────
step "1/8  Cập nhật hệ điều hành (có thể mất vài phút)"
apt-get update -q
apt-get "${APT_OPTS[@]}" upgrade
# tzdata: ảnh VPS tối giản có thể thiếu, và thiếu nó thì bước đặt múi giờ ngay sau đây chết.
apt-get "${APT_OPTS[@]}" install ca-certificates curl git openssl tzdata ufw \
    fail2ban python3-systemd unattended-upgrades

# Tự tải và cài bản vá bảo mật mỗi ngày. Không tự khởi động lại máy — nhưng kể cả khi máy
# khởi động lại, mọi container đều có restart: unless-stopped nên tự bật lên.
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

# ─────────────────────────────────────────────────────────────────────────────
step "2/8  Múi giờ Việt Nam"
# Để lịch sao lưu 02:00 và giờ trong log khớp giờ thật, không lệch 7 tiếng.
timedatectl set-timezone Asia/Ho_Chi_Minh
echo "  Giờ hiện tại: $(date)"

# ─────────────────────────────────────────────────────────────────────────────
step "3/8  Docker"
if command -v docker >/dev/null 2>&1; then
    echo "  Đã có: $(docker --version)"
else
    # Cách cài chính thức theo docs.docker.com — KHÔNG dùng gói docker.io của Ubuntu: gói đó
    # cũ hơn và thiếu plugin "docker compose" bản mới, mà docker-compose.prod.yml cần cú pháp
    # !reset / !override chỉ có từ Compose 2.24.
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
        > /etc/apt/sources.list.d/docker.list
    apt-get update -q
    apt-get "${APT_OPTS[@]}" install docker-ce docker-ce-cli containerd.io \
        docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker
echo "  $(docker compose version)"

# ─────────────────────────────────────────────────────────────────────────────
step "4/8  Giới hạn log của Docker"
# Mặc định Docker giữ log của mỗi container KHÔNG giới hạn. Chạy vài tháng là log đầy ổ, và
# khi ổ đầy thì Postgres dừng ghi — hệ thống chết vì một thứ chẳng ai để ý tới.
# Chỉ áp dụng cho container tạo SAU lúc này, nên phải làm trước lần khởi động đầu tiên.
if [ -f /etc/docker/daemon.json ]; then
    echo "  Đã có /etc/docker/daemon.json — giữ nguyên."
else
    cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
EOF
    systemctl restart docker
    echo "  Mỗi container giữ tối đa 30MB log."
fi

# ─────────────────────────────────────────────────────────────────────────────
step "5/8  Swap 2GB"
# Lần deploy nào cũng build backend bằng Maven NGAY TRÊN server. Build cần thêm khoảng 1GB
# RAM trong lúc Postgres, MinIO và backend cũ vẫn đang chạy — VPS 4GB không có swap có thể
# bị hệ điều hành giết tiến trình giữa chừng.
if swapon --show | grep -q .; then
    echo "  Đã có swap: $(swapon --show --noheadings | awk '{print $3}' | head -1)"
elif fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null \
        && swapon /swapfile; then
    grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "  Đã tạo swap 2GB."
else
    rm -f /swapfile
    warn "VPS này không cho tạo swap (thường gặp ở loại ảo hoá OpenVZ/LXC). Nên chọn VPS ≥ 4GB RAM."
fi

# ─────────────────────────────────────────────────────────────────────────────
step "6/8  Tài khoản \"$DEPLOY_USER\""
if id "$DEPLOY_USER" >/dev/null 2>&1; then
    echo "  Đã có."
else
    # Không đặt mật khẩu: tài khoản này chỉ đăng nhập được bằng SSH key.
    adduser --disabled-password --gecos "" "$DEPLOY_USER" >/dev/null
    echo "  Đã tạo."
fi
# Nhóm docker: chạy lệnh docker không cần sudo. Lưu ý nhóm này tương đương quyền root.
usermod -aG sudo,docker "$DEPLOY_USER"
# Tài khoản không có mật khẩu thì sudo không hỏi mật khẩu được — phải cho phép không hỏi.
echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/90-$DEPLOY_USER
chmod 440 /etc/sudoers.d/90-$DEPLOY_USER
visudo -cf /etc/sudoers.d/90-$DEPLOY_USER >/dev/null || die "file sudoers sai cú pháp."

# Chép SSH key của root sang cho deploy, để key bạn đang dùng đăng nhập root cũng vào được deploy.
DEPLOY_SSH=/home/$DEPLOY_USER/.ssh
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$DEPLOY_SSH"
touch "$DEPLOY_SSH/authorized_keys"
if [ -s /root/.ssh/authorized_keys ]; then
    cat /root/.ssh/authorized_keys "$DEPLOY_SSH/authorized_keys" | sort -u > "$DEPLOY_SSH/authorized_keys.tmp"
    mv "$DEPLOY_SSH/authorized_keys.tmp" "$DEPLOY_SSH/authorized_keys"
fi
chown "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_SSH/authorized_keys"
chmod 600 "$DEPLOY_SSH/authorized_keys"

if [ -s "$DEPLOY_SSH/authorized_keys" ]; then
    echo "  Tài khoản deploy nhận $(grep -c . "$DEPLOY_SSH/authorized_keys") SSH key."
else
    warn "root chưa có SSH key nào nên deploy cũng chưa có. Làm lại bước \"Chép SSH key lên server\""
    warn "trong README rồi chạy lại script này."
fi

if [ -d "$REPO_DIR" ]; then
    chown -R "$DEPLOY_USER:$DEPLOY_USER" "$REPO_DIR"
    echo "  Chuyển $REPO_DIR sang cho $DEPLOY_USER."
fi

# ─────────────────────────────────────────────────────────────────────────────
step "7/8  Tường lửa"
# Lấy đúng cổng SSH mà bạn đang dùng để kết nối lúc này (phần tử thứ 4 của SSH_CONNECTION).
# Hầu hết là 22, nhưng vài nhà cung cấp đổi sang cổng khác — mở nhầm cổng rồi bật tường lửa
# là mất kết nối ngay lập tức.
SSH_PORT="$(echo "${SSH_CONNECTION:-}" | awk '{print $4}')"
if [ -z "$SSH_PORT" ]; then
    SSH_PORT="$(sshd -T 2>/dev/null | awk '/^port /{print $2; exit}')"
fi
SSH_PORT="${SSH_PORT:-22}"
echo "  Cổng SSH: $SSH_PORT"

ufw default deny incoming  >/dev/null
ufw default allow outgoing >/dev/null
ufw allow "$SSH_PORT"/tcp  >/dev/null
ufw allow 80/tcp           >/dev/null
ufw allow 443/tcp          >/dev/null
ufw allow 443/udp          >/dev/null
ufw --force enable         >/dev/null
ufw status | sed 's/^/  /'
# Lưu ý: cổng mà Docker publish đi vòng qua ufw. Vì vậy docker-compose.prod.yml không publish
# cổng nào ngoài 80/443 của Caddy — ufw ở đây là lớp thứ hai, không phải lớp duy nhất.

# ─────────────────────────────────────────────────────────────────────────────
step "8/8  fail2ban"
# Server có IP công khai sẽ bị dò mật khẩu SSH liên tục, ngay từ ngày đầu. fail2ban chặn IP
# nào sai quá 5 lần trong 1 giờ. Ubuntu 24.04 ghi log SSH vào journal chứ không vào file,
# nên phải chỉ rõ backend = systemd, không thì fail2ban không đọc được gì.
cat > /etc/fail2ban/jail.local <<EOF
[sshd]
enabled  = true
backend  = systemd
port     = $SSH_PORT
maxretry = 5
findtime = 1h
bantime  = 1h
EOF
systemctl enable fail2ban >/dev/null 2>&1 || true
systemctl restart fail2ban || true
sleep 2
if systemctl is-active --quiet fail2ban; then
    echo "  fail2ban đang chạy."
else
    warn "fail2ban không khởi động được. Không ảnh hưởng hệ thống, xem: journalctl -u fail2ban"
fi

# ─────────────────────────────────────────────────────────────────────────────
echo
echo "════════════════════════════════════════════════════════════════"
echo " Xong phần cài đặt server."
echo "════════════════════════════════════════════════════════════════"
if [ -f /var/run/reboot-required ]; then
    echo " Bản cập nhật vừa cài cần khởi động lại máy. Gõ:  reboot"
    echo " rồi chờ khoảng 1 phút và đăng nhập lại bằng tài khoản deploy."
else
    echo " Bước tiếp theo trong README: đăng nhập thử bằng tài khoản deploy."
fi
