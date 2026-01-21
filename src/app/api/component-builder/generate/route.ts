import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  generateComponentFromDescription,
  generateComponentFromSpec,
  ComponentSpecSchema,
} from "@/lib/component-builder";
import { rateLimit } from "@/lib/rate-limit";

const aiRateLimit = { interval: 60000, maxRequests: 10 };

const GenerateRequestSchema = z.object({
  description: z.string().min(1).optional(),
  spec: ComponentSpecSchema.optional(),
  preferences: z.object({
    type: z.enum(["client", "server"]).optional(),
    styling: z.enum(["tailwind", "css-modules", "inline"]).optional(),
    features: z.array(z.string()).optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResult = rateLimit(`component-builder:${session.user?.id ?? "anonymous"}`, aiRateLimit);
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await request.json();
    const { description, spec, preferences } = GenerateRequestSchema.parse(body);

    if (spec) {
      const output = generateComponentFromSpec(spec);
      return NextResponse.json(output);
    }

    if (description) {
      const output = await generateComponentFromDescription({
        description,
        preferences,
      });
      return NextResponse.json(output);
    }

    return NextResponse.json(
      { error: "Either description or spec must be provided" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Component generation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate component" },
      { status: 500 }
    );
  }
}
