# AI Hub

One place to chat with several AI models, compare their answers, and let one model write code while another reviews it and real tests check it.

**Live demo:** https://beeper-for-ai.vercel.app

> The backend runs on a free hosting plan that sleeps when idle. The first request after a quiet period can take up to a minute while it wakes up.

## What it does

### Unified Chat
- Chat with Gemini, Groq or OpenRouter from one interface.
- Pick a different model for every message. The conversation history is shared across models.
- Conversations are saved per user and listed in a sidebar.

### Compare Models
- Send one prompt to every connected model at once.
- Answers appear side by side with the response time of each model.
- If one model fails, the others still return their answers.

### Code Generator and Reviewer
A bounded, rule-driven loop for a single task: turn a specification into code and check it.

1. A **Planner step** reads the request and decides whether it can be tested (a pure function with clear inputs and outputs) and what the function signature should be.
2. A **Test Writer** writes tests from the specification only. It never sees the implementation.
3. A **Generator** model writes the code.
4. The code and tests run inside an isolated **E2B sandbox** (10 second limit, a fresh sandbox every round).
5. A **Reviewer** model, which can be a different provider from the generator, reviews the code against a fixed checklist (spec match, edge cases, security, readability) and replies in JSON.
6. If blocking issues remain, the generator fixes only those issues, and the loop repeats.

The rules live in code, not in prompts:

| Rule | Outcome |
|---|---|
| No high or medium issues remain and the tests pass | `approved` |
| The same blocking issues repeat in two rounds in a row | `stuck` |
| Blocking issues remain after 3 rounds | `unresolved`, with a warning |

Failed tests are turned into real issues, so a model cannot approve code that does not pass. If the sandbox is unavailable or a request cannot be tested, the run falls back to a reviewer-only result and says so clearly in the interface.

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React (Vite), React Router, Tailwind CSS, Axios, react-markdown |
| Backend | Node.js, Express |
| Database | MongoDB with Mongoose |
| Auth | JWT in an httpOnly cookie, bcrypt password hashing |
| AI providers | Gemini, Groq, OpenRouter (official APIs only) |
| Code execution | E2B sandbox |
| Hosting | Vercel (frontend), Render (backend), MongoDB Atlas (database) |

## Architecture

```
Browser (React)
   |  cookie-based session
   v
Express API
   |-- /api/auth                 register, login, logout, session check
   |-- /api/conversations        chat history and messages
   |-- /api/compare              one prompt, every model
   |-- /api/code-review-loop     generator, tests, sandbox, reviewer
   |
   |-- providers/                one adapter per model provider
   |-- services/                 the loop, test writer, sandbox
   v
MongoDB Atlas          AI provider APIs          E2B sandbox
```

Design choices worth knowing:

- **Adapter pattern for providers.** Every provider exposes the same function shape, so adding a model means adding one file and one registry entry. Calls retry with exponential backoff and jitter on temporary errors (rate limits and overloaded servers), but not on errors like an invalid key.
- **Agents do not talk to each other directly.** The server runs the loop and passes one agent's output to the next, which keeps the stopping rules enforceable.
- **Official APIs only.** The project does not scrape chat websites or use unofficial access to messaging apps.
- **Secrets stay on the server.** API keys are never sent to the browser or into the sandbox. CORS only allows the configured frontend origins.

## Run it locally

### Requirements
- Node.js (v20 or newer recommended)
- A MongoDB connection string (MongoDB Atlas free tier works)
- API keys for the providers you want to use

### Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=a_long_random_string
NODE_ENV=development
CLIENT_URL=http://localhost:5173

GEMINI_API_KEY=
GEMINI_MODEL=
GROQ_API_KEY=
GROQ_MODEL=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=

GENERATOR_PROVIDER=gemini
REVIEWER_PROVIDER=groq
TEST_WRITER_PROVIDER=groq

E2B_API_KEY=
```

Then start the server:

```bash
npm start
```

`CLIENT_URL` accepts several origins separated by commas. `E2B_API_KEY` is optional: without it the code reviewer still works, but without tests.

### Frontend

```bash
cd client
npm install
npm run dev
```

The app opens at `http://localhost:5173`. In development it talks to `http://localhost:5000`. For a deployed build, set `VITE_API_URL` to your backend URL.

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Log in with email or username |
| POST | `/api/auth/logout` | Log out |
| GET | `/api/auth/me` | Current user |
| POST | `/api/conversations` | Create a chat |
| GET | `/api/conversations` | List my chats |
| GET | `/api/conversations/:id` | Messages of one chat |
| POST | `/api/conversations/:id/messages` | Send a message and get a reply |
| POST | `/api/compare` | Ask every model one prompt |
| POST | `/api/code-review-loop` | Run the generator, tests and reviewer loop |
| GET | `/api/code-review-loop` | List my saved runs |
| GET | `/api/code-review-loop/:id` | One saved run with all rounds |

All endpoints except register and login require a logged-in session, and every user only sees their own data.

## Limitations

- **The reviewer is also an LLM.** An approved result means the reviewer found no blocking issues and the generated tests passed. It is not a proof that the code is correct, and the tests are also written by a model.
- **Tests run for JavaScript only**, and only for pure functions that can be checked with inputs and outputs. Requests such as user interfaces or servers are reviewed without tests, and the interface says so.
- **Free tiers.** Model providers, the sandbox and the hosting all have usage limits, so heavy use can hit rate limits.
- Saved code review runs are stored and available through the API. A history page for them in the interface is planned.

## Roadmap

- Streaming responses from the server
- Bring your own API key, stored encrypted
- Review-only mode for code a user already has
- Import chat history from official export files
- Tests for more languages, starting with Python
- Agent definitions as configuration, so new agents can be added without changing the loop
- Per-user usage limits
