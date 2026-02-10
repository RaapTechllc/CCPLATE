import Link from "next/link";

// Disable static generation for this page
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const builders = [
  {
    name: "Hook Builder",
    description: "Generate React hooks from natural language descriptions",
    icon: "🪝",
    gradient: "from-blue-500/10 to-cyan-500/10",
    border: "hover:border-blue-500/40",
  },
  {
    name: "Prompt Builder",
    description: "Design, test, and version AI prompts with live preview",
    icon: "💬",
    gradient: "from-violet-500/10 to-purple-500/10",
    border: "hover:border-violet-500/40",
  },
  {
    name: "Agent Builder",
    description: "Create AI agents with custom tools and capabilities",
    icon: "🤖",
    gradient: "from-emerald-500/10 to-teal-500/10",
    border: "hover:border-emerald-500/40",
  },
  {
    name: "Schema Builder",
    description: "Generate database models from plain English descriptions",
    icon: "🗄️",
    gradient: "from-amber-500/10 to-orange-500/10",
    border: "hover:border-amber-500/40",
  },
  {
    name: "API Builder",
    description: "Scaffold complete CRUD endpoints from your data models",
    icon: "🔌",
    gradient: "from-rose-500/10 to-pink-500/10",
    border: "hover:border-rose-500/40",
  },
  {
    name: "Component Builder",
    description: "Generate polished React components from descriptions",
    icon: "🧩",
    gradient: "from-sky-500/10 to-indigo-500/10",
    border: "hover:border-sky-500/40",
  },
];

const features = [
  { icon: "🔐", label: "Authentication", detail: "Email/password + OAuth" },
  { icon: "👤", label: "User Management", detail: "Profiles & RBAC" },
  { icon: "🛡️", label: "Admin Panel", detail: "Full dashboard" },
  { icon: "📁", label: "File Storage", detail: "Upload & serve" },
  { icon: "🎨", label: "UI Components", detail: "Production-ready" },
  { icon: "⚡", label: "Guardian System", detail: "AI workflow supervisor" },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32 lg:py-40">
          <div className="text-center">
            {/* Badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-4 py-1.5 text-sm text-zinc-600 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Open Source · AI-Powered Developer Tooling
            </div>

            {/* Heading */}
            <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight text-zinc-900 sm:text-6xl lg:text-7xl dark:text-zinc-50">
              Ship faster with{" "}
              <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-violet-400">
                AI-powered
              </span>{" "}
              building blocks
            </h1>

            {/* Subheading */}
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              Get 50% of the way on any project instantly. Then use 6 built-in AI
              builders to generate hooks, agents, prompts, schemas, APIs, and
              components — all supervised by the Guardian workflow engine.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 px-8 text-sm font-medium text-white shadow-lg shadow-zinc-900/20 transition-all hover:bg-zinc-800 hover:shadow-xl hover:shadow-zinc-900/30 dark:bg-zinc-50 dark:text-zinc-900 dark:shadow-zinc-50/10 dark:hover:bg-zinc-200"
              >
                Get Started
                <svg
                  className="ml-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-300 bg-white/80 px-8 text-sm font-medium text-zinc-700 backdrop-blur transition-all hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Built-in Features Strip */}
      <section className="border-y border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {features.map((f) => (
              <div
                key={f.label}
                className="flex flex-col items-center gap-1 text-center"
              >
                <span className="text-2xl">{f.icon}</span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {f.label}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-500">
                  {f.detail}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Builders Section */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            6 AI Builders. One Platform.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-zinc-600 dark:text-zinc-400">
            Describe what you need in plain English. Each builder generates
            production-ready code that integrates with your existing project.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {builders.map((builder) => (
            <div
              key={builder.name}
              className={`group relative rounded-2xl border border-zinc-200 bg-gradient-to-br ${builder.gradient} p-6 transition-all duration-300 ${builder.border} hover:shadow-lg dark:border-zinc-800`}
            >
              <span className="text-3xl">{builder.icon}</span>
              <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {builder.name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {builder.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Guardian Section */}
      <section className="border-t border-zinc-200 bg-zinc-950 dark:border-zinc-800">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-medium text-emerald-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Guardian System
              </div>
              <h2 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Your AI Workflow Supervisor
              </h2>
              <p className="mt-4 text-base leading-7 text-zinc-400">
                Guardian watches your development session and nudges you to
                commit, test, and stay on track. It manages parallel agent work
                through Git worktree isolation and prevents database conflicts
                with schema locking.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  "Smart nudges for commits, tests & context pressure",
                  "Git worktree isolation for parallel agents",
                  "Schema lock prevents migration conflicts",
                  "Human-in-the-loop approval gates",
                  "RLM-lite for infinite context management",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm text-zinc-300"
                  >
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Guardian Terminal Mock */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-1 shadow-2xl">
              <div className="flex items-center gap-1.5 border-b border-zinc-800 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-500/70" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
                <div className="h-3 w-3 rounded-full bg-green-500/70" />
                <span className="ml-3 text-xs text-zinc-500">
                  ccplate status
                </span>
              </div>
              <div className="space-y-2 p-4 font-mono text-xs leading-6 text-zinc-400">
                <p>
                  <span className="text-emerald-400">✓</span>{" "}
                  <span className="text-zinc-300">Session:</span> 2h 34m active
                </p>
                <p>
                  <span className="text-emerald-400">✓</span>{" "}
                  <span className="text-zinc-300">Progress:</span> Step 5/7 in
                  PRP
                </p>
                <p>
                  <span className="text-amber-400">⚡</span>{" "}
                  <span className="text-zinc-300">Context:</span> 45% capacity
                </p>
                <p>
                  <span className="text-blue-400">💡</span>{" "}
                  <span className="text-zinc-300">Nudge:</span> 12 files
                  changed, no commit in 20min
                </p>
                <p>
                  <span className="text-emerald-400">✓</span>{" "}
                  <span className="text-zinc-300">Worktrees:</span> oauth-api ·
                  oauth-ui
                </p>
                <p>
                  <span className="text-emerald-400">✓</span>{" "}
                  <span className="text-zinc-300">Schema Lock:</span> Available
                </p>
                <p className="pt-2 text-zinc-600">
                  $ <span className="text-zinc-400">_</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center sm:py-28">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
          Ready to build?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-base text-zinc-600 dark:text-zinc-400">
          Start with a production-ready foundation and let AI handle the
          boilerplate. Focus on what makes your project unique.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 px-8 text-sm font-medium text-white shadow-lg transition-all hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-zinc-500">
              © {new Date().getFullYear()} CCPLATE. AI-Powered Development
              Platform.
            </p>
            <div className="flex gap-6 text-sm text-zinc-500">
              <Link href="/login" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                Sign In
              </Link>
              <Link href="/register" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                Register
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
