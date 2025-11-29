# Security Policy

## Reporting a Vulnerability

Please do **NOT** open a public issue for security vulnerabilities.

Instead, please email: **security@kitiumai.com**

Include the following information:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 24 hours and provide regular updates on our progress.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| 0.x     | :x:                |

## Security Best Practices

### For Contributors

1. **Never commit secrets** - Use environment variables
2. **Keep dependencies updated** - Review Dependabot PRs promptly
3. **Use strong authentication** - Enable 2FA on GitHub
4. **Sign commits** - Configure GPG commit signing
5. **Review code carefully** - Look for security vulnerabilities in PRs

### For Maintainers

1. **Review security reports promptly** - Within 48 hours
2. **Keep the repository updated** - Address critical vulnerabilities immediately
3. **Audit dependencies regularly** - Run `npm audit` before releases
4. **Monitor for exposed secrets** - Review secret scanning alerts
5. **Test security fixes** - Ensure patches don't break functionality

## Security Features Enabled

- ✅ Branch protection rules
- ✅ Required code reviews (2 approvals)
- ✅ CodeQL analysis
- ✅ Dependabot alerts and updates
- ✅ Secret scanning with push protection
- ✅ Signed commits required
- ✅ CODEOWNERS enforcement

## Security Checklist for Reviewers

Before approving any PR, verify:

- [ ] **No hardcoded secrets**
  - No API keys, passwords, tokens
  - No credentials in code or comments

- [ ] **Dependency changes**
  - Check for known vulnerabilities
  - Review new dependencies for legitimacy
  - No unnecessary dependencies added

- [ ] **Access control**
  - Proper authentication/authorization checks
  - No overly permissive permissions

- [ ] **Data handling**
  - Input validation present
  - SQL injection prevention
  - XSS prevention (for web components)
  - Proper data sanitization

- [ ] **Error handling**
  - No sensitive information in error messages
  - Proper logging without secrets

- [ ] **Cryptography**
  - Strong algorithms used
  - Proper key management
  - No custom crypto implementations

- [ ] **Third-party integrations**
  - API calls use HTTPS
  - Proper rate limiting
  - Error handling for API failures

## References

- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [OWASP Top 10](https://owasp.org/Top10/)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [CodeQL Documentation](https://codeql.github.com/)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests)

---

For questions or issues with GitHub security:

1. **General questions** → Open an issue tagged `security`
2. **Security vulnerabilities** → Email security@kitiumai.com
3. **Configuration help** → Contact tech leads
