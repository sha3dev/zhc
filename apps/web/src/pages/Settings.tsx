import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionHeader } from '@/components/ui/section-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { fetchJson } from '@/lib/api';
import type { ConfigurationResponse, UpdateConfigurationInput } from '@/types/configuration';
import type { CliStatus, CliToolStatus, CliToolsResponse } from '@/types/tool';
import {
  AlertCircle,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Container,
  Gem,
  Github,
  Globe,
  Mail,
  Orbit,
  RefreshCw,
  Save,
  Sparkles,
  SquareTerminal,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SettingsSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>;
}

function Field({
  id,
  label,
  hint,
  children,
  fullWidth = false,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${fullWidth ? 'sm:col-span-2' : ''}`}>
      <Label htmlFor={id} className="font-mono text-foreground text-xs uppercase tracking-widest">
        {label}
      </Label>
      {children}
      {hint && <p className="font-code text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

function SectionCard({
  section,
  active,
  dimmed,
  children,
}: {
  section: SettingsSection;
  active: boolean;
  dimmed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      id={section.id}
      className="border border-border bg-card"
      style={
        active
          ? {
              borderColor: 'rgba(55,247,18,0.35)',
              boxShadow: 'inset 0 0 16px rgba(55,247,18,0.04)',
            }
          : dimmed
            ? { opacity: 0.55 }
            : undefined
      }
    >
      <div className="flex items-center gap-3 border-border border-b px-4 py-3.5 sm:px-5">
        <span
          className={dimmed ? 'text-muted-foreground' : 'text-primary'}
          style={dimmed ? undefined : { filter: 'drop-shadow(0 0 4px rgba(55,247,18,0.5))' }}
        >
          {section.icon}
        </span>
        <div className="min-w-0">
          <p className="font-bold font-mono text-foreground text-xs">{section.label}</p>
          <p className="truncate font-code text-2xs text-muted-foreground">{section.description}</p>
        </div>
      </div>
      <div className="space-y-4 px-4 py-4 sm:px-5">{children}</div>
    </div>
  );
}

// ─── CLI status badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CliStatus }) {
  if (status === 'configured') {
    return (
      <span className="flex items-center gap-1.5">
        <CheckCircle2
          className="h-3.5 w-3.5 text-primary"
          style={{ filter: 'drop-shadow(0 0 4px rgba(55,247,18,0.7))' }}
        />
        <span
          className="font-mono text-primary text-xs"
          style={{ textShadow: 'var(--glow-primary)' }}
        >
          configured
        </span>
      </span>
    );
  }
  if (status === 'installed') {
    return (
      <span className="flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
        <span className="font-mono text-xs text-yellow-500">not_configured</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      <XCircle className="h-3.5 w-3.5 text-destructive" />
      <span className="font-mono text-destructive text-xs">not_installed</span>
    </span>
  );
}

// ─── CLI Tool Status Card ─────────────────────────────────────────────────────

const CLI_META: Record<
  string,
  {
    authHint?: string;
    description: string;
    icon: React.ReactNode;
    installHint?: string;
    label: string;
    sectionId: string;
  }
> = {
  claude_code: {
    authHint: 'claude login',
    description: 'Anthropic CLI — claude',
    icon: <BrainCircuit className="h-4 w-4" />,
    installHint: 'npm install -g @anthropic-ai/claude-code',
    label: 'claude_code',
    sectionId: 'claude',
  },
  codex: {
    authHint: 'codex login',
    description: 'OpenAI CLI — codex',
    icon: <SquareTerminal className="h-4 w-4" />,
    installHint: 'npm install -g @openai/codex',
    label: 'codex',
    sectionId: 'codex',
  },
  kilo: {
    authHint: 'open kilo auth and sign in with your Kilo account',
    description: 'Kilo CLI — kilo',
    icon: <Gem className="h-4 w-4" />,
    installHint: 'npm install -g @kilocode/cli',
    label: 'kilo',
    sectionId: 'kilo',
  },
  gemini_cli: {
    authHint: 'open gemini and choose "Login with Google"',
    description: 'Google CLI — gemini',
    icon: <Sparkles className="h-4 w-4" />,
    installHint: 'npm install -g @google/gemini-cli',
    label: 'gemini_cli',
    sectionId: 'gemini',
  },
  opencode: {
    authHint: 'opencode login',
    description: 'OpenCode CLI — opencode',
    icon: <Orbit className="h-4 w-4" />,
    installHint: 'npm install -g opencode',
    label: 'opencode',
    sectionId: 'opencode',
  },
};

const CLI_TOOL_IDS = ['claude_code', 'codex', 'kilo', 'gemini_cli', 'opencode'] as const;

const CLI_SECTIONS: Array<{
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  toolId: string;
}> = CLI_TOOL_IDS.map((toolId) => ({
  id: CLI_META[toolId].sectionId,
  label: CLI_META[toolId].label,
  icon: CLI_META[toolId].icon,
  description: CLI_META[toolId].description,
  toolId,
}));

function CliStatusCard({ tool }: { tool: CliToolStatus }) {
  return (
    <div className="space-y-3">
      {/* Status + version row */}
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={tool.status} />
        {tool.version && (
          <span className="border border-border px-1.5 py-0.5 font-code text-2xs text-muted-foreground">
            v{tool.version}
          </span>
        )}
        <span className="ml-auto font-code text-2xs text-muted-foreground/50">
          $ {tool.command} --version
        </span>
      </div>

      {/* Not installed hint */}
      {tool.status === 'not_installed' && (
        <div className="space-y-1 border border-destructive/30 bg-destructive/5 px-3 py-2.5">
          <p className="font-code text-destructive text-xs">{'> command not found in PATH'}</p>
          {CLI_META[tool.id]?.installHint && (
            <p className="font-code text-2xs text-muted-foreground">
              {'$ '}
              <span className="text-muted-foreground/80">{CLI_META[tool.id].installHint}</span>
            </p>
          )}
        </div>
      )}

      {/* Installed but not configured hint */}
      {tool.status === 'installed' && (
        <div className="space-y-1 border border-yellow-500/30 bg-yellow-500/5 px-3 py-2.5">
          <p className="font-code text-xs text-yellow-500">
            {'> installed but authentication required'}
          </p>
          {CLI_META[tool.id]?.authHint && (
            <p className="font-code text-2xs text-muted-foreground">
              {'$ '}
              <span className="text-muted-foreground/80">{CLI_META[tool.id].authHint}</span>
            </p>
          )}
          {tool.id === 'gemini_cli' && (
            <p className="font-code text-2xs text-muted-foreground/70">
              {'> personal Google account / Google AI Ultra only; API keys are not used here'}
            </p>
          )}
        </div>
      )}

      {/* Models — only when configured */}
      {tool.status === 'configured' && (
        <div className="space-y-2">
          <p className="font-mono text-2xs text-muted-foreground uppercase tracking-widest">
            models ({tool.models.length})
          </p>
          {tool.models.length === 0 ? (
            <p className="font-code text-2xs text-muted-foreground/60">
              {'> no models returned by CLI'}
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {tool.models.map((name) => (
                <span
                  key={name}
                  className="border border-border px-1.5 py-0.5 font-code text-2xs text-muted-foreground"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CliToolsSection() {
  const [tools, setTools] = useState<CliToolStatus[]>([]);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTools = useCallback(async (recheck = false) => {
    setLoading(true);
    setError(null);
    try {
      const typed = await fetchJson<CliToolsResponse>(recheck ? '/tools/recheck' : '/tools', {
        method: recheck ? 'POST' : 'GET',
      });
      setTools(typed.items);
      setCachedAt(typed.cachedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load CLI status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTools();
  }, [loadTools]);

  const cachedAtLabel = cachedAt
    ? new Date(cachedAt).toLocaleString(undefined, {
        dateStyle: 'short',
        timeStyle: 'medium',
      })
    : null;

  return (
    <>
      {/* Recheck bar */}
      <div className="flex items-center justify-between border border-border bg-card px-4 py-3 sm:px-5">
        <p className="font-code text-2xs text-muted-foreground">
          {cachedAtLabel ? `> last refresh: ${cachedAtLabel}` : '> cli tools detected from PATH'}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => loadTools(true)}
          disabled={loading}
          className="font-mono text-xs"
        >
          <RefreshCw className={`mr-1.5 h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'checking…' : 'recheck'}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 border border-destructive/40 bg-destructive/5 px-4 py-3">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
          <p className="font-code text-destructive text-xs">{error}</p>
        </div>
      )}

      {CLI_SECTIONS.map((s) => {
        const tool = tools.find((t) => t.id === s.toolId);
        const status = tool?.status ?? null;
        const section: SettingsSection = {
          id: s.id,
          label: s.label,
          icon: s.icon,
          description: s.description,
        };
        return (
          <SectionCard
            key={s.id}
            section={section}
            active={false}
            dimmed={status === 'not_installed'}
          >
            {loading && !tool ? (
              <p className="animate-pulse font-code text-2xs text-muted-foreground">
                {'> checking…'}
              </p>
            ) : tool ? (
              <CliStatusCard tool={tool} />
            ) : (
              <p className="font-code text-2xs text-muted-foreground/60">{'> no data'}</p>
            )}
          </SectionCard>
        );
      })}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const SECTIONS: SettingsSection[] = [
  {
    id: 'dokku',
    label: 'dokku',
    icon: <Container className="h-4 w-4" />,
    description: 'Infrastructure deployment',
  },
  {
    id: 'github',
    label: 'github_app',
    icon: <Github className="h-4 w-4" />,
    description: 'Repository management',
  },
  {
    id: 'email',
    label: 'email',
    icon: <Mail className="h-4 w-4" />,
    description: 'Resend polling + transport',
  },
  {
    id: 'human',
    label: 'human',
    icon: <Mail className="h-4 w-4" />,
    description: 'Fallback human escalation target',
  },
  {
    id: 'steel',
    label: 'steel',
    icon: <Globe className="h-4 w-4" />,
    description: 'Cloud browser runtime for agents',
  },
];

export default function Settings() {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saveError, setSaveError] = useState('');
  const [loadError, setLoadError] = useState('');

  // ── Dokku ──
  const [dokkuHost, setDokkuHost] = useState('');
  const [dokkuUser, setDokkuUser] = useState('dokku');
  const [dokkuPort, setDokkuPort] = useState('22');

  // ── GitHub App ──
  const [ghAppId, setGhAppId] = useState('');
  const [ghInstallationId, setGhInstallationId] = useState('');
  const [ghClientId, setGhClientId] = useState('');
  const [ghClientSecret, setGhClientSecret] = useState('');
  const [ghPrivateKey, setGhPrivateKey] = useState('');
  const [ghClientSecretVisible, setGhClientSecretVisible] = useState(false);
  const [ghClientSecretConfigured, setGhClientSecretConfigured] = useState(false);
  const [ghPrivateKeyConfigured, setGhPrivateKeyConfigured] = useState(false);
  const [ghClientSecretDirty, setGhClientSecretDirty] = useState(false);
  const [ghPrivateKeyDirty, setGhPrivateKeyDirty] = useState(false);

  // ── Email ──
  const [emailFromName, setEmailFromName] = useState('');
  const [emailFromAddress, setEmailFromAddress] = useState('');
  const [emailInboundAddress, setEmailInboundAddress] = useState('');
  const [emailPollEnabled, setEmailPollEnabled] = useState('false');
  const [emailPollInterval, setEmailPollInterval] = useState('60');
  const [resendApiKey, setResendApiKey] = useState('');
  const [resendApiKeyConfigured, setResendApiKeyConfigured] = useState(false);
  const [resendApiKeyDirty, setResendApiKeyDirty] = useState(false);
  const [humanEmail, setHumanEmail] = useState('');
  const [steelApiKey, setSteelApiKey] = useState('');
  const [steelApiKeyConfigured, setSteelApiKeyConfigured] = useState(false);
  const [steelApiKeyDirty, setSteelApiKeyDirty] = useState(false);

  useEffect(() => {
    const loadConfiguration = async () => {
      setLoadingConfig(true);
      setLoadError('');
      try {
        const config = await fetchJson<ConfigurationResponse>('/configuration');
        setDokkuHost(config.dokku.host ?? '');
        setDokkuUser(config.dokku.sshUser ?? 'dokku');
        setDokkuPort(config.dokku.port ? String(config.dokku.port) : '22');

        setGhAppId(config.github.appId ?? '');
        setGhInstallationId(config.github.installationId ?? '');
        setGhClientId(config.github.clientId ?? '');
        setGhClientSecret('');
        setGhPrivateKey('');
        setGhClientSecretConfigured(config.github.clientSecret.configured);
        setGhPrivateKeyConfigured(config.github.privateKey.configured);
        setGhClientSecretDirty(false);
        setGhPrivateKeyDirty(false);

        setEmailFromName(config.email.fromName ?? '');
        setEmailFromAddress(config.email.fromAddress ?? '');
        setEmailInboundAddress(config.email.inboundAddress ?? '');
        setEmailPollEnabled(String(config.email.pollEnabled));
        setEmailPollInterval(String(config.email.pollIntervalSeconds ?? 60));
        setResendApiKey('');
        setResendApiKeyConfigured(config.email.resendApiKey.configured);
        setResendApiKeyDirty(false);
        setHumanEmail(config.human.email ?? '');
        setSteelApiKey('');
        setSteelApiKeyConfigured(config.steel.apiKey.configured);
        setSteelApiKeyDirty(false);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Unable to load configuration.');
      } finally {
        setLoadingConfig(false);
      }
    };

    void loadConfiguration();
  }, []);

  const handleSave = async () => {
    setSaveError('');
    try {
      const payload: UpdateConfigurationInput = {
        dokku: {
          host: dokkuHost.trim() || null,
          port: dokkuPort.trim() ? Number(dokkuPort) : null,
          sshUser: dokkuUser.trim() || null,
        },
        email: {
          fromAddress: emailFromAddress.trim() || null,
          fromName: emailFromName.trim() || null,
          inboundAddress: emailInboundAddress.trim() || null,
          pollEnabled: emailPollEnabled === 'true',
          pollIntervalSeconds: Number(emailPollInterval || '60'),
          ...(resendApiKeyDirty ? { resendApiKey } : {}),
        },
        github: {
          appId: ghAppId.trim() || null,
          clientId: ghClientId.trim() || null,
          installationId: ghInstallationId.trim() || null,
          ...(ghClientSecretDirty ? { clientSecret: ghClientSecret } : {}),
          ...(ghPrivateKeyDirty ? { privateKey: ghPrivateKey } : {}),
        },
        human: {
          email: humanEmail.trim() || null,
        },
        steel: {
          ...(steelApiKeyDirty ? { apiKey: steelApiKey } : {}),
        },
      };

      const config = await fetchJson<ConfigurationResponse>('/configuration', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setGhClientSecret('');
      setGhPrivateKey('');
      setResendApiKey('');
      setSteelApiKey('');
      setGhClientSecretConfigured(config.github.clientSecret.configured);
      setGhPrivateKeyConfigured(config.github.privateKey.configured);
      setResendApiKeyConfigured(config.email.resendApiKey.configured);
      setSteelApiKeyConfigured(config.steel.apiKey.configured);
      setGhClientSecretDirty(false);
      setGhPrivateKeyDirty(false);
      setResendApiKeyDirty(false);
      setSteelApiKeyDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Unable to save configuration.');
    }
  };

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => setActiveSection(null), 1500);
  };

  const NAV_ITEMS = [
    ...SECTIONS,
    ...CLI_SECTIONS.map((section) => ({
      id: section.id,
      label: section.label,
    })),
  ];

  return (
    <div
      className="relative min-h-screen space-y-6 p-4 sm:space-y-8 sm:p-6"
      style={{
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(55,247,18,0.018) 28px, rgba(55,247,18,0.018) 29px)',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <SectionHeader label="CONFIGURATION" />
          <h1 className="font-bold font-mono text-foreground text-xl sm:text-2xl">
            settings
            <span
              className="ml-1 animate-cursor-blink text-primary"
              style={{ textShadow: 'var(--glow-primary)' }}
            >
              |
            </span>
          </h1>
          <p className="hidden font-code text-muted-foreground text-xs sm:block">
            agent_orchestrator :: system configuration
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleSave}
          disabled={loadingConfig}
          className="mt-1 shrink-0"
          style={saved ? { boxShadow: '0 0 8px rgba(55,247,18,0.4)' } : undefined}
        >
          <Save className="mr-1.5 h-3 w-3" />
          {loadingConfig ? 'loading…' : saved ? 'saved' : 'save_all'}
        </Button>
      </div>

      {(loadError || saveError) && (
        <div className="border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="font-code text-destructive text-xs">{loadError || saveError}</p>
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* ── Jump nav (desktop) ──────────────────────────────────── */}
        <nav className="sticky top-6 hidden w-44 shrink-0 space-y-0.5 self-start lg:block">
          <p className="mono-label mb-2 px-1">config.sections</p>
          {NAV_ITEMS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollTo(s.id)}
              className="flex w-full items-center gap-2 border border-transparent px-2 py-1.5 font-mono text-muted-foreground text-xs transition-all duration-150 hover:border-border hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <span className="font-code text-2xs text-muted-foreground/60">
                {String(i + 1).padStart(2, '0')}
              </span>
              {s.label}
            </button>
          ))}
        </nav>

        {/* ── Sections ────────────────────────────────────────────── */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* 01 · Dokku */}
          <SectionCard section={SECTIONS[0]} active={activeSection === 'dokku'}>
            <FieldGroup>
              <Field id="dokku-host" label="host" hint="IP or hostname of your Dokku server">
                <Input
                  id="dokku-host"
                  value={dokkuHost}
                  onChange={(e) => setDokkuHost(e.target.value)}
                  placeholder="dokku.example.com"
                  className="font-mono text-xs"
                />
              </Field>
              <Field id="dokku-user" label="ssh_user" hint="Usually 'dokku'">
                <Input
                  id="dokku-user"
                  value={dokkuUser}
                  onChange={(e) => setDokkuUser(e.target.value)}
                  placeholder="dokku"
                  className="font-mono text-xs"
                />
              </Field>
              <Field id="dokku-port" label="ssh_port" hint="Default 22">
                <Input
                  id="dokku-port"
                  value={dokkuPort}
                  onChange={(e) => setDokkuPort(e.target.value)}
                  placeholder="22"
                  className="font-mono text-xs"
                />
              </Field>
            </FieldGroup>
            <div className="border border-border/50 bg-muted/30 px-3 py-2.5">
              <p className="font-code text-2xs text-muted-foreground">
                {
                  '> ssh authentication uses the key installed on this machine (~/.ssh/id_rsa or ssh-agent)'
                }
              </p>
            </div>
          </SectionCard>

          {/* 02 · GitHub App */}
          <SectionCard section={SECTIONS[1]} active={activeSection === 'github'}>
            <FieldGroup>
              <Field id="gh-app-id" label="app_id" hint="GitHub App numeric ID">
                <Input
                  id="gh-app-id"
                  value={ghAppId}
                  onChange={(e) => setGhAppId(e.target.value)}
                  placeholder="123456"
                  className="font-mono text-xs"
                />
              </Field>
              <Field
                id="gh-installation-id"
                label="installation_id"
                hint="Installation ID for your org/user"
              >
                <Input
                  id="gh-installation-id"
                  value={ghInstallationId}
                  onChange={(e) => setGhInstallationId(e.target.value)}
                  placeholder="78901234"
                  className="font-mono text-xs"
                />
              </Field>
              <Field id="gh-client-id" label="client_id" hint="OAuth App client ID">
                <Input
                  id="gh-client-id"
                  value={ghClientId}
                  onChange={(e) => setGhClientId(e.target.value)}
                  placeholder="Iv1.abc123def456"
                  className="font-mono text-xs"
                />
              </Field>
              <Field id="gh-client-secret" label="client_secret" hint="OAuth App client secret">
                <div className="relative">
                  <Input
                    id="gh-client-secret"
                    type={ghClientSecretVisible ? 'text' : 'password'}
                    value={ghClientSecret}
                    onChange={(e) => {
                      setGhClientSecretDirty(true);
                      setGhClientSecret(e.target.value);
                    }}
                    placeholder={ghClientSecretConfigured ? 'configured' : 'not configured'}
                    className="pr-10 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setGhClientSecretVisible((v) => !v)}
                    className="-translate-y-1/2 absolute top-1/2 right-2 font-code text-2xs text-muted-foreground transition-colors duration-150 hover:text-foreground"
                  >
                    {ghClientSecretVisible ? 'hide' : 'show'}
                  </button>
                </div>
              </Field>
            </FieldGroup>
            <Field
              id="gh-private-key"
              label="app_private_key"
              hint="PEM-encoded private key generated for the GitHub App"
              fullWidth
            >
              <Textarea
                id="gh-private-key"
                value={ghPrivateKey}
                onChange={(e) => {
                  setGhPrivateKeyDirty(true);
                  setGhPrivateKey(e.target.value);
                }}
                placeholder={
                  ghPrivateKeyConfigured
                    ? 'configured - paste a new PEM to replace, or clear to remove'
                    : '-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----'
                }
                className="min-h-[100px] resize-y font-mono text-xs"
              />
            </Field>
          </SectionCard>

          <SectionCard section={SECTIONS[2]} active={activeSection === 'email'}>
            <FieldGroup>
              <Field id="email-poll-enabled" label="poll_enabled" hint="Enable inbound polling">
                <Select value={emailPollEnabled} onValueChange={setEmailPollEnabled}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">true</SelectItem>
                    <SelectItem value="false">false</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field id="email-from-name" label="from_name" hint="Display name for outbound emails">
                <Input
                  id="email-from-name"
                  value={emailFromName}
                  onChange={(e) => setEmailFromName(e.target.value)}
                  placeholder="CEO"
                  className="font-mono text-xs"
                />
              </Field>
              <Field
                id="email-from-address"
                label="from_address"
                hint="Sender address used by Resend"
              >
                <Input
                  id="email-from-address"
                  value={emailFromAddress}
                  onChange={(e) => setEmailFromAddress(e.target.value)}
                  placeholder="ceo@example.com"
                  className="font-mono text-xs"
                />
              </Field>
              <Field
                id="email-inbound-address"
                label="inbound_address"
                hint="Inbound mailbox polled from Resend"
              >
                <Input
                  id="email-inbound-address"
                  value={emailInboundAddress}
                  onChange={(e) => setEmailInboundAddress(e.target.value)}
                  placeholder="ceo@inbound.resend.dev"
                  className="font-mono text-xs"
                />
              </Field>
              <Field
                id="email-poll-interval"
                label="poll_interval_seconds"
                hint="Default 60 seconds"
              >
                <Input
                  id="email-poll-interval"
                  value={emailPollInterval}
                  onChange={(e) => setEmailPollInterval(e.target.value)}
                  placeholder="60"
                  className="font-mono text-xs"
                />
              </Field>
              <Field
                id="resend-api-key"
                label="resend_api_key"
                hint="Leave untouched to preserve existing key"
                fullWidth
              >
                <Input
                  id="resend-api-key"
                  type="password"
                  value={resendApiKey}
                  onChange={(e) => {
                    setResendApiKeyDirty(true);
                    setResendApiKey(e.target.value);
                  }}
                  placeholder={resendApiKeyConfigured ? 'configured' : 're_...'}
                  className="font-mono text-xs"
                />
              </Field>
            </FieldGroup>
            <div className="border border-border/50 bg-muted/30 px-3 py-2.5">
              <p className="font-code text-2xs text-muted-foreground">
                {'> polling uses the server process; no webhook is required in v1'}
              </p>
            </div>
          </SectionCard>

          <SectionCard section={SECTIONS[3]} active={activeSection === 'human'}>
            <FieldGroup>
              <Field
                id="human-email"
                label="human.email"
                hint="Destination used when the CEO escalates to the human"
                fullWidth
              >
                <Input
                  id="human-email"
                  value={humanEmail}
                  onChange={(e) => setHumanEmail(e.target.value)}
                  placeholder="human@example.com"
                  className="font-mono text-xs"
                />
              </Field>
            </FieldGroup>
          </SectionCard>

          <SectionCard section={SECTIONS[4]} active={activeSection === 'steel'}>
            <FieldGroup>
              <Field
                id="steel-api-key"
                label="steel.api_key"
                hint="API key for Steel cloud browser sessions"
                fullWidth
              >
                <Input
                  id="steel-api-key"
                  type="password"
                  value={steelApiKey}
                  onChange={(e) => {
                    setSteelApiKeyDirty(true);
                    setSteelApiKey(e.target.value);
                  }}
                  placeholder={steelApiKeyConfigured ? 'configured' : 'stl_...'}
                  className="font-mono text-xs"
                />
              </Field>
            </FieldGroup>
            <div className="border border-border/50 bg-muted/30 px-3 py-2.5">
              <p className="font-code text-2xs text-muted-foreground">
                {
                  '> enables remote browsing, screenshots, persistent profiles, and authenticated sessions through Steel'
                }
              </p>
            </div>
          </SectionCard>

          {/* CLI Tools */}
          <CliToolsSection />

          {/* Bottom save bar */}
          <div className="flex items-center justify-between border border-border bg-card px-4 py-3 sm:px-5">
            <p className="font-code text-2xs text-muted-foreground">
              {'> changes are stored server-side'}
            </p>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={loadingConfig}
              style={saved ? { boxShadow: '0 0 8px rgba(55,247,18,0.4)' } : undefined}
            >
              <Save className="mr-1.5 h-3 w-3" />
              {loadingConfig ? 'loading…' : saved ? 'saved_!' : 'save_all'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
