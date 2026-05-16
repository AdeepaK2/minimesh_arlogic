import Image from "next/image";
import Link from "next/link";

const features = [
  {
    title: "Prompt to 3D",
    description:
      "Describe your idea in plain English. MiniMesh AI turns text into production-ready meshes in seconds.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
      />
    ),
  },
  {
    title: "Refine & iterate",
    description:
      "Regenerate variations, adjust complexity, and fine-tune style until the model matches your vision.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
      />
    ),
  },
  {
    title: "Export & embed",
    description:
      "Download GLB, OBJ, and more—or embed interactive 3D directly on any website with a simple snippet.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
      />
    ),
  },
];

const steps = [
  {
    step: "01",
    title: "Write a prompt",
    text: "Tell us what you want—a product, character, prop, or abstract shape.",
  },
  {
    step: "02",
    title: "AI builds the mesh",
    text: "Our pipeline generates topology, materials, and previews you can inspect in-browser.",
  },
  {
    step: "03",
    title: "Export or embed",
    text: "Download standard 3D files or copy an embed code for your site, store, or portfolio.",
  },
];

const useCases = [
  { title: "E-commerce", text: "Spinning product previews without a photo shoot." },
  { title: "Portfolios", text: "Showcase interactive work that stands out." },
  { title: "Games & prototypes", text: "Block out assets fast for jams and MVPs." },
  { title: "Marketing sites", text: "Hero 3D that loads fast and converts." },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Try MiniMesh with limited generations.",
    features: ["5 models / month", "GLB export", "Community support"],
    cta: "Get started",
    ctaHref: "/signup",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/ month",
    description: "For creators shipping work every week.",
    features: [
      "100 models / month",
      "All export formats",
      "Embed snippets",
      "Priority generation",
    ],
    cta: "Start Pro trial",
    ctaHref: "/signup",
    highlighted: true,
  },
  {
    name: "Team",
    price: "$49",
    period: "/ month",
    description: "Shared workspace for studios and agencies.",
    features: [
      "Unlimited seats",
      "500 models / month",
      "API access",
      "SSO & admin",
    ],
    cta: "Contact sales",
    ctaHref: "#cta",
    highlighted: false,
  },
];

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-cyan-400">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-lg text-zinc-400">{description}</p>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-16 md:pb-32 md:pt-24">
      <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-sm text-cyan-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            Text to 3D · Export anywhere
          </p>
          <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Turn prompts into{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              3D models
            </span>{" "}
            in seconds
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-zinc-400">
            MiniMesh AI helps creators and developers generate meshes from
            natural language—then export or embed them on any website.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-8 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:brightness-110"
            >
              Generate your first model
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-8 text-sm font-medium text-zinc-200 transition hover:border-white/30 hover:bg-white/5"
            >
              See how it works
            </Link>
          </div>
          <p className="mt-6 text-sm text-zinc-500">
            No credit card required · Standard 3D formats
          </p>
        </div>

        <div className="relative flex justify-center lg:justify-end">
          <div className="mesh-preview relative aspect-square w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/50 p-8 shadow-2xl shadow-cyan-500/10 backdrop-blur">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-500/10 via-transparent to-violet-500/10" />
            <svg
              viewBox="0 0 200 200"
              className="relative h-full w-full text-cyan-400/80"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.75"
            >
              <polygon points="100,20 170,60 170,140 100,180 30,140 30,60" />
              <line x1="100" y1="20" x2="100" y2="100" />
              <line x1="30" y1="60" x2="100" y2="100" />
              <line x1="170" y1="60" x2="100" y2="100" />
              <line x1="30" y1="140" x2="100" y2="100" />
              <line x1="170" y1="140" x2="100" y2="100" />
              <line x1="100" y1="20" x2="170" y2="60" />
              <line x1="170" y1="60" x2="170" y2="140" />
              <line x1="170" y1="140" x2="100" y2="180" />
              <line x1="100" y1="180" x2="30" y2="140" />
              <line x1="30" y1="140" x2="30" y2="60" />
              <line x1="30" y1="60" x2="100" y2="20" />
              <circle cx="100" cy="100" r="4" fill="currentColor" stroke="none" />
            </svg>
            <div className="absolute bottom-6 left-6 right-6 rounded-xl border border-white/10 bg-black/60 px-4 py-3 backdrop-blur">
              <p className="font-mono text-xs text-zinc-500">prompt</p>
              <p className="mt-1 text-sm text-zinc-200">
                &ldquo;Low-poly crystal fox, game-ready&rdquo;
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SocialProof() {
  const brands = ["Studio", "Arcade", "Pixel", "Nova", "Forge", "Lumen"];
  return (
    <section className="border-y border-white/5 bg-white/[0.02] px-6 py-12">
      <p className="text-center text-sm font-medium text-zinc-500">
        Trusted by creators &amp; developers
      </p>
      <div className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-x-12 gap-y-6">
        {brands.map((name) => (
          <span
            key={name}
            className="text-lg font-semibold tracking-wide text-zinc-600"
          >
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}

export function Features() {
  return (
    <section id="features" className="px-6 py-24 md:py-32">
      <SectionHeading
        eyebrow="Features"
        title="Everything you need from idea to embed"
        description="From first prompt to live on your site—without leaving the browser."
      />
      <div className="mx-auto mt-16 grid max-w-6xl gap-6 md:grid-cols-3">
        {features.map((feature) => (
          <article
            key={feature.title}
            className="group rounded-2xl border border-white/10 bg-white/[0.03] p-8 transition hover:-translate-y-1 hover:border-cyan-500/30 hover:bg-white/[0.05]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 text-cyan-400">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                {feature.icon}
              </svg>
            </div>
            <h3 className="mt-6 text-xl font-semibold text-white">
              {feature.title}
            </h3>
            <p className="mt-3 leading-relaxed text-zinc-400">
              {feature.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-24 md:py-32">
      <SectionHeading
        eyebrow="How it works"
        title="Three steps to 3D on the web"
        description="A workflow designed for speed—whether you ship games, stores, or landing pages."
      />
      <div className="mx-auto mt-16 grid max-w-6xl gap-8 md:grid-cols-3">
        {steps.map((item) => (
          <div key={item.step} className="relative">
            <span className="text-5xl font-bold text-white/10">{item.step}</span>
            <h3 className="mt-4 text-xl font-semibold text-white">{item.title}</h3>
            <p className="mt-3 text-zinc-400">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function UseCases() {
  return (
    <section className="px-6 py-24 md:py-32">
      <SectionHeading
        eyebrow="Use cases"
        title="Built for the way you ship"
        description="MiniMesh fits into real production pipelines—not just demos."
      />
      <div className="mx-auto mt-16 grid max-w-6xl gap-4 sm:grid-cols-2">
        {useCases.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-8"
          >
            <h3 className="text-lg font-semibold text-white">{item.title}</h3>
            <p className="mt-2 text-zinc-400">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ExportSection() {
  return (
    <section id="export" className="px-6 py-24 md:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-cyan-400">
            For developers
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Export once, embed anywhere
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Standard formats and web-ready snippets so your models work outside
            MiniMesh.
          </p>
          <Link
            href="#"
            className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-cyan-400 hover:text-cyan-300"
          >
            View export docs
            <span aria-hidden>→</span>
          </Link>
          <span className="ml-3 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-300">
            API coming soon
          </span>
        </div>
        <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950 p-6 text-sm leading-relaxed">
          <code className="font-mono text-zinc-300">
            <span className="text-zinc-500">{`<!-- Embed on your site -->`}</span>
            {"\n"}
            <span className="text-violet-400">&lt;script</span>
            <span className="text-zinc-300"> type=</span>
            <span className="text-cyan-400">&quot;module&quot;</span>
            <span className="text-zinc-300"> src=</span>
            <span className="text-cyan-400">
              &quot;https://cdn.minimesh.ai/v1/embed.js&quot;
            </span>
            <span className="text-violet-400">&gt;&lt;/script&gt;</span>
            {"\n"}
            <span className="text-violet-400">&lt;minimesh-viewer</span>
            {"\n"}
            <span className="text-zinc-300">  model=</span>
            <span className="text-cyan-400">&quot;your-model-id&quot;</span>
            {"\n"}
            <span className="text-zinc-300">  auto-rotate</span>
            {"\n"}
            <span className="text-violet-400">/&gt;</span>
          </code>
        </pre>
      </div>
    </section>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="px-6 py-24 md:py-32">
      <SectionHeading
        eyebrow="Pricing"
        title="Start free, scale when you ship"
        description="Simple plans for solo creators, pros, and teams."
      />
      <div className="mx-auto mt-16 grid max-w-6xl gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className={`relative flex flex-col rounded-2xl border p-8 ${
              plan.highlighted
                ? "border-cyan-500/50 bg-gradient-to-b from-cyan-500/10 to-transparent shadow-lg shadow-cyan-500/10"
                : "border-white/10 bg-white/[0.03]"
            }`}
          >
            {plan.highlighted && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-3 py-1 text-xs font-semibold text-white">
                Most popular
              </span>
            )}
            <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
            <p className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-white">{plan.price}</span>
              <span className="text-zinc-500">{plan.period}</span>
            </p>
            <p className="mt-3 text-sm text-zinc-400">{plan.description}</p>
            <ul className="mt-8 flex-1 space-y-3">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={plan.ctaHref}
              className={`mt-8 flex h-11 items-center justify-center rounded-full text-sm font-semibold transition ${
                plan.highlighted
                  ? "bg-gradient-to-r from-cyan-500 to-violet-500 text-white hover:brightness-110"
                  : "border border-white/15 text-white hover:bg-white/5"
              }`}
            >
              {plan.cta}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CtaBand() {
  return (
    <section id="cta" className="px-6 py-24">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-zinc-900/80 to-violet-500/10 px-8 py-16 text-center backdrop-blur md:px-16">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Ready to build in 3D?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-zinc-400">
          Create a free account or log in to start generating models with MiniMesh AI.
        </p>
        <div className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-8 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Sign up free
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-8 text-sm font-medium text-zinc-200 transition hover:border-white/30 hover:bg-white/5"
          >
            Login
          </Link>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 md:flex-row">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="" width={32} height={32} />
          <span className="font-semibold text-white">MiniMesh AI</span>
        </Link>
        <nav className="flex flex-wrap justify-center gap-6 text-sm text-zinc-500">
          <Link href="/admin" className="hover:text-zinc-300">
            Admin
          </Link>
          <Link href="#" className="hover:text-zinc-300">
            Privacy
          </Link>
          <Link href="#" className="hover:text-zinc-300">
            Terms
          </Link>
          <Link href="#" className="hover:text-zinc-300">
            GitHub
          </Link>
          <Link href="#" className="hover:text-zinc-300">
            Contact
          </Link>
        </nav>
        <p className="text-sm text-zinc-600">
          © {new Date().getFullYear()} MiniMesh AI
        </p>
      </div>
    </footer>
  );
}
