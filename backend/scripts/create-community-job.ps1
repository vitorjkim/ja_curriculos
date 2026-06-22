param(
  [string]$BaseUrl = 'http://localhost:3010'
)

$ErrorActionPreference = 'Stop'

Write-Host "Using API base: $BaseUrl"

# 1) Login as admin
$loginBody = @{ email = 'admin@curriculoja.com'; password = 'admin123' } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri ($BaseUrl + '/api/auth/login') -ContentType 'application/json' -Body $loginBody
if (-not $login.token) { throw "Login failed: $($login | ConvertTo-Json -Depth 6)" }
$token = $login.token
Write-Host "Authenticated. Token acquired."

# 2) Build payload that satisfies backend validation
$payloadObj = @{
  company_name = 'Pizzaria XPTO'
  title        = 'Teste Vaga Comunidade (PS1)'
  area         = 'administracao'
  subarea      = 'assistente_administrativo'
  location     = 'São Paulo - SP'
  description  = 'Criada via script PowerShell para teste automático.'
  requirements = 'Boa comunicação e organização.'
  salary_type  = 'fixed'
  salary_fixed = 2000
  contract_type = 'clt'
  experience_level = 'junior'
  work_type    = 'presencial'
  benefits     = 'VR, VT'
  submission_methods = @('5511999999999','vagas@pizzariaxpto.com')
  contact_methods    = @('contato@pizzariaxpto.com')
}

$payload = $payloadObj | ConvertTo-Json -Depth 6

# 3) Create community job
$headers = @{ Authorization = ('Bearer ' + $token) }
$result = Invoke-RestMethod -Method Post -Uri ($BaseUrl + '/api/jobs/community') -Headers $headers -ContentType 'application/json' -Body $payload

Write-Output ($result | ConvertTo-Json -Depth 8)
if ($result.job.id) {
  Write-Host "Created community job id:" $result.job.id
  Write-Host "View at:" ($BaseUrl + '/api/jobs/' + $result.job.id)
} else {
  throw "Unexpected response: $($result | ConvertTo-Json -Depth 8)"
}
