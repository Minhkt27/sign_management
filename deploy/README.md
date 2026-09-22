# Triển khai lên VPS

Làm lần lượt từ trên xuống. Mỗi bước ghi rõ: gõ lệnh gì, lệnh đó làm gì, và **kết quả đúng trông như thế nào** — chưa thấy đúng kết quả thì đừng sang bước sau.

Tổng thời gian khoảng 1 tiếng, phần lớn là ngồi chờ.

**Quy ước trong tài liệu này**

- `<IP>` — địa chỉ IP của VPS, nhà cung cấp gửi cho bạn (VD `103.45.67.89`)
- `<TEN-MIEN>` — tên miền của hệ thống (VD `signage.benhvien-abc.vn`)
- Khối lệnh ghi **PowerShell** thì gõ trên máy Windows của bạn. Khối ghi **server** thì gõ trong cửa sổ đã đăng nhập vào VPS.

---

## Trước khi bắt đầu

- [ ] Nhánh `main` trên GitHub đã có code mới nhất — server sẽ tải code từ `main`.
- [ ] Đã đọc hết một lượt tài liệu này.

---

## Bước 1 — Tạo SSH key trên máy của bạn

*Làm trước khi thuê VPS. 5 phút.*

SSH key là cách đăng nhập server bằng một cặp file thay cho mật khẩu. Hình dung như ổ khoá và chìa: file `.pub` là **ổ khoá**, lắp lên server; file còn lại là **chìa**, chỉ nằm trên máy bạn, không bao giờ gửi cho ai.

**PowerShell:**

```powershell
ssh-keygen -t ed25519 -C "may-cua-toi"
```

Máy hỏi 3 câu — cứ nhấn Enter cả 3 lần. Xong sẽ có hai file trong `C:\Users\<tên bạn>\.ssh\`:

| File | Là gì | Được gửi đi không |
|---|---|---|
| `id_ed25519.pub` | ổ khoá | Được — dán lên server |
| `id_ed25519` | chìa khoá | **KHÔNG BAO GIỜ** |

Xem nội dung ổ khoá (để dán ở bước 2):

```powershell
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
```

Kết quả đúng: một dòng bắt đầu bằng `ssh-ed25519 AAAA...` và kết thúc bằng `may-cua-toi`.

> Mất file `id_ed25519` là mất đường vào server (sau bước 6). Sao lưu nó vào USB hoặc trình quản lý mật khẩu.

---

## Bước 2 — Thuê VPS

Chọn khi thuê:

| Mục | Chọn |
|---|---|
| Hệ điều hành | **Ubuntu 24.04 LTS** — đúng bản này, các script viết cho nó |
| CPU / RAM | Tối thiểu 2 vCPU / 4GB RAM. 4 vCPU thì mỗi lần cập nhật code build nhanh hơn |
| Ổ cứng | Tối thiểu 40GB SSD |
| SSH key | Nếu trang thuê có ô này: dán dòng `ssh-ed25519 AAAA...` từ bước 1 |

Hỏi nhà cung cấp hai điều:

1. **Có sao lưu / snapshot tự động không?** Nên bật. Bản sao lưu hệ thống tự làm (bước 9) nằm ngay trên VPS — VPS hỏng thì mất theo. Snapshot của nhà cung cấp nằm ở chỗ khác.
2. **Có tường lửa trên bảng điều khiển không?** Nếu có, mở 3 cổng: **22, 80, 443**. Chặn 80 thì không xin được chứng chỉ HTTPS.

Bạn sẽ nhận về: **địa chỉ IP** và **mật khẩu root**.

---

## Bước 3 — Tên miền

*Làm càng sớm càng tốt: sau khi tạo bản ghi, có thể mất từ vài phút tới vài giờ mới có tác dụng.*

Tại trang quản lý tên miền, tạo một **bản ghi DNS**:

| Loại | Tên | Giá trị |
|---|---|---|
| `A` | `signage` (hoặc tên bạn muốn) | `<IP>` |

Nghĩa là: ai gõ `signage.benhvien-abc.vn` thì được dẫn tới VPS của bạn.

> **Chọn tên miền cho chắc.** Mỗi ảnh tải lên được lưu kèm đường dẫn đầy đủ, gồm cả tên miền. Đổi tên miền sau này thì ảnh cũ vẫn trỏ về tên miền cũ và không hiện nữa.

Kiểm tra — **PowerShell:**

```powershell
Resolve-DnsName <TEN-MIEN>
```

Kết quả đúng: cột `IPAddress` là IP của VPS. Báo lỗi hoặc ra IP khác thì chờ thêm rồi thử lại. **Chưa ra đúng IP thì chưa làm bước 7.**

---

## Bước 4 — Đăng nhập server lần đầu

**PowerShell:**

```powershell
ssh root@<IP>
```

- Lần đầu máy hỏi `Are you sure you want to continue connecting?` → gõ `yes`, Enter.
- Nếu hỏi mật khẩu → dán mật khẩu root. **Gõ hoặc dán sẽ không hiện ký tự nào — bình thường**, cứ Enter.

Kết quả đúng: dấu nhắc đổi thành dạng `root@ten-may:~#`. Bạn đang ở trong server.

**Nếu bị hỏi mật khẩu** thì SSH key chưa có trên server (bước 2 chưa dán được). Gõ `exit` để ra, rồi chép key lên — **PowerShell:**

```powershell
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@<IP> "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
```

Nhập mật khẩu root lần cuối. Rồi `ssh root@<IP>` lại — **không bị hỏi mật khẩu nữa** là đúng.

---

## Bước 5 — Tải code và cài đặt server

**server** (đang đăng nhập bằng root):

```bash
git clone -b main https://github.com/Minhkt27/sign_management.git /opt/sign_management
bash /opt/sign_management/deploy/server-setup.sh
```

Lệnh thứ hai chạy khoảng 5–10 phút và làm 8 việc: cập nhật hệ điều hành, đặt múi giờ Việt Nam, cài Docker, giới hạn log, tạo swap, tạo tài khoản `deploy`, bật tường lửa, bật fail2ban. Chi tiết từng việc có ở đầu file `deploy/server-setup.sh`.

Kết quả đúng — cuối cùng in ra:

```
════════════════════════════════════════════════════════════════
 Xong phần cài đặt server.
════════════════════════════════════════════════════════════════
```

Ở mục 6/8 phải có dòng `Tài khoản deploy nhận 1 SSH key.` Nếu thay vào đó là cảnh báo "root chưa có SSH key nào" thì quay lại bước 4.

Nếu cuối cùng script bảo khởi động lại máy:

```bash
reboot
```

Chờ khoảng 1 phút.

---

## Bước 6 — Chuyển sang tài khoản `deploy` và khoá SSH

Từ giờ **không dùng root nữa**. Tài khoản `deploy` làm được mọi việc (có quyền `sudo`) nhưng không bị ai dò mật khẩu được, vì nó không có mật khẩu.

**PowerShell:**

```powershell
ssh deploy@<IP>
```

Kết quả đúng: vào thẳng, **không hỏi mật khẩu**, dấu nhắc dạng `deploy@ten-may:~$`.

Giờ tắt hẳn đăng nhập bằng mật khẩu — **server:**

```bash
sudo bash /opt/sign_management/deploy/harden-ssh.sh
```

Kết quả đúng: `Đã tắt đăng nhập bằng mật khẩu và đăng nhập bằng root.`

> **Chưa đóng cửa sổ này.** Mở một cửa sổ PowerShell **mới** và gõ `ssh deploy@<IP>`. Vào được thì xong. Không vào được thì quay lại cửa sổ cũ (vẫn đang đăng nhập) và gõ lệnh hoàn tác mà script đã in ra.

---

## Bước 7 — Tạo cấu hình và khởi động hệ thống

*Chỉ làm khi bước 3 đã ra đúng IP.*

**server:**

```bash
cd /opt/sign_management
bash deploy/generate-env.sh <TEN-MIEN>
```

Lệnh này tạo file `.env` chứa toàn bộ mật khẩu hệ thống, sinh ngẫu nhiên mới. Nó in ra mật khẩu đăng nhập lần đầu của `superadmin` — **chép lại ngay**.

Chép luôn file `.env` về máy bạn — **PowerShell** (cửa sổ mới, không phải cửa sổ server):

```powershell
scp deploy@<IP>:/opt/sign_management/.env "$env:USERPROFILE\Documents\signage-server.env"
```

Cất file này như cất mật khẩu. Mất nó thì bản sao lưu không khôi phục lên được server khác.

Khởi động — **server:**

```bash
docker compose up -d --build
```

Lần đầu mất 10–15 phút: tải các thành phần, rồi build backend và frontend ngay trên server. Các lần cập nhật sau nhanh hơn nhiều.

> Trong thư mục `/opt/sign_management`, lệnh `docker compose` tự dùng cấu hình production (nhờ dòng `COMPOSE_FILE` trong `.env`). Không cần gõ thêm gì.

---

## Bước 8 — Kiểm tra

**server:**

```bash
docker compose ps
```

Kết quả đúng: 6 dòng, cột `STATUS` đều là `Up`; `signage_postgres` và `signage_minio` có thêm `(healthy)`. Chỉ dòng `signage_caddy` có cổng `0.0.0.0:80` và `0.0.0.0:443` — các dòng khác không có cổng nào, đúng thiết kế.

Nếu `signage_backend` là `Restarting`: chờ thêm 1 phút (lần đầu nó tạo bảng trong database). Vẫn vậy thì xem mục "Khi có sự cố".

Kiểm tra bằng trình duyệt:

- [ ] Mở `https://<TEN-MIEN>` → hiện trang đăng nhập, **có biểu tượng ổ khoá** cạnh địa chỉ
- [ ] Đăng nhập `superadmin` với mật khẩu ở bước 7 → hệ thống bắt đổi mật khẩu ngay
- [ ] Tạo một biển báo có ảnh → ảnh hiện ra
- [ ] Dùng điện thoại **tắt Wi-Fi, bật 4G**, mở `https://<TEN-MIEN>` → vào được

Sau đó đăng nhập tiếp hai tài khoản `admin` và `tech` (mật khẩu lần đầu nằm trong file `.env` ở dòng `ADMIN_INITIAL_PASSWORD` và `TECH_INITIAL_PASSWORD`) để đổi mật khẩu cho cả hai.

---

## Bước 9 — Sao lưu: kiểm tra ngay hôm đầu

Hệ thống tự sao lưu **mỗi đêm 02:00**: database, toàn bộ ảnh, và file `.env`. Giữ 14 ngày gần nhất trong `/opt/sign_management/backups/`.

Đừng đợi tới đêm mới biết nó có chạy không. Chạy thử một lần ngay — **server:**

```bash
docker exec signage_backup sh /opt/backup/backup.sh
sudo ls -l backups/*/
```

Kết quả đúng: một thư mục tên dạng `20260923-143005`, bên trong có 4 file `database.dump`, `env.backup`, `globals.sql`, `minio-data.tar.gz`, và không file nào có kích thước 0.

**Chép bản sao lưu về máy bạn** — vì bản trên server sẽ mất theo nếu server hỏng. Nên làm mỗi tuần cho tới khi có sao lưu tự động ra ngoài.

**server** (thay tên thư mục bằng bản mới nhất):

```bash
sudo tar -czf ~/sao-luu.tar.gz -C /opt/sign_management/backups 20260923-143005
sudo chown deploy ~/sao-luu.tar.gz
```

**PowerShell:**

```powershell
scp deploy@<IP>:sao-luu.tar.gz "$env:USERPROFILE\Documents\"
```

Chép xong thì xoá bản tạm trên server — **server:** `rm ~/sao-luu.tar.gz`

---

## Bước 10 — Không gấp, làm trong tuần đầu

### Theo dõi hệ thống sập

Đăng ký miễn phí tại [uptimerobot.com](https://uptimerobot.com), tạo monitor loại **HTTPS** trỏ tới `https://<TEN-MIEN>`, chọn nhận email. Hệ thống sập thì bạn biết trước khi bệnh viện gọi.

### Tự động deploy khi đẩy code lên `main`

Tạo một cặp key **riêng** cho GitHub (không dùng key cá nhân của bạn) — **server:**

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github-actions -N "" -C github-actions
cat ~/.ssh/github-actions.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github-actions
```

Lệnh cuối in ra một khối từ `-----BEGIN OPENSSH PRIVATE KEY-----` tới `-----END OPENSSH PRIVATE KEY-----`. Vào GitHub → repo `sign_management` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**, tạo 3 secret:

| Tên | Giá trị |
|---|---|
| `VPS_HOST` | `<IP>` |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | cả khối vừa in ra, kể cả hai dòng BEGIN/END |

Rồi xoá chìa khoá khỏi server (GitHub đã giữ bản của nó) — **server:**

```bash
rm ~/.ssh/github-actions
```

Từ giờ mỗi lần code vào `main` và CI chạy xanh, GitHub tự đăng nhập server và cập nhật. Theo dõi ở tab **Actions** trên GitHub.

---

## Việc thường ngày

Mọi lệnh gõ trong `/opt/sign_management` (`cd /opt/sign_management` trước).

| Việc | Lệnh |
|---|---|
| Xem trạng thái | `docker compose ps` |
| Xem log backend (Ctrl+C để thoát) | `docker compose logs -f --tail 100 backend` |
| Khởi động lại một phần | `docker compose restart backend` |
| Cập nhật code bằng tay | `git pull && docker compose up -d --build && docker image prune -f` |
| Sao lưu ngay | `docker exec signage_backup sh /opt/backup/backup.sh` |
| Xem nhật ký sao lưu tự động | `sudo tail -20 backups/backup.log` |
| Dung lượng ổ cứng | `df -h /` |

---

## Khi có sự cố

| Triệu chứng | Kiểm tra | Thường là do |
|---|---|---|
| Trình duyệt báo lỗi chứng chỉ, hoặc không vào được `https://` | `docker compose logs --tail 30 caddy` | Tên miền chưa trỏ đúng IP (làm lại kiểm tra ở bước 3), hoặc tường lửa trên bảng điều khiển nhà cung cấp chặn cổng 80 |
| Vào được trang nhưng đăng nhập báo lỗi | `docker compose logs --tail 50 backend` | Backend chưa khởi động xong, hoặc lỗi database |
| `signage_backend` cứ `Restarting` | `docker compose logs --tail 80 backend` | Tìm dòng có chữ `ERROR` đầu tiên |
| Ảnh không hiện | `docker compose ps minio` | MinIO không chạy |
| Không SSH vào được sau bước 6 | Dùng **console trên web** của nhà cung cấp, đăng nhập root bằng mật khẩu, gõ `rm /etc/ssh/sshd_config.d/01-hardening.conf && systemctl reload ssh` | Key trên máy bạn không khớp với key trên server |
| Ổ cứng đầy | `df -h /` rồi `docker system df` | Image cũ: `docker image prune -f` và `docker builder prune -f` |

Gửi kèm kết quả lệnh "Kiểm tra" khi cần người khác hỗ trợ — nó nói lên gần hết vấn đề.

---

## Khôi phục từ bản sao lưu

> Khôi phục **thay thế toàn bộ** dữ liệu hiện tại. Script tự sao lưu hiện trạng trước khi xoá, nên lỡ chọn nhầm bản vẫn quay lại được.

**Trên cùng server** — **server:**

```bash
cd /opt/sign_management
sudo ls backups/                                   # xem có những bản nào
sudo bash deploy/backup/restore.sh backups/20260923-020000
```

Script hỏi xác nhận — gõ đúng `KHOI PHUC`.

Nếu khôi phục hỏng giữa chừng, script in ra khung **KHÔI PHỤC THẤT BẠI** kèm đúng một lệnh để quay về trạng thái ngay trước khi khôi phục. Chạy lệnh đó. Lúc này hệ thống đang tắt, và khởi động lại VPS cũng **không** tự bật lên — phải chạy lệnh đó hoặc `docker compose up -d`.

**Lên một server mới** (server cũ hỏng hẳn):

1. Làm bước 1–6 trên server mới. Trỏ tên miền về IP mới (bước 3).
2. Chép bản sao lưu từ máy bạn lên — **PowerShell:**
   ```powershell
   scp "$env:USERPROFILE\Documents\sao-luu.tar.gz" deploy@<IP-MOI>:
   ```
3. **server:**
   ```bash
   cd /opt/sign_management
   mkdir -p backups && tar -xzf ~/sao-luu.tar.gz -C backups
   cp backups/*/env.backup .env && chmod 600 .env
   docker compose up -d --build
   sudo bash deploy/backup/restore.sh backups/<tên-thư-mục-vừa-giải-nén>
   ```

Bước `cp ... env.backup .env` là bắt buộc: phải dùng **đúng mật khẩu cũ**, vì database và kho ảnh trong bản sao lưu vẫn nhớ chúng. Script khôi phục sẽ từ chối chạy nếu phát hiện mật khẩu không khớp.

---

## Những điều nên biết

- **Bản sao lưu tự động hiện chỉ nằm trên chính VPS.** Server hỏng thì mất theo, trừ khi đã bật snapshot của nhà cung cấp (bước 2) hoặc đã chép về máy (bước 9). Việc tiếp theo nên làm: tự động đẩy bản sao lưu ra ngoài, ví dụ Cloudflare R2 — 10GB miễn phí, dư cho dữ liệu hiện tại.
- **MinIO (kho ảnh) đã ngừng phát hành bản cộng đồng từ 9/2025** — không còn bản vá bảo mật mới. Hệ thống ghim bản cuối cùng, không mở cổng MinIO ra ngoài, và chỉ cho phép đọc ảnh qua nginx. Nên tính chuyển sang cách lưu ảnh khác trong vài tháng tới.
- **Cloudflare:** nếu sau này bật proxy của Cloudflare (đám mây màu cam) trước tên miền, phải cấu hình thêm để backend nhận đúng IP người dùng — không thì chức năng chặn đăng nhập sai nhiều lần sẽ coi mọi người là một.
