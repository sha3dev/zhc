import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hono } from 'hono';

const FILES_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECTS_ROOT = resolve(FILES_DIR, '../../../../../projects');

const TEXT_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.ini',
  '.sh',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.py',
  '.rb',
  '.go',
  '.rs',
  '.html',
  '.css',
  '.xml',
  '.csv',
  '.log',
  '.sql',
  '.env',
  '.gitignore',
  '.graphql',
  '.proto',
]);

const IGNORED_NAMES = new Set(['node_modules', 'dist', '.git', '__pycache__', '.next', 'venv']);

interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileEntry[];
  extension?: string;
}

async function buildTree(dir: string, rootDir: string, depth = 0): Promise<FileEntry[]> {
  if (depth > 10) return [];

  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }

  const entries: FileEntry[] = [];

  for (const name of names.sort()) {
    if (name.startsWith('.') || IGNORED_NAMES.has(name)) continue;

    const fullPath = join(dir, name);
    const relativePath = relative(rootDir, fullPath);

    let fileStat: Awaited<ReturnType<typeof stat>>;
    try {
      fileStat = await stat(fullPath);
    } catch {
      continue;
    }

    if (fileStat.isDirectory()) {
      const children = await buildTree(fullPath, rootDir, depth + 1);
      entries.push({ name, path: relativePath, type: 'directory', children });
    } else {
      entries.push({ name, path: relativePath, type: 'file', extension: extname(name) });
    }
  }

  return entries;
}

function isSafePath(requestedPath: string): boolean {
  const resolved = resolve(PROJECTS_ROOT, requestedPath);
  const rel = relative(PROJECTS_ROOT, resolved);
  return !rel.startsWith('..');
}

export function createFilesRouter(): Hono {
  const router = new Hono();

  router.get('/', async (context) => {
    const tree = await buildTree(PROJECTS_ROOT, PROJECTS_ROOT);
    return context.json({ tree });
  });

  router.get('/content', async (context) => {
    const path = context.req.query('path') ?? '';
    if (!path) {
      return context.json({ error: 'Missing path parameter' }, 400);
    }

    if (!isSafePath(path)) {
      return context.json({ error: 'Invalid path' }, 403);
    }

    const safePath = resolve(PROJECTS_ROOT, path);
    const ext = extname(safePath).toLowerCase();
    const isPdf = ext === '.pdf';
    const isText = TEXT_EXTENSIONS.has(ext);

    if (!isPdf && !isText) {
      return context.json({ error: 'Unsupported file type' }, 400);
    }

    let content: Buffer;
    try {
      content = await readFile(safePath);
    } catch {
      return context.json({ error: 'File not found' }, 404);
    }

    if (isPdf) {
      return new Response(content, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline',
        },
      });
    }

    return context.text(content.toString('utf-8'));
  });

  return router;
}
