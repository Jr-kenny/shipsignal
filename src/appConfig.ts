export const appConfig = {
  "slug": "shipsignal",
  "name": "ShipSignal",
  "oneLiner": "Decide whether a shipping claim is valid before support spirals.",
  "pitch": "Paste the shipment timeline and the customer claim. The contract returns a support decision with the exact operational reason.",
  "mode": "nonComparative",
  "primaryLabel": "Shipment timeline or courier notes",
  "secondaryLabel": "Customer claim or SLA policy",
  "primaryPlaceholder": "Order placed March 4. Label created March 5. Weather delay March 6. Delivered March 10 at 14:20. Customer says package never arrived...",
  "secondaryPlaceholder": "Refund if order is lost, damaged, or 5+ days past SLA without a documented force-majeure event.",
  "task": "Review the shipment timeline and claim, then decide whether the claim should be approved, reviewed, or rejected.",
  "criteria": "Output must be valid JSON with keys headline, verdict, score, reasons, next_action, proof_of_advantage. verdict must be APPROVE, REVIEW, or REJECT. score must be an integer 0-100. reasons must contain exactly 3 short strings tied to delivery evidence, SLA rules, or missing proof.",
  "judgingPoints": [
    "Support automation is concrete and valuable.",
    "Non-comparative validation keeps the contract lean.",
    "The decision story is obvious in one glance."
  ],
  "theme": {
    "accent": "#16a34a",
    "accentSoft": "#dcfce7",
    "surface": "#f3fff7",
    "ink": "#132516"
  },
  "modeLabel": "Non-comparative equivalence"
} as const;
