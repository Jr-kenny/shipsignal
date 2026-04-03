import { readFileSync } from "node:fs";
import path from "node:path";
import { TransactionStatus } from "genlayer-js/types";

export default async function main(client) {
  const filePath = path.resolve(process.cwd(), "contracts/shipsignal.py");
  const contractCode = new Uint8Array(readFileSync(filePath));

  await client.initializeConsensusSmartContract();

  const deployHash = await client.deployContract({
    code: contractCode,
    args: [],
  });

  const receipt = await client.waitForTransactionReceipt({
    hash: deployHash,
    status: TransactionStatus.ACCEPTED,
    retries: 200,
    interval: 3000,
  });

  return receipt?.data?.contract_address ?? receipt?.txDataDecoded?.contractAddress ?? null;
}
