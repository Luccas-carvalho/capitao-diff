import "dotenv/config";

import bcrypt from "bcryptjs";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();
const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "*"
  })
);

const jwtSecret = process.env.JWT_SECRET ?? "super-secret-change-me";
const port = Number.parseInt(process.env.PORT ?? "4000", 10);

type AuthedRequest = Request & {
  userId?: string;
};

const getParamValue = (value: string | string[] | undefined): string | null => {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
};

const authMiddleware = (request: AuthedRequest, response: Response, next: NextFunction): void => {
  const token = request.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    response.status(401).json({ message: "Missing token" });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as { sub: string };
    request.userId = decoded.sub;
    next();
  } catch {
    response.status(401).json({ message: "Invalid token" });
  }
};

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "capitao-diff-api" });
});

app.post("/auth/register", async (request, response) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
  });

  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    response.status(409).json({ message: "User already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      passwordHash
    }
  });

  const token = jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: "7d" });
  response.status(201).json({ token, user: { id: user.id, email: user.email } });
});

app.post("/auth/login", async (request, response) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
  });

  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    response.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    response.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const token = jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: "7d" });
  response.json({ token, user: { id: user.id, email: user.email } });
});

app.get("/projects", authMiddleware, async (request: AuthedRequest, response) => {
  const projects = await prisma.project.findMany({
    where: { ownerId: request.userId },
    include: {
      runs: {
        orderBy: { createdAt: "desc" },
        take: 5
      },
      issues: {
        orderBy: { createdAt: "desc" },
        take: 10
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  response.json(projects);
});

app.post("/projects", authMiddleware, async (request: AuthedRequest, response) => {
  const schema = z.object({
    name: z.string().min(2),
    repoUrl: z.string().url().optional()
  });

  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
    return;
  }

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      repoUrl: parsed.data.repoUrl,
      ownerId: request.userId!
    }
  });

  response.status(201).json(project);
});

app.get("/projects/:projectId/runs", authMiddleware, async (request: AuthedRequest, response) => {
  const projectId = getParamValue(request.params.projectId);
  if (!projectId) {
    response.status(400).json({ message: "Invalid project id" });
    return;
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: request.userId
    }
  });

  if (!project) {
    response.status(404).json({ message: "Project not found" });
    return;
  }

  const runs = await prisma.qaRun.findMany({
    where: { projectId: project.id },
    include: { screenshots: true, report: true },
    orderBy: { createdAt: "desc" }
  });

  response.json(runs);
});

app.post("/projects/:projectId/runs", authMiddleware, async (request: AuthedRequest, response) => {
  const projectId = getParamValue(request.params.projectId);
  if (!projectId) {
    response.status(400).json({ message: "Invalid project id" });
    return;
  }

  const schema = z.object({
    status: z.enum(["approved", "rejected"]),
    score: z.number().int().min(0).max(100),
    summary: z.string().min(1),
    language: z.enum(["en", "pt"]),
    resultMarkdown: z.string().min(1),
    screenshots: z
      .array(
        z.object({
          path: z.string().min(1),
          viewport: z.string().min(1)
        })
      )
      .default([]),
    reportPayload: z.record(z.any())
  });

  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
    return;
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: request.userId
    }
  });

  if (!project) {
    response.status(404).json({ message: "Project not found" });
    return;
  }

  const run = await prisma.qaRun.create({
    data: {
      projectId: project.id,
      status: parsed.data.status,
      score: parsed.data.score,
      summary: parsed.data.summary,
      language: parsed.data.language,
      resultMarkdown: parsed.data.resultMarkdown,
      screenshots: {
        createMany: {
          data: parsed.data.screenshots
        }
      },
      report: {
        create: {
          payload: parsed.data.reportPayload
        }
      }
    },
    include: {
      screenshots: true,
      report: true
    }
  });

  response.status(201).json(run);
});

app.get("/projects/:projectId/issues", authMiddleware, async (request: AuthedRequest, response) => {
  const projectId = getParamValue(request.params.projectId);
  if (!projectId) {
    response.status(400).json({ message: "Invalid project id" });
    return;
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: request.userId
    }
  });

  if (!project) {
    response.status(404).json({ message: "Project not found" });
    return;
  }

  const issues = await prisma.issue.findMany({
    where: { projectId: project.id },
    orderBy: { updatedAt: "desc" }
  });

  response.json(issues);
});

app.post("/projects/:projectId/issues", authMiddleware, async (request: AuthedRequest, response) => {
  const projectId = getParamValue(request.params.projectId);
  if (!projectId) {
    response.status(400).json({ message: "Invalid project id" });
    return;
  }

  const schema = z.object({
    title: z.string().min(3),
    description: z.string().min(3),
    severity: z.enum(["low", "medium", "high", "critical"])
  });

  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
    return;
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: request.userId
    }
  });

  if (!project) {
    response.status(404).json({ message: "Project not found" });
    return;
  }

  const issue = await prisma.issue.create({
    data: {
      projectId: project.id,
      title: parsed.data.title,
      description: parsed.data.description,
      severity: parsed.data.severity
    }
  });

  response.status(201).json(issue);
});

app.patch("/issues/:issueId", authMiddleware, async (request: AuthedRequest, response) => {
  const issueId = getParamValue(request.params.issueId);
  if (!issueId) {
    response.status(400).json({ message: "Invalid issue id" });
    return;
  }

  const schema = z.object({
    status: z.enum(["open", "in_progress", "resolved"]).optional(),
    severity: z.enum(["low", "medium", "high", "critical"]).optional(),
    title: z.string().min(3).optional(),
    description: z.string().min(3).optional()
  });

  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
    return;
  }

  const issue = await prisma.issue.findUnique({
    where: { id: issueId }
  });

  if (!issue) {
    response.status(404).json({ message: "Issue not found" });
    return;
  }

  const ownsProject = await prisma.project.findFirst({
    where: {
      id: issue.projectId,
      ownerId: request.userId
    },
    select: { id: true }
  });

  if (!ownsProject) {
    response.status(404).json({ message: "Issue not found" });
    return;
  }

  const updated = await prisma.issue.update({
    where: { id: issue.id },
    data: parsed.data
  });

  response.json(updated);
});

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  console.error(error);
  response.status(500).json({ message: "Internal server error" });
});

app.listen(port, () => {
  console.log(`Capitão Diff API running on port ${port}`);
});
