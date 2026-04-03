import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<any>;
    };
  }
}

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask with the GenLayer wallet snap is required.");
  }

  const accounts = (await window.ethereum.request({
    method: "eth_requestAccounts",
  })) as string[];

  const walletAddress = accounts?.[0] as `0x${string}` | undefined;
  if (!walletAddress) {
    throw new Error("No wallet account returned by MetaMask.");
  }

  const client = createClient({
    chain: studionet,
    account: walletAddress,
    provider: window.ethereum,
  });

  await client.connect("studionet");

  return {
    client,
    walletAddress,
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
