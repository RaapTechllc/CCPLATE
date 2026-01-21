"use client";

interface GeneratedModel {
  id: string;
  description: string;
  modelName: string;
  modelCode: string;
  createdAt: Date;
  applied: boolean;
}

interface ModelHistoryProps {
  history: GeneratedModel[];
  onSelect: (model: GeneratedModel) => void;
}

export function ModelHistory({ history, onSelect }: ModelHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="text-sm text-zinc-500 dark:text-zinc-400 py-4 text-center">
        No models generated yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Recent Generations
      </h3>
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {history.map((model) => (
          <button
            key={model.id}
            onClick={() => onSelect(model)}
            className="w-full text-left p-3 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                  {model.modelName}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  {model.description}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {formatTimeAgo(model.createdAt)}
                </span>
                {model.applied && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                    Applied
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export type { GeneratedModel };
