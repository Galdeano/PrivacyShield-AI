# PrivacyShield AI — Reversible Text Anonymizer for External AI

A 100% local, privacy-focused desktop application designed to anonymize sensitive text, emails, and prompts before sending them to external AI tools (ChatGPT, Claude, Gemini, etc.), and cleanly restore the original values upon receiving the AI's response.

---

## 🚀 Features

- **100% Offline & Local Processing**: Powered by local `spaCy` NLP models and Microsoft `Presidio` analyzer. Zero data ever leaves your computer.
- **Bi-directional Reversibility**: Replaces names, companies, physical addresses, emails, and phone numbers with clean placeholders (e.g. `[PERSON_1]`, `[COMPANY_1]`), and accurately restores the exact original values when the AI response is pasted back.
- **Interactive Review Table**: Inspect detected entities, toggle exclusions, edit placeholder tokens, or add custom keywords manually before copying.
- **Session Continuity**: Preserves placeholder mappings across multi-turn AI interactions until you hit **New Session**.
- **One-Click Clipboard Workflow**: Easily copy anonymized text to clipboard and copy restored answers back into your work.

---

## 🛠️ Tech Stack

- **Desktop GUI**: Electron + React 19 + Tailwind CSS + Lucide Icons.
- **Local NLP Engine**: Python 3.14 + FastAPI + Presidio Analyzer + spaCy (`en_core_web_sm`, `fr_core_news_sm`).

---

## 🏃 How to Run

### Quick Start (Windows)
Double-click:
```bat
start_app.bat
```
This starts the local Python NLP engine on `127.0.0.1:8765` and opens the Electron desktop window.

### Development Mode
If you want to edit and hot-reload:
1. Start the Python engine:
   ```powershell
   .\venv\Scripts\python engine\server.py
   ```
2. Start the frontend:
   ```powershell
   cd frontend
   npm run dev
   ```

---

## 📋 Typical Usage Workflow

1. **Step 1 (Outbound)**: Paste an email or confidential draft into the app.
2. **Step 2 (Auto-Detect & Review)**: Click **Auto-Detect Sensitive Entities**. Review the table on the right (modify tokens or uncheck any item if desired).
3. **Step 3 (Anonymize & Copy)**: Click **Anonymize Text Now**, then **Copy Anonymized Text**.
4. **Step 4 (External AI)**: Paste the text into ChatGPT/Claude and get your answer.
5. **Step 5 (Inbound Restore)**: Switch to the **2. Restore AI Response** tab in the app, paste the AI response, and click **Restore Real Values**. Copy the final de-anonymized response.
