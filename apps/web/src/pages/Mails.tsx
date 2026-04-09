import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SectionHeader } from '@/components/ui/section-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchJson } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type {
  EmailAddress,
  EmailDetails,
  EmailDirection,
  EmailStatus,
  ListEmailsResponse,
  SyncEmailsResponse,
} from '@/types/mail';
import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

function formatAddressList(items: EmailAddress[] | null | undefined): string {
  if (!items || items.length === 0) {
    return 'n/a';
  }

  return items
    .map((item) => (item.name ? `${item.name} <${item.address}>` : item.address))
    .join(', ');
}

function getStatusVariant(status: EmailStatus) {
  switch (status) {
    case 'received':
      return 'info';
    case 'sent':
      return 'success';
    case 'failed':
      return 'destructive';
  }
}

function getDirectionLabel(direction: EmailDirection) {
  return direction === 'inbound' ? 'inbound' : 'outbound';
}

export default function Mails() {
  const [direction, setDirection] = useState<'all' | EmailDirection>('all');
  const [status, setStatus] = useState<'all' | EmailStatus>('all');
  const [search, setSearch] = useState('');
  const [emails, setEmails] = useState<ListEmailsResponse['items']>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [syncMessage, setSyncMessage] = useState('');

  const loadEmails = async (nextSelectedId?: number | null) => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      if (direction !== 'all') params.set('direction', direction);
      if (status !== 'all') params.set('status', status);
      if (search.trim()) params.set('search', search.trim());

      const response = await fetchJson<ListEmailsResponse>(`/mails?${params.toString()}`);
      setEmails(response.items);

      const targetId = nextSelectedId ?? selectedId ?? response.items[0]?.id ?? null;
      setSelectedId(targetId);

      if (targetId) {
        setSelectedEmail(await fetchJson<EmailDetails>(`/mails/${targetId}`));
      } else {
        setSelectedEmail(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load emails.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEmails();
  }, [direction, status]);

  const handleSearch = async () => {
    await loadEmails(null);
  };

  const handleSelect = async (id: number) => {
    setSelectedId(id);
    setSelectedEmail(await fetchJson<EmailDetails>(`/mails/${id}`));
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage('');
    setError('');

    try {
      const result = await fetchJson<SyncEmailsResponse>('/mails/sync', { method: 'POST' });
      setSyncMessage(`imported=${result.imported} skipped=${result.skipped}`);
      await loadEmails(selectedId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to sync emails.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div
      className="relative min-h-full space-y-6 p-4 sm:space-y-8 sm:p-6"
      style={{
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(55,247,18,0.018) 28px, rgba(55,247,18,0.018) 29px)',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <SectionHeader label="MAILS" />
          <h1 className="font-mono text-xl font-bold text-foreground sm:text-2xl">
            mails
            <span
              className="ml-1 animate-cursor-blink text-primary"
              style={{ textShadow: 'var(--glow-primary)' }}
            >
              |
            </span>
          </h1>
          <p className="hidden font-code text-xs text-muted-foreground sm:block">
            agent_orchestrator :: inbound and outbound mail log
          </p>
        </div>

        <Button size="sm" onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`mr-1.5 h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'syncing…' : 'sync_now'}
        </Button>
      </div>

      {(error || syncMessage) && (
        <div className="border border-border bg-card px-4 py-3">
          {error && <p className="font-code text-destructive text-xs">{`> error: ${error}`}</p>}
          {!error && syncMessage && (
            <p className="font-code text-primary text-xs">{`> ${syncMessage}`}</p>
          )}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
        <div className="space-y-4">
          <div className="grid gap-3 border border-border bg-card p-4 sm:grid-cols-4">
            <Select
              value={direction}
              onValueChange={(value) => setDirection(value as 'all' | EmailDirection)}
            >
              <SelectTrigger>
                <SelectValue placeholder="direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">all directions</SelectItem>
                <SelectItem value="inbound">inbound</SelectItem>
                <SelectItem value="outbound">outbound</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={status}
              onValueChange={(value) => setStatus(value as 'all' | EmailStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">all status</SelectItem>
                <SelectItem value="received">received</SelectItem>
                <SelectItem value="sent">sent</SelectItem>
                <SelectItem value="failed">failed</SelectItem>
              </SelectContent>
            </Select>

            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="search subject / sender"
              className="font-mono text-xs sm:col-span-2"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void handleSearch();
                }
              }}
            />
          </div>

          <div className="border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>direction</TableHead>
                  <TableHead>subject</TableHead>
                  <TableHead>counterparty</TableHead>
                  <TableHead>agent</TableHead>
                  <TableHead>date</TableHead>
                  <TableHead>status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      loading…
                    </TableCell>
                  </TableRow>
                ) : emails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      no emails found
                    </TableCell>
                  </TableRow>
                ) : (
                  emails.map((email) => (
                    <TableRow
                      key={email.id}
                      data-state={selectedId === email.id ? 'selected' : undefined}
                      onClick={() => void handleSelect(email.id)}
                    >
                      <TableCell>{getDirectionLabel(email.direction)}</TableCell>
                      <TableCell className="max-w-[240px] truncate">
                        {email.subject || '(no subject)'}
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate">
                        {email.direction === 'inbound'
                          ? email.fromName || email.fromAddress || 'n/a'
                          : formatAddressList(email.toAddresses)}
                      </TableCell>
                      <TableCell>{email.agentName || 'n/a'}</TableCell>
                      <TableCell>
                        {formatDate(email.providerCreatedAt || email.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(email.status)}>{email.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <p className="font-mono text-xs text-foreground">mail.detail</p>
          </div>
          <div className="space-y-4 px-4 py-4">
            {!selectedEmail ? (
              <p className="font-code text-xs text-muted-foreground">{'> select an email'}</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Badge variant={selectedEmail.direction === 'inbound' ? 'info' : 'default'}>
                    {selectedEmail.direction}
                  </Badge>
                  <h2 className="font-mono text-sm text-foreground">
                    {selectedEmail.subject || '(no subject)'}
                  </h2>
                  <p className="font-code text-2xs text-muted-foreground">
                    {formatDate(selectedEmail.providerCreatedAt || selectedEmail.createdAt)}
                  </p>
                </div>

                <div className="space-y-2 border-t border-border pt-4 font-code text-xs">
                  <p>
                    <span className="text-muted-foreground">from:</span>{' '}
                    {selectedEmail.fromName
                      ? `${selectedEmail.fromName} <${selectedEmail.fromAddress}>`
                      : selectedEmail.fromAddress || 'n/a'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">to:</span>{' '}
                    {formatAddressList(selectedEmail.toAddresses)}
                  </p>
                  <p>
                    <span className="text-muted-foreground">cc:</span>{' '}
                    {formatAddressList(selectedEmail.ccAddresses)}
                  </p>
                  <p>
                    <span className="text-muted-foreground">bcc:</span>{' '}
                    {formatAddressList(selectedEmail.bccAddresses)}
                  </p>
                  <p>
                    <span className="text-muted-foreground">agent:</span>{' '}
                    {selectedEmail.agentName || 'n/a'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">provider:</span>{' '}
                    {selectedEmail.provider}
                  </p>
                  <p>
                    <span className="text-muted-foreground">provider_id:</span>{' '}
                    {selectedEmail.providerMessageId}
                  </p>
                  <p>
                    <span className="text-muted-foreground">message_id:</span>{' '}
                    {selectedEmail.messageIdHeader || 'n/a'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">in_reply_to:</span>{' '}
                    {selectedEmail.inReplyToHeader || 'n/a'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">references:</span>{' '}
                    {selectedEmail.references?.join(', ') || 'n/a'}
                  </p>
                  {selectedEmail.errorMessage && (
                    <p>
                      <span className="text-muted-foreground">error:</span>{' '}
                      {selectedEmail.errorMessage}
                    </p>
                  )}
                </div>

                <div className="space-y-2 border-t border-border pt-4">
                  <p className="font-mono text-xs text-foreground">text_body</p>
                  <pre className="max-h-[240px] overflow-auto whitespace-pre-wrap border border-border bg-muted/20 p-3 font-code text-2xs text-muted-foreground">
                    {selectedEmail.textBody || 'n/a'}
                  </pre>
                </div>

                <div className="space-y-2 border-t border-border pt-4">
                  <p className="font-mono text-xs text-foreground">html_body</p>
                  <pre className="max-h-[160px] overflow-auto whitespace-pre-wrap border border-border bg-muted/20 p-3 font-code text-2xs text-muted-foreground">
                    {selectedEmail.htmlBody || 'n/a'}
                  </pre>
                </div>

                <div className="space-y-2 border-t border-border pt-4">
                  <p className="font-mono text-xs text-foreground">raw_payload</p>
                  <pre className="max-h-[240px] overflow-auto whitespace-pre-wrap border border-border bg-muted/20 p-3 font-code text-2xs text-muted-foreground">
                    {JSON.stringify(selectedEmail.rawPayload, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
