# Changelog

All notable changes to **PrivacyShield AI** are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [1.3.0] — 2026-11-18

### Added
- **Dynamic NLP Language Model Manager** in Settings modal.
  - Supports 5 languages: English, French, German, Spanish, Italian.
  - 1-click download triggers `python -m spacy download` locally with live spinner.
  - Engine reloads automatically after install — no app restart needed.
- **Per-document NLP language selector** that dynamically lists only installed models with flag emojis.

---

## [1.2.0] — 2026-11-17

### Added
- **Settings Modal** with dedicated configuration panel.
- **Financial & Legal entity detection**:
  - French SIREN / SIRET (9 & 14 digits).
  - IBAN bank numbers.
  - French Social Security numbers (NIR, 13+2 digits).
  - Credit Card numbers (Visa, Mastercard, Amex).
  - European VAT / TVA numbers.
- **Full GUI internationalization (i18n)**:
  - Complete FR & EN translations for all labels, buttons, and status messages.
  - Instant live language switch from header or Settings without app restart.
- Entity category toggles: Identity, Organization, Address, Contact, Finance & Legal.

---

## [1.1.0] — 2026-11-17

### Added
- **Text selection floating context menu**: Select any word in input → instant entity creation (Person / Company / Address / Custom) without manual typing.
- **Inline entity boundary editing**: Edit the original text of any detected entity directly in the mapping table (shrink, expand, correct NER over-capture).
- **Smart honorific prefix trimmer**: Auto-detects and removes titles (Monsieur, Madame, Mr., Dr., etc.) with one click.
- **Highlight Sync**: Hovering over an entity card highlights its exact position in the input textarea with animated cyan pulse and synchronized scroll.

---

## [1.0.0] — 2026-11-17

### Added
- Electron + React 19 + Tailwind CSS desktop application.
- 100% offline Python NLP sidecar engine (Microsoft Presidio + spaCy).
- Entity detection: Person names, Organizations, Physical addresses, Emails, Phone numbers.
- Bi-directional anonymization and reversible restoration workflow.
- Active Mapping Vault side-panel with checkbox toggles and manual entity addition.
- One-click clipboard copy for anonymized output and restored AI response.
- Session management (New Session button to flush active mappings).
- FR/EN NLP language selector in header.
- Local FastAPI server on `127.0.0.1:8765` with health check endpoint.
- `start_app.bat` Windows launcher.
