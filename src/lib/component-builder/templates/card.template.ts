import type { ComponentSpec } from "../spec";

export function cardTemplate(spec: ComponentSpec): string {
  const isClient = spec.type === "client";
  const hasAnimations = spec.features.includes("animations");
  const hasDarkMode = spec.features.includes("dark-mode");
  const hasLoadingState = spec.features.includes("loading-state");

  const imports = [
    isClient ? '"use client";\n' : "",
    'import { cn } from "@/lib/utils";',
    'import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";',
    hasLoadingState ? 'import { Spinner } from "@/components/ui/spinner";' : "",
  ].filter(Boolean).join("\n");

  return `${imports}

interface ${spec.name}Props {
  title: string;
  description?: string;
  footer?: React.ReactNode;
  className?: string;
${spec.hasChildren ? "  children?: React.ReactNode;\n" : ""}${hasLoadingState ? "  isLoading?: boolean;\n" : ""}}

export function ${spec.name}({
  title,
  description,
  footer,
  className,
${spec.hasChildren ? "  children,\n" : ""}${hasLoadingState ? "  isLoading,\n" : ""}}: ${spec.name}Props) {
${hasLoadingState ? `  if (isLoading) {
    return (
      <Card className={cn("${hasAnimations ? "transition-all duration-200 " : ""}${hasDarkMode ? "bg-white dark:bg-zinc-900 " : ""}", className)}>
        <CardContent className="flex items-center justify-center p-8">
          <Spinner />
        </CardContent>
      </Card>
    );
  }
` : ""}
  return (
    <Card className={cn("${hasAnimations ? "transition-all duration-200 hover:shadow-lg " : ""}${hasDarkMode ? "bg-white dark:bg-zinc-900 " : ""}", className)}>
      <CardHeader>
        <CardTitle>${spec.features.includes("responsive") ? '<span className="text-lg md:text-xl">{title}</span>' : "{title}"}</CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
${spec.hasChildren ? `      <CardContent>
        {children}
      </CardContent>
` : ""}      {footer && (
        <CardFooter>
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}
`;
}
