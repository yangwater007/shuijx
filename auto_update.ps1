# auto_update.ps1 v3 — +ngrok 自动重连
$ErrorActionPreference = "Continue"
$workdir = "D:\quicktiny"
$logfile = "$workdir\logs\auto_update.log"
New-Item -ItemType Directory -Path "$workdir\logs" -Force | Out-Null

function Write-Log($msg) {
    $line = "$(Get-Date -Format 'HH:mm:ss') $msg"
    Write-Host $line
    Add-Content -Path $logfile -Value $line
}

Write-Log "========== 自动更新 =========="

# 交易日检测
$dow = (Get-Date).DayOfWeek.value__
$isTradingDay = ($dow -ge 1 -and $dow -le 5 -and (Get-Date).Hour -ge 9)

if ($isTradingDay) {
    Write-Log "[K线] 增量同步..."
    python "$workdir\sync_kline.py" --days 1 --workers 12 --skip-existing 2>&1 | Out-Null
    Write-Log "[K线] 完成"
} else {
    Write-Log "[K线] 非交易日，跳过"
}

Write-Log "[概念] 同步..."
python "$workdir\sync_concepts.py" --workers 8 2>&1 | Out-Null
Write-Log "[概念] 完成"

# MCP 保活
try {
    $r = Invoke-RestMethod -Uri http://localhost:8766/health -TimeoutSec 3
    Write-Log "[MCP] 在线 ($($r.tools) tools)"
} catch {
    Write-Log "[MCP] 未运行，启动..."
    Start-Process python -ArgumentList "mcp_bridge\server.py" -WindowStyle Hidden -WorkingDirectory $workdir
    Start-Sleep -Seconds 3
    Write-Log "[MCP] 已启动"
}

# ngrok 保活
try {
    $t = Invoke-RestMethod -Uri http://127.0.0.1:4040/api/tunnels -TimeoutSec 3
    $url = $t.tunnels[0].public_url
    Write-Log "[ngrok] 在线: $url"
} catch {
    Write-Log "[ngrok] 断开，重连..."
    Get-Process -Name ngrok -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 1
    $ngrok = "C:\Users\water\AppData\Local\Programs\Python\Python312\Scripts\ngrok.exe"
    Start-Process $ngrok -ArgumentList "http 8766 --log=stdout" -WindowStyle Hidden
    Start-Sleep -Seconds 3
    try {
        $t2 = Invoke-RestMethod -Uri http://127.0.0.1:4040/api/tunnels -TimeoutSec 3
        Write-Log "[ngrok] 已重连: $($t2.tunnels[0].public_url)"
    } catch {
        Write-Log "[ngrok] 重连失败"
    }
}

Write-Log "========== 完成 =========="
