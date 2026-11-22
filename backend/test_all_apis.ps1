$base = "http://localhost:2525"
$suffix = [guid]::NewGuid().ToString().Substring(0,6)

function Call-Api {
    param($Name, $Method, $Uri, $Body, $Token, $ExpectedCode)
    $headers = @{}
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    try {
        $params = @{ Uri="$base$Uri"; Method=$Method; UseBasicParsing=$true; ContentType="application/json"; Headers=$headers }
        if ($Body) { $params["Body"] = $Body }
        $r = Invoke-WebRequest @params
        $status = if ($r.StatusCode -eq $ExpectedCode) { "PASS" } else { "WARN($($r.StatusCode))" }
        $content = $r.Content | ConvertFrom-Json
        Write-Host "$status | $Name | $($r.StatusCode)" -ForegroundColor $(if($status -eq "PASS"){"Green"}else{"Yellow"})
        return $content
    } catch {
        $code = [int]$_.Exception.Response.StatusCode
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $errBody = $reader.ReadToEnd()
        $status = if ($code -eq $ExpectedCode) { "PASS" } else { "FAIL" }
        Write-Host "$status | $Name | $code" -ForegroundColor $(if($status -eq "PASS"){"Green"}else{"Red"})
        if ($errBody) { try { return $errBody | ConvertFrom-Json } catch { return $null } }
        return $null
    }
}

Write-Host "`n========== TESTS API BACKEND EVENTFLOW ==========" -ForegroundColor Cyan

# === 1. AUTH ===
Write-Host "`n--- 1. AUTHENTIFICATION ---" -ForegroundColor Magenta
$adminData = Call-Api "1.1 Login Admin" POST "/api/auth/login" '{"email":"admin@example.com","password":"admin12345678"}' $null 200
$adminToken = $adminData.accessToken

$t = Call-Api "1.2 Register Enseignant" POST "/api/auth/register" "{`"firstName`":`"Salah`",`"lastName`":`"Ben`",`"email`":`"prof.$suffix@t.com`",`"password`":`"Password123!`",`"role`":`"ENSEIGNANT`"}" $null 201
$teacherId = $t.id

$s = Call-Api "1.3 Register Etudiant" POST "/api/auth/register" "{`"firstName`":`"Yassine`",`"lastName`":`"Trabelsi`",`"email`":`"etud.$suffix@t.com`",`"password`":`"Password123!`",`"role`":`"ETUDIANT`"}" $null 201
$studentId = $s.id

Call-Api "1.4 Login EN_ATTENTE => 403" POST "/api/auth/login" "{`"email`":`"prof.$suffix@t.com`",`"password`":`"Password123!`"}" $null 403
Call-Api "1.5 Duplicate Email => 409" POST "/api/auth/register" "{`"firstName`":`"X`",`"lastName`":`"Y`",`"email`":`"prof.$suffix@t.com`",`"password`":`"Password123!`",`"role`":`"ENSEIGNANT`"}" $null 409

# === 2. ADMIN ===
Write-Host "`n--- 2. ADMIN ---" -ForegroundColor Magenta
Call-Api "2.1 GET /admin/users/pending" GET "/api/admin/users/pending" $null $adminToken 200
Call-Api "2.2 Validate Enseignant" PATCH "/api/admin/users/$teacherId/validate" '{"role":"ENSEIGNANT"}' $adminToken 200
Call-Api "2.3 Validate Etudiant" PATCH "/api/admin/users/$studentId/validate" '{"role":"ETUDIANT"}' $adminToken 200
Call-Api "2.4 GET /admin/users" GET "/api/admin/users" $null $adminToken 200

# === 3. LOGIN VALIDES ===
Write-Host "`n--- 3. LOGIN COMPTES VALIDES ---" -ForegroundColor Magenta
$tl = Call-Api "3.1 Login Enseignant" POST "/api/auth/login" "{`"email`":`"prof.$suffix@t.com`",`"password`":`"Password123!`"}" $null 200
$teacherToken = $tl.accessToken
$sl = Call-Api "3.2 Login Etudiant" POST "/api/auth/login" "{`"email`":`"etud.$suffix@t.com`",`"password`":`"Password123!`"}" $null 200
$studentToken = $sl.accessToken

# === 4. PROFIL ===
Write-Host "`n--- 4. PROFIL ---" -ForegroundColor Magenta
Call-Api "4.1 GET /users/me" GET "/api/users/me" $null $teacherToken 200
Call-Api "4.2 PUT /users/me" PUT "/api/users/me" '{"firstName":"SalahMAJ","lastName":"BenMAJ"}' $teacherToken 200
Call-Api "4.3 PATCH password" PATCH "/api/users/me/password" '{"currentPassword":"Password123!","newPassword":"NewPassword1!"}' $teacherToken 200
$tl2 = Call-Api "4.4 Re-login new pwd" POST "/api/auth/login" "{`"email`":`"prof.$suffix@t.com`",`"password`":`"NewPassword1!`"}" $null 200
$teacherToken = $tl2.accessToken

# === 5. EVENEMENTS ===
Write-Host "`n--- 5. EVENEMENTS ---" -ForegroundColor Magenta
$fd = (Get-Date).AddDays(15).ToString("yyyy-MM-dd")
$ev = Call-Api "5.1 Create event" POST "/api/teacher/events" "{`"title`":`"Conf IA $suffix`",`"description`":`"Sem IA`",`"category`":`"TECH`",`"eventDate`":`"$fd`",`"startTime`":`"09:00`",`"endTime`":`"13:00`",`"location`":`"Amphi`",`"imageUrl`":`"https://ex.com/i.jpg`",`"ticketPrice`":20.00,`"capacity`":50}" $teacherToken 201
$eventId = $ev.id
Call-Api "5.2 GET mine" GET "/api/teacher/events" $null $teacherToken 200
Call-Api "5.3 GET event detail" GET "/api/teacher/events/$eventId" $null $teacherToken 200
Call-Api "5.4 PUT update" PUT "/api/teacher/events/$eventId" "{`"title`":`"Conf IA MAJ`",`"description`":`"Upd`",`"category`":`"TECH`",`"eventDate`":`"$fd`",`"startTime`":`"09:00`",`"endTime`":`"14:00`",`"location`":`"Amphi`",`"imageUrl`":`"https://ex.com/i.jpg`",`"ticketPrice`":20.00,`"capacity`":50}" $teacherToken 200
$ac = Call-Api "5.5 Add action" POST "/api/teacher/events/$eventId/actions" "{`"title`":`"Accueil`",`"description`":`"Badge`",`"actionDate`":`"$fd`",`"startTime`":`"09:00`",`"endTime`":`"09:30`"}" $teacherToken 201
Call-Api "5.6 GET actions" GET "/api/teacher/events/$eventId/actions" $null $teacherToken 200
Call-Api "5.7 Publish" PATCH "/api/teacher/events/$eventId/publish" $null $teacherToken 200

# === 6. PUBLIC ===
Write-Host "`n--- 6. CONSULTATION PUBLIQUE ---" -ForegroundColor Magenta
Call-Api "6.1 GET /events" GET "/api/events" $null $null 200
Call-Api "6.2 GET /events/$eventId" GET "/api/events/$eventId" $null $null 200
Call-Api "6.3 GET /events?search=IA" GET "/api/events?search=IA" $null $null 200
Call-Api "6.4 GET actions (public)" GET "/api/events/$eventId/actions" $null $null 200

# === 7. RESERVATIONS ===
Write-Host "`n--- 7. RESERVATIONS ---" -ForegroundColor Magenta
$res = Call-Api "7.1 Create reservation" POST "/api/reservations" "{`"eventId`":$eventId,`"numberOfPlaces`":2,`"paymentMethod`":`"CARTE_SIMULEE`"}" $studentToken 201
$resId = $res.id
Call-Api "7.2 GET /reservations/me" GET "/api/reservations/me" $null $studentToken 200
Call-Api "7.3 Double reservation => 409" POST "/api/reservations" "{`"eventId`":$eventId,`"numberOfPlaces`":1}" $studentToken 409

# === 8. PAIEMENT ===
Write-Host "`n--- 8. PAIEMENT ---" -ForegroundColor Magenta
Call-Api "8.1 Pay" POST "/api/reservations/$resId/pay" '{"status":"PAYE"}' $studentToken 200
Call-Api "8.2 Ticket" GET "/api/reservations/$resId/ticket" $null $studentToken 200

# === 9. NOTIFICATIONS ===
Write-Host "`n--- 9. NOTIFICATIONS ---" -ForegroundColor Magenta
$notifs = Call-Api "9.1 GET notifications" GET "/api/notifications" $null $studentToken 200
if ($notifs -and $notifs.Count -gt 0) {
    Call-Api "9.2 Mark read" PATCH "/api/notifications/$($notifs[0].id)/read" $null $studentToken 200
}
Call-Api "9.3 Mark all read" PATCH "/api/notifications/read-all" $null $studentToken 200

# === 10. PARTICIPANTS ===
Write-Host "`n--- 10. PARTICIPANTS ---" -ForegroundColor Magenta
Call-Api "10.1 GET participants" GET "/api/teacher/events/$eventId/participants" $null $teacherToken 200

# === 11. DASHBOARD ===
Write-Host "`n--- 11. DASHBOARD ---" -ForegroundColor Magenta
Call-Api "11.1 Admin stats" GET "/api/dashboard/admin" $null $adminToken 200
Call-Api "11.2 Teacher stats" GET "/api/dashboard/teacher" $null $teacherToken 200
Call-Api "11.3 Student stats" GET "/api/dashboard/student" $null $studentToken 200

# === 12. HISTORIQUE ===
Write-Host "`n--- 12. HISTORIQUE ---" -ForegroundColor Magenta
Call-Api "12.1 History admin" GET "/api/history" $null $adminToken 200
Call-Api "12.2 History teacher" GET "/api/history" $null $teacherToken 200
Call-Api "12.3 History student" GET "/api/history" $null $studentToken 200

# === 13. ANNULATION ===
Write-Host "`n--- 13. ANNULATION ---" -ForegroundColor Magenta
Call-Api "13.1 Cancel reservation" POST "/api/reservations/$resId/cancel" $null $studentToken 200
$check = Call-Api "13.2 Verify places" GET "/api/events/$eventId" $null $null 200
Write-Host "   Places: $($check.availablePlaces)/50" -ForegroundColor $(if($check.availablePlaces -eq 50){"Green"}else{"Red"})

Write-Host "`n========== TESTS TERMINES ==========" -ForegroundColor Cyan
