# Viskora

> **Adaptive AI Tutor that Diagnoses Misconceptions in Engineering Mathematics**

Viskora is an intelligent pair-tutoring environment designed to analyze student working line-by-line, diagnose conceptual misconceptions (versus one-off calculation slips), check prerequisite mastery through vertical interactive checklists, and provide targeted, scannable guidance using a contextual AI assistant.

---

## 🚀 Getting Started

Follow these steps to set up and run Viskora locally on your machine.

### Prerequisites

Ensure you have the following installed on your system:

- [Node.js](https://nodejs.org/) (`v24.x`; Vercel and local builds use the same Node.js major version)
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

## Graph visualization

The analysis page includes an interactive graph below the prerequisite concept explorer and alternative-method sections. It uses the current problem's expression and refreshes when another attempt is selected. Supported explicit functions are plotted with their equation, axes, and a movable point that shows the function value and tangent slope. Definite-integral visualizations shade the selected interval; supported implicit quadratic relations can display both branches.

Expressions that cannot be safely parsed are not replaced with a sample graph. Rational functions preserve recognized denominator exclusions (for example, `x^3/(3*x+5)` is not plotted at `x = -5/3`). If an image transcription is uncertain, confirm or correct it before analysis; the app withholds a graph until the expression is usable. The expression evaluator accepts arithmetic, powers, `x`, parentheses, and `sin`, `cos`, `tan`, `exp`, `log`, and `sqrt` functions.

## Analysis service configuration

Typed submissions use the local analysis API. The app checks supported work locally and can use Gemini for broader line-by-line review and image transcription. To enable Gemini, set `GEMINI_API_KEY` in the project-root `.env` file, then restart the development server. The `.env` file is private and ignored by Git; each computer needs its own key, which is not included when the project is copied or cloned. `npm run dev` starts Vite and its local analysis endpoint. `npm run api` starts the standalone API for deployments where it runs separately from Vite; route `/api` to that process.

## Teacher and student profiles

Viskora now supports teacher and student profiles. Create an account from the sign-in screen, then teachers can create classes and share the generated six-character join code. Students enter that code in their sidebar to connect their profile to the teacher. Students can see their own tutor and progress reports; teachers can view class-level summaries and each joined student's submissions, analysis notes, and mastery overview.

In local development, accounts, sessions, class memberships, and reports are stored in `data/viskora.sqlite` (ignored by Git). Set the `VISKORA_DB_PATH` process environment variable to use a different local path. In production, the app connects to Supabase Postgres and creates its tables on first use. It deliberately does not use Vercel's temporary filesystem for account data. The API hashes passwords and checks the signed-in user's role and class ownership before returning or updating report data.

## Deploy to Vercel

This repository includes a Vercel Node.js function for `/api/*`, a Vite static build configuration, and a 300-second function duration for the AI analysis route.

1. Push the repository to GitHub and import it in Vercel. The project root is this folder; the build command is `npm run build` and the output folder is `dist`.
2. In Supabase, open **Connect**, select **Transaction pooler**, copy its connection string, and set it as `DATABASE_URL` in Vercel Project Settings → Environment Variables. Use the transaction pooler for Vercel serverless functions; it uses port `6543`. Keep the connection string private and percent-encode reserved characters in the database password.
3. Add `GEMINI_API_KEY` in Vercel Project Settings → Environment Variables if you want AI review and image transcription. Set both variables for Preview and Production, then redeploy.
4. Deploy with Vercel or push to the connected Git branch. Tables are created the first time an API route is used.

Copy `.env.example` as a reference for local environment variables. Keep real keys in Vercel's encrypted environment settings or a private local `.env` file. The serverless function accepts JSON request bodies up to 4 MB. Vercel deployment and environment variable setup are described in the [Vite on Vercel guide](https://vercel.com/docs/frameworks/frontend/vite), [Supabase Postgres connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres), and [Vercel environment variables guide](https://vercel.com/docs/environment-variables).
