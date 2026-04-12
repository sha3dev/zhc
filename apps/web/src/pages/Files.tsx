import { SectionHeader } from '@/components/ui/section-header';
import { MarkdownViewer } from '@/components/ui/markdown-viewer';
import { fetchJson } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react';
import { useEffect, useState } from 'react';

const TEXT_VIEWABLE_EXTS = new Set([
  '.txt', '.md', '.json', '.yaml', '.yml', '.toml', '.ini', '.sh',
  '.ts', '.tsx', '.js', '.jsx', '.py', '.rb', '.go', '.rs',
  '.html', '.css', '.xml', '.csv', '.log', '.sql', '.env',
  '.gitignore', '.graphql', '.proto',
]);

interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileEntry[];
  extension?: string;
}

interface FilesTreeResponse {
  tree: FileEntry[];
}

function getApiBase(): string {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
  return configured ? configured.replace(/\/$/, '') : '/api';
}

function isViewable(entry: FileEntry): boolean {
  if (entry.type !== 'file') return false;
  return entry.extension === '.pdf' || TEXT_VIEWABLE_EXTS.has(entry.extension ?? '');
}

function TreeNode({
  entry,
  selectedPath,
  onSelect,
  depth = 0,
  defaultExpanded = false,
}: {
  entry: FileEntry;
  selectedPath: string | null;
  onSelect: (entry: FileEntry) => void;
  depth?: number;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (entry.type === 'directory') {
    return (
      <div>
        <button
          type="button"
          className="flex w-full items-center gap-1.5 py-1 text-left font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          style={{ paddingLeft: `${8 + depth * 12}px`, paddingRight: '8px' }}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="w-3 shrink-0">
            {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </span>
          <Folder size={11} className="shrink-0 text-primary/60" />
          <span className="truncate">{entry.name}</span>
        </button>
        {expanded &&
          entry.children?.map((child) => (
            <TreeNode
              key={child.path}
              entry={child}
              selectedPath={selectedPath}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
      </div>
    );
  }

  const viewable = isViewable(entry);
  const isSelected = selectedPath === entry.path;

  return (
    <button
      type="button"
      disabled={!viewable}
      className={cn(
        'flex w-full items-center gap-1.5 py-1 text-left font-mono text-xs transition-colors',
        isSelected
          ? 'border border-primary/30 bg-primary/5 text-primary'
          : 'border border-transparent',
        viewable ? 'cursor-pointer text-muted-foreground hover:text-foreground' : 'cursor-default text-muted-foreground/40',
      )}
      style={{ paddingLeft: `${8 + depth * 12}px`, paddingRight: '8px' }}
      onClick={() => viewable && onSelect(entry)}
    >
      <span className="w-3 shrink-0" />
      <File size={11} className="shrink-0 opacity-60" />
      <span className="truncate">{entry.name}</span>
    </button>
  );
}

type ViewState =
  | { status: 'empty' }
  | { status: 'loading'; path: string }
  | { status: 'pdf'; path: string; url: string }
  | { status: 'text'; path: string; ext: string; content: string }
  | { status: 'error'; path: string; message: string };

export default function Files() {
  const [tree, setTree] = useState<FileEntry[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [selected, setSelected] = useState<FileEntry | null>(null);
  const [viewState, setViewState] = useState<ViewState>({ status: 'empty' });

  useEffect(() => {
    fetchJson<FilesTreeResponse>('/files')
      .then((data) => setTree(data.tree))
      .catch(() => setTree([]))
      .finally(() => setTreeLoading(false));
  }, []);

  const handleSelect = async (entry: FileEntry) => {
    setSelected(entry);

    if (entry.extension === '.pdf') {
      const url = `${getApiBase()}/files/content?path=${encodeURIComponent(entry.path)}`;
      setViewState({ status: 'pdf', path: entry.path, url });
      return;
    }

    setViewState({ status: 'loading', path: entry.path });
    try {
      const url = `${getApiBase()}/files/content?path=${encodeURIComponent(entry.path)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      setViewState({ status: 'text', path: entry.path, ext: entry.extension ?? '', content: text });
    } catch (err) {
      setViewState({ status: 'error', path: entry.path, message: String(err) });
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-4 sm:p-6">
      <SectionHeader label="files.browser" />
      <div className="flex flex-1 overflow-hidden border border-border">
        {/* File tree */}
        <div className="w-60 shrink-0 overflow-y-auto border-r border-border">
          <div className="border-b border-border px-3 py-2">
            <p className="mono-label">fs.tree</p>
          </div>
          {treeLoading ? (
            <p className="animate-pulse px-3 py-2 font-mono text-2xs text-muted-foreground">
              loading...
            </p>
          ) : tree.length === 0 ? (
            <p className="px-3 py-2 font-mono text-2xs text-muted-foreground">no files found</p>
          ) : (
            <div className="py-1">
              {tree.map((entry) => (
                <TreeNode
                  key={entry.path}
                  entry={entry}
                  selectedPath={selected?.path ?? null}
                  onSelect={handleSelect}
                  defaultExpanded={true}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content viewer */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {selected && (
            <div className="border-b border-border px-3 py-2">
              <p className="mono-label truncate font-mono text-2xs text-muted-foreground">
                {selected.path}
              </p>
            </div>
          )}

          {viewState.status === 'empty' && (
            <div className="flex flex-1 items-center justify-center">
              <p className="font-mono text-xs text-muted-foreground">
                {'> select a file to view'}
              </p>
            </div>
          )}

          {viewState.status === 'loading' && (
            <div className="flex flex-1 items-center justify-center">
              <p className="animate-pulse font-mono text-xs text-muted-foreground">loading...</p>
            </div>
          )}

          {viewState.status === 'error' && (
            <div className="flex flex-1 items-center justify-center">
              <p className="font-mono text-xs text-destructive">{`error: ${viewState.message}`}</p>
            </div>
          )}

          {viewState.status === 'pdf' && (
            <iframe
              src={viewState.url}
              className="w-full flex-1 border-0"
              title={viewState.path}
            />
          )}

          {viewState.status === 'text' &&
            (viewState.ext === '.md' ? (
              <MarkdownViewer
                value={viewState.content}
                minHeight="100%"
                className="flex-1 overflow-auto"
              />
            ) : (
              <pre className="flex-1 overflow-auto whitespace-pre-wrap break-words bg-background p-4 font-mono text-xs text-foreground/80">
                {viewState.content}
              </pre>
            ))}
        </div>
      </div>
    </div>
  );
}
