param(
  [Parameter(Mandatory = $true)]
  [string]$BaseUrl
)

$normalizedBaseUrl = $BaseUrl.TrimEnd('/')

$healthResponse = Invoke-RestMethod -Uri "$normalizedBaseUrl/api/health" -Method Get
if ($healthResponse.status -ne 'healthy') {
  throw "Health check failed. Status was '$($healthResponse.status)'."
}

$loginResponse = Invoke-WebRequest -Uri "$normalizedBaseUrl/login" -Method Get
if ($loginResponse.StatusCode -ne 200) {
  throw "Login page check failed. Status code was $($loginResponse.StatusCode)."
}

Write-Host "Health endpoint is healthy."
Write-Host "Login page returned HTTP 200."
