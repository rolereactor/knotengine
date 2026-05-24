"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import {
  MoreHorizontal,
  UserPlus,
  History,
  ArrowRightLeft,
  LogOut,
  AlertTriangle,
  RefreshCw,
  Users,
  XCircle,
  Trash2,
  Shield,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { fetcher, swrKeys } from "@/lib/swr";

type RoleHistoryEntry = {
  from: string;
  to: string;
  changedBy: string;
  changedAt: string;
  reason?: string;
};

type Member = {
  id: string;
  userId: string | null;
  email: string;
  image: string | null;
  role: "owner" | "admin" | "developer" | "viewer" | "billing";
  accepted: boolean;
  invitedAt: string;
  acceptedAt?: string;
  roleHistory: RoleHistoryEntry[];
  isSelf: boolean;
};

type MerchantData = {
  plan?: string;
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  developer: "Developer",
  viewer: "Viewer",
  billing: "Billing",
};

const ROLE_COLORS: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  owner: "default",
  admin: "secondary",
  developer: "outline",
  viewer: "outline",
  billing: "secondary",
};

const PLAN_SEAT_LIMITS: Record<string, number> = {
  starter: 2,
  professional: 10,
  enterprise: Infinity,
};

export default function TeamPage() {
  const { data: session } = useSession();
  const merchantId = (session?.user as { merchantId?: string })?.merchantId;

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<
    "admin" | "developer" | "viewer" | "billing"
  >("viewer");
  const [inviting, setInviting] = useState(false);
  const [historyMember, setHistoryMember] = useState<Member | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [roleChangeReason, setRoleChangeReason] = useState("");
  const [roleChangeMember, setRoleChangeMember] = useState<string | null>(null);
  const [revokeConfirmMember, setRevokeConfirmMember] = useState<Member | null>(
    null,
  );
  const [revoking, setRevoking] = useState(false);

  const { data: merchantData } = useSWR<MerchantData>(
    swrKeys.merchant,
    fetcher,
    { revalidateOnFocus: false },
  );

  const plan = merchantData?.plan || "starter";
  const seatLimit = PLAN_SEAT_LIMITS[plan] ?? 2;

  const currentMember = members.find((m) => m.isSelf);
  const isOwner = currentMember?.role === "owner";
  const isAdmin = currentMember?.role === "admin";

  const activeMembers = members.filter((m) => m.accepted);
  const pendingMembers = members.filter((m) => !m.accepted);
  const seatCount = activeMembers.length;
  const atSeatLimit = seatLimit !== Infinity && seatCount >= seatLimit;

  const fetchMembers = useCallback(async () => {
    if (!merchantId) return;
    try {
      const res = await fetch(`/api/v1/merchants/${merchantId}/team`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      } else {
        console.error("Failed to load team members:", res.status);
        toast.error("Failed to load team members");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !merchantId) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/v1/merchants/${merchantId}/team/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchMembers();
        setInviteOpen(false);
        setInviteEmail("");
        toast.success(data.message || `Invite sent to ${inviteEmail}`);
      } else {
        toast.error(data.error || "Failed to send invite");
      }
    } catch {
      toast.error("Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (
    memberId: string,
    role: "admin" | "developer" | "viewer" | "billing",
  ) => {
    if (!merchantId) return;
    try {
      const res = await fetch(
        `/api/v1/merchants/${merchantId}/team/${memberId}/role`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, reason: roleChangeReason || undefined }),
        },
      );
      if (res.ok) {
        await fetchMembers();
        setRoleChangeMember(null);
        setRoleChangeReason("");
        toast.success("Role updated");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update role");
      }
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!merchantId) return;
    try {
      const res = await fetch(
        `/api/v1/merchants/${merchantId}/team/${memberId}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (res.ok) {
        await fetchMembers();
        toast.success("Member removed");
      } else {
        toast.error(data.error || "Failed to remove member");
      }
    } catch {
      toast.error("Failed to remove member");
    }
  };

  const handleRevokeInvite = async () => {
    if (!merchantId || !revokeConfirmMember) return;
    setRevoking(true);
    try {
      const res = await fetch(
        `/api/v1/merchants/${merchantId}/team/${revokeConfirmMember.id}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (res.ok) {
        await fetchMembers();
        setRevokeConfirmMember(null);
        toast.success("Invite revoked");
      } else {
        toast.error(data.error || "Failed to revoke invite");
      }
    } catch {
      toast.error("Failed to revoke invite");
    } finally {
      setRevoking(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!merchantId || !transferTarget) return;
    setTransferring(true);
    try {
      const res = await fetch(
        `/api/v1/merchants/${merchantId}/team/transfer-ownership`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newOwnerId: transferTarget,
            reason: transferReason || undefined,
          }),
        },
      );
      const data = await res.json();
      if (res.ok) {
        await fetchMembers();
        setTransferOpen(false);
        setTransferTarget("");
        setTransferReason("");
        toast.success(data.message || "Ownership transferred");
      } else {
        toast.error(data.error || "Failed to transfer ownership");
      }
    } catch {
      toast.error("Failed to transfer ownership");
    } finally {
      setTransferring(false);
    }
  };

  const handleLeaveMerchant = async () => {
    if (!merchantId) return;
    setLeaving(true);
    try {
      const res = await fetch(`/api/v1/merchants/${merchantId}/team/leave`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "You have left the merchant");
        window.location.href = "/dashboard";
      } else {
        toast.error(data.error || "Failed to leave merchant");
      }
    } catch {
      toast.error("Failed to leave merchant");
    } finally {
      setLeaving(false);
      setLeaveConfirmOpen(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!merchantId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">No merchant selected</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Team</h2>
          <p className="text-muted-foreground">
            Manage who has access to this merchant.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {loading ? (
            <Skeleton className="hidden h-4 w-20 sm:block" />
          ) : (
            <div className="text-muted-foreground hidden text-sm sm:block">
              <span
                className={atSeatLimit ? "text-destructive font-medium" : ""}
              >
                {seatCount}
              </span>
              {seatLimit !== Infinity ? (
                <span>/{seatLimit} seats</span>
              ) : (
                <span> seats used</span>
              )}
            </div>
          )}
          {loading ? (
            <Skeleton className="h-9 w-36" />
          ) : (
            (isOwner || isAdmin) && (
              <Button
                onClick={() => setInviteOpen(true)}
                disabled={atSeatLimit}
                title={
                  atSeatLimit
                    ? `Seat limit reached for ${plan} plan`
                    : undefined
                }
              >
                <UserPlus className="mr-2 size-4" />
                Invite Member
              </Button>
            )
          )}
        </div>
      </div>

      {/* Active Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-4" />
            Members
            <Badge variant="secondary" className="ml-1 font-mono text-xs">
              {activeMembers.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            People with active access to this merchant account.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-muted-foreground py-10 text-center text-sm">
              Loading members...
            </div>
          ) : activeMembers.length === 0 ? (
            <div className="text-muted-foreground py-10 text-center text-sm">
              No active members yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden sm:table-cell">Joined</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeMembers.map((member) => {
                  const isSelf = member.isSelf;
                  const canManage =
                    isOwner && !isSelf && member.role !== "owner";

                  return (
                    <TableRow key={member.id}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarImage
                              src={member.image ?? undefined}
                              alt={member.email}
                            />
                            <AvatarFallback className="bg-muted text-xs font-semibold">
                              {member.email?.[0]?.toUpperCase() ?? (
                                <Shield className="size-3" />
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm leading-none font-medium">
                              {member.email}
                            </p>
                            {isSelf && (
                              <p className="text-muted-foreground mt-0.5 text-xs">
                                You
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={ROLE_COLORS[member.role] ?? "outline"}
                          className="capitalize"
                        >
                          {ROLE_LABELS[member.role] ?? member.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden text-sm sm:table-cell">
                        {formatDate(member.acceptedAt)}
                      </TableCell>
                      <TableCell className="pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setHistoryMember(member)}
                            >
                              <History className="mr-2 size-4" />
                              View Role History
                            </DropdownMenuItem>

                            {canManage && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setRoleChangeMember(member.id);
                                    setRoleChangeReason("");
                                  }}
                                >
                                  <ArrowRightLeft className="mr-2 size-4" />
                                  Change Role
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleRemove(member.id)}
                                >
                                  <Trash2 className="mr-2 size-4" />
                                  Remove
                                </DropdownMenuItem>
                              </>
                            )}

                            {isSelf && isOwner && activeMembers.length > 1 && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setTransferOpen(true)}
                                >
                                  <ArrowRightLeft className="mr-2 size-4" />
                                  Transfer Ownership
                                </DropdownMenuItem>
                              </>
                            )}

                            {isSelf && !isOwner && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setLeaveConfirmOpen(true)}
                                >
                                  <LogOut className="mr-2 size-4" />
                                  Leave Merchant
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {!loading && pendingMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Pending Invites
              <Badge variant="outline" className="ml-1 font-mono text-xs">
                {pendingMembers.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              These people have been invited but haven&apos;t accepted yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Invited
                  </TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarImage
                            src={member.image ?? undefined}
                            alt={member.email}
                          />
                          <AvatarFallback className="bg-muted text-xs font-semibold">
                            {member.email?.[0]?.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-sm font-medium">{member.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={ROLE_COLORS[member.role] ?? "outline"}
                        className="capitalize"
                      >
                        {ROLE_LABELS[member.role] ?? member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-sm sm:table-cell">
                      {formatDate(member.invitedAt)}
                    </TableCell>
                    <TableCell className="pr-4">
                      {isOwner && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setRevokeConfirmMember(member)}
                            >
                              <XCircle className="mr-2 size-4" />
                              Revoke Invite
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Invite Sheet */}
      <Sheet open={inviteOpen} onOpenChange={setInviteOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Invite Member</SheetTitle>
            <SheetDescription>
              Send an invitation to join this merchant. They&apos;ll receive an
              email with a link to accept.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-5 overflow-y-auto py-4">
            <div className="space-y-2">
              <Label>Email address</Label>
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) =>
                  setInviteRole(
                    v as "admin" | "developer" | "viewer" | "billing",
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="developer">Developer</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Admins can manage team and settings. Developers access API keys.
                Billing manages payments. Viewers are read-only.
              </p>
            </div>
          </div>

          <SheetFooter className="flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setInviteOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="flex-1"
            >
              {inviting ? "Sending..." : "Send Invite"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Role Change Dialog */}
      <Dialog
        open={!!roleChangeMember}
        onOpenChange={(open) => {
          if (!open) {
            setRoleChangeMember(null);
            setRoleChangeReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Update this member&apos;s access level.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                placeholder="Why is this role changing?"
                value={roleChangeReason}
                onChange={(e) => setRoleChangeReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRoleChangeMember(null);
                setRoleChangeReason("");
              }}
            >
              Cancel
            </Button>
            {(["admin", "developer", "billing", "viewer"] as const).map(
              (role) => (
                <Button
                  key={role}
                  variant={role === "admin" ? "secondary" : "outline"}
                  onClick={() =>
                    roleChangeMember && handleRoleChange(roleChangeMember, role)
                  }
                  className="capitalize"
                >
                  {ROLE_LABELS[role]}
                </Button>
              ),
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role History Dialog */}
      <Dialog
        open={!!historyMember}
        onOpenChange={(open) => !open && setHistoryMember(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Role History</DialogTitle>
            <DialogDescription>{historyMember?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!historyMember?.roleHistory ||
            historyMember.roleHistory.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                No role changes recorded.
              </p>
            ) : (
              <div className="space-y-3">
                {historyMember.roleHistory.map((entry, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <RefreshCw className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {entry.from}
                        </Badge>
                        <ArrowRightLeft className="text-muted-foreground size-3" />
                        <Badge variant="default" className="text-xs capitalize">
                          {entry.to}
                        </Badge>
                      </div>
                      {entry.reason && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {entry.reason}
                        </p>
                      )}
                      <p className="text-muted-foreground mt-1 text-xs">
                        {formatDate(entry.changedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Ownership Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Transfer Ownership
            </DialogTitle>
            <DialogDescription>
              This is irreversible. You will become an admin after transfer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>New Owner</Label>
              <Select value={transferTarget} onValueChange={setTransferTarget}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent>
                  {activeMembers
                    .filter((m) => m.id !== currentMember?.id)
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.email} ({ROLE_LABELS[m.role]})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                placeholder="Why are you transferring ownership?"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleTransferOwnership}
              disabled={transferring || !transferTarget}
            >
              {transferring ? "Transferring..." : "Transfer Ownership"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Invite Confirmation */}
      <Dialog
        open={!!revokeConfirmMember}
        onOpenChange={(open) => !open && setRevokeConfirmMember(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Invite</DialogTitle>
            <DialogDescription>
              This will cancel the pending invite for{" "}
              <span className="text-foreground font-medium">
                {revokeConfirmMember?.email}
              </span>
              . They won&apos;t be able to join using their current invite link.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevokeConfirmMember(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeInvite}
              disabled={revoking}
            >
              {revoking ? "Revoking..." : "Revoke Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Merchant Confirmation */}
      <Dialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Leave Merchant
            </DialogTitle>
            <DialogDescription>
              You will lose access to all data and settings for this merchant.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLeaveConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleLeaveMerchant}
              disabled={leaving}
            >
              {leaving ? "Leaving..." : "Leave Merchant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
