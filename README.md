# ShipSignal

Decide whether a shipping claim is valid before support spirals.

Contract: [https://studio.genlayer.com/contracts?import-contract=0xf589aF822621d01DC24F658D9fC77F2F0e8D645F](https://studio.genlayer.com/contracts?import-contract=0xf589aF822621d01DC24F658D9fC77F2F0e8D645F)

## What this app is

ShipSignal is a shipping claim review tool for support teams, logistics operators, and commerce platforms. Paste the shipment timeline and the customer claim. The contract returns a support decision with the exact operational reason.

## The problem it solves

Support teams waste time on refund claims because shipment events, delivery exceptions, and SLA rules are scattered across different systems. ShipSignal brings the evidence into one decision path.

## How the product works

1. Connect a browser wallet on GenLayer Studionet.
2. Paste shipment timeline or courier notes.
3. Paste customer claim or sla policy.
4. Sign one write transaction to the intelligent contract.
5. Wait for the contract to return the structured result.
6. Read the verdict, score, reasons, and next action in the UI.

## What the contract decides

The contract performs this judgment onchain:

> Review the shipment timeline and claim, then decide whether the claim should be approved, reviewed, or rejected.

Returned fields:

- headline
- verdict
- score
- reasons
- next_action
- proof_of_advantage

The verdict is always APPROVE, REVIEW, or REJECT. The score is an integer from 0 to 100, and the reasons array is always kept short enough to read instantly.

## Why GenLayer is necessary here

The contract is not just reading a timeline. It is deciding whether the evidence satisfies the refund rule under a real delivery policy. That interpretation is the GenLayer advantage.

Consensus mode: **Non-comparative equivalence**

Validators independently apply the same task and criteria to the case. This keeps the verdict stable when the app is enforcing a policy, gate, or approval rule with a tight output schema.

## Example input shape

Shipment timeline or courier notes:

~~~text
Order placed March 4. Label created March 5. Weather delay March 6. Delivered March 10 at 14:20. Customer says package never arrived...
~~~

Customer claim or SLA policy:

~~~text
Refund if order is lost, damaged, or 5+ days past SLA without a documented force-majeure event.
~~~

## Important files

- contracts/shipsignal.py: intelligent contract
- deploy/001_deploy.mjs: deployment script for Studionet
- src/App.tsx: browser UI
- src/lib/genlayer.ts: wallet connection and contract calls
- src/appConfig.ts: app task, copy, placeholders, and mode

## Run locally

1. pnpm install
2. Ensure .env.local contains VITE_CONTRACT_ADDRESS=0xf589aF822621d01DC24F658D9fC77F2F0e8D645F
3. Ensure .env.local contains VITE_GENLAYER_RPC_URL=https://studio.genlayer.com/api
4. pnpm dev
5. Open the app in a browser with Rabby, MetaMask, or another injected wallet that can switch to GenLayer Studionet.

## Deployed contract

- Address: 0xf589aF822621d01DC24F658D9fC77F2F0e8D645F
- Studio import: [https://studio.genlayer.com/contracts?import-contract=0xf589aF822621d01DC24F658D9fC77F2F0e8D645F](https://studio.genlayer.com/contracts?import-contract=0xf589aF822621d01DC24F658D9fC77F2F0e8D645F)
