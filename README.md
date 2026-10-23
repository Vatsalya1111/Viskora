# Viskora

> **Adaptive AI Tutor that Diagnoses Misconceptions in Engineering Mathematics**

Viskora is an intelligent pair-tutoring environment designed to analyze student working line-by-line, diagnose conceptual misconceptions (versus one-off calculation slips), check prerequisite mastery through vertical interactive checklists, and provide targeted, scannable guidance using a contextual AI assistant.

---

## 🚀 Getting Started

Follow these steps to set up and run Viskora locally on your machine.

### Prerequisites

Ensure you have the following installed on your system:

- [Node.js](https://nodejs.org/) (`v18.0.0` or higher recommended)
- `npm` (bundled with Node.js) or `yarn` / `pnpm`

Check your Node and npm versions:
```bash
node -v
npm -v
```

---

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Vatsalya1111/Viskora.git
   cd Viskora
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

---

### Running the Application

1. **Start the local development server** (this starts the analysis endpoint too):
   ```bash
   npm run dev
   ```

2. **Open the application in your browser:**
   Once Vite starts, navigate to the local URL displayed in your terminal (typically [http://localhost:5173](http://localhost:5173)).

---

### Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Vite dev server with Hot Module Replacement (HMR). |
| `npm run api` | Starts the local analysis API on port 3001. |
| `npm test` | Runs the analysis unit tests. |
| `npm run build` | Builds the optimized production bundle in the `dist/` directory. |
| `npm run preview` | Previews the production build locally. |

---

## 🛠️ Tech Stack

- **Framework**: React 19
- **Build Tooling**: Vite 8
- **Math Rendering**: KaTeX (for LaTeX formula formatting)
- **Routing**: React Router 7
- **Styling**: Vanilla CSS Design System with custom design tokens and dark/light accents
- **State Management**: React Context + useReducer with an extensible AI mock/API layer

---

## ✨ Key Features

- **Dynamic Working Preview**: Line-by-line verification reflecting the active problem without hardcoded placeholders.
- **Scannable Misconception Diagnosis**: High-contrast breakdowns separating observed errors, recurring patterns, and correct formulations.
- **Collapsible Prerequisites Checklist**: Interactive vertical checklist enabling students to review foundational topics and track their mastery.
- **Context-Aware Chatbot with Fallback Engine**: Socratic AI assistant providing hints, rule statements, and examples scoped to individual solution steps.
- **Adaptive Understanding Check**: 3-question sequence to confirm mastery or distinguish deep misconceptions from one-off slips.

### Analysis service configuration

Typed submissions use the local API. The verifier currently supports the product rule for `x^2 sin(x)` and linear-over-linear quotient derivatives; other expressions are reported as uncertain. Handwritten transcription uses Gemini 3.5 Flash-Lite when `GEMINI_API_KEY` is configured. Paste your key into the `GEMINI_API_KEY=` line in the project-root `.env` file, then restart `npm run dev`. The `.env` file is private and ignored by Git. Each laptop needs its own key; keys are not included when the project is copied or cloned. `npm run api` starts the standalone API for deployments where it runs separately from Vite; route `/api` to that process.
