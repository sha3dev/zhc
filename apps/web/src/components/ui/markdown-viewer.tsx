import { cn } from '@/lib/utils';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { useEffect, useRef } from 'react';

const monoHighlight = HighlightStyle.define([
  {
    tag: tags.heading1,
    color: '#37F712',
    fontWeight: '700',
    textShadow: '0 0 6px rgba(55,247,18,0.4)',
  },
  { tag: tags.heading2, color: '#37F712', fontWeight: '700', opacity: '0.9' },
  { tag: tags.heading3, color: '#37F712', fontWeight: '600', opacity: '0.75' },
  { tag: [tags.heading4, tags.heading5, tags.heading6], color: '#37F712', opacity: '0.6' },
  { tag: tags.processingInstruction, color: 'rgba(55,247,18,0.45)', fontWeight: '400' },
  { tag: tags.strong, color: '#ffffff', fontWeight: '700' },
  { tag: tags.emphasis, color: '#d0ceca', fontStyle: 'italic' },
  { tag: [tags.strong, tags.emphasis], color: '#ffffff', fontWeight: '700', fontStyle: 'italic' },
  { tag: tags.monospace, color: '#FE9900', fontFamily: 'JetBrains Mono, monospace' },
  { tag: tags.link, color: '#00A6F4', textDecoration: 'underline' },
  { tag: tags.url, color: 'rgba(0,166,244,0.55)' },
  { tag: tags.list, color: '#00A6F4' },
  { tag: tags.quote, color: '#78716b', fontStyle: 'italic' },
  { tag: tags.contentSeparator, color: '#444' },
  { tag: tags.strikethrough, color: '#78716b', textDecoration: 'line-through' },
  { tag: tags.content, color: '#e5e3e0' },
]);

const monoTheme = EditorView.theme(
  {
    '&': {
      color: '#e5e3e0',
      backgroundColor: 'hsl(0,0%,4%)',
      fontFamily: 'JetBrains Mono, Space Mono, monospace',
      fontSize: '12px',
      lineHeight: '1.7',
    },
    '.cm-content': {
      padding: '14px 16px',
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'JetBrains Mono, Space Mono, monospace',
    },
    '.cm-gutters': {
      display: 'none',
    },
    '&.cm-focused': {
      outline: 'none',
    },
    '.cm-activeLine': {
      backgroundColor: 'transparent',
    },
    '.cm-selectionBackground, ::selection': {
      backgroundColor: 'rgba(55,247,18,0.1)',
    },
  },
  { dark: true },
);

interface MarkdownViewerProps {
  value: string;
  className?: string;
  minHeight?: string;
}

export function MarkdownViewer({ value, className, minHeight = '220px' }: MarkdownViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        markdown({ base: markdownLanguage }),
        syntaxHighlighting(monoHighlight),
        monoTheme,
        EditorView.lineWrapping,
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });
  }, [value]);

  return (
    <div
      ref={containerRef}
      style={{ minHeight }}
      className={cn(
        'w-full border border-input bg-background/80',
        '[&_.cm-editor]:min-h-[inherit] [&_.cm-scroller]:min-h-[inherit]',
        className,
      )}
    />
  );
}
