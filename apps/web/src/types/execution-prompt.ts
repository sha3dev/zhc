export interface PromptBlock {
  content: string;
  key: string;
  kind: 'identity' | 'command' | 'memory' | 'context' | 'input' | 'static';
  title: string;
}
