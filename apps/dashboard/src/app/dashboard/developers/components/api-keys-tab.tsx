'use client';

import {
  Copy,
  Check,
  MoreHorizontal,
  RefreshCw,
  AlertTriangle,
  Terminal,
  ExternalLink,
  Key,
} from 'lucide-react';
import { cn, dedent } from '@/lib/utils';
import { CodeBlock } from '@/components/ui/code-block';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useApiKeys } from '../hooks/use-api-keys';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050';

export function ApiKeysTab() {
  const {
    session,
    copied,
    rotating,
    isRotateDialogOpen,
    setIsRotateDialogOpen,
    newKey,
    setNewKey,
    selectedIntegrationLanguage,
    setSelectedIntegrationLanguage,
    copyToClipboard,
    handleRotateKey,
  } = useApiKeys();

  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Standard keys</CardTitle>
          <CardDescription className="text-xs">
            These keys authenticate API requests. Secret keys are only visible
            once upon creation.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pt-0">
          <div className="border-border/40 overflow-hidden rounded-lg border shadow-sm">
            <Table>
              <TableHeader className="bg-muted/20">
                <TableRow className="border-border/30 h-12 hover:bg-transparent">
                  <TableHead className="w-40 pl-6 text-[10px] font-bold tracking-wider uppercase">
                    Name
                  </TableHead>
                  <TableHead className="text-[10px] font-bold tracking-wider uppercase">
                    Token
                  </TableHead>
                  <TableHead className="text-[10px] font-bold tracking-wider uppercase">
                    Status
                  </TableHead>
                  <TableHead className="pr-6 text-right text-[10px] font-bold tracking-wider uppercase">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="group">
                  <TableCell className="pl-6 text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <Key className="text-muted-foreground size-3.5" />
                      Secret key
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm tracking-wider">
                    <div className="flex items-center gap-2">
                      <span>
                        {session?.user?.apiKey
                          ? `knot_sk_...${session.user.apiKey.slice(-4)}`
                          : 'knot_sk_********************'}
                      </span>
                      <Badge
                        variant="outline"
                        className="h-4 px-1 text-[9px] font-bold tracking-wide uppercase"
                      >
                        Live
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-500">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuLabel className="text-xs">
                          Actions
                        </DropdownMenuLabel>
                        {session?.user?.apiKey && (
                          <DropdownMenuItem
                            className="text-xs"
                            onClick={() =>
                              copyToClipboard(
                                session.user.apiKey as string,
                                'sk',
                              )
                            }
                          >
                            <Copy className="mr-2 h-3.5 w-3.5" />
                            Copy key
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-xs"
                          onClick={() => setIsRotateDialogOpen(true)}
                        >
                          <RefreshCw className="mr-2 h-3.5 w-3.5" />
                          Roll key...
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive text-xs">
                          <AlertTriangle className="mr-2 h-3.5 w-3.5" />
                          Revoke key
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex w-full flex-col items-start gap-6">
        <Card className="group relative w-full overflow-hidden border bg-[#0c0c0c] text-slate-50 shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-2 xl:gap-12">
              <div className="flex flex-col gap-6 sm:gap-10">
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-50">
                    Integration Guide
                  </h3>
                  <p className="text-xs text-slate-400">
                    The fastest way to test and integrate with KnotEngine.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Terminal className="size-4 text-emerald-500" />
                    <h4 className="text-sm font-bold text-slate-50">
                      Create an invoice
                    </h4>
                  </div>
                  <p className="max-w-sm text-[13px] leading-relaxed text-slate-400">
                    Generate a new payment invoice instantly using our REST API
                    or the official Node.js SDK.
                  </p>
                  <div className="flex pt-2 text-xs">
                    <a
                      href="https://github.com/qodinger/knotengine?tab=readme-ov-file#-self-hosting"
                      target="_blank"
                      className="inline-flex items-center gap-1.5 font-medium text-slate-300 transition-colors hover:text-white"
                    >
                      API Reference <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-4">
                <div className="flex items-center">
                  <div className="flex rounded-lg border border-white/5 bg-white/5 p-1">
                    <button
                      onClick={() => setSelectedIntegrationLanguage('nodejs')}
                      className={cn(
                        'rounded-md px-3 py-1 text-[10px] font-bold tracking-tight uppercase transition-all',
                        selectedIntegrationLanguage === 'nodejs'
                          ? 'border border-white/5 bg-[#0A0A0A] text-slate-100 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200',
                      )}
                    >
                      Node.js SDK
                    </button>
                    <button
                      onClick={() => setSelectedIntegrationLanguage('curl')}
                      className={cn(
                        'rounded-md px-3 py-1 text-[10px] font-bold tracking-tight uppercase transition-all',
                        selectedIntegrationLanguage === 'curl'
                          ? 'border border-white/5 bg-[#0A0A0A] text-slate-100 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200',
                      )}
                    >
                      cURL
                    </button>
                  </div>
                </div>

                {selectedIntegrationLanguage === 'curl' ? (
                  <CodeBlock
                    language="bash"
                    className="w-full"
                    code={dedent`
                      curl -X POST ${API_BASE_URL}/v1/invoices \\
                        -H "x-api-key: YOUR_KEY" \\
                        -H "Content-Type: application/json" \\
                        -d '{ "amount_usd": 100, "currency": "BTC" }'
                    `}
                  />
                ) : (
                  <div className="w-full min-w-0 space-y-4">
                    <CodeBlock
                      language="typescript"
                      className="w-full"
                      code={dedent`
                        import { KnotClient } from '@qodinger/knot-sdk';

                        const knot = new KnotClient({ apiKey: 'YOUR_KEY' });

                        const invoice = await knot.createInvoice({
                          amount_usd: 100,
                          currency: 'BTC'
                        });
                      `}
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isRotateDialogOpen} onOpenChange={setIsRotateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Roll API Key</DialogTitle>
            <DialogDescription>
              Are you sure? The current key will be invalidated immediately, and
              any applications using it will stop working.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRotateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRotateKey}
              disabled={rotating}
            >
              {rotating && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Roll key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(newKey)}
        onOpenChange={(open) => !open && setNewKey(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>API Key Generated</DialogTitle>
            <DialogDescription>
              Copy your new API key now. You will not be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 flex items-center space-x-2">
            <Input
              readOnly
              value={newKey || ''}
              className="font-mono text-sm"
            />
            <Button
              size="icon"
              variant="secondary"
              onClick={() => newKey && copyToClipboard(newKey, 'newkey')}
            >
              {copied === 'newkey' ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <Alert
            variant="default"
            className="mb-4 border-amber-500/20 bg-amber-500/10 text-amber-600"
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-sm">Save this key</AlertTitle>
            <AlertDescription className="text-xs">
              Save this key in a secure location like a password manager or
              environment variable.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button type="button" onClick={() => setNewKey(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
