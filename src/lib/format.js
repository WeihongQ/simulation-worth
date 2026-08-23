// Shared value-formatting rules for the domain scores in src/data/twin2k.json.
// Every domain except anchoring_estimation is scored on a [0,1] share/rate
// scale; anchoring_estimation is a ratio index (human average = 1.0 by
// construction, since it's normalized by dividing by the human sample mean
// -- see data/prepare.py). Mixing the two without labeling would mislead, so
// callers should always go through here rather than assuming percent.
export const RATIO_DOMAIN_ID = "anchoring_estimation";

export function isRatioDomain(domainId) {
  return domainId === RATIO_DOMAIN_ID;
}

export function formatDomainValue(domainId, value) {
  if (isRatioDomain(domainId)) return `${value.toFixed(2)}×`;
  return `${Math.round(value * 100)}%`;
}

export function domainValueLabel(domainId) {
  return isRatioDomain(domainId) ? "relative estimate (human = 1.00×)" : "share / rate";
}
