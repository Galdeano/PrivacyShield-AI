# PrivacyShield AI

<div align="center">
  <img src="frontend/src/assets/hero.png" alt="PrivacyShield AI Banner" width="700" style="border-radius: 12px; margin-bottom: 20px;" />
  <p><strong>100% Local, Reversible Text Anonymizer for ChatGPT, Claude, and External AI</strong></p>
  <p>
    <a href="https://galdeano.github.io/PrivacyShield-AI/fr/">🇫🇷 Français</a> •
    <a href="https://galdeano.github.io/PrivacyShield-AI/en/">🇬🇧 English</a> •
    <a href="https://galdeano.github.io/PrivacyShield-AI/de/">🇩🇪 Deutsch</a> •
    <a href="https://galdeano.github.io/PrivacyShield-AI/es/">🇪🇸 Español</a> •
    <a href="https://galdeano.github.io/PrivacyShield-AI/it/">🇮🇹 Italiano</a>
  </p>
  <p>
    <a href="https://github.com/Galdeano/PrivacyShield-AI/releases/latest"><img src="https://img.shields.io/badge/Download-Windows%20.exe-0284c7?style=for-the-badge&logo=windows" alt="Download Windows" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-BSL%201.1-amber?style=for-the-badge" alt="License BSL 1.1" /></a>
    <img src="https://img.shields.io/badge/Zero%20Telemetry-100%25%20Offline-emerald?style=for-the-badge" alt="Privacy" />
  </p>
</div>

---

## 🔒 Why PrivacyShield AI?

When using external cloud LLMs (ChatGPT, Claude, Gemini, DeepSeek), pasting confidential drafts, emails, or business contracts risks exposing sensitive personal and corporate data.

**PrivacyShield AI** runs entirely on your local machine. It automatically detects sensitive entities, replaces them with realistic placeholders, and restores them accurately once the AI gives its answer.

```
[Your Confidential Email] 
          │
          ▼  (100% Local NLP Presidio + spaCy)
[Anonymized Text with [PERSON_1], [COMPANY_1], [SIRET_1]]
          │
          ▼  (Copy to ChatGPT / Claude)
[AI Generates High-Quality Answer using placeholders]
          │
          ▼  (Paste back into PrivacyShield AI)
[De-anonymized Text with Original Names & Values Restored]
```

---

## ✨ Features

- **100% Local & Offline**: Powered by local `spaCy` NLP models and Microsoft `Presidio`. Zero telemetry, zero cloud data transfer.
- **Bi-directional Reversibility**: Replaces and restores names, companies, addresses, emails, phone numbers, and financial data without collisions.
- **Finance & Legal Detection**: Native support for:
  - French SIREN / SIRET (9 & 14 digits)
  - French Social Security numbers (NIR, 13+2 digits)
  - European IBANs and payment card numbers
  - European VAT / TVA numbers
- **Precision Word Editing**:
  - Floating selection context menu: select any word to define a custom entity on the fly.
  - Inline boundary editing to fix or shrink captured terms directly in the review table.
  - Smart honorific prefix trimmer (*Monsieur, Madame, Mr., Dr., etc.*).
  - Synchronized hover highlighting between the review table and original text.
- **Multilingual Support**:
  - Full GUI translated in French and English.
  - Dynamic NLP model downloader supporting English, French, German, Spanish, and Italian.

---

## 🚀 Installation & Downloads

Download the latest standalone Windows installer from the [Releases Page](https://github.com/Galdeano/PrivacyShield-AI/releases/latest):

- **Installer (`.exe`)**: `PrivacyShield AI Setup 1.5.0.exe` (~184 MB)  
  *Completely self-contained: includes the embedded Python environment and NLP models. No Python or Node installation required.*

---

## 🛠️ Development

For development setup instructions, see [CONTRIBUTING.md](CONTRIBUTING.md).

```bash
# Clone
git clone https://github.com/Galdeano/PrivacyShield-AI.git
cd PrivacyShield-AI

# Run development mode
.\start_app.bat
```

---

## 📜 License & Commercial Use

PrivacyShield AI is licensed under the **Business Source License 1.1 (BSL 1.1)**:
- **Free for Personal and Non-Commercial Use**.
- **Commercial Production Use** by businesses, companies, or teams requires a commercial license. Contact: `galdeano.david@gmail.com`.
- Automatically transitions to the standard open-source **MIT License** on **January 1, 2030**.
