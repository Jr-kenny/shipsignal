import type { CSSProperties, FormEvent } from "react";
import { useMemo, useState } from "react";
import { CheckCircle2, LoaderCircle, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { appConfig } from "./appConfig";
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

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}` | undefined;

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

export default function App() {
  const [client, setClient] = useState<any>(null);
  const [walletAddress, setWalletAddress] = useState<`0x${string}` | null>(null);
  const [primaryInput, setPrimaryInput] = useState(appConfig.primaryPlaceholder);
  const [secondaryInput, setSecondaryInput] = useState(appConfig.secondaryPlaceholder);
  const [result, setResult] = useState<Decision | null>(null);
  const [status, setStatus] = useState("Connect a browser wallet and push one decision onchain.");
  const [isBusy, setIsBusy] = useState(false);

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
      setStatus("Connecting MetaMask and switching to Studionet...");
      const wallet = await connectWallet();
      setClient(wallet.client);
      setWalletAddress(wallet.walletAddress);
      setStatus("Wallet ready. Submit a case to create an onchain AI decision.");

      if (contractAddress) {
        try {
          const latestCaseId = await getLatestCaseId(wallet.client, contractAddress, wallet.walletAddress);
          const raw = await getCase(wallet.client, contractAddress, Number(latestCaseId));
          const parsed = parseDecision(raw);
          if (parsed) {
            setResult(parsed);
          }
        } catch {
          // Ignore empty state for first-time wallet addresses.
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
    <main style={themeStyle} className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="overflow-hidden rounded-[32px] border border-black/10 bg-white/85 shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur">
          <div className="grid gap-6 p-6 md:grid-cols-[1.3fr_0.7fr] md:p-8">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.18em]">
                <Sparkles className="h-4 w-4" />
                {appConfig.modeLabel}
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-black/50">GenLayer Studionet app</p>
                <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">{appConfig.name}</h1>
                <p className="max-w-3xl text-lg text-black/70">{appConfig.oneLiner}</p>
                <p className="max-w-3xl text-base text-black/65">{appConfig.pitch}</p>
              </div>
            </div>

            <div className="rounded-[28px] border border-black/10 bg-black/[0.03] p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/55">Wallet flow</p>
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={onConnect}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold text-white shadow-lg transition hover:translate-y-[-1px]"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  <Wallet className="h-4 w-4" />
                  {walletAddress ? "Wallet connected" : "Connect browser wallet"}
                </button>
                <div className="rounded-2xl bg-white p-4 text-sm text-black/70">
                  <p className="font-semibold text-black">Status</p>
                  <p className="mt-2">{status}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 text-sm text-black/70">
                  <p className="font-semibold text-black">Contract</p>
                  <p className="mono mt-2 break-all text-xs">{contractAddress ?? "Deploy first"}</p>
                </div>
                {walletAddress ? (
                  <div className="rounded-2xl bg-white p-4 text-sm text-black/70">
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
              <h2 className="text-2xl font-bold">One transaction, one decision</h2>
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
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/55">Why this ranks</p>
              <h2 className="text-2xl font-bold">Hackathon-ready story</h2>
            </div>

            <div className="grid gap-3">
              {appConfig.judgingPoints.map(point => (
                <div key={point} className="rounded-[22px] border border-black/10 bg-white px-4 py-4 text-sm text-black/75">
                  {point}
                </div>
              ))}
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
