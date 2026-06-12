# ─────────────────────────────────────────────────────────────
#  AIOS — SharePoint Lists Provisioning
#  Erstellt alle 5 Listen für den AIOS Web App Betrieb
#  Voraussetzung: PnP.PowerShell Modul + SharePoint Admin-Rechte
#
#  Ausführung:
#    Connect-PnPOnline -Url "https://TENANT.sharepoint.com/sites/AIOS" -Interactive
#    .\Provision-SharePointLists.ps1
# ─────────────────────────────────────────────────────────────

param(
    [string]$SiteUrl = "https://TENANT.sharepoint.com/sites/AIOS",
    [string]$CompanyName = "AIOS"   # Anzeigename des Kunden — pro Tenant überschreiben
)

# ── Verbindung prüfen ─────────────────────────────────────────
try {
    $ctx = Get-PnPContext
    Write-Host "✓ Verbunden mit: $SiteUrl" -ForegroundColor Green
} catch {
    Write-Host "Bitte zuerst verbinden:" -ForegroundColor Yellow
    Write-Host "Connect-PnPOnline -Url '$SiteUrl' -Interactive" -ForegroundColor Cyan
    exit 1
}

# ── Helper ────────────────────────────────────────────────────
function EnsureList {
    param([string]$Title, [string]$Description)
    $list = Get-PnPList -Identity $Title -ErrorAction SilentlyContinue
    if ($null -eq $list) {
        $list = New-PnPList -Title $Title -Template GenericList -EnableVersioning
        Write-Host "  ✓ Liste '$Title' erstellt" -ForegroundColor Green
    } else {
        Write-Host "  → Liste '$Title' bereits vorhanden" -ForegroundColor DarkGray
    }
    return $list
}

function EnsureField {
    param([string]$ListTitle, [string]$InternalName, [string]$DisplayName, [string]$Type, [hashtable]$Extra = @{})
    $field = Get-PnPField -List $ListTitle -Identity $InternalName -ErrorAction SilentlyContinue
    if ($null -eq $field) {
        $params = @{
            List         = $ListTitle
            InternalName = $InternalName
            DisplayName  = $DisplayName
            Type         = $Type
            Required     = $false
        }
        foreach ($k in $Extra.Keys) { $params[$k] = $Extra[$k] }
        Add-PnPField @params | Out-Null
        Write-Host "    + Feld '$DisplayName' ($Type)" -ForegroundColor DarkCyan
    } elseif (($Type -eq "Choice" -or $Type -eq "MultiChoice") -and $Extra.ContainsKey("Choices")) {
        # Choice-Spalten: fehlende Werte nachträglich ergänzen (verhindert SP-Ablehnungen
        # wenn neue Werte zur App hinzugefügt werden ohne Reprovisioning).
        $existingChoices = $field.Choices
        $newChoices = $Extra["Choices"] | Where-Object { $existingChoices -notcontains $_ }
        if ($newChoices.Count -gt 0) {
            $merged = $existingChoices + $newChoices
            Set-PnPField -List $ListTitle -Identity $InternalName -Values @{ Choices = $merged } | Out-Null
            Write-Host "    ~ Feld '$DisplayName': Choices ergänzt ($($newChoices -join ', '))" -ForegroundColor Yellow
        }
    }
}

# ════════════════════════════════════════════════════════════════
# 1. AIOS_UseCases
# ════════════════════════════════════════════════════════════════
Write-Host "`n[1/6] AIOS_UseCases" -ForegroundColor Cyan
EnsureList -Title "AIOS_UseCases" -Description "KI Use Cases" | Out-Null

$ucFields = @(
    @{ N="UCId";         D="UC-ID";                     T="Text" },
    @{ N="Cluster";      D="Cluster / Abteilung";        T="Text" },
    @{ N="System";       D="System / Werkzeug";           T="Text" },
    @{ N="Legacy";       D="Betroffenes Legacy-System";   T="Text" },
    @{ N="Owner";        D="Business Owner";              T="Text" },
    @{ N="Capability";   D="KI-Technologie";              T="Text" },
    @{ N="UCCategory";   D="Use Case Kategorie";          T="Choice"; Extra=@{Choices=@("Copilot Agents","AI bei der Erstellung","Predictive AI","Externe Tools","AI in Legacy Systemen","Content Creation","Sonstiges")} },
    @{ N="Autonomy";     D="Autonomiegrad";               T="Text" },
    @{ N="Lifecycle";    D="Lifecycle";                   T="Choice"; Extra=@{Choices=@("Idea","Build","Run","Retire")} },
    @{ N="Portfolio";    D="Portfolio Decision";          T="Choice"; Extra=@{Choices=@("Start","Scale","Stop","Hold","Backlog")} },
    @{ N="RiskTier";     D="Risk Tier";                   T="Choice"; Extra=@{Choices=@("Low","Medium","High")} },
    @{ N="GovTier";      D="Governance-Tier";             T="Choice"; Extra=@{Choices=@("1","2","3")} },
    @{ N="Approval";     D="Approval Status";             T="Choice"; Extra=@{Choices=@("Not required","Pending","Approved","Rejected")} },
    @{ N="OpReady";      D="Operational Readiness";       T="Choice"; Extra=@{Choices=@("Not ready","Operational Ready")} },
    @{ N="KpiStatus";    D="KPI Status";                  T="Choice"; Extra=@{Choices=@("yes","no")} },
    @{ N="HiTL";         D="Human in the Loop";           T="Choice"; Extra=@{Choices=@("yes","no")} },
    @{ N="Reversible";   D="Entscheidungen reversibel";   T="Choice"; Extra=@{Choices=@("yes","no")} },
    @{ N="ValueScore";   D="Value Score (1-3)";           T="Number" },
    @{ N="FeasScore";    D="Feasibility Score (1-3)";     T="Number" },
    @{ N="RiskScore";    D="Risk Score (1-3)";            T="Number" },
    @{ N="Active";       D="Aktiv";                       T="Boolean" },
    @{ N="Description";  D="Beschreibung";                T="Note" },
    @{ N="Link";         D="URL (Agent / Tool)";          T="URL" },
    @{ N="CreatedBy_x";  D="Erstellt von (Actor)";        T="Text" },
    @{ N="UpdatedBy_x";  D="Geändert von (Actor)";        T="Text" },
    # KI-Typ (Mehrfachauswahl)
    @{ N="KiType";       D="KI-Typ Dimension";            T="MultiChoice"; Extra=@{Choices=@("KI im Einsatz","KI in der Erstellung")} },
    # Governance-Trigger (Boolean)
    @{ N="GT01";         D="Trigger GT01";                T="Boolean" },
    @{ N="GT02";         D="Trigger GT02";                T="Boolean" },
    @{ N="GT03";         D="Trigger GT03";                T="Boolean" },
    @{ N="GT04";         D="Trigger GT04";                T="Boolean" },
    # Sensible Bereiche
    @{ N="SB01";         D="Sensibel SB01";               T="Boolean" },
    @{ N="SB02";         D="Sensibel SB02";               T="Boolean" },
    @{ N="SB03";         D="Sensibel SB03";               T="Boolean" },
    @{ N="SB04";         D="Sensibel SB04";               T="Boolean" },
    # Minimum Checks (7)
    @{ N="MC01"; D="MC01"; T="Boolean" }, @{ N="MC02"; D="MC02"; T="Boolean" },
    @{ N="MC03"; D="MC03"; T="Boolean" }, @{ N="MC04"; D="MC04"; T="Boolean" },
    @{ N="MC05"; D="MC05"; T="Boolean" }, @{ N="MC06"; D="MC06"; T="Boolean" },
    @{ N="MC07"; D="MC07"; T="Boolean" },
    # ── Reliability (P0 — AI Reliability Framework) ──────────────
    @{ N="ReliabilityTier"; D="Reliability Tier (R1-R5)"; T="Choice"; Extra=@{Choices=@("R1","R2","R3","R4","R5")} },
    @{ N="HitlMode";        D="HITL-Modus";               T="Choice"; Extra=@{Choices=@("HITL","HOTL","none")} },
    @{ N="AutonomyLevel";   D="Automationsgrad";           T="Choice"; Extra=@{Choices=@("supervised","semi-auto","autonomous")} },
    @{ N="FailureModes";    D="Failure Mode Risiken (JSON)"; T="Note" },
    @{ N="MonitoringSla";   D="Monitoring SLA";            T="Choice"; Extra=@{Choices=@("Echtzeit","täglich","wöchentlich","monatlich","quartalsweise")} }
)

foreach ($f in $ucFields) {
    $extra = if ($f.Extra) { $f.Extra } else { @{} }
    EnsureField -ListTitle "AIOS_UseCases" -InternalName $f.N -DisplayName $f.D -Type $f.T -Extra $extra
}

# ════════════════════════════════════════════════════════════════
# 2. AIOS_Incidents
# ════════════════════════════════════════════════════════════════
Write-Host "`n[2/6] AIOS_Incidents" -ForegroundColor Cyan
EnsureList -Title "AIOS_Incidents" -Description "KI Incident Log" | Out-Null

$incFields = @(
    @{ N="IncId";         D="INC-ID";              T="Text" },
    @{ N="UCRef";         D="Use Case ID";          T="Text" },
    @{ N="IncType";       D="Typ";                  T="Choice"; Extra=@{Choices=@("Incident","Deviation","Near Miss")} },
    @{ N="Severity";      D="Schweregrad";           T="Choice"; Extra=@{Choices=@("Low","Medium","High")} },
    @{ N="Status";        D="Status";               T="Choice"; Extra=@{Choices=@("Open","In Progress","Resolved")} },
    @{ N="Description";   D="Beschreibung";          T="Note" },
    @{ N="Actions";       D="Ergriffene Maßnahmen";  T="Note" },
    @{ N="IncDate";       D="Datum des Vorfalls";    T="DateTime" },
    @{ N="CreatedBy_x";   D="Erstellt von (Actor)";  T="Text" },
    # ── Reliability (P1 — Failure Mode Filter) ───────────────────
    @{ N="FailureMode";   D="Reliability Failure Mode"; T="Choice"; Extra=@{Choices=@("accuracy","inconsistency","drift","agentic","infrastructure")} }
)
foreach ($f in $incFields) {
    $extra = if ($f.Extra) { $f.Extra } else { @{} }
    EnsureField -ListTitle "AIOS_Incidents" -InternalName $f.N -DisplayName $f.D -Type $f.T -Extra $extra
}

# ════════════════════════════════════════════════════════════════
# 3. AIOS_Artefakte (JSON-Blob Strategie)
# ════════════════════════════════════════════════════════════════
Write-Host "`n[3/6] AIOS_Artefakte" -ForegroundColor Cyan
Write-Host "  Strategie: JSON-Blob pro Artefakt-Typ — vermeidet 100+ Spalten" -ForegroundColor DarkGray
EnsureList -Title "AIOS_Artefakte" -Description "RA / GC / BC / DSFA als JSON-Blobs" | Out-Null

$artFields = @(
    @{ N="UCId";       D="Use Case ID";    T="Text" },
    @{ N="ArtType";    D="Artefakt-Typ";   T="Choice"; Extra=@{Choices=@("ra","gc","bc","dsfa")} },
    @{ N="Payload";    D="Daten (JSON)";   T="Note" },
    @{ N="SavedAt";    D="Gespeichert am"; T="DateTime" },
    @{ N="SavedBy";    D="Gespeichert von";T="Text" }
)
foreach ($f in $artFields) {
    $extra = if ($f.Extra) { $f.Extra } else { @{} }
    EnsureField -ListTitle "AIOS_Artefakte" -InternalName $f.N -DisplayName $f.D -Type $f.T -Extra $extra
}

# Compound-Index: UCId + ArtType für schnelle Abfragen
Write-Host "  → Index UCId+ArtType (manuell in SP-Admin empfohlen)" -ForegroundColor DarkYellow

# ════════════════════════════════════════════════════════════════
# 4. AIOS_AuditLog
# ════════════════════════════════════════════════════════════════
Write-Host "`n[4/6] AIOS_AuditLog" -ForegroundColor Cyan
EnsureList -Title "AIOS_AuditLog" -Description "Unveränderliches Audit-Protokoll" | Out-Null

$alFields = @(
    @{ N="EntryId";    D="Eintrag-ID";      T="Text" },
    @{ N="Actor";      D="Actor (UPN)";     T="Text" },
    @{ N="Action";     D="Aktion";          T="Choice"; Extra=@{Choices=@("create","edit","approve","reject","delete","save-artefakt","inline-edit")} },
    @{ N="Entity";     D="Entität";         T="Choice"; Extra=@{Choices=@("UseCase","Incident","Artefakt")} },
    @{ N="EntityId";   D="Entität-ID";      T="Text" },
    @{ N="Diff";       D="Änderungen (JSON)";T="Note" },
    @{ N="Comment";    D="Kommentar";       T="Text" }
)
foreach ($f in $alFields) {
    $extra = if ($f.Extra) { $f.Extra } else { @{} }
    EnsureField -ListTitle "AIOS_AuditLog" -InternalName $f.N -DisplayName $f.D -Type $f.T -Extra $extra
}

# AuditLog: nur AIOS.Admin darf löschen → Berechtigungen brechen
Write-Host "  ⚠ Hinweis: Bitte AuditLog-Listenberechtigungen manuell einschränken:" -ForegroundColor Yellow
Write-Host "    Site Settings → Permissions → Break Inheritance → Editor: kein Delete" -ForegroundColor DarkYellow

# ════════════════════════════════════════════════════════════════
# 5. AIOS_Config
# ════════════════════════════════════════════════════════════════
Write-Host "`n[5/6] AIOS_Users" -ForegroundColor Cyan
EnsureList -Title "AIOS_Users" -Description "AIOS Benutzerverwaltung (Rollen + Zugriff)" | Out-Null

$usrFields = @(
    @{ N="Email";       D="E-Mail (AAD UPN)";   T="Text" },
    @{ N="DisplayName"; D="Anzeigename";          T="Text" },
    @{ N="AadUserId";   D="AAD User ID";          T="Text" },
    @{ N="Role";        D="AIOS-Rolle";           T="Choice"; Extra=@{Choices=@("AIOS.Viewer","AIOS.Editor","AIOS.Approver","AIOS.Admin")} },
    @{ N="Active";      D="Zugriff aktiv";        T="Boolean" },
    @{ N="InvitedAt";   D="Eingeladen am";        T="DateTime" },
    @{ N="InvitedBy";   D="Eingeladen von";       T="Text" },
    @{ N="LastLogin";   D="Letzter Login";        T="DateTime" }
)
foreach ($f in $usrFields) {
    $extra = if ($f.Extra) { $f.Extra } else { @{} }
    EnsureField -ListTitle "AIOS_Users" -InternalName $f.N -DisplayName $f.D -Type $f.T -Extra $extra
}

Write-Host "  ⚠ Pflicht: Ersten Admin-Eintrag manuell anlegen (Bootstrap)" -ForegroundColor Yellow
Write-Host "    → AIOS_Users → Neues Element: Email=deine@email.de, Role=AIOS.Admin, Active=Ja" -ForegroundColor DarkYellow

# ════════════════════════════════════════════════════════════════
# 6. AIOS_Config (vormals 5)
# ════════════════════════════════════════════════════════════════
Write-Host "`n[6/6] AIOS_Config" -ForegroundColor Cyan
EnsureList -Title "AIOS_Config" -Description "COMPANY-Objekt und Tenant-Konfiguration" | Out-Null

EnsureField -ListTitle "AIOS_Config" -InternalName "ConfigKey" -DisplayName "Schlüssel" -Type "Text"
EnsureField -ListTitle "AIOS_Config" -InternalName "ConfigValue" -DisplayName "Wert (JSON)" -Type "Note"

# Default COMPANY-Konfiguration einfügen
$existing = Get-PnPListItem -List "AIOS_Config" -Query "<View><Query><Where><Eq><FieldRef Name='ConfigKey'/><Value Type='Text'>COMPANY</Value></Eq></Where></Query></View>"
if ($existing.Count -eq 0) {
    $companyConfig = @{
        name    = $CompanyName
        short   = "AIOS"
        tag     = "AI Management System"
        iso     = "ISO 42001 aligned"
        chatbot = @{ enabled = $true; label = "AI-Assistent"; url = "https://claude.ai"; hint = "Fragen zum AIOS?" }
    } | ConvertTo-Json -Compress
    Add-PnPListItem -List "AIOS_Config" -Values @{ Title="COMPANY"; ConfigKey="COMPANY"; ConfigValue=$companyConfig } | Out-Null
    Write-Host "  ✓ Default COMPANY-Konfiguration eingefügt" -ForegroundColor Green
}

# ── Zusammenfassung ───────────────────────────────────────────
Write-Host "`n════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✓ Provisioning abgeschlossen" -ForegroundColor Green
Write-Host ""
Write-Host "Nächste Schritte:" -ForegroundColor Yellow
Write-Host "  1. AIOS_AuditLog Berechtigungen einschränken (nur Admin = Delete)"
Write-Host "  2. Entra-App-Registrierung: Managed Identity für Azure Functions"
Write-Host "  3. Graph API Berechtigungen: Sites.ReadWrite.All"
Write-Host "  4. staticwebapp.config.json: TENANT_ID eintragen"
Write-Host ""
Write-Host "SharePoint Site URL:" -ForegroundColor Cyan
Write-Host "  $SiteUrl" -ForegroundColor White
