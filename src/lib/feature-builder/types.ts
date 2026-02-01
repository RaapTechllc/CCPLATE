import type { APISpec, GeneratedFiles } from "@/lib/api-builder";
import type { ComponentBuilderOutput } from "@/lib/component-builder";
import type { HookSpec } from "@/lib/hook-builder";
import type { Model } from "@/lib/schema-builder";

export interface FeatureMetricsStep {
  step: "schema" | "api" | "hooks" | "components";
  minutesSaved: number;
}

export interface FeatureMetrics {
  estimatedMinutesSaved: number;
  steps: FeatureMetricsStep[];
}

export interface FeatureSchemaOutput {
  model: Model;
  modelCode: string;
  diff: string;
  existingModels: string[];
}

export interface FeatureApiOutput {
  spec: APISpec;
  files: GeneratedFiles;
  existingFiles: string[];
}

export interface FeatureHookOutput {
  spec: HookSpec;
  code: string;
  filename: string;
  suggestedPath: string;
  exists: boolean;
}

export interface FeatureComponentOutput extends ComponentBuilderOutput {
  exists: boolean;
}

export interface FeatureBuilderResponse {
  featureName: string;
  basePath: string;
  schema?: FeatureSchemaOutput;
  api?: FeatureApiOutput;
  hooks?: FeatureHookOutput[];
  components?: FeatureComponentOutput[];
  metrics: FeatureMetrics;
}

export interface FeatureBuilderMetrics {
  totalEvents: number;
  totalMinutesSaved: number;
  byEventType: Record<string, number>;
  byBuilder: Record<string, number>;
  recentEvents: Array<{
    id: string;
    builder: string;
    eventType: string;
    estimatedMinutesSaved?: number;
    createdAt: string;
  }>;
}
