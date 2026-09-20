$ErrorActionPreference = "Stop"
$root = "c:\Users\iafify\Desktop\Inbound Dashboard\reports"
$j = Get-Content -LiteralPath (Join-Path $root "daily-2026-09-20.json") -Encoding UTF8 | ConvertFrom-Json

function Esc([string]$s) {
  if ($null -eq $s) { return "" }
  return $s.Replace("&","&amp;").Replace("<","&lt;").Replace(">","&gt;").Replace('"',"&quot;")
}
function N($n) {
  $v = 0
  [void][int64]::TryParse([string]$n, [ref]$v)
  return $v.ToString("N0")
}
function Pct($a, $b) {
  if (-not $b) { return 0 }
  return [int][Math]::Round(100.0 * [double]$a / [double]$b)
}

$asnPct = Pct $j.asnGot $j.asnNeed
$qtyPct = Pct $j.qty $j.ro
$venPct = Pct $j.vendorsGot $j.vendorsNeed
$capTotal = 87100
$capPct = Pct $j.qty $capTotal
$pendingRo = 0
foreach ($p in @($j.pending)) { $pendingRo += [int64]$p.totalRo }

$hourLabels = @("9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM")
$maxHour = 1
foreach ($h in @($j.hourly)) {
  $t = [int]$h.received + [int]$h.dock + [int]$h.arrive
  if ($t -gt $maxHour) { $maxHour = $t }
}

$facRows = New-Object System.Collections.Generic.List[string]
foreach ($f in @($j.facilities)) {
  $tone = "ok"
  if ([int]$f.capPct -ge 100) { $tone = "over" }
  elseif ([int]$f.capPct -ge 80) { $tone = "warn" }
  $facRows.Add(@"
<tr>
  <td class="mono">$(Esc ([string]$f.facility))</td>
  <td class="num">$(N $f.received) / $(N $f.asn)</td>
  <td class="num">$(N $f.qty) / $(N $f.ro)</td>
  <td class="num">$(N $f.sku)</td>
  <td class="num">$(N $f.qty) / $(N $f.capacity)</td>
  <td class="num $tone">$([int]$f.capPct) pct</td>
</tr>
"@)
}

$pendRows = New-Object System.Collections.Generic.List[string]
foreach ($p in @($j.pending)) {
  $pendRows.Add(@"
<tr>
  <td>$(Esc ([string]$p.vendor))</td>
  <td class="mono">$(Esc ([string]$p.asn))</td>
  <td class="mono">$(Esc ([string]$p.facility))</td>
  <td class="num">$(N $p.totalRo)</td>
</tr>
"@)
}

$empRows = New-Object System.Collections.Generic.List[string]
foreach ($e in (@($j.employees) | Sort-Object { [int64]$_.qty } -Descending)) {
  $empRows.Add(@"
<tr>
  <td>$(Esc ([string]$e.name))</td>
  <td class="num">$(N $e.asns)</td>
  <td class="num">$(N $e.qty)</td>
  <td class="num">$(N $e.sku)</td>
</tr>
"@)
}

$venRows = New-Object System.Collections.Generic.List[string]
$vens = @($j.vendors) | Where-Object { [int]$_.asns -gt 0 -or [int]$_.qty -gt 0 } | Sort-Object { [int64]$_.qty } -Descending
foreach ($v in $vens) {
  $venRows.Add(@"
<tr>
  <td>$(Esc ([string]$v.name))</td>
  <td class="mono">$(Esc ([string]$v.facility))</td>
  <td class="num">$(N $v.asns)</td>
  <td class="num">$(N $v.qty)</td>
  <td class="num">$(N $v.sku)</td>
</tr>
"@)
}

$hourBars = New-Object System.Collections.Generic.List[string]
$hi = 0
foreach ($h in @($j.hourly)) {
  $lab = if ($hi -lt $hourLabels.Count) { $hourLabels[$hi] } else { [string]$h.label }
  $hi++
  $w = [int](100.0 * [int]$h.received / $maxHour)
  $hourBars.Add(@"
<div class="hbar">
  <span class="hl">$lab</span>
  <span class="track"><i style="width:${w}pct"></i></span>
  <span class="hn">$([int]$h.received)</span>
</div>
"@)
}

$logRows = New-Object System.Collections.Generic.List[string]
foreach ($r in @($j.log)) {
  $st = "Open"
  if ([int]$r.qty -gt 0 -or [string]$r.status -eq "Received") { $st = "Received" }
  $cls = "open"
  if ($st -eq "Received") { $cls = "ok" }
  $logRows.Add(@"
<tr>
  <td>$(Esc ([string]$r.vendor))</td>
  <td class="mono">$(Esc ([string]$r.asn))</td>
  <td class="mono">$(Esc ([string]$r.facility))</td>
  <td class="num">$(N $r.totalRo)</td>
  <td class="num">$(N $r.qty)</td>
  <td class="num">$(N $r.sku)</td>
  <td class="$cls">$st</td>
  <td>$(Esc ([string]$r.arrival))</td>
  <td>$(Esc ([string]$r.emp))</td>
</tr>
"@)
}

$facHtml = [string]::Join("`n", $facRows)
$pendHtml = [string]::Join("`n", $pendRows)
$empHtml = [string]::Join("`n", $empRows)
$venHtml = [string]::Join("`n", $venRows)
$hourHtml = [string]::Join("`n", $hourBars)
$logHtml = [string]::Join("`n", $logRows)
$logCount = @($j.log).Count
$pendCount = @($j.pending).Count
$genTime = ([string]$j.generated).Split(" ")[-1]

$html = @"
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>تقرير الاستلام اليومي — 20 سبتمبر 2026</title>
<style>
  @page { size: A4; margin: 14mm 12mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", "Cairo", Tahoma, Arial, sans-serif; color: #141414; font-size: 11.5px; line-height: 1.45; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #141414; padding-bottom: 10px; margin-bottom: 16px; }
  .brand { font-weight: 800; font-size: 13px; letter-spacing: .04em; }
  .brand small { display: block; font-weight: 600; color: #6b6f76; font-size: 10px; margin-top: 2px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: #6b6f76; font-size: 11px; text-align: left; direction: ltr; }
  h2 { font-size: 13px; margin: 18px 0 8px; padding: 5px 8px; background: #141414; color: #fff; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0 6px; }
  .kpi { border: 1px solid #e7e8ec; padding: 10px 10px 8px; }
  .kpi .l { color: #6b6f76; font-size: 10px; font-weight: 700; }
  .kpi .v { font-size: 20px; font-weight: 800; margin-top: 4px; }
  .kpi .s { color: #6b6f76; font-size: 10px; margin-top: 2px; }
  .note { font-size: 11px; color: #333; margin: 8px 0 0; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  th, td { border-bottom: 1px solid #e7e8ec; padding: 5px 6px; text-align: right; vertical-align: top; }
  th { font-size: 10px; color: #6b6f76; font-weight: 700; background: #f4f5f7; }
  td.num, th.num { text-align: left; font-variant-numeric: tabular-nums; }
  .mono { font-family: Consolas, "Courier New", monospace; font-size: 10.5px; direction: ltr; text-align: left; }
  .ok { color: #1fb08f; font-weight: 700; }
  .open { color: #db3332; font-weight: 700; }
  .warn { color: #b8860b; font-weight: 700; }
  .over { color: #db3332; font-weight: 700; }
  .hbar { display: grid; grid-template-columns: 78px 1fr 28px; gap: 8px; align-items: center; margin: 4px 0; }
  .hl { font-size: 10px; color: #6b6f76; direction: ltr; text-align: left; }
  .track { height: 8px; background: #f0f1f3; }
  .track i { display: block; height: 100%; background: #141414; }
  .hn { font-size: 10px; font-weight: 700; }
  footer { margin-top: 18px; border-top: 1px solid #e7e8ec; padding-top: 8px; color: #6b6f76; font-size: 9.5px; }
  .log { font-size: 9.5px; }
  .log th, .log td { padding: 4px 5px; }
  .avoid { break-inside: avoid; page-break-inside: avoid; }
</style>
</head>
<body>
  <header>
    <div>
      <div class="brand">noon minutes · Inbound Team<small>Daily Receiving Report</small></div>
      <h1>تقرير الاستلام اليومي</h1>
      <div>الأحد، 20 سبتمبر 2026 — كل حركة الاستلام حتى الساعة $genTime</div>
    </div>
    <div class="meta">
      Source: Google Sheet · Daily Receiving<br/>
      Generated: $($j.generated)<br/>
      Confidential — Internal use
    </div>
  </header>

  <p class="note">ملخص وردية اليوم لمدير العمليات: الاستلام الفعلي مقابل المخطط، طاقة المستودعات من Pivot Table 1، والـ ASN اللي لسه مفتوح.</p>

  <div class="kpis">
    <div class="kpi"><div class="l">ASN مستلم / مخطط</div><div class="v">$(N $j.asnGot) / $(N $j.asnNeed)</div><div class="s">$asnPct pct إنجاز</div></div>
    <div class="kpi"><div class="l">الكمية مستلم / Total RO</div><div class="v">$(N $j.qty) / $(N $j.ro)</div><div class="s">$qtyPct pct من المخطط</div></div>
    <div class="kpi"><div class="l">الموردين مستلم / مخطط</div><div class="v">$(N $j.vendorsGot) / $(N $j.vendorsNeed)</div><div class="s">$venPct pct — مورد واحد مرة واحدة</div></div>
    <div class="kpi"><div class="l">الكابسيتي (كل المستودعات)</div><div class="v">$(N $j.qty) / $(N $capTotal)</div><div class="s">$capPct pct من رقم البيفوت · $(N $j.sku) SKU · $(N $j.cars) سيارة</div></div>
  </div>

  <div class="avoid">
    <h2>1) المستودعات — الإنجاز مقابل الكابسيتي</h2>
    <table>
      <thead>
        <tr>
          <th>المستودع</th>
          <th class="num">ASN مستلم / مخطط</th>
          <th class="num">كمية / Total RO</th>
          <th class="num">SKU</th>
          <th class="num">كمية / كابسيتي</th>
          <th class="num">كابسيتي pct</th>
        </tr>
      </thead>
      <tbody>
        $facHtml
        <tr>
          <td><b>الإجمالي</b></td>
          <td class="num"><b>$(N $j.asnGot) / $(N $j.asnNeed)</b></td>
          <td class="num"><b>$(N $j.qty) / $(N $j.ro)</b></td>
          <td class="num"><b>$(N $j.sku)</b></td>
          <td class="num"><b>$(N $j.qty) / $(N $capTotal)</b></td>
          <td class="num"><b>$capPct pct</b></td>
        </tr>
      </tbody>
    </table>
    <p class="note">الكابسيتي من Pivot Table 1 عمود F ليوم 20 سبتمبر. CAIID03 و CAIID04 متحدين كـ CAIID03+04. مفيش مستودع عدّى 80 pct.</p>
  </div>

  <div class="avoid">
    <h2>2) ASN مفتوح — مش اتقفل Received ($pendCount ASN · $(N $pendingRo) وحدة مخطط)</h2>
    <table>
      <thead>
        <tr><th>المورد</th><th>ASN</th><th>المستودع</th><th class="num">Total RO</th></tr>
      </thead>
      <tbody>
        $pendHtml
      </tbody>
    </table>
    <p class="note">الحالة في الشيت فاضية، ومفيش كمية مستلمة. أكبر المعلق: Coca Cola 19,333 وبيبسي كولا مصر 13,956 على CAIID01. مفيش Arrive/Dock مفتوح وقت إصدار التقرير.</p>
  </div>

  <div class="avoid">
    <h2>3) توزيع الاستلام على ساعات اليوم</h2>
    $hourHtml
    <p class="note">عدد الـ ASN حسب ساعة الوصول. الذروة: 10:00 AM (8 ASN) ثم 9:00 AM و 1:00 PM (7 لكل ساعة).</p>
  </div>

  <div class="avoid">
    <h2>4) أداء الموظفين</h2>
    <table>
      <thead>
        <tr><th>الموظف</th><th class="num">ASN</th><th class="num">الكمية</th><th class="num">SKU</th></tr>
      </thead>
      <tbody>
        $empHtml
      </tbody>
    </table>
    <p class="note">الأسماء موحّدة (Mahmoud Reda / Mhamoud Reda نفس الشخص). أعلى كمية: Abdelwhab ثم Mohamed Safwat ثم Seif Mohamed.</p>
  </div>

  <div class="avoid">
    <h2>5) الموردين اللي تم استلامهم</h2>
    <table>
      <thead>
        <tr><th>المورد</th><th>المستودع</th><th class="num">ASN</th><th class="num">الكمية</th><th class="num">SKU</th></tr>
      </thead>
      <tbody>
        $venHtml
      </tbody>
    </table>
  </div>

  <div class="avoid">
    <h2>6) دقة الجدول</h2>
    <p class="note">Mentioned in Schedule: 29 صف (كل المستلم). Not specified: 19 صف (كل المفتوح). مفيش قيم تانية في عمود Supplier Schedule Accuracy اليوم.</p>
  </div>

  <h2>7) سجل الاستلام الكامل — 20 سبتمبر 2026 ($logCount صف)</h2>
  <table class="log">
    <thead>
      <tr>
        <th>المورد</th><th>ASN</th><th>المستودع</th>
        <th class="num">Total RO</th><th class="num">مستلم</th><th class="num">SKU</th>
        <th>الحالة</th><th>الوصول</th><th>الموظف</th>
      </tr>
    </thead>
    <tbody>
      $logHtml
    </tbody>
  </table>

  <footer>
    تقرير داخلي لفريق inbound — noon minutes. المصدر: شيت Daily Receiving و Pivot Table 1.
    الأرقام لحظية وقت التصدير $($j.generated). لو الشيت اتحدّث بعد كده، يتعمل تقرير جديد.
  </footer>
</body>
</html>
"@

$html = $html.Replace(" pct", "%").Replace("width:0pct", "width:0%").Replace("width:10pct", "width:10%").Replace("width:20pct", "width:20%").Replace("width:25pct", "width:25%").Replace("width:30pct", "width:30%").Replace("width:37pct", "width:37%").Replace("width:40pct", "width:40%").Replace("width:50pct", "width:50%").Replace("width:62pct", "width:62%").Replace("width:70pct", "width:70%").Replace("width:75pct", "width:75%").Replace("width:80pct", "width:80%").Replace("width:87pct", "width:87%").Replace("width:88pct", "width:88%").Replace("width:90pct", "width:90%").Replace("width:100pct", "width:100%")
# restore bar widths that used pct placeholder in style
$html = [regex]::Replace($html, 'width:(\d+)pct', 'width:$1%')

$htmlPath = Join-Path $root "Inbound-Daily-Report-2026-09-20.html"
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($htmlPath, $html, $utf8)
Write-Output "HTML $htmlPath $($html.Length)"
