# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.5.x   | :white_check_mark: |
| < 0.5   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

1. **Private Vulnerability Reporting** (preferred):
   - Go to the [Security tab](https://github.com/qodinger/knotengine/security/advisories/new)
   - Click "Report a vulnerability"
   - Fill out the form with details

2. **GitHub Discussions** (if above not available):
   - Create a new Discussion with the "Security Q&A" template
   - Mark as confidential

### What to Include

When reporting, please include:

- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact assessment

### Response Timeline

- **Initial Response**: Within 48 hours
- **Assessment**: Within 7 days
- **Fix Timeline**: Depends on severity — critical issues are addressed immediately

### Scope

The following are in scope for security reports:

- API authentication and authorization bypass
- Payment processing vulnerabilities
- Webhook signature verification bypass
- HD wallet derivation flaws
- Webhook injection or XSS
- Sensitive data exposure
- Rate limiting bypass
- Session fixation/hijacking

### Out of Scope

The following are NOT security vulnerabilities:

- Missing CSRF tokens on unauthenticated endpoints
- Banner/branding removal on checkout pages (unless on paid plan)
- Self-hosted deployment security (user's server config)
- Denial of service attacks on public endpoints
- Social engineering attacks
- Physical security
- Vulnerabilities in third-party services (Tatum, Alchemy, etc.)

---

## Security Best Practices

### For Self-Hosted Deployments

1. **Use strong secrets**: Generate all secrets with `openssl rand -hex 32`
2. **Enable TLS**: Always use HTTPS in production
3. **Restrict access**: Firewall ports except 80/443
4. **Keep updated**: Regularly pull latest images
5. **Monitor logs**: Watch for unusual activity

### For Production API Keys

- Never commit API keys to version control
- Rotate keys regularly
- Use separate keys for development/production
- Enable webhook signature verification
