# GitHub Repository Settings Guide

## Current Repository Configuration

**Repository URL:** `https://github.com/lukehkg/media-store-demo-01.git`

---

## ✅ **Current Status**

### Local Git Configuration
- **Remote:** `origin` → `https://github.com/lukehkg/media-store-demo-01.git`
- **Authentication:** Uses HTTPS (requires credentials for push)
- **Access:** You have write access from your local machine

### GitHub Repository Settings (To Verify)

To ensure the repository is **public read-only** for others and **write access** only for you:

---

## 🔒 **Step-by-Step: Configure GitHub Repository Settings**

### 1. **Access Repository Settings**

1. Go to: `https://github.com/lukehkg/media-store-demo-01`
2. Click **Settings** tab (top right, requires owner/admin access)
3. Scroll down to **Danger Zone** (bottom of settings page)

### 2. **Set Repository Visibility**

**Current Setting:** Check if repository is **Public** or **Private**

**To Make Public (Read-Only for Others):**
- Settings → General → **Change visibility**
- Select **Public**
- Type repository name to confirm
- Click **I understand, change repository visibility**

**Result:**
- ✅ Anyone can **view/clone** the repository
- ✅ Only you (and collaborators you add) can **push changes**

### 3. **Manage Collaborators (Optional)**

**To Add Write Access for Specific Users:**
- Settings → **Collaborators and teams**
- Click **Add people**
- Enter GitHub username
- Select permission level:
  - **Read** = View only
  - **Write** = Can push changes
  - **Admin** = Full access

**Current Status:** Only you have write access (default)

### 4. **Branch Protection Rules (Recommended)**

**To Prevent Accidental Changes:**
- Settings → **Branches**
- Click **Add rule** or edit existing rule for `main` branch
- Enable:
  - ✅ **Require pull request reviews before merging**
  - ✅ **Require status checks to pass before merging**
  - ✅ **Require branches to be up to date before merging**
  - ✅ **Include administrators** (applies to you too)

**Result:** Even you will need to create pull requests (optional, but recommended)

### 5. **Deploy Keys (For CI/CD - Read-Only)**

**If you need CI/CD to read the repository:**
- Settings → **Deploy keys**
- Click **Add deploy key**
- Enter public SSH key
- ✅ **Allow write access** = Unchecked (read-only)
- Click **Add key**

**Result:** CI/CD can clone, but cannot push

---

## 🔐 **Authentication Methods**

### Current Setup: HTTPS Authentication

**How It Works:**
- Uses GitHub username/password or Personal Access Token (PAT)
- Credentials stored locally (Windows Credential Manager)
- Required for `git push` operations

**To Check Your Authentication:**
```bash
# Test push access
git push origin main --dry-run

# Check stored credentials (Windows)
# Control Panel → Credential Manager → Windows Credentials
# Look for: git:https://github.com
```

### Alternative: SSH Authentication

**To Use SSH Instead:**
1. Generate SSH key:
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

2. Add to GitHub:
   - GitHub → Settings → SSH and GPG keys → New SSH key
   - Paste public key (`~/.ssh/id_ed25519.pub`)

3. Change remote URL:
   ```bash
   git remote set-url origin git@github.com:lukehkg/media-store-demo-01.git
   ```

**Result:** Uses SSH key instead of password/token

---

## ✅ **Verify Current Settings**

### Check Repository Visibility

**Public Repository:**
- URL: `https://github.com/lukehkg/media-store-demo-01`
- Anyone can view without login
- Clone URL visible to everyone

**Private Repository:**
- Requires login to view
- Only collaborators can clone

### Check Your Access Level

**Owner/Admin:**
- Can access Settings tab
- Can change visibility
- Can add collaborators
- Can delete repository

**Write Access:**
- Can push to repository
- Cannot change settings
- Cannot add collaborators

**Read Access:**
- Can clone repository
- Cannot push changes
- Cannot access settings

---

## 🛡️ **Security Best Practices**

### 1. **Use Personal Access Tokens (PAT) Instead of Password**

**Why:**
- GitHub deprecated password authentication for Git operations
- PATs are more secure and can be revoked

**How to Create PAT:**
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click **Generate new token (classic)**
3. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (if using GitHub Actions)
4. Copy token (save it, won't be shown again)
5. Use token as password when Git prompts

### 2. **Enable Two-Factor Authentication (2FA)**

**Why:**
- Extra security layer
- Required for some GitHub features

**How:**
- GitHub → Settings → Security → Two-factor authentication
- Follow setup instructions

### 3. **Review Active Sessions**

**Check:**
- GitHub → Settings → Security → Active sessions
- Review all logged-in devices
- Revoke suspicious sessions

### 4. **Audit Log (For Organizations)**

**If using GitHub Organization:**
- Settings → Audit log
- Review all repository actions
- Monitor for unauthorized access

---

## 📋 **Quick Checklist**

- [ ] Repository is **Public** (read-only for others)
- [ ] Only you have **Write** access
- [ ] Branch protection enabled (optional)
- [ ] Using **Personal Access Token** (not password)
- [ ] **Two-Factor Authentication** enabled
- [ ] No sensitive credentials in repository (✅ Already verified)
- [ ] `.gitignore` properly configured (✅ Already verified)

---

## 🔍 **Verify Current Configuration**

### Check Repository Visibility
```bash
# Visit in browser (logged out or incognito)
https://github.com/lukehkg/media-store-demo-01

# If you can see it without login = Public ✅
# If login required = Private ⚠️
```

### Check Your Write Access
```bash
# Test push (dry-run)
git push origin main --dry-run

# If successful = You have write access ✅
# If permission denied = Check authentication ⚠️
```

### Check Remote URL
```bash
git remote -v

# Should show:
# origin  https://github.com/lukehkg/media-store-demo-01.git (fetch)
# origin  https://github.com/lukehkg/media-store-demo-01.git (push)
```

---

## 🚨 **If Repository is Currently Private**

**To Make It Public:**
1. Go to repository Settings
2. Scroll to **Danger Zone**
3. Click **Change visibility**
4. Select **Make public**
5. Type repository name to confirm
6. Click **I understand, change repository visibility**

**Warning:** Making repository public exposes all code and commit history. Ensure:
- ✅ No sensitive credentials (already verified)
- ✅ No private API keys (already verified)
- ✅ No proprietary code (if applicable)

---

## 📞 **Troubleshooting**

### Cannot Push Changes

**Error:** `remote: Permission denied`

**Solutions:**
1. Check authentication:
   ```bash
   git config --global credential.helper
   ```
2. Update credentials:
   - Windows: Control Panel → Credential Manager
   - Remove old GitHub credentials
   - Git will prompt for new credentials on next push
3. Use Personal Access Token instead of password

### Repository Shows as Private

**If you want it public:**
- Follow "If Repository is Currently Private" steps above
- Or contact GitHub support if you don't have admin access

### Want to Restrict Access Further

**Options:**
1. Make repository **Private** (only you can access)
2. Add **Branch protection rules** (require PR reviews)
3. Use **GitHub Actions** for automated deployments only
4. Remove **Deploy keys** if not needed

---

## ✅ **Recommended Settings for Public Repository**

1. **Visibility:** Public ✅
2. **Default Branch:** `main` ✅
3. **Branch Protection:** Enabled (optional but recommended)
4. **Collaborators:** Only you (or trusted team members)
5. **Deploy Keys:** None (unless needed for CI/CD)
6. **Actions:** Enabled (for CI/CD)
7. **Issues:** Enabled (for bug tracking)
8. **Wiki:** Disabled (unless needed)
9. **Projects:** Disabled (unless needed)

---

**Last Updated:** 2024-01-06  
**Repository:** `lukehkg/media-store-demo-01`

