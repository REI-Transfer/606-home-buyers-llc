import Script from "next/script"

// GoFunnel attribution/tracking script (shared env-var-driven template).
//
// Reads the per-client GoFunnel org (client) id from NEXT_PUBLIC_GOFUNNEL_ORG_ID.
// There is intentionally NO hardcoded default — this template backs many client
// deployments, so each Vercel project supplies its own id. When the env var is
// unset/empty, tracking is disabled (renders nothing), so the template is a
// no-op until a deployment opts in.
//
// Loaded beforeInteractive so it runs ahead of form embeds and sets the gf_sid
// session cookie used for attribution.
const GOFUNNEL_ORG_ID = process.env.NEXT_PUBLIC_GOFUNNEL_ORG_ID ?? ""

export function GoFunnelTracking() {
  if (!GOFUNNEL_ORG_ID) return null // tracking disabled for this deployment

  return (
    <Script
      id="gofunnel-tracking"
      src={`https://app.gofunnel.ai/api/tracking/script/${GOFUNNEL_ORG_ID}`}
      strategy="beforeInteractive"
    />
  )
}
