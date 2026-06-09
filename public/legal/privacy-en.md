# PRIVACY POLICY
## Drug Platform / Adam Groznov

**Version:** v1.0 (effective edition)
**Effective date:** 2026-06-09
**URL:** https://adam.groznov.uk/privacy-en

---

## INTRODUCTION

This Privacy Policy explains **what personal data** we collect, **how we use it**, **with whom we share it**, and **what rights you have** as a User of the Drug / Adam Groznov platform.

This document operates together with the [Terms of Service](https://adam.groznov.uk/terms-en) and is an integral part thereof.

**If you do not agree with the terms of this Policy — please do not use the Platform.**

---

## 1. WHO WE ARE AND HOW TO CONTACT US

### 1.1. Data Controller

**Individual Entrepreneur Yulia Valeriivna Kolmykova**
- Tax ID (Ukraine): 2717224886
- Jurisdiction: Ukraine
- Tax authority: Main Department of the State Tax Service in Kharkiv Oblast
- KVED (IT/digital block relevant to the Platform): **62.01** (computer programming), **62.02** (computer consultancy), **62.03** (computer facilities management), **62.09** (other IT activities), **63.11** (data processing, hosting and related activities), **63.12** (web portals), **58.29** (software publishing), **74.10** (specialised design activities), **47.91** (Internet retail)

Acts as the **Data Controller** of your personal data in accordance with GDPR Art. 4(7) and the Ukrainian Law on Personal Data Protection (Law No. 2297-VI).

### 1.2. Privacy contacts

- **Email:** `privacy@groznov.net`
- **Support:** `support@groznov.net`
- **Postal address:** provided upon request to `privacy@groznov.net`

### 1.3. Data Protection Officer (DPO)

Due to the small size of the Provider, a separate Data Protection Officer (DPO) **is not appointed** (not required by GDPR Art. 37 for organizations that do not process large volumes of special category data). Privacy matters are addressed directly to Individual Entrepreneur Y.V. Kolmykova via `privacy@groznov.net`.

### 1.4. EU Representative (Article 27 GDPR)

For the purposes of GDPR Article 27 (representatives of controllers not established in the EU), the Provider does not currently have an EU establishment. EU residents may contact the Provider directly at `privacy@groznov.net`.

### 1.5. UK Representative (UK GDPR Article 27)

For UK residents, contact: `privacy@groznov.net`.

---

## 2. WHAT DATA WE COLLECT

### 2.1. Data you provide voluntarily

| Category | Specific data | Required? |
|---|---|---|
| **Identification** | Email address | Required (for CF Access verification) |
| **Profile** | Name/nickname, interface language | Optional |
| **Conversations** | Text of User messages and Adam's responses | Naturally during use |
| **Voice** | Audio transcripts of voice sessions (text, not the audio file itself) | Only when using voice |
| **Files** | Photos, documents, scans attached in chat | Only if you attach them |
| **Cabinet intake forms** | Fields you fill in before a Cabinet session | Required for the specific Cabinet |
| **Payment information** | Amount, payment method, order_id (no card data) | When paying |

> **We do NOT store bank card data.** Payments are processed by external payment gateways (LiqPay, Fondy, Lemonsqueezy, NOWPayments) directly.

### 2.2. Data we collect automatically

| Category | Specific data | Purpose |
|---|---|---|
| **Technical** | IP address (truncated to /24 for logging), User-Agent, device type | Security, rate-limiting, statistics |
| **Session** | Session cookies (Cloudflare Access JWT), login/logout time | Authentication |
| **Use metrics** | Number of messages, session time, which Cabinets visited | Service improvement, free-tier quota |
| **Errors** | Stack traces for technical failures | Debugging (no personal data in logs) |

### 2.3. Data we do NOT collect

- ❌ Bank card data (full number, CVV, expiration date)
- ❌ Biometric data for identification
- ❌ Geolocation (precise — only country/region from IP for compliance)
- ❌ Social media data (no integrations like "Sign in with Facebook")
- ❌ Your browser history, data from other sites
- ❌ Third-party data without their consent

### 2.4. Special category data (GDPR Art. 9)

The User **may voluntarily provide** in conversation with Adam data that falls into special categories:
- **Health** data
- **Religious beliefs**
- **Sex life** data
- **Racial-ethnic origin**
- **Philosophical beliefs**

**Legal basis for processing** such data is the User's **explicit consent** (GDPR Art. 9(2)(a)), provided by actively clicking the send button on a message containing such data.

These data:
- Are **encrypted at rest** (Fernet AES-128, per-user keys)
- Are **not used for marketing**
- Are **not transferred to third parties**, except to the LLM provider needed to generate a response
- Are **deleted upon account deletion**

---

## 3. HOW WE USE THE DATA

### 3.1. Main processing purposes

| Purpose | Data | Legal basis |
|---|---|---|
| **Service provision** | Message text, profile, history | Performance of contract (GDPR 6(1)(b)) |
| **Adam's long-term memory** | Conversations, embeddings | Performance of contract + legitimate interest (6(1)(b), 6(1)(f)) |
| **Platform security** | IP, technical data | Legitimate interest (6(1)(f)) |
| **Free-tier quota calculation** | Email (normalized), counter | Performance of contract (6(1)(b)) |
| **Payment processing** | Amount, method, order_id | Performance of contract (6(1)(b)) |
| **Crisis detection** | Text of last message (in the moment only) | Vital interests (6(1)(d)) |
| **Product development** | Use metrics, aggregated statistics | Legitimate interest (6(1)(f)) |

### 3.2. What we do NOT do with data

- ❌ **Do not sell** data to advertisers
- ❌ **Do not use** your conversations to train third-party LLM models
- ❌ **Do not display** advertising within the service
- ❌ **Do not profile** you for automated decisions with legal consequences (GDPR Art. 22)
- ❌ **Do not transfer** data to marketing aggregators
- ❌ **Do not use** third-party trackers (no Google Analytics, no Meta Pixel)

### 3.3. Automated decisions

The Platform uses AI (LLM models) to **generate responses** in conversation. This is not an "automated decision with legal consequences" within the meaning of GDPR Art. 22.

The exception is **automatic calculation of the free-tier quota** (3 free conversations). This is simple arithmetic, not profiling.

### 3.4. California-specific (CCPA / CPRA)

For California residents under CCPA / CPRA:

a) **Categories of personal information collected** in the last 12 months: identifiers (email), commercial information (payment history), internet activity (use metrics, technical data), inferences (conversational patterns for AI memory).

b) **We do not sell or share** personal information for cross-context behavioral advertising. Therefore, no "Do Not Sell or Share My Personal Information" link is required, but you may still submit such a request to `privacy@groznov.net`.

c) **CCPA rights:** right to know, right to delete, right to correct, right to opt-out of sale (we do not sell — confirmed automatic), right to limit use of sensitive personal information, right to non-discrimination.

d) **Sensitive Personal Information (SPI)** under CCPA: we process SPI (health data in "Conversation about health" Cabinet, religious beliefs in "Religious mentor" Cabinet) only for performance of the service, not for inference about consumer characteristics.

---

## 4. WITH WHOM WE SHARE DATA

### 4.1. Data Processors

The Provider works with the following **processors** that process your data **only on our instructions**:

| Processor | Processes | Jurisdiction | Legal basis for transfer |
|---|---|---|---|
| **Cloudflare** | DNS, CDN, Zero Trust Access, R2 object storage | USA (HQ), data centers in EU + UA | Cloudflare Standard DPA + EU SCC 2021/914 |
| **Anthropic** | Message text (Claude model) | USA | Anthropic Commercial Terms + DPA + EU SCC |
| **OpenAI** | Text + voice transcripts (GPT, Whisper, Realtime models) | USA | OpenAI DPA + EU SCC |
| **DeepSeek** | Message text (DeepSeek model) | Hong Kong / China (PRC) | Direct API agreement; **restricted transfer, warning** (see §4.4) |
| **Google Cloud (Gemini)** | Text + image generation | USA + EU data centers | Google Cloud DPA + EU SCC |
| **xAI** | Message text (Grok) | USA | xAI Terms |
| **LiqPay (PrivatBank)** | UA card payments | Ukraine | Agreement with PrivatBank |
| **Fondy / Flitt** | Card payments | Ukraine / EU | Direct merchant agreement |
| **Lemonsqueezy** | MoR for international payments | USA | Lemonsqueezy Terms |
| **NOWPayments** | Crypto checkout | Netherlands | NOWPayments Terms |
| **Resend** | Email delivery | USA | Resend DPA |
| **Hetzner** (if applicable) | Backend hosting | Germany / Finland | Hetzner DPA |

### 4.2. Principles of data transfer to processors

- **Minimum necessary scope**
- **Contractual basis** (DPA with each)
- **No onward transfer** without our authorization

### 4.3. Who we do NOT transfer data to

- ❌ Marketing companies
- ❌ Data brokers
- ❌ Advertising networks
- ❌ Other Platform Users
- ❌ Governments **without a proper legal request**

### 4.4. Transfer of data outside the EEA

#### USA (Cloudflare, Anthropic, OpenAI, Google, Lemonsqueezy, Resend)

Transfer is based on **Standard Contractual Clauses (SCC) Commission Implementing Decision 2021/914**, supplemented by a **transfer impact assessment**. Users may request a copy of SCC via `privacy@groznov.net`.

#### United Kingdom (post-Brexit)

UK GDPR is recognized as adequate for transfers from the EEA. No additional measures are required.

#### China (DeepSeek, Hong Kong / China)

**Important:** DeepSeek is based in Hong Kong, with part of servers in mainland China. Data transfer to PRC is **not recognized as adequate** under either GDPR or UK GDPR.

**Safeguards:**
- Before first use of the DeepSeek model, the User is shown a **warning** about trans-border transfer to China
- The User **actively confirms** consent by clicking
- The User may **completely opt out** of using DeepSeek (the platform automatically switches to other models)
- Special category data (GDPR Art. 9) is **not transferred to DeepSeek by default**

#### Netherlands (NOWPayments)

Netherlands is an EEA member, no additional measures required.

---

## 5. HOW LONG WE STORE DATA

### 5.1. Retention periods

| Data category | Retention period | What happens after |
|---|---|---|
| **User profile** | Until account deletion + 90 days | Deletion from production + backup |
| **Conversations with Adam** | Until account deletion + 90 days | Deletion from all databases |
| **Voice transcripts** | Until account deletion + 90 days | Deletion |
| **Attached files (R2)** | Until message deletion + 30 days | Deletion from R2 |
| **Payment data** (order_id, amount) | 7 years (Ukrainian tax law requirement) | Archiving in encrypted form |
| **Security incidents** (attack attempt logs, fraud) | 1 year | Deletion |
| **Technical logs** (IP, User-Agent for debug) | 90 days | Deletion |
| **Free-tier quota data** (normalized email + counter) | Until account deletion | Deletion |

### 5.2. Why a 90-day buffer period

After you delete your account, we retain data for **90 days** for:
- Investigation of disputes (chargebacks, complaints)
- Restoration upon User request (if changed mind)
- Responses to official requests from authorized bodies for the last activity period

After 90 days, data is **irreversibly deleted** from all systems, including backups (backups older than 90 days are not restored for this user).

### 5.3. Anonymized data

Some data (aggregated metrics, Cabinet usage, technical indicators) is **retained indefinitely** in anonymized form — without the possibility of reverse linkage to a specific User.

---

## 6. YOUR RIGHTS

In accordance with GDPR Art. 15-22, UK GDPR, CCPA, and Ukrainian Law on Personal Data Protection:

### 6.1. Right of access (GDPR Art. 15)

You may request:
- What data we process about you
- For what purpose
- To whom we transfer
- How long we retain

**How to exercise:** request to `privacy@groznov.net`. Response provided **within 30 days** (may be extended to 60 days for complex requests with notification).

### 6.2. Right to rectification (GDPR Art. 16)

If data about you is inaccurate — you may correct it:
- Profile (email, name) — in Account Settings
- Conversations with Adam — not corrected (this is dialogue history), but individual messages may be deleted

### 6.3. Right to erasure ("right to be forgotten", GDPR Art. 17)

You may request **complete deletion** of your data:

**Method A (self-service):** via Account Settings — "Delete my account" button. Deletion occurs within 24 hours from all production systems + within 90 days from backups.

**Method B (via us):** request to `privacy@groznov.net`. Response within 30 days.

### 6.4. Right to restriction of processing (GDPR Art. 18)

You may request **temporary suspension** of processing of your data (e.g., during complaint review). Request to `privacy@groznov.net`.

### 6.5. Right to data portability (GDPR Art. 20)

You may request **export of your data** in machine-readable format:

**How to exercise:**
- Via API: `GET /me/biography.json` (returns all your history in JSON)
- Via API: `GET /me/biography.md` (returns in Markdown format for reading)
- Via UI: Settings → "Export my data" (prepares ZIP archive with everything: conversations, files, intake forms, payment history)

### 6.6. Right to object (GDPR Art. 21)

You may **object** to processing based on legitimate interest (GDPR Art. 6(1)(f)). In our case this concerns:
- Analytics (aggregated metrics)
- Adam's long-term memory

Request to `privacy@groznov.net`. We will assess the reasonableness and notify you of the result.

### 6.7. Right to withdraw consent (GDPR Art. 7(3))

If processing is based on your consent (e.g., special category data Art. 9, transfer to DeepSeek) — you may **withdraw consent at any time**. This does not affect the lawfulness of processing BEFORE withdrawal.

### 6.8. Right not to be subject to automated decision (GDPR Art. 22)

As noted in §3.3, we **do not use** automated decisions with legal consequences.

### 6.9. CCPA-specific rights (California residents)

In addition to GDPR equivalent rights, California residents have:
- **Right to know** what categories of personal information are collected and for what purposes (CCPA §1798.110)
- **Right to delete** personal information (CCPA §1798.105)
- **Right to correct** inaccurate personal information (CPRA §1798.106)
- **Right to opt-out of sale/sharing** for cross-context behavioral advertising (CCPA §1798.120) — we do not sell or share, so this right is automatically respected
- **Right to limit use of Sensitive Personal Information** (CPRA §1798.121) — request to `privacy@groznov.net`
- **Right to non-discrimination** for exercising CCPA rights

### 6.10. UK GDPR-specific (UK residents)

UK GDPR rights mirror EU GDPR. For complaints — the **Information Commissioner's Office (ICO)**: `https://ico.org.uk/`.

### 6.11. Right to complaint to a supervisory authority

If you believe we are violating your data protection rights, you may file a complaint with:

- **Ukraine:** Ukrainian Parliament Commissioner for Human Rights — `https://ombudsman.gov.ua/`
- **EU:** to your country's national data protection authority (full list — `https://edpb.europa.eu/about-edpb/about-edpb/members_en`)
- **United Kingdom:** Information Commissioner's Office (ICO) — `https://ico.org.uk/`
- **USA (California):** California Privacy Protection Agency — `https://cppa.ca.gov/`

Before filing a complaint, please **contact us first** at `privacy@groznov.net` — most issues are resolved faster through direct dialogue.

---

## 7. CHILDREN AND MINORS

7.1. The Platform is intended **exclusively for persons aged 18 years or older**.

7.2. **Use by persons under 18 is prohibited** (see §7 of Terms of Service).

7.3. If we **discover** that data of a minor has been provided through the platform:
- The account is **immediately blocked**
- Data is **completely deleted** within 7 days (in accordance with GDPR Art. 17 + UK ICO Age Appropriate Design Code + US COPPA for children under 13)
- No data transferred to third parties is **retained longer** than necessary for technical transfer

7.4. **Parents/guardians** who discover that a child has registered on the Platform — should contact `privacy@groznov.net` for immediate deletion.

7.5. We **do not use** targeted marketing methods aimed at minors.

---

## 8. COOKIES AND SIMILAR TECHNOLOGIES

### 8.1. Which cookies we use

The Platform uses **only technically necessary cookies**:

| Cookie | Purpose | Duration |
|---|---|---|
| `CF_Authorization` | Cloudflare Access JWT for authentication | Until session end or 24 hours |
| `session_id` | User session in backend | Until logout |
| `lang` | Selected interface language | 1 year |
| `theme` | Light/dark theme | 1 year |

### 8.2. What we do NOT use

- ❌ Tracking cookies (no Google Analytics, no Meta Pixel, no Hotjar)
- ❌ Advertising cookies
- ❌ Cross-site cookies for social networks
- ❌ Browser fingerprinting

### 8.3. Cookie banner

Since we use **only technically necessary cookies**, a separate cookie consent banner under GDPR is not required (ePrivacy Directive Article 30: only strictly necessary cookies do not require consent).

However, at the first visit we **display** an informational message about cookie use — for full transparency.

### 8.4. How to disable cookies

You may disable cookies in your browser settings. **However**, without authentication cookies the Platform will not work — you will not be able to log in.

---

## 9. DATA SECURITY

### 9.1. Technical measures

- **HTTPS/TLS 1.3** for all traffic
- **Cloudflare WAF** (Web Application Firewall) for attack protection
- **Rate limiting** to prevent brute-force and DDoS
- **Encryption at rest** for special category data (Fernet AES-128, per-user keys)
- **Regular updates** of dependencies and platforms
- **Backups** with encryption

### 9.2. Organizational measures

- Access to production data is **limited to** Individual Entrepreneur Y.V. Kolmykova and the Platform Creator
- Access via **two-factor authentication**
- VPN signature for administrative access
- Principle of **least privilege**

### 9.3. What you can do for security

- Do not share your email/password with third parties
- Do not use the same password for the Platform and other services
- If you suspect account compromise — immediately notify `support@groznov.net`

---

## 10. DATA INCIDENTS (DATA BREACH)

### 10.1. What we do in case of an incident

If a data security incident occurs (unauthorized access, leak, loss):

1. **Investigation** — within the first 24 hours
2. **Notification of competent authority** (Ukrainian Commissioner for UA, national DPA for EU, ICO for UK) — **within 72 hours** of detection (GDPR Art. 33)
3. **Notification of User** — in case of **high risk** to rights and freedoms (e.g., password leak, financial data) — **without undue delay** (GDPR Art. 34)
4. **Mitigation** — urgent actions to reduce harm (forced password reset, blocking attacker's access, etc.)
5. **Post-incident review** — analysis of causes and implementation of preventive measures

### 10.2. How we will notify you

If an incident affects your data — we will send a notification to your email address registered on the Platform. Information will also be published on `https://adam.groznov.uk/security-notices`.

---

## 11. MARKETING AND COMMUNICATIONS

### 11.1. What we do NOT do

- ❌ **Do not send** marketing emails without your explicit consent
- ❌ **Do not transfer** your email address to marketing companies
- ❌ **Do not use** you in advertising without written permission

### 11.2. What we do

- ✅ Send **transactional emails** (registration confirmations, payment, important service notifications) — on the legal basis of performance of contract
- ✅ Send **notifications about critical changes** to Terms of Service / Privacy Policy — 14 days before they take effect
- ✅ If you have **explicitly subscribed** to news (optional newsletter in Settings) — we will send updates; you can unsubscribe at any time using the link in the email

---

## 12. UNILATERAL MODIFICATION BY THE PROVIDER

### 12.1. Provider's right to unilateral modification of Privacy Policy

The Provider reserves the **exclusive right to unilaterally**:

a) Make changes to this Privacy Policy
b) Supplement it with new provisions
c) Delete or modify individual clauses
d) Update the document edition as a whole

without obtaining prior consent of the User for specific changes.

This right is necessary for:
- Adaptation to changes in legislation (GDPR updates, UK ICO guidance, CCPA amendments, UA Law 2297 amendments)
- Alignment with data processors' requirements
- Response to changes in processor list (e.g., adding a new LLM provider)
- Correction of errors and inaccuracies

### 12.2. Notification procedure

#### 12.2.1. Material changes

Material changes include:
- Change in categories of personal data processed
- Change in processing purposes
- Change in the list of data processors (third parties)
- Change in data retention periods
- Change in legal basis of processing
- Change in transfer jurisdiction

**Notification:**
- **Email** — **14 days** before entry into force
- **Banner at the top of the interface** at the next User login
- **Publication of new edition** at `https://adam.groznov.uk/privacy-en` with version number

#### 12.2.2. Non-material changes

Non-material changes include:
- Typo corrections
- Wording clarifications without changing the essence
- Contact updates
- Technical corrections

**Notification:** publication of new edition without prior email.

### 12.3. User's right in response to changes

a) User has the right to **stop using the Platform** before the new edition takes effect — by deleting the account
b) **Unused portion of prepayment is refunded** pro-rata (§8.4 of Terms of Service)
c) **Continued use** after the new edition enters into force **constitutes consent** to the new terms

### 12.4. Versioning

a) Each edition has:
   - A unique version number
   - Publication date
   - Effective date
   - SHA-256 hash of the full text

b) **Archive of previous editions** — available upon request at `privacy@groznov.net`

c) **Optionally** the hash of each edition may be anchored in the Bitcoin blockchain via OpenTimestamps

### 12.5. Imperative norms take priority

No provision of §12 may limit imperative norms:
- GDPR Regulation 2016/679
- UK GDPR + ICO guidance
- Ukrainian Law on Personal Data Protection (No. 2297-VI)
- California Consumer Privacy Act (CCPA / CPRA)
- Other imperative norms of User's jurisdiction

In case of conflict — the imperative norm takes priority.

---

## 13. CONTACTS AND QUESTIONS

For any questions about privacy, exercising rights, complaints:

- **Email:** `privacy@groznov.net`
- **Response time:** up to 30 days for official requests, up to 5 business days for general questions
- **Address:** provided upon request at the email above

### Request to exercise rights

To speed up processing, please include in your request:
1. Your email registered on the Platform
2. Which right exactly you are exercising (access / erasure / portability, etc.)
3. Specific data of interest (optional)

For identity verification, we may ask to confirm email via CF Access PIN.

---

## 14. VERSION AND DATE

- **Current edition:** v1.0
- **Publication date:** 2026-06-09
- **Effective date:** 2026-06-09
- **Previous edition:** none (this is the first official publication)
- **SHA-256 hash:** calculated and published with each new version

---

*For all privacy-related questions — `privacy@groznov.net`.*
