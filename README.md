# Mckenney Notebook

[![Forks](https://img.shields.io/github/forks/Planet9V/notebook_ts.svg?style=for-the-badge)](https://github.com/Planet9V/notebook_ts/network/members)
[![Stargazers](https://img.shields.io/github/stars/Planet9V/notebook_ts.svg?style=for-the-badge)](https://github.com/Planet9V/notebook_ts/stargazers)
[![Issues](https://img.shields.io/github/issues/Planet9V/notebook_ts.svg?style=for-the-badge)](https://github.com/Planet9V/notebook_ts/issues)
[![License](https://img.shields.io/github/license/Planet9V/notebook_ts.svg?style=for-the-badge)](https://github.com/Planet9V/notebook_ts/blob/main/LICENSE)

Mckenney Notebook is a private, self-hosted operational command center. It combines notes, a Sales CRM, dynamic research pipelines, and automated multi-channel publishing into a single, unified workspace.

---

## 🆚 Why Mckenney Notebook?

Google NotebookLM is great for reading notes, but falls short when you need to act on them. Mckenney Notebook bridges the gap between research and business operations:

| Capability | Mckenney Notebook | Google NotebookLM |
|:---|:---|:---|
| **Privacy & Sovereignty** | 100% Self-hosted. Your data, your keys, your database. | Google Cloud hosting. Data subject to cloud terms. |
| **Sales CRM Integration** | Dynamic Deal pipelines, monthly calendars, and neon-glow bento dossier views. | None. Static document organization only. |
| **Automated Publications** | Built-in schedulers for email (SMTP), LinkedIn, and Twitter/X campaigns. | None. No publishing capability. |
| **Deep Research Schedulers**| Cron-based queries pulling from Perplexity, Tavily, and Valyu. | Interactive prompt responses only. |
| **Advanced Podcast Engine** | 1-4 speakers with customizable profiles and voice mapping (Kokoro, OpenAI). | 2 speakers only, no customization. |
| **API Automation** | Full REST API to integrate with external workflows and applications. | Closed ecosystem, no API access. |

---

## ✨ Core Pillars

### 1. Unified Operations Center (`/pipeline`)
Manage your business workflows across four workspaces from a single workspace dropdown:
* **Sales CRM**: Track client acquisition with active Kanban boards and close-date calendars.
* **Research Hub**: Run and track deep research workflows (Queued $\rightarrow$ Researching $\rightarrow$ Review & Enhance).
* **Project Delivery**: Monitor ongoing project execution phases in real-time.
* **Publication Queue**: Draft, queue, and schedule social media or newsletter updates.

### 2. Bento-Grid Customer Dossier (`/customers/[id]/bento`)
View customer health in a cyberpunk-inspired dark ledger dashboard:
* **Interactive Grid Editor**: Drag-and-drop cards to customize your dashboard layout.
* **Neon Status Borders**: Cyan, orange, and emerald glowing borders dynamically highlight compliance scores and active threat counts.
* **Filter Console**: Search and filter cards instantly with fuzzy matching, dimming non-matching content to focus on key data.

### 3. Publications & Campaign Scheduling (`/publications`)
Automate your marketing pipeline from within your notebooks:
* **Background Worker**: Finds and publishes queued posts dynamically.
* **Social & Email Channels**: Push to SMTP email, Twitter/X, and LinkedIn.
* **Browser Automation**: Use the Playwright browser automation module to publish without expensive developer REST APIs.

### 4. Audio & Podcast Generation
Generate multi-speaker audio summaries of notebooks:
* **Voice Overrides**: Map specific speakers to TTS engines (Kokoro, OpenAI TTS, Deepgram).
* **Profile Duplication**: Easily copy and edit speaking styles and profiles.

---

## 🚀 Quick Start (2 Minutes)

### Step 1: Clone the Repository
```bash
git clone https://github.com/Planet9V/notebook_ts.git
cd notebook_ts
```

### Step 2: Configure Environment Variables
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```
Ensure you set your `OPEN_NOTEBOOK_ENCRYPTION_KEY` to a secure random string (this encrypts credentials stored in your database).

### Step 3: Run the Services
Start the entire stack using Docker Compose:
```bash
docker compose up -d
```

### Step 4: Access the UI
Open your browser and navigate to:
* **Web UI**: [http://localhost:8502](http://localhost:8502)
* **REST API Docs**: [http://localhost:5055/docs](http://localhost:5055/docs)

---

## 🤝 Contributing & Licensing

Mckenney Notebook is open-source and released under the [MIT License](LICENSE). We welcome community pull requests and feature extensions!
