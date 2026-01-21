"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getGuardianConfig, saveGuardianConfig, type GuardianConfig } from "./actions";

const AVAILABLE_LANGUAGES = [
  "typescript",
  "javascript",
  "python",
  "go",
  "rust",
  "java",
  "c",
  "cpp",
];

export default function GuardianPage() {
  const [config, setConfig] = useState<GuardianConfig | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getGuardianConfig().then(setConfig);
  }, []);

  const handleSave = () => {
    if (!config) return;
    startTransition(async () => {
      const result = await saveGuardianConfig(config);
      if (result.success) {
        toast.success("Guardian configuration saved");
      } else {
        toast.error(result.error || "Failed to save configuration");
      }
    });
  };

  if (!config) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <p className="text-gray-500">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Guardian Settings
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configure the Guardian workflow supervisor for your development environment.
        </p>
      </div>

      <div className="space-y-6">
        {/* Master Toggle */}
        <Card>
          <CardHeader>
            <CardTitle>Guardian Status</CardTitle>
            <CardDescription>
              Enable or disable the Guardian workflow supervisor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="guardian-enabled">Guardian Enabled</Label>
              <Switch
                id="guardian-enabled"
                checked={config.guardian.enabled}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    guardian: { ...config.guardian, enabled: checked },
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Nudge Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Nudge Configuration</CardTitle>
            <CardDescription>
              Configure when Guardian should nudge you about various conditions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Commit Nudge */}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Commit Nudge</Label>
                  <p className="text-sm text-gray-500">
                    Remind to commit when files change without commits
                  </p>
                </div>
                <Switch
                  checked={config.guardian.nudges.commit.enabled}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      guardian: {
                        ...config.guardian,
                        nudges: {
                          ...config.guardian.nudges,
                          commit: { ...config.guardian.nudges.commit, enabled: checked },
                        },
                      },
                    })
                  }
                />
              </div>
              {config.guardian.nudges.commit.enabled && (
                <div className="grid gap-4 pt-2 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="files-threshold">
                      Files Threshold: {config.guardian.nudges.commit.filesThreshold}
                    </Label>
                    <input
                      type="range"
                      id="files-threshold"
                      min={1}
                      max={20}
                      value={config.guardian.nudges.commit.filesThreshold}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          guardian: {
                            ...config.guardian,
                            nudges: {
                              ...config.guardian.nudges,
                              commit: {
                                ...config.guardian.nudges.commit,
                                filesThreshold: parseInt(e.target.value),
                              },
                            },
                          },
                        })
                      }
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      Nudge after this many files changed
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minutes-threshold">
                      Minutes Threshold: {config.guardian.nudges.commit.minutesThreshold}
                    </Label>
                    <input
                      type="range"
                      id="minutes-threshold"
                      min={5}
                      max={60}
                      value={config.guardian.nudges.commit.minutesThreshold}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          guardian: {
                            ...config.guardian,
                            nudges: {
                              ...config.guardian.nudges,
                              commit: {
                                ...config.guardian.nudges.commit,
                                minutesThreshold: parseInt(e.target.value),
                              },
                            },
                          },
                        })
                      }
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      Minutes since last commit before nudging
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Test Nudge */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label className="text-base font-medium">Test Nudge</Label>
                <p className="text-sm text-gray-500">
                  Remind to run tests after code changes
                </p>
              </div>
              <Switch
                checked={config.guardian.nudges.test.enabled}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    guardian: {
                      ...config.guardian,
                      nudges: {
                        ...config.guardian.nudges,
                        test: { enabled: checked },
                      },
                    },
                  })
                }
              />
            </div>

            {/* Progress Nudge */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label className="text-base font-medium">Progress Nudge</Label>
                <p className="text-sm text-gray-500">
                  Remind about current plan step if work seems off-topic
                </p>
              </div>
              <Switch
                checked={config.guardian.nudges.progress.enabled}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    guardian: {
                      ...config.guardian,
                      nudges: {
                        ...config.guardian.nudges,
                        progress: { enabled: checked },
                      },
                    },
                  })
                }
              />
            </div>

            {/* Context Nudge */}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Context Nudge</Label>
                  <p className="text-sm text-gray-500">
                    Warn when context window is getting full
                  </p>
                </div>
                <Switch
                  checked={config.guardian.nudges.context.enabled}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      guardian: {
                        ...config.guardian,
                        nudges: {
                          ...config.guardian.nudges,
                          context: { ...config.guardian.nudges.context, enabled: checked },
                        },
                      },
                    })
                  }
                />
              </div>
              {config.guardian.nudges.context.enabled && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="context-threshold">
                    Threshold: {Math.round(config.guardian.nudges.context.threshold * 100)}%
                  </Label>
                  <input
                    type="range"
                    id="context-threshold"
                    min={50}
                    max={100}
                    value={config.guardian.nudges.context.threshold * 100}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        guardian: {
                          ...config.guardian,
                          nudges: {
                            ...config.guardian.nudges,
                            context: {
                              ...config.guardian.nudges.context,
                              threshold: parseInt(e.target.value) / 100,
                            },
                          },
                        },
                      })
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Nudge when context window reaches this percentage
                  </p>
                </div>
              )}
            </div>

            {/* Error Nudge */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label className="text-base font-medium">Error Nudge</Label>
                <p className="text-sm text-gray-500">
                  Alert about detected errors or diagnostics
                </p>
              </div>
              <Switch
                checked={config.guardian.nudges.error.enabled}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    guardian: {
                      ...config.guardian,
                      nudges: {
                        ...config.guardian.nudges,
                        error: { enabled: checked },
                      },
                    },
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Cooldown Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Cooldown Settings</CardTitle>
            <CardDescription>
              Prevent nudge spam by configuring cooldown periods
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cooldown-minutes">
                Minutes Between Nudges: {config.guardian.cooldown.minutes}
              </Label>
              <input
                type="range"
                id="cooldown-minutes"
                min={1}
                max={30}
                value={config.guardian.cooldown.minutes}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    guardian: {
                      ...config.guardian,
                      cooldown: {
                        ...config.guardian.cooldown,
                        minutes: parseInt(e.target.value),
                      },
                    },
                  })
                }
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cooldown-tool-uses">
                Tool Uses Between Nudges: {config.guardian.cooldown.toolUses}
              </Label>
              <input
                type="range"
                id="cooldown-tool-uses"
                min={1}
                max={20}
                value={config.guardian.cooldown.toolUses}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    guardian: {
                      ...config.guardian,
                      cooldown: {
                        ...config.guardian.cooldown,
                        toolUses: parseInt(e.target.value),
                      },
                    },
                  })
                }
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Worktree Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Worktree Settings</CardTitle>
            <CardDescription>
              Configure git worktree isolation for parallel agent work
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="worktree-base-dir">Base Directory</Label>
              <Input
                id="worktree-base-dir"
                value={config.worktrees.baseDir}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    worktrees: { ...config.worktrees, baseDir: e.target.value },
                  })
                }
                placeholder=".worktrees"
              />
              <p className="text-xs text-gray-500">
                Directory where worktrees will be created
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="worktree-branch-prefix">Branch Prefix</Label>
              <Input
                id="worktree-branch-prefix"
                value={config.worktrees.branchPrefix}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    worktrees: { ...config.worktrees, branchPrefix: e.target.value },
                  })
                }
                placeholder="ccplate/"
              />
              <p className="text-xs text-gray-500">
                Prefix for branches created by worktrees
              </p>
            </div>
          </CardContent>
        </Card>

        {/* LSP Settings */}
        <Card>
          <CardHeader>
            <CardTitle>LSP Settings</CardTitle>
            <CardDescription>
              Language Server Protocol integration for code intelligence
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="lsp-enabled">LSP Enabled</Label>
              <Switch
                id="lsp-enabled"
                checked={config.lsp.enabled}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    lsp: { ...config.lsp, enabled: checked },
                  })
                }
              />
            </div>
            {config.lsp.enabled && (
              <div className="space-y-2 pt-2">
                <Label>Languages</Label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        const languages = config.lsp.languages.includes(lang)
                          ? config.lsp.languages.filter((l) => l !== lang)
                          : [...config.lsp.languages, lang];
                        setConfig({
                          ...config,
                          lsp: { ...config.lsp, languages },
                        });
                      }}
                      className={`rounded-full px-3 py-1 text-sm transition-colors ${
                        config.lsp.languages.includes(lang)
                          ? "bg-primary text-primary-foreground"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Select languages for LSP support
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RLM Settings */}
        <Card>
          <CardHeader>
            <CardTitle>RLM Settings</CardTitle>
            <CardDescription>
              Recursive Language Model for infinite context retrieval
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="rlm-enabled">RLM Enabled</Label>
              <Switch
                id="rlm-enabled"
                checked={config.rlm.enabled}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    rlm: { ...config.rlm, enabled: checked },
                  })
                }
              />
            </div>
            {config.rlm.enabled && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="max-excerpt-lines">
                    Max Excerpt Lines: {config.rlm.maxExcerptLines}
                  </Label>
                  <input
                    type="range"
                    id="max-excerpt-lines"
                    min={10}
                    max={100}
                    value={config.rlm.maxExcerptLines}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        rlm: {
                          ...config.rlm,
                          maxExcerptLines: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Maximum lines per code excerpt
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recursion-threshold">
                    Recursion Threshold: {config.rlm.recursionThreshold}
                  </Label>
                  <input
                    type="range"
                    id="recursion-threshold"
                    min={5}
                    max={50}
                    value={config.rlm.recursionThreshold}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        rlm: {
                          ...config.rlm,
                          recursionThreshold: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Number of files before spawning subagents
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-recursion-depth">
                    Max Recursion Depth: {config.rlm.maxRecursionDepth}
                  </Label>
                  <input
                    type="range"
                    id="max-recursion-depth"
                    min={1}
                    max={5}
                    value={config.rlm.maxRecursionDepth}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        rlm: {
                          ...config.rlm,
                          maxRecursionDepth: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Maximum depth of recursive subagent spawning
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} loading={isPending} size="lg">
            Save Configuration
          </Button>
        </div>
      </div>
    </div>
  );
}
