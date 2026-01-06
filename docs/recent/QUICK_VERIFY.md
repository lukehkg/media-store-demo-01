# Quick System Verification

## PowerShell Script: `verify-system.ps1`

Run this script to verify all system structure in less than 5 minutes:

```powershell
powershell -ExecutionPolicy Bypass -File verify-system.ps1
```

## What It Checks

1. **Docker Services** - Verifies all 4 services are running
2. **Frontend Structure** - Checks admin, client, and shared folders
3. **Backend Structure** - Verifies all backend files exist
4. **Docker Configuration** - Checks all Dockerfiles and compose files
5. **Documentation** - Verifies docs organization
6. **Storage Dashboard** - Checks all storage features are present

## Expected Output

✅ All critical checks should pass
⚠️ Warnings are non-critical
✗ Errors need to be fixed

## Quick Status

- **Docker Services**: 4/4 running
- **Frontend Files**: All present
- **Backend Files**: All present
- **Docker Configs**: All present
- **Documentation**: Organized in docs/
- **Storage Dashboard**: All features present

