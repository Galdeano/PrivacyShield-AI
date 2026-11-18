# Contributing to PrivacyShield AI

Thank you for your interest in contributing to **PrivacyShield AI**!

## License Notice
PrivacyShield AI is licensed under the **Business Source License 1.1 (BSL 1.1)**.
- Free for personal and non-commercial use.
- Commercial production use by companies or teams requires a commercial license.
- The software will automatically transition to the **MIT License** on **January 1, 2030**.

By submitting a Pull Request, you agree that your contributions will be licensed under the same terms.

---

## Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Galdeano/PrivacyShield-AI.git
   cd PrivacyShield-AI
   ```

2. **Setup Python environment:**
   ```bash
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   pip install -r engine/requirements.txt  # or install presidio-analyzer, spacy, fastapi, uvicorn
   python -m spacy download fr_core_news_sm
   python -m spacy download en_core_web_sm
   ```

3. **Setup Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Run Application:**
   ```bat
   .\start_app.bat
   ```

---

## Coding Standards
- Modern React with hooks, Tailwind CSS, Lucide icons.
- All entity detection must execute **strictly 100% offline and locally**. Zero telemetry, zero external network requests for text analysis.
- Pull requests should target the `dev` branch.
