$env:SPRING_PROFILES_ACTIVE = "dev"

Write-Host "Starting infrastructure..." -ForegroundColor Cyan
docker compose up postgres minio -d

Write-Host "Starting backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; `$env:SPRING_PROFILES_ACTIVE='dev'; `$env:POSTGRES_PASSWORD='change_me_in_production'; mvn spring-boot:run"

Write-Host "Starting frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Write-Host "All services started!" -ForegroundColor Green
