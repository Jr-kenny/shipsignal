import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

type EthereumProvider = {
  isMetaMask?: boolean;
  isRabby?: boolean;
  providers?: EthereumProvider[];
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<any>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export type WalletDiagnostics = {
  providerLabel: string;
  currentChainId: string | null;
  hasSnapsApi: boolean;
};

function getProviderLabel(provider: EthereumProvider) {
  if (provider.isRabby) return "Rabby";
  if (provider.isMetaMask) return "MetaMask";
  return "Injected wallet";
}

function selectProvider() {
  const injected = window.ethereum;
  if (!injected) return null;

  if (Array.isArray(injected.providers) && injected.providers.length > 0) {
    return injected.providers.find(provider => provider.isRabby) ?? injected.providers[0];
  }

  return injected;
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Unknown wallet error");
  }

  return String(error ?? "Unknown wallet error");
}

function chainParams() {
  return {
    chainId: `0x${studionet.id.toString(16)}`,
    chainName: studionet.name,
    rpcUrls: [...studionet.rpcUrls.default.http],
    nativeCurrency: studionet.nativeCurrency,
    blockExplorerUrls: studionet.blockExplorers?.default?.url ? [studionet.blockExplorers.default.url] : undefined,
  };
}

async function ensureStudionet(provider: EthereumProvider) {
  const params = chainParams();
  const currentChainId = (await provider.request({
    method: "eth_chainId",
  })) as string;

  if (currentChainId === params.chainId) {
    return currentChainId;
  }

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: params.chainId }],
    });
  } catch (error) {
    const message = errorMessage(error).toLowerCase();
    const code =
      typeof error === "object" && error !== null && "code" in error ? Number((error as { code?: unknown }).code) : NaN;

    if (code === 4902 || message.includes("unrecognized chain") || message.includes("unknown chain")) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [params],
      });
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: params.chainId }],
      });
    } else {
      throw error;
    }
  }

  return params.chainId;
}

function formatWalletError(error: unknown) {
  const message = errorMessage(error);
  const normalized = message.toLowerCase();
  const code =
    typeof error === "object" && error !== null && "code" in error ? Number((error as { code?: unknown }).code) : NaN;

  if (code === 4001 || normalized.includes("user rejected") || normalized.includes("user denied")) {
    return "Wallet request rejected. Approve the account and Studionet prompts, then try again.";
  }

  if (normalized.includes("wallet_addethereumchain") || normalized.includes("wallet_switchethereumchain")) {
    return "Studionet switch failed. Approve the network request in your wallet and try again.";
  }

  if (normalized.includes("eth_requestaccounts")) {
    return "Wallet account access failed. Approve the account request and try again.";
  }

  return `Wallet connection failed: ${message}`;
}

export async function connectWallet() {
  const provider = selectProvider();

  if (!provider) {
    throw new Error("No browser wallet detected.");
  }

  let currentChainId: string | null = null;

  try {
    currentChainId = await ensureStudionet(provider);
  } catch (error) {
    throw new Error(formatWalletError(error));
  }

  let accounts: string[];
  try {
    accounts = (await provider.request({
      method: "eth_requestAccounts",
    })) as string[];
  } catch (error) {
    throw new Error(formatWalletError(error));
  }

  const walletAddress = accounts?.[0] as `0x${string}` | undefined;
  if (!walletAddress) {
    throw new Error("No wallet account returned by the provider.");
  }

  const client = createClient({
    chain: studionet,
    account: walletAddress,
    provider,
  });

  return {
    client,
    walletAddress,
    diagnostics: {
      providerLabel: getProviderLabel(provider),
      currentChainId,
      hasSnapsApi: typeof provider.request === "function",
    } satisfies WalletDiagnostics,
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
