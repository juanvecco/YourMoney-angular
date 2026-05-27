Set-Location $PSScriptRoot
& "$PSScriptRoot\node_modules\.bin\ng.cmd" serve --host 127.0.0.1 --port 4200 *> "$PSScriptRoot\angular-live.log"
