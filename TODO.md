# PrivacyShield AI — Feature Roadmap & TODO List

## 🎯 High-Priority UI & NLP Enhancements

- [ ] **1. Context Menu Custom Entity Creation (Selection → Right-Click)**
  - Add text selection detection inside the input textarea.
  - Implement custom context menu / floating action tooltip on text selection:
    - *"Create Custom Entity from Selection"*
    - Pre-fills the selected text and opens a quick modal/popover to pick type (PERSON, COMPANY, ADDRESS, CUSTOM, etc.).
    - Adds directly to the Active Mapping Vault.

- [ ] **2. Fine-Grained Entity Boundary Editing & Modification**
  - Ability to adjust or shrink an entity's text directly in the review table or via click (e.g. if the NER engine captures 3 words like *"Monsieur Jean Dupont"* but only *"Jean Dupont"* should be anonymized, or if it groups words incorrectly).
  - Add inline editable text input for the original entity text, with real-time validation and range recalculation.
  - Add split/merge entity actions in the table.

- [ ] **3. Comprehensive Settings Modal / Drawer**
  - **NLP Language Management**:
    - Manage supported languages (English, French, German, Spanish, Italian, etc.).
    - 1-click model download / trigger from UI (e.g., `de_core_news_sm`, `es_core_news_sm`).
    - Default detection language selector.
  - **Category Toggles & Extended Presets**:
    - Checkbox list of active recognition categories:
      - 👤 **Identity**: Person Names.
      - 🏢 **Organizations**: Companies, Agencies.
      - 📍 **Geography**: Physical Street Addresses, Cities, Zip Codes.
      - 📞 **Contact**: Emails, Phone Numbers.
      - 💳 **Finance & Legal (New)**:
        - IBAN & Credit Cards.
        - French SIREN / SIRET numbers (9 & 14 digits with Luhn verification).
        - French Social Security numbers (NIR / Numéro de Sécurité Sociale).
        - Invoice numbers, tax IDs (VAT / TVA).
      - 🔒 **Credentials & Keys**: API keys, JWT tokens, IP addresses.

- [ ] **4. GUI Multi-Language Support (i18n)**
  - Integrate lightweight i18n system (`react-i18next` or context-based dictionary).
  - Provide full UI translations for:
    - French (Français)
    - English
    - (Extensible to Spanish, German, etc.)
  - Instant live switching from header / settings without reload.

---

## 📦 Packaging & Distribution

- [ ] **5. Windows Standalone Executable (.exe) Bundling**
  - Package Python sidecar into a standalone binary using PyInstaller / PyOxidizer (embedding the spaCy models and dependencies so end-users don't need Python installed).
  - Configure `electron-builder` with NSIS installer and portable `.exe` targets:
    - Custom app icon (.ico).
    - Single-installer setup (`PrivacyShield-Setup-1.0.0.exe`).
    - Production asset paths & auto-spawn of packaged backend.

---

## 🌐 Open Source & Promotion

- [ ] **6. GitHub Repository Setup**
  - Initialize clean Git repository with proper `.gitignore` (excluding `venv/`, `node_modules/`, `dist/`).
  - Add standard community health files:
    - `LICENSE` (e.g., MIT or Apache 2.0).
    - `CONTRIBUTING.md`.
    - Comprehensive `README.md` with GIFs/screenshots, architecture diagrams, and quickstart commands.
  - Setup GitHub Actions CI workflow to build and test the Electron bundle.

- [ ] **7. GitHub Promotional Page (GitHub Pages / Showcase)**
  - Create a modern, responsive landing page hosted on GitHub Pages:
    - Hero banner: *"100% Local, Reversible Text Anonymizer for ChatGPT, Claude & External AI"*.
    - Visual interactive comparison slider / demo showing before → anonymized → restored text.
    - Security & Privacy highlights (zero telemetry, zero cloud data transfer, GDPR compliant).
    - Direct download buttons for Windows `.exe` releases.
    - Feature matrix and FAQ.
