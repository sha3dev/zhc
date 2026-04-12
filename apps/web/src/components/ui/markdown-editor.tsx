import { cn } from '@/lib/utils';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { useEffect, useRef } from 'react';

// ─── Mono highlight style ────────────────────────────────────────────────────

const monoHighlight = HighlightStyle.define([
  // Headings — primary green, bold
  {
    tag: tags.heading1,
    color: '#37F712',
    fontWeight: '700',
    textShadow: '0 0 6px rgba(55,247,18,0.4)',
  },
  { tag: tags.heading2, color: '#37F712', fontWeight: '700', opacity: '0.9' },
  { tag: tags.heading3, color: '#37F712', fontWeight: '600', opacity: '0.75' },
  { tag: [tags.heading4, tags.heading5, tags.heading6], color: '#37F712', opacity: '0.6' },

  // Heading markers (#, ##) — dimmed green
  { tag: tags.processingInstruction, color: 'rgba(55,247,18,0.45)', fontWeight: '400' },

  // Bold
  { tag: tags.strong, color: '#ffffff', fontWeight: '700' },
  // Italic
  { tag: tags.emphasis, color: '#d0ceca', fontStyle: 'italic' },
  // Bold + italic
  { tag: [tags.strong, tags.emphasis], color: '#ffffff', fontWeight: '700', fontStyle: 'italic' },

  // Inline code
  { tag: tags.monospace, color: '#FE9900', fontFamily: 'JetBrains Mono, monospace' },

  // Links
  { tag: tags.link, color: '#00A6F4', textDecoration: 'underline' },
  { tag: tags.url, color: 'rgba(0,166,244,0.55)' },

  // List marker (-, *, 1.)
  { tag: tags.list, color: '#00A6F4' },

  // Blockquote
  { tag: tags.quote, color: '#78716b', fontStyle: 'italic' },

  // HR / thematic break
  { tag: tags.contentSeparator, color: '#444' },

  // Strikethrough
  { tag: tags.strikethrough, color: '#78716b', textDecoration: 'line-through' },

  // Plain text
  { tag: tags.content, color: '#e5e3e0' },
]);

// ─── CodeMirror base theme ───────────────────────────────────────────────────

const monoTheme = EditorView.theme(
  {
    '&': {
      color: '#e5e3e0',
      backgroundColor: 'hsl(0,0%,4%)',
      fontFamily: 'JetBrains Mono, Space Mono, monospace',
      fontSize: '12px',
      lineHeight: '1.6',
    },
    '.cm-content': {
      padding: '10px 12px',
      caretColor: '#37F712',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#37F712',
      borderLeftWidth: '2px',
    },
    '&.cm-focused .cm-cursor': {
      boxShadow: '0 0 4px rgba(55,247,18,0.5)',
    },
    '.cm-selectionBackground, ::selection': {
      backgroundColor: 'rgba(55,247,18,0.12)',
    },
    '&.cm-focused .cm-selectionBackground': {
      backgroundColor: 'rgba(55,247,18,0.15)',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(255,255,255,0.025)',
    },
    '.cm-gutters': {
      display: 'none',
    },
    '.cm-scroller': {
      overflowX: 'auto',
    },
    // Focus ring handled by wrapper
    '&.cm-focused': {
      outline: 'none',
    },
  },
  { dark: true },
);

// ─── Component ───────────────────────────────────────────────────────────────

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Set to true to fill the parent flex container instead of using a fixed minHeight */
  fill?: boolean;
  minHeight?: string;
  className?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  fill = false,
  minHeight = '220px',
  className,
}: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  // Keep callback ref fresh without rebuilding the editor
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Build the editor once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const placeholderExt = placeholder
      ? EditorView.theme({ '.cm-placeholder': { color: '#504b46' } })
      : [];

    const state = EditorState.create({
      doc: value,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        markdown({ base: markdownLanguage }),
        syntaxHighlighting(monoHighlight),
        monoTheme,
        placeholderExt,
        updateListener,
        EditorView.lineWrapping,
        EditorState.tabSize.of(2),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally only on mount

  // Sync external value changes (e.g. form reset) without disturbing cursor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      style={fill ? undefined : { minHeight }}
      className={cn(
        'w-full border border-input bg-background',
        'transition-all duration-200',
        'focus-within:border-ring focus-within:ring-1 focus-within:ring-ring',
        fill
          ? 'min-h-0 flex-1 [&_.cm-content]:min-h-full [&_.cm-editor]:h-full [&_.cm-scroller]:h-full'
          : '[&_.cm-editor]:min-h-[inherit] [&_.cm-scroller]:min-h-[inherit]',
        className,
      )}
    />
  );
}
