import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

type EthereumRequest = (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<any>;

declare global {
  interface Window {
    ethereum?: {
      request: EthereumRequest;
    };
  }
}

export type WalletDiagnostics = {
  isFlask: boolean;
  isGenLayerSnapInstalled: boolean;
  installedSnaps: Record<string, unknown>;
};

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Unknown wallet error");
  }

  return String(error ?? "Unknown wallet error");
}

function formatWalletError(error: unknown, diagnostics: WalletDiagnostics | null) {
  const message = errorMessage(error);
  const normalized = message.toLowerCase();

  if (normalized.includes("4001") || normalized.includes("user rejected") || normalized.includes("user denied")) {
    return "Wallet request rejected. Approve the Studionet and GenLayer prompts, then try again.";
  }

  if (normalized.includes("wallet_getsnaps") || normalized.includes("wallet_requestsnaps") || normalized.includes("snap")) {
    if (diagnostics && !diagnostics.isFlask) {
      return "This MetaMask build does not expose Snaps for GenLayer. Use a Snaps-enabled MetaMask build and retry the connection.";
    }

    return "GenLayer Snap setup failed. Approve the Snap install prompt in MetaMask, then try again.";
  }

  if (normalized.includes("wallet_addethereumchain") || normalized.includes("wallet_switchethereumchain") || normalized.includes("chain")) {
    return "Studionet switch failed. Approve the network switch in MetaMask, then try again.";
  }

  return `Wallet connection failed: ${message}`;
}

async function getWalletDiagnostics() {
  if (!window.ethereum) {
    return null;
  }

  try {
    const probeClient = createClient({ chain: studionet });
    const diagnostics = await probeClient.metamaskClient("npm");
    return diagnostics as WalletDiagnostics;
  } catch {
    return null;
  }
}

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask with the GenLayer Snap is required.");
  }

  const diagnostics = await getWalletDiagnostics();
  const bootstrapClient = createClient({ chain: studionet });

  try {
    await bootstrapClient.connect("studionet");
  } catch (error) {
    throw new Error(formatWalletError(error, diagnostics));
  }

  let accounts: string[];
  try {
    accounts = (await window.ethereum.request({
      method: "eth_requestAccounts",
    })) as string[];
  } catch (error) {
    throw new Error(formatWalletError(error, diagnostics));
  }

  const walletAddress = accounts?.[0] as `0x${string}` | undefined;
  if (!walletAddress) {
    throw new Error("No wallet account returned by MetaMask.");
  }

  const client = createClient({
    chain: studionet,
    account: walletAddress,
  });

  try {
    await client.connect("studionet");
  } catch (error) {
    throw new Error(formatWalletError(error, diagnostics));
  }

  return {
    client,
    walletAddress,
    diagnostics,
  };
}

export async function submitCase(
  client: any,
  contractAddress: `0x${string}`,
  primaryInput: string,
  secondaryInput: string,
) {
  const hash = await client.writeContract({
    address: contractAddress,
    functionName: "submit_case",
    args: [primaryInput, secondaryInput],
    value: 0n,
  });

  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    retries: 150,
    interval: 2000,
  });

  return receipt;
}

export async function getCase(client: any, contractAddress: `0x${string}`, caseId: number) {
  return client.readContract({
    address: contractAddress,
    functionName: "get_case",
    args: [caseId],
  });
}

export async function getLatestCaseId(client: any, contractAddress: `0x${string}`, address: `0x${string}`) {
  return client.readContract({
    address: contractAddress,
    functionName: "get_latest_case_id",
    args: [address],
  });
}

export function extractCaseId(receipt: any): number | null {
  const readable = receipt?.consensus_data?.leader_receipt?.[0]?.result?.payload?.readable ?? receipt?.result;
  if (readable === undefined || readable === null) {
    return null;
  }

  const parsed = Number.parseInt(String(readable), 10);
  return Number.isNaN(parsed) ? null : parsed;
}
