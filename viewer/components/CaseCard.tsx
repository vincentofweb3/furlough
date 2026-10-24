import { safeHttpUrl, type CaseRecord, VERDICT_CLASS } from "@/lib/contract";

export default function CaseCard({ entry, now }: { entry: CaseRecord; now: number }) {
  const verdictClass = VERDICT_CLASS[entry.verdict] ?? "false-report";
  const journal = safeHttpUrl(entry.journal_url);
  const expiresAt = entry.expires_at ? Date.parse(entry.expires_at) : Number.NaN;
  const expired = Number.isFinite(expiresAt) && expiresAt <= now;

  let cutLine = "no cut armed by this case";
  if (entry.cut) {
    const ended = entry.lifted_at
      ? `reaped at ${entry.lifted_at}`
      : expired
        ? "lifted by the clock, no transaction"
        : "window still open";
    cutLine = `cut armed ${entry.armed_at ?? "?"} - expires ${entry.expires_at ?? "?"} (${ended})`;
  }

  return (
    <article className={`case ${verdictClass}`} id={`case-${entry.case_id}`}>
      <div className="top">
        <span className="id">{entry.case_id}</span>
        <span className={`badge ${verdictClass}`}>{entry.verdict}</span>
      </div>
      <div className="claim">{entry.claim}</div>
      <div className="row">
        reporter {entry.reporter} - filed {entry.submitted_at}
      </div>
      <div className="row">
        journal{" "}
        {journal ? (
          <a href={journal} target="_blank" rel="noopener noreferrer">
            {entry.journal_url}
          </a>
        ) : (
          entry.journal_url
        )}
      </div>
      <div className="row">{cutLine}</div>
      <details>
        <summary>rationale and digest</summary>
        <div className="row">{entry.rationale}</div>
        <div className="row">
          journal fetched {entry.digest?.journal_found ? "true" : "false"} - signed by the bound
          observer {entry.digest?.authenticated ? "true" : "false"} - names the bound agent{" "}
          {entry.digest?.agent_matches ? "true" : "false"}
          {entry.digest?.note ? ` (${entry.digest.note})` : ""}
        </div>
        <div className="sig">{entry.digest?.signature ?? "no digest recorded"}</div>
        <div className="row">
          finalized {entry.finalized ?? "?"} - validator round completed{" "}
          {entry.validator_agreed ? "true" : "false"}
        </div>
      </details>
    </article>
  );
}
