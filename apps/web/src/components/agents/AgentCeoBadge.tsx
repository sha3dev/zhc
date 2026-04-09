import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';

export function AgentCeoBadge() {
  return (
    <Badge
      variant="warning"
      className="inline-flex h-5 w-5 items-center justify-center border-yellow-500/40 bg-yellow-500/10 p-0 text-yellow-300"
    >
      <Crown className="h-3 w-3" />
    </Badge>
  );
}
