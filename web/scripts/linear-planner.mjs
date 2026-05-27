const issuePattern = /\b[A-Z]{2,}-\d+\b/g;

export function normalizeIssue(input = {}) {
  return {
    identifier: normalizeIdentifier(input.identifier || input.id || ""),
    title: sanitizeText(input.title || ""),
    project: sanitizeText(input.project || ""),
    state: sanitizeText(input.state || "unknown"),
    url: sanitizeText(input.url || "")
  };
}

export function extractIssueReferences(text = "") {
  return [...new Set(String(text).match(issuePattern) || [])];
}

export function planLinearSync({ currentIssue = {}, candidates = [], followUp = {} } = {}) {
  const issue = normalizeIssue(currentIssue);
  const refs = extractIssueReferences(`${followUp.title || ""}\n${followUp.body || ""}`);
  const duplicates = findDuplicateCandidates(followUp, candidates);
  const missing = [];

  if (!issue.identifier) {
    missing.push("current Linear issue identifier");
  }

  if (!issue.project) {
    missing.push("Linear project");
  }

  return {
    state: missing.length > 0 ? "needs-evidence" : duplicates.length > 0 ? "duplicate-review" : "ready-to-draft",
    issue,
    refs,
    duplicates,
    followUpDraft: buildFollowUpDraft(followUp, issue),
    actions: [
      {
        id: "refresh-linked-issue",
        state: "service-required",
        reason: "Refreshing Linear requires the configured operator tool, not browser credentials."
      },
      {
        id: "create-follow-up",
        state: duplicates.length > 0 || missing.length > 0 ? "blocked" : "confirmation-required",
        reason:
          duplicates.length > 0
            ? "Possible duplicate issues must be reviewed before creation."
            : "Issue creation requires operator confirmation and the configured Linear tool."
      }
    ],
    evidence:
      missing.length > 0
        ? `Missing ${missing.join(", ")}.`
        : "Linear browser integration is a safe draft only; no token or write is available here."
  };
}

export function findDuplicateCandidates(followUp = {}, candidates = []) {
  const title = normalizeForCompare(followUp.title || "");
  const bodyRefs = new Set(extractIssueReferences(followUp.body || ""));

  return candidates
    .map(normalizeIssue)
    .filter((candidate) => {
      const candidateTitle = normalizeForCompare(candidate.title);
      const sharesReference = bodyRefs.has(candidate.identifier);
      const titleOverlap =
        title &&
        candidateTitle &&
        (candidateTitle.includes(title) || title.includes(candidateTitle) || similarity(title, candidateTitle) >= 0.72);

      return sharesReference || titleOverlap;
    })
    .map((candidate) => ({
      identifier: candidate.identifier,
      title: candidate.title,
      reason: "Potential duplicate by issue reference or title overlap."
    }));
}

function buildFollowUpDraft(followUp, issue) {
  return {
    title: sanitizeText(followUp.title || "Follow-up for Symphony-Web"),
    project: issue.project || "Symphony",
    parent: issue.identifier || "unknown",
    body: sanitizeText(
      followUp.body ||
        "Draft only. Creation must happen through the configured Linear operator tool after duplicate review."
    ),
    labels: Array.isArray(followUp.labels)
      ? followUp.labels.map(sanitizeText).filter(Boolean)
      : ["feature"]
  };
}

function normalizeIdentifier(value) {
  const normalized = String(value).toUpperCase().trim();
  return issuePattern.test(normalized) ? normalized.match(issuePattern)[0] : "";
}

function sanitizeText(value) {
  return String(value)
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, "[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._-]{20,}/g, "[redacted]")
    .slice(0, 5000);
}

function normalizeForCompare(value) {
  return sanitizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function similarity(left, right) {
  const leftTokens = new Set(left.split(/\s+/).filter(Boolean));
  const rightTokens = new Set(right.split(/\s+/).filter(Boolean));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return intersection / union;
}
