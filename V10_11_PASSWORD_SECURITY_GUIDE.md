EMPLOYEE HUB V10.11 — PASSWORD & SECURITY QUESTION ADD-ON
=============================================================

BASE
- Additive upgrade from V10.10 Salary Payment Acknowledgment.
- Both existing HTML entry points are updated identically.
- All V10.10 and earlier files remain in this bundle.

ADDED
1. Employee password enrollment in Mission Zone. Employee selects their own profile and proves current PIN before registering a password.
2. Password requirements: 8–128 characters, at least one letter and one number.
3. Password login as an alternative to the existing PIN login.
4. Security-question registration (four selectable prompts).
5. Security-question password reset.
6. Password and answer are stored as PBKDF2-SHA-256 hashes with random per-secret salts and 150,000 iterations in separate localStorage key:
   employeeHubAccountSecurity_v1
7. Existing PIN login remains available as a fallback. Existing employee PINs are not modified.
8. Existing salary acknowledgment feature remains unchanged.

NOT ADDED / LIMITATIONS
- No server-side identity verification (explicitly skipped by user).
- No server-side private storage or cross-device sync for credentials or salary communication.
- No tamper-resistant audit trail. Browser storage can be inspected or modified by someone with local technical access.
- Security questions are a recovery convenience, not a strong second factor. Answers may be guessed or researched.
- Password registration is bound to the existing PIN check, which is still browser-side.
- Manager login continues to use the existing manager/payroll PIN workflows. No individual manager accounts were introduced.
- No live Netlify / Apps Script / Food Cost Dashboard deployment test was possible here.

PRESERVATION
- Existing employee PIN and manager PIN flows remain.
- Existing payroll formulas, payment ledger, rewards, tasks, attendance, performance, payslips, AI coach, bilingual spoken motivator and salary acknowledgment add-on remain.
- New credentials use a separate localStorage key and do not mutate the main db.
- The Google Apps Script bridge and sync serializer were not intentionally changed.
- Password and security-question records are not added to the existing sync payload.

DEPLOYMENT
1. Keep the V10.10 ZIP as rollback copy.
2. Extract this bundle and deploy the same HTML entry point you currently use.
3. Use HTTPS (Netlify) for Web Crypto PBKDF2 support.
4. Each employee must select their own profile, enter their existing PIN, and register a password and security question on each browser/device they use.
5. Do not treat this browser-only setup as a secure payroll vault. For strong privacy, server-side authentication and authorization are still required.
