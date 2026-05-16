const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:3001";

export type BillingPlanId = "free" | "starter" | "pro";

export interface BillingTier {
  id: BillingPlanId;
  label: string;
  priceUsd: number;
  monthlyTokenLimit: number;
}

export interface BillingPlansCatalogResponse {
  basis: {
    freeMonthlyTokens: number;
    paidUsd: { starter: number; pro: number };
    paidTokensPerUsd: number;
  };
  tiers: BillingTier[];
}

export interface BillingUsageResponse extends BillingPlansCatalogResponse {
  assignedPlanId: BillingPlanId;
  monthlyGenerationTokensUsed: number;
  periodStartedAtUtc: string;
  periodEndsAtUtc: string;
  assignedTier: BillingTier;
}

export async function fetchBillingPlansCatalog(): Promise<BillingPlansCatalogResponse> {
  const response = await safeFetch(`${API_BASE_URL}/billing/plans`);

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as BillingPlansCatalogResponse;
}

export async function fetchBillingUsage(
  accessToken: string,
): Promise<BillingUsageResponse> {
  const response = await safeFetch(`${API_BASE_URL}/billing/usage`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as BillingUsageResponse;
}

export async function setBillingPlan(
  accessToken: string,
  plan: BillingPlanId,
): Promise<BillingUsageResponse> {
  const response = await safeFetch(`${API_BASE_URL}/billing/plan`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ plan }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as BillingUsageResponse;
}

async function safeFetch(url: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new Error(
      "Backend API is offline. Start the Nest server on port 3001 and try again.",
    );
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      message?: string | string[];
      error?: string;
    };
    const message = Array.isArray(body.message)
      ? body.message.join(" ")
      : body.message;

    return message ?? body.error ?? `Request failed with ${response.status}.`;
  } catch {
    return `Request failed with ${response.status}.`;
  }
}
