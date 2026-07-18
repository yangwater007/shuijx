# reconnect_ngrok.ps1 — ngrok 隧道重连脚本
$ErrorActionPreference = "Continue"

# 1. 杀掉旧 ngrok
Get-Process -Name ngrok -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

# 2. 确认 MCP 在 8766 运行
try {
    $r = Invoke-RestMethod -Uri http://localhost:8766/health -TimeoutSec 3
    Write-Host "[OK] MCP 8766 在线 ($($r.tools) tools)"
} catch {
    Write-Host "[!] MCP 不在线，正在启动..."
    Start-Process python -ArgumentList "mcp_bridge\server.py" -WindowStyle Hidden -WorkingDirectory D:\quicktiny
    Start-Sleep -Seconds 3
}

# 3. 启动 ngrok 隧道
$ngrok = "C:\Users\water\AppData\Local\Programs\Python\Python312\Scripts\ngrok.exe"
Start-Process $ngrok -ArgumentList "http 8766 --log=stdout" -WindowStyle Hidden

Start-Sleep -Seconds 3

# 4. 验证
try {
    $tunnels = Invoke-RestMethod -Uri http://127.0.0.1:4040/api/tunnels -TimeoutSec 3
    $url = $tunnels.tunnels[0].public_url
    Write-Host "[OK] 隧道已连接: $url -> localhost:8766"
    Write-Host ""
    Write-Host "访问: https://yangwater007.github.io/shuijx/?bridge=$url#/ai"
} catch {
    Write-Host "[FAIL] 隧道连接失败，请检查 ngrok 登录状态"
}
