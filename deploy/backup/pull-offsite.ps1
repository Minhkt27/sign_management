# Tải bản sao lưu MỚI NHẤT từ VPS về máy này, nén thành file .zip có mật khẩu (AES-256).
# Làm 15 ngày một lần — server chỉ giữ 14 ngày, nên đây là bản duy nhất sống sót nếu VPS hỏng.
#
#   powershell -ExecutionPolicy Bypass -File deploy\backup\pull-offsite.ps1
#   (tuỳ chọn) -OutDir "E:\SaoLuu"   để lưu thẳng vào USB
#
# Cần: ssh vào được deploy@VPS bằng key (như khi deploy), 7-Zip cài ở chỗ mặc định.
# Script hỏi mật khẩu 2 lần. MẤT MẬT KHẨU = MẤT BẢN SAO LƯU, hãy cất nó vào nơi an toàn
# (trình quản lý mật khẩu), đừng ghi chung chỗ với file zip.
#
# File zip chứa NGUYÊN VĂN mật khẩu database, MinIO, JWT (env.backup) — vì khôi phục lên server
# mới bắt buộc phải có đúng các mật khẩu cũ. Vì vậy bản giải nén tạm luôn bị xoá ngay, chỉ để
# lại file zip đã mã hoá.
param(
    [string]$OutDir = (Join-Path $HOME "SignaWay-saoluu"),
    [string]$Server = "deploy@103.97.133.8",
    [string]$RemoteDir = "/opt/sign_management/backups",
    # Chỉ để chạy tự động/thử nghiệm; dùng tay thì bỏ trống để script hỏi.
    [SecureString]$Password
)
$ErrorActionPreference = "Stop"

$sevenZip = "C:\Program Files\7-Zip\7z.exe"
if (-not (Test-Path $sevenZip)) { throw "Không thấy 7-Zip tại $sevenZip — cài 7-Zip trước." }

Write-Host "==> 1/4  Tìm bản sao lưu mới nhất trên server"
$name = (ssh $Server "sudo sh -c 'ls -1d $RemoteDir/20* | tail -1 | xargs basename'").Trim()
if ($name -notmatch '^\d{8}-\d{6}$') { throw "Không đọc được tên bản sao lưu (nhận được: '$name')." }
Write-Host "    $name"

$remoteTar = "/tmp/signaway-$name.tar"
$work = Join-Path $env:TEMP "signaway-$name"
$localTar = Join-Path $work "$name.tar"
$zip = Join-Path $OutDir "signaway-$name.zip"
if (Test-Path $zip) { throw "Đã có $zip — bản này đã được tải về rồi." }

try {
    Write-Host "==> 2/4  Đóng gói trên server và tải về"
    # umask 077: file tạm trên server chỉ user deploy đọc được, và bị xoá ngay sau khi tải.
    # Kiểm tra đủ 4 file trước khi đóng gói — giống restore.sh, thiếu 1 file là bản hỏng.
    ssh $Server "umask 077 && sudo sh -c 'for f in globals.sql database.dump minio-data.tar.gz env.backup; do test -s $RemoteDir/$name/`$f || { echo thieu `$f >&2; exit 1; }; done; tar -C $RemoteDir -cf - $name' > $remoteTar"
    if ($LASTEXITCODE -ne 0) { throw "Đóng gói trên server thất bại." }
    New-Item -ItemType Directory -Force $work | Out-Null
    scp -q "${Server}:$remoteTar" $localTar
    if ($LASTEXITCODE -ne 0) { throw "Tải file về thất bại." }

    Write-Host "==> 3/4  Nén có mật khẩu"
    if ($Password) { $p1 = $Password; $p2 = $Password } else {
        $p1 = Read-Host "    Mật khẩu cho file zip (ít nhất 12 ký tự)" -AsSecureString
        $p2 = Read-Host "    Nhập lại mật khẩu" -AsSecureString
    }
    $pw = [Net.NetworkCredential]::new("", $p1).Password
    if ($pw -ne [Net.NetworkCredential]::new("", $p2).Password) { throw "Hai lần nhập mật khẩu không khớp." }
    if ($pw.Length -lt 12) { throw "Mật khẩu quá ngắn (cần ít nhất 12 ký tự)." }

    New-Item -ItemType Directory -Force $OutDir | Out-Null
    # -mx=1: nội dung vốn đã nén sẵn (dump nén, ảnh tar.gz), nén lại chỉ tốn thời gian.
    & $sevenZip a -tzip -mem=AES256 -mx=1 "-p$pw" $zip $localTar | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "7-Zip nén thất bại." }

    Write-Host "==> 4/4  Kiểm tra file zip mở được bằng mật khẩu vừa đặt"
    & $sevenZip t "-p$pw" $zip | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Remove-Item -Force $zip
        throw "File zip không mở được bằng mật khẩu vừa nhập — đã xoá, hãy chạy lại."
    }
}
finally {
    ssh $Server "rm -f $remoteTar" | Out-Null
    if (Test-Path $work) { Remove-Item -Recurse -Force $work }
}

$size = "{0:N1} MB" -f ((Get-Item $zip).Length / 1MB)
Write-Host ""
Write-Host "Xong: $zip ($size)"
Write-Host "Chép file này sang USB / ổ khác. Lần tải tiếp theo: $((Get-Date).AddDays(15).ToString('dd/MM/yyyy'))"
