import type { CSSProperties, FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BadgePercent,
  CheckCircle2,
  FileSearch,
  Gavel,
  Landmark,
  LoaderCircle,
  PackageCheck,
  Receipt,
  ScanSearch,
  ShieldCheck,
  ShipWheel,
  Sparkles,
  Trophy,
  UserRoundSearch,
  Vote,
  Wallet,
} from "lucide-react";
import { appConfig } from "./appConfig";
import type { WalletDiagnostics } from "./lib/genlayer";
import { connectWallet, extractCaseId, getCase, getLatestCaseId, submitCase } from "./lib/genlayer";

type Decision = {
  headline: string;
  verdict: "APPROVE" | "REVIEW" | "REJECT";
  score: number;
  reasons: string[];
  next_action: string;
  proof_of_advantage: string;
  app: string;
  mode: string;
};

type SceneConfig = {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  kind:
    | "invoice"
    | "discount"
    | "dispute"
    | "governance"
    | "grant"
    | "policy"
    | "prize"
    | "hiring"
    | "shipping"
    | "vendor";
  explainers: Array<{ title: string; body: string }>;
};

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}` | undefined;

const scenes: Record<string, SceneConfig> = {
  billshield: {
    eyebrow: "Treasury screen",
    title: "Invoice lane",
    subtitle: "Vendor, budget, and exception signals are compressed into one treasury verdict.",
    icon: Receipt,
    kind: "invoice",
    explainers: [
      { title: "Payment risk", body: "The contract reads the spend request and policy together before it stores a treasury outcome." },
      { title: "Escalation path", body: "Review outcomes preserve a human checkpoint without losing the onchain reasoning trail." },
      { title: "Wallet action", body: "Finance signs once, then the decision becomes a persisted contract result." },
    ],
  },
  dealguard: {
    eyebrow: "Pricing gate",
    title: "Discount ladder",
    subtitle: "The UI visualizes where the ask sits against pricing guardrails before a rep submits it.",
    icon: BadgePercent,
    kind: "discount",
    explainers: [
      { title: "Threshold logic", body: "The contract decides whether the request fits policy, needs review, or should stop." },
      { title: "Commercial context", body: "Upside, urgency, and exception logic are judged in the same write." },
      { title: "Sales ops fit", body: "This is built to feel like a pricing desk, not a generic contract demo." },
    ],
  },
  disputedock: {
    eyebrow: "Evidence split",
    title: "Dispute dock",
    subtitle: "Two sides, one scope, and a single payout recommendation shaped from the evidence trail.",
    icon: Gavel,
    kind: "dispute",
    explainers: [
      { title: "Evidence intake", body: "The agreement and dispute record are passed together so the decision stays anchored." },
      { title: "Responsibility read", body: "Comparative consensus works well when both parties describe the same event differently." },
      { title: "Payout clarity", body: "The result panel turns long dispute context into an action-ready resolution." },
    ],
  },
  govpulse: {
    eyebrow: "Mandate check",
    title: "Proposal circuit",
    subtitle: "A governance proposal is mapped against treasury mandate and execution pressure before the vote moves.",
    icon: Vote,
    kind: "governance",
    explainers: [
      { title: "Mandate fit", body: "The contract compresses long governance text into a readable approve, review, or reject call." },
      { title: "Treasury discipline", body: "Risk and upside live in the same onchain explanation instead of separate forum threads." },
      { title: "Community UX", body: "The visual language is closer to governance ops than a generic form submit screen." },
    ],
  },
  grantjudge: {
    eyebrow: "Application filter",
    title: "Thesis board",
    subtitle: "Thesis fit, execution risk, and impact are scored as one funding screen before reviewers spend time.",
    icon: Landmark,
    kind: "grant",
    explainers: [
      { title: "Fast triage", body: "The contract screens applications before a manual committee even opens the memo." },
      { title: "Stable approval logic", body: "This app uses non-comparative consensus to keep grant decisions consistent." },
      { title: "Review readiness", body: "The result is shaped as an intake memo, not a hackathon scoreboard." },
    ],
  },
  policygate: {
    eyebrow: "Claim checker",
    title: "Policy scanner",
    subtitle: "Risky claims are highlighted as if compliance is reading the copy live before launch.",
    icon: ScanSearch,
    kind: "policy",
    explainers: [
      { title: "Copy review", body: "Marketing copy and policy rules are judged in one contract call." },
      { title: "Flagged language", body: "The interface makes policy violations feel like a review workflow, not raw JSON." },
      { title: "Shipping safety", body: "Teams can see why language was blocked before the asset goes out." },
    ],
  },
  prizepilot: {
    eyebrow: "Rubric pass",
    title: "Judge board",
    subtitle: "The submission is turned into a visible rubric pass before the official score is written onchain.",
    icon: Trophy,
    kind: "prize",
    explainers: [
      { title: "Rubric-first", body: "The interface looks like a judging table so the product reads instantly." },
      { title: "Comparative fit", body: "Comparative equivalence is appropriate when several judges may phrase the same call differently." },
      { title: "Decision output", body: "The result keeps the write legible for organizers and teams alike." },
    ],
  },
  proofmatch: {
    eyebrow: "Match screen",
    title: "Fit surface",
    subtitle: "Resume signals and role must-haves are arranged like a shortlist workspace before the match is submitted.",
    icon: UserRoundSearch,
    kind: "hiring",
    explainers: [
      { title: "Role alignment", body: "Candidate evidence and role demands are compared directly inside the contract." },
      { title: "Missing proof", body: "The output explains what is absent instead of hiding behind a vague score." },
      { title: "Hiring board feel", body: "The UI is tuned for screening flow rather than generic prompt input." },
    ],
  },
  shipsignal: {
    eyebrow: "Fulfillment trace",
    title: "Shipment line",
    subtitle: "Timeline stages, claim pressure, and SLA posture are laid out like an ops console before support decides.",
    icon: ShipWheel,
    kind: "shipping",
    explainers: [
      { title: "Timeline logic", body: "The contract reasons over courier sequence, delivery proof, and claim policy together." },
      { title: "Support action", body: "Outcomes are phrased for refund, review, or denial workflows instead of chain-native jargon." },
      { title: "Domain design", body: "This app now looks like shipping operations, not a recolored clone of the others." },
    ],
  },
  vendorsnap: {
    eyebrow: "Procurement compare",
    title: "Vendor grid",
    subtitle: "Capabilities and sourcing requirements are presented like a buyer worksheet before the final go or no-go call.",
    icon: PackageCheck,
    kind: "vendor",
    explainers: [
      { title: "Side-by-side fit", body: "The UI emphasizes requirement coverage because that is how sourcing teams actually think." },
      { title: "Procurement risk", body: "Missing controls and enterprise gaps are surfaced before approval becomes expensive." },
      { title: "Contract-backed memo", body: "The final decision is still an onchain result, but the interface feels operational." },
    ],
  },
};

function parseDecision(raw: unknown): Decision | null {
  if (typeof raw !== "string") {
    return null;
  }

  try {
    return JSON.parse(raw) as Decision;
  } catch {
    return null;
  }
}

function scoreTone(score?: number) {
  if (typeof score !== "number") return "0%";
  return `${Math.max(8, Math.min(score, 100))}%`;
}

function renderWorkspace(kind: SceneConfig["kind"], result: Decision | null): ReactNode {
  const verdict = result?.verdict ?? "REVIEW";
  const score = result?.score ?? 64;

  switch (kind) {
    case "invoice":
      return (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Invoice size", value: `$${score.toLocaleString()}k` },
              { label: "Budget path", value: verdict },
              { label: "Escalation", value: score > 75 ? "Low" : "Manual" },
            ].map(card => (
              <div key={card.label} className="rounded-3xl border border-white/10 bg-white/10 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">{card.label}</p>
                <p className="mt-2 text-lg font-semibold">{card.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/55">
              <span>Budget pressure</span>
              <span>{score}/100</span>
            </div>
            <div className="mt-3 h-3 rounded-full bg-white/10">
              <div className="h-3 rounded-full bg-[var(--accent)]" style={{ width: scoreTone(score) }} />
            </div>
          </div>
        </div>
      );
    case "discount":
      return (
        <div className="space-y-3">
          {[12, 20, 32].map((value, index) => (
            <div key={value} className="flex items-center gap-3">
              <div className="w-16 text-xs uppercase tracking-[0.18em] text-white/55">{index === 2 ? "Ask" : "Guard"}</div>
              <div className="h-3 flex-1 rounded-full bg-white/10">
                <div className="h-3 rounded-full bg-[var(--accent)]" style={{ width: `${value}%` }} />
              </div>
              <div className="w-12 text-right text-sm font-semibold">{value}%</div>
            </div>
          ))}
        </div>
      );
    case "dispute":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { side: "Claimant", note: "Delivered milestone, access issue raised later." },
            { side: "Counterparty", note: "Scope incomplete, evidence trail partially missing." },
          ].map(item => (
            <div key={item.side} className="rounded-3xl border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">{item.side}</p>
              <p className="mt-3 text-sm leading-6 text-white/80">{item.note}</p>
            </div>
          ))}
        </div>
      );
    case "governance":
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Mandate fit", value: "High" },
            { label: "Treasury risk", value: verdict === "APPROVE" ? "Contained" : "Watch" },
            { label: "Execution", value: `${score}/100` },
          ].map(item => (
            <div key={item.label} className="rounded-3xl border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">{item.label}</p>
              <p className="mt-2 text-lg font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
      );
    case "grant":
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Thesis fit", value: 82 },
            { label: "Execution", value: 68 },
            { label: "Impact", value: 74 },
          ].map(item => (
            <div key={item.label} className="rounded-3xl border border-white/10 bg-white/10 p-4">
              <div className="flex h-24 items-end gap-2">
                <div className="w-full rounded-t-2xl bg-[var(--accent)]/80" style={{ height: `${item.value}%` }} />
              </div>
              <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/55">{item.label}</p>
              <p className="mt-1 text-sm font-semibold">{item.value}/100</p>
            </div>
          ))}
        </div>
      );
    case "policy":
      return (
        <div className="space-y-3">
          {["guaranteed outcome", "unsupported authority", "missing qualifier"].map(flag => (
            <div key={flag} className="rounded-3xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/85">
              <span className="text-white/45">Flagged:</span> {flag}
            </div>
          ))}
        </div>
      );
    case "prize":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Novelty", value: 87 },
            { label: "Execution", value: 79 },
            { label: "Clarity", value: 84 },
            { label: "GenLayer fit", value: 91 },
          ].map(item => (
            <div key={item.label} className="rounded-3xl border border-white/10 bg-white/10 p-4">
              <div className="flex items-center justify-between text-sm">
                <span>{item.label}</span>
                <span className="font-semibold">{item.value}</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-[var(--accent)]" style={{ width: `${item.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      );
    case "hiring":
      return (
        <div className="flex flex-wrap gap-2">
          {["vendor ops", "analytics", "pricing", "delivery", "stakeholder sync", "Python"].map(chip => (
            <span
              key={chip}
              className={`rounded-full px-3 py-2 text-sm ${chip === "Python" ? "bg-white/10 text-white/55" : "bg-[var(--accent)]/20 text-white"}`}
            >
              {chip}
            </span>
          ))}
        </div>
      );
    case "shipping":
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-white/55">
            <span>Label</span>
            <span>Transit</span>
            <span>Delivered</span>
            <span>Claim</span>
          </div>
          <div className="flex items-center gap-3">
            {["1", "2", "3", "4"].map((step, index) => (
              <div key={step} className="flex flex-1 items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${index < 3 ? "bg-[var(--accent)] text-black" : "bg-white/10 text-white"}`}>
                  {step}
                </div>
                {index < 3 ? <div className="h-1 flex-1 rounded-full bg-[var(--accent)]/60" /> : null}
              </div>
            ))}
          </div>
          <p className="text-sm text-white/75">Operational timeline stays visible before the support verdict is submitted.</p>
        </div>
      );
    case "vendor":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { title: "Proposal", lines: ["14-day onboarding", "SOC2", "usage pricing"] },
            { title: "Requirements", lines: ["sub-30 day launch", "fixed budget", "audit logs"] },
          ].map(column => (
            <div key={column.title} className="rounded-3xl border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">{column.title}</p>
              <div className="mt-3 space-y-2 text-sm text-white/85">
                {column.lines.map(line => (
                  <div key={line} className="rounded-2xl bg-black/20 px-3 py-2">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
  }
}

function walletStateLabel(diagnostics: WalletDiagnostics | null) {
  if (!diagnostics) return "Unknown";
  if (diagnostics.isGenLayerSnapInstalled) return "GenLayer Snap ready";
  return diagnostics.isFlask ? "Snap not installed yet" : "Snap support not detected";
}

export default function App() {
  const [client, setClient] = useState<any>(null);
  const [walletAddress, setWalletAddress] = useState<`0x${string}` | null>(null);
  const [walletDiagnostics, setWalletDiagnostics] = useState<WalletDiagnostics | null>(null);
  const [primaryInput, setPrimaryInput] = useState(appConfig.primaryPlaceholder);
  const [secondaryInput, setSecondaryInput] = useState(appConfig.secondaryPlaceholder);
  const [result, setResult] = useState<Decision | null>(null);
  const [status, setStatus] = useState("Approve the Studionet switch and the GenLayer Snap prompt when the wallet opens.");
  const [isBusy, setIsBusy] = useState(false);

  const scene = scenes[appConfig.slug] ?? scenes.billshield;
  const SceneIcon = scene.icon;

  const themeStyle = useMemo(
    () =>
      ({
        "--accent": appConfig.theme.accent,
        "--accent-soft": appConfig.theme.accentSoft,
        "--surface": appConfig.theme.surface,
        "--ink": appConfig.theme.ink,
      }) as CSSProperties,
    [],
  );

  async function onConnect() {
    try {
      setStatus("Checking MetaMask, Studionet, and GenLayer Snap...");
      const wallet = await connectWallet();
      setClient(wallet.client);
      setWalletAddress(wallet.walletAddress);
      setWalletDiagnostics(wallet.diagnostics);
      setStatus("Wallet ready. You can submit a case now.");

      if (contractAddress) {
        try {
          const latestCaseId = await getLatestCaseId(wallet.client, contractAddress, wallet.walletAddress);
          const raw = await getCase(wallet.client, contractAddress, Number(latestCaseId));
          const parsed = parseDecision(raw);
          if (parsed) {
            setResult(parsed);
          }
        } catch {
          // First-time wallets may not have previous results yet.
        }
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Wallet connection failed.");
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!client || !walletAddress) {
      setStatus("Connect your wallet first.");
      return;
    }

    if (!contractAddress) {
      setStatus("Missing VITE_CONTRACT_ADDRESS. Deploy the contract first.");
      return;
    }

    try {
      setIsBusy(true);
      setStatus("Sending transaction to Studionet...");
      const receipt = await submitCase(client, contractAddress, primaryInput, secondaryInput);
      const caseId = extractCaseId(receipt);

      if (caseId === null) {
        throw new Error("Transaction landed but the case id was not readable from the receipt.");
      }

      setStatus("Consensus accepted. Reading the stored result...");
      const raw = await getCase(client, contractAddress, caseId);
      const parsed = parseDecision(raw);

      if (!parsed) {
        throw new Error("The contract returned a result that could not be parsed.");
      }

      setResult(parsed);
      setStatus("Decision stored onchain.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Submission failed.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main
      style={themeStyle}
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,var(--accent-soft),transparent_35%),linear-gradient(140deg,#ffffff_0%,var(--surface)_58%,#ffffff_100%)] px-4 py-6 sm:px-6"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="overflow-hidden rounded-[36px] border border-black/10 bg-white/80 shadow-[0_28px_90px_rgba(0,0,0,0.08)] backdrop-blur">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="border-b border-black/8 p-6 lg:border-b-0 lg:border-r lg:border-black/8 lg:p-8">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.18em]">
                    <Sparkles className="h-4 w-4" />
                    {appConfig.modeLabel}
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white">
                    <SceneIcon className="h-4 w-4" />
                    {scene.eyebrow}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-black/45">{scene.title}</p>
                  <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">{appConfig.name}</h1>
                  <p className="max-w-3xl text-lg text-black/72">{appConfig.oneLiner}</p>
                  <p className="max-w-3xl text-base text-black/62">{scene.subtitle}</p>
                </div>

                <div className="rounded-[30px] bg-[linear-gradient(165deg,rgba(0,0,0,0.94),rgba(0,0,0,0.72))] p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/55">Workspace</p>
                      <h2 className="mt-2 text-2xl font-semibold">{scene.title}</h2>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-3">
                      <SceneIcon className="h-6 w-6" />
                    </div>
                  </div>
                  {renderWorkspace(scene.kind, result)}
                </div>
              </div>
            </div>

            <div className="p-6 lg:p-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/55">Wallet flow</p>
                  <ShieldCheck className="h-5 w-5" />
                </div>

                <button
                  type="button"
                  onClick={onConnect}
                  className="flex w-full items-center justify-center gap-2 rounded-[24px] px-4 py-4 font-semibold text-white shadow-lg transition hover:translate-y-[-1px]"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  <Wallet className="h-4 w-4" />
                  {walletAddress ? "Wallet connected" : "Connect GenLayer wallet"}
                </button>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-4 text-sm text-black/70">
                    <p className="font-semibold text-black">Snap status</p>
                    <p className="mt-2">{walletStateLabel(walletDiagnostics)}</p>
                  </div>
                  <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-4 text-sm text-black/70">
                    <p className="font-semibold text-black">Wallet build</p>
                    <p className="mt-2">{walletDiagnostics ? (walletDiagnostics.isFlask ? "Flask / Snaps-ready" : "Standard extension") : "Waiting for detection"}</p>
                  </div>
                </div>

                <div className="rounded-[24px] border border-black/10 bg-white p-4 text-sm text-black/72">
                  <p className="font-semibold text-black">Status</p>
                  <p className="mt-2">{status}</p>
                </div>

                <div className="rounded-[24px] border border-black/10 bg-white p-4 text-sm text-black/72">
                  <p className="font-semibold text-black">Contract</p>
                  <p className="mono mt-2 break-all text-xs">{contractAddress ?? "Deploy first"}</p>
                </div>

                {walletAddress ? (
                  <div className="rounded-[24px] border border-black/10 bg-white p-4 text-sm text-black/72">
                    <p className="font-semibold text-black">Active wallet</p>
                    <p className="mono mt-2 break-all text-xs">{walletAddress}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <form
            onSubmit={onSubmit}
            className="space-y-5 rounded-[32px] border border-black/10 bg-white/90 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.06)]"
          >
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/55">Input</p>
              <h2 className="text-2xl font-bold">Submit the operating context</h2>
              <p className="text-sm text-black/62">{appConfig.pitch}</p>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-black">{appConfig.primaryLabel}</span>
              <textarea
                value={primaryInput}
                onChange={event => setPrimaryInput(event.target.value)}
                rows={9}
                className="w-full rounded-[24px] border border-black/10 bg-white px-4 py-4 text-sm text-black outline-none transition focus:border-black/30"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-black">{appConfig.secondaryLabel}</span>
              <textarea
                value={secondaryInput}
                onChange={event => setSecondaryInput(event.target.value)}
                rows={8}
                className="w-full rounded-[24px] border border-black/10 bg-white px-4 py-4 text-sm text-black outline-none transition focus:border-black/30"
              />
            </label>

            <button
              type="submit"
              disabled={isBusy}
              className="flex w-full items-center justify-center gap-2 rounded-[24px] px-4 py-4 text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-70"
              style={{ backgroundColor: "var(--accent)" }}
            >
              {isBusy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
              {isBusy ? "Running consensus..." : "Submit onchain decision"}
            </button>
          </form>

          <div className="space-y-5 rounded-[32px] border border-black/10 bg-white/90 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.06)]">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/55">Explanation</p>
              <h2 className="text-2xl font-bold">What this contract is evaluating</h2>
            </div>

            <div className="grid gap-3">
              {scene.explainers.map(item => (
                <div key={item.title} className="rounded-[24px] border border-black/10 bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">{item.title}</p>
                  <p className="mt-2 text-sm text-black/72">{item.body}</p>
                </div>
              ))}
              <div className="rounded-[24px] border border-black/10 bg-[var(--accent-soft)] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Decision scope</p>
                <p className="mt-2 text-sm text-black/75">{appConfig.task}</p>
              </div>
            </div>

            <div className="rounded-[28px] border border-dashed border-black/15 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/55">Latest result</p>
              {result ? (
                <div className="mt-4 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white"
                      style={{ backgroundColor: "var(--accent)" }}
                    >
                      {result.verdict}
                    </span>
                    <span className="mono text-sm text-black/65">Score {result.score}/100</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{result.headline}</h3>
                    <p className="mt-2 text-sm text-black/70">{result.next_action}</p>
                  </div>
                  <div className="space-y-2">
                    {result.reasons.map(reason => (
                      <div key={reason} className="rounded-2xl bg-black/[0.03] px-4 py-3 text-sm text-black/75">
                        {reason}
                      </div>
                    ))}
                  </div>
                  <div className="rounded-2xl bg-black text-sm text-white">
                    <div className="p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/60">Why GenLayer</p>
                      <p className="mt-2">{result.proof_of_advantage}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-[24px] bg-black/[0.03] px-4 py-6 text-sm text-black/65">
                  No decision yet. Connect your wallet, submit a case, and the result will load here.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
