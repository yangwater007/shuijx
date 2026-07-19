import type { SupabaseClient } from "@supabase/supabase-js";

export interface ToolContext {
  supabase: SupabaseClient;
  args: Record<string, unknown>;
}

export interface ToolDef {
  description: string;
  handler: (ctx: ToolContext) => Promise<string>;
}

// Import tool modules
import { MARKET_TOOLS } from "./market.ts";
import { LIMIT_TOOLS } from "./limit.ts";
import { CAPITAL_TOOLS } from "./capital.ts";
import { REVIEW_TOOLS } from "./review.ts";

export const ALL_TOOLS: Record<string, ToolDef> = {
  ...MARKET_TOOLS,
  ...LIMIT_TOOLS,
  ...CAPITAL_TOOLS,
  ...REVIEW_TOOLS,
};
