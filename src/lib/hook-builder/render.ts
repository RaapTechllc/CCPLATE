import type { HookSpec } from "./spec";
import { renderQueryTemplate } from "./templates/use-query.template";
import { renderMutationTemplate } from "./templates/use-mutation.template";
import { renderInfiniteQueryTemplate } from "./templates/use-infinite-query.template";
import { renderFormTemplate } from "./templates/use-form.template";

export function renderHook(spec: HookSpec): string {
  switch (spec.kind) {
    case "query":
      return renderQueryTemplate(spec);
    case "mutation":
      return renderMutationTemplate(spec);
    case "infiniteQuery":
      return renderInfiniteQueryTemplate(spec);
    case "form":
      return renderFormTemplate(spec);
    default:
      throw new Error(`Unknown hook kind: ${spec.kind}`);
  }
}
