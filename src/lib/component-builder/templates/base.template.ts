import type { ComponentSpec, Prop } from "../spec";

export function baseTemplate(spec: ComponentSpec): string {
  const imports = generateImports(spec);
  const propsInterface = generatePropsInterface(spec);
  const stateDeclarations = generateStateDeclarations(spec);
  const jsx = generateJSX(spec);

  return `${spec.type === "client" ? '"use client";\n\n' : ""}${imports}

${propsInterface}

export function ${spec.name}(${getPropsSignature(spec)}) {
${stateDeclarations}
  return (
${jsx}
  );
}
`;
}

function generateImports(spec: ComponentSpec): string {
  const imports: string[] = [];

  if (spec.type === "client") {
    const hooks: string[] = [];
    if (spec.features.includes("loading-state") || spec.features.includes("error-state")) {
      hooks.push("useState");
    }
    if (spec.dataSource?.type === "fetch") {
      hooks.push("useEffect");
    }
    if (hooks.length > 0) {
      imports.push(`import { ${hooks.join(", ")} } from "react";`);
    }
  }

  if (spec.features.includes("loading-state")) {
    imports.push('import { Spinner } from "@/components/ui/spinner";');
  }

  if (spec.styling === "tailwind") {
    imports.push('import { cn } from "@/lib/utils";');
  }

  return imports.join("\n");
}

function generatePropsInterface(spec: ComponentSpec): string {
  if (spec.props.length === 0 && !spec.hasChildren) {
    return "";
  }

  const propLines = spec.props.map((prop) => {
    const comment = prop.description ? `  /** ${prop.description} */\n` : "";
    const optional = prop.required ? "" : "?";
    const defaultComment = prop.defaultValue ? ` // default: ${prop.defaultValue}` : "";
    return `${comment}  ${prop.name}${optional}: ${prop.type};${defaultComment}`;
  });

  if (spec.hasChildren) {
    propLines.push("  children?: React.ReactNode;");
  }

  return `interface ${spec.name}Props {
${propLines.join("\n")}
}`;
}

function getPropsSignature(spec: ComponentSpec): string {
  if (spec.props.length === 0 && !spec.hasChildren) {
    return "";
  }

  const propNames = spec.props.map((p) => {
    if (p.defaultValue) {
      return `${p.name} = ${p.defaultValue}`;
    }
    return p.name;
  });

  if (spec.hasChildren) {
    propNames.push("children");
  }

  return `{ ${propNames.join(", ")} }: ${spec.name}Props`;
}

function generateStateDeclarations(spec: ComponentSpec): string {
  const lines: string[] = [];

  if (spec.features.includes("loading-state")) {
    lines.push("  const [isLoading, setIsLoading] = useState(false);");
  }

  if (spec.features.includes("error-state")) {
    lines.push("  const [error, setError] = useState<Error | null>(null);");
  }

  if (spec.features.includes("search")) {
    lines.push('  const [searchQuery, setSearchQuery] = useState("");');
  }

  if (spec.features.includes("pagination")) {
    lines.push("  const [page, setPage] = useState(1);");
  }

  if (spec.features.includes("sorting")) {
    lines.push('  const [sortBy, setSortBy] = useState<string | null>(null);');
    lines.push('  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");');
  }

  if (spec.dataSource?.type === "fetch") {
    lines.push("  const [data, setData] = useState<unknown>(null);");
  }

  if (lines.length > 0) {
    lines.push("");
  }

  if (spec.features.includes("loading-state")) {
    lines.push(`  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Spinner />
      </div>
    );
  }
`);
  }

  if (spec.features.includes("error-state")) {
    lines.push(`  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        Error: {error.message}
      </div>
    );
  }
`);
  }

  if (spec.features.includes("empty-state") && spec.dataSource) {
    lines.push(`  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        No data available
      </div>
    );
  }
`);
  }

  return lines.join("\n");
}

function generateJSX(spec: ComponentSpec): string {
  const containerClasses: string[] = [];
  
  if (spec.features.includes("responsive")) {
    containerClasses.push("w-full");
  }

  if (spec.features.includes("dark-mode")) {
    containerClasses.push("bg-white dark:bg-zinc-900");
  }

  if (spec.features.includes("animations")) {
    containerClasses.push("transition-all duration-200");
  }

  const classAttr = containerClasses.length > 0
    ? ` className="${containerClasses.join(" ")}"`
    : "";

  let content = spec.hasChildren ? "{children}" : "/* Component content */";

  if (spec.features.includes("search")) {
    content = `<div className="mb-4">
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
        />
      </div>
      ${content}`;
  }

  if (spec.features.includes("pagination")) {
    content = `${content}
      <div className="mt-4 flex items-center justify-center gap-2">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="rounded px-3 py-1 border disabled:opacity-50"
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          className="rounded px-3 py-1 border"
        >
          Next
        </button>
      </div>`;
  }

  return `    <div${classAttr}>
      ${content}
    </div>`;
}
