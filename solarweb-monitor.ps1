# Solarweb Scraper + Email Delivery (PowerShell Wrapper)
# Usage: .\solarweb-monitor.ps1 [-DryRun]
# This wrapper calls the Node.js orchestrator for scraping and email delivery

param(
    [switch]$DryRun = $false
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fontana Alisha - Daily Monitoring" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Call Node.js orchestrator
$args = if ($DryRun) { "--dry-run" } else { "" }
Write-Host "Running Node orchestrator..." -ForegroundColor Yellow
npm run build
node dist/scheduler/orchestrator.js $args

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
exit

# ============================================
# OLD MOCK DATA BELOW (kept for reference)
# ============================================
$systemData = @{
    FarmName = "FONTANA ALISHA"
    Date = (Get-Date).ToString("yyyy-MM-dd")
    Systems = @(
        @{
            Name = "Office"
            kWh = 45.23
            Status = "PRODUCING"
            Inverters = @(
                @{ Name = "Symo 20.0-3-M (1)"; kW = 16.843; Percentage = 71; Color = "🟢"; Status = "OPTIMAL" },
                @{ Name = "Symo 20.0-3-M (2)"; kW = 16.867; Percentage = 71; Color = "🟢"; Status = "OPTIMAL" },
                @{ Name = "Symo 20.0-3-M (3)"; kW = 11.513; Percentage = 55; Color = "🟡"; Status = "UNDERPERFORMING" }
            )
        },
        @{
            Name = "Gate"
            kWh = 0
            Status = "NOT_PRODUCING"
            Inverters = @()
        },
        @{
            Name = "Rootstock"
            kWh = 0
            Status = "NOT_PRODUCING"
            Inverters = @()
        }
    )
}

# Build email subject
$emailDate = [DateTime]::ParseExact($systemData.Date, "yyyy-MM-dd", $null)
$dateFormatted = $emailDate.ToString("dd-MMM-yyyy")
$emailSubject = "$($systemData.FarmName) - Daily Status ($dateFormatted)"

# Build email body
$emailBody = @"
$($systemData.FarmName) - Daily Status Report
Date: $($systemData.Date)

System Status:
"@

$totalProducing = 0
$totalProduction = 0

foreach ($system in $systemData.Systems) {
    $indicator = if ($system.Status -eq "PRODUCING") { "✅" } else { "❌" }
    $emailBody += "`n$indicator $($system.Name): $($system.kwh.ToString('F2')) kWh"
    $totalProduction += $system.kwh

    if ($system.Inverters.Count -gt 0) {
        foreach ($inv in $system.Inverters) {
            $emailBody += "`n  - $($inv.Name): $($inv.kW.ToString('F3')) kW ($($inv.Percentage)%) [$($inv.Color) $($inv.Status)]"
        }
    }

    if ($system.Status -eq "PRODUCING") { $totalProducing++ }
    $emailBody += "`n"
}
$emailBody += @"

Summary:
Total systems: $($systemData.Systems.Count)
Producing: $totalProducing/$($systemData.Systems.Count)
Total production: $($totalProduction.ToString('F2')) kWh
"@

Write-Host "[EMAIL SUBJECT]"
Write-Host $emailSubject
Write-Host ""
Write-Host "[EMAIL BODY]"
Write-Host $emailBody
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN] Email NOT sent" -ForegroundColor Yellow
} else {
    Write-Host "Sending email to $RecipientEmail..." -ForegroundColor Cyan

    # TODO: Send via Zoho API or MCP
    # For now, log success
    Write-Host "✅ Email sent successfully" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
