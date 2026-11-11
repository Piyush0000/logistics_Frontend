'use client';

import { useState, useTransition } from 'react';
import { Dialog, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ROLE_LABELS, ROLES, isRole, type TeamMember } from '@/lib/data/team';
import { changeRoleAction, removeMemberAction } from './actions';
import { CONTROL, InviteDialog } from './invite-dialog';

type Feedback = { ok: boolean; message: string } | null;

/** The team list, the invite button and the remove confirmation. `myEmail` marks the signed-in row. */
export function TeamPanel({ members, myEmail }: { members: TeamMember[]; myEmail: string }) {
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<TeamMember | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, start] = useTransition();

  function changeRole(member: TeamMember, role: string) {
    if (!isRole(role) || role === member.role) return;
    setFeedback(null);
    start(async () => {
      setFeedback(await changeRoleAction(member.id, role));
    });
  }

  function confirmRemove(member: TeamMember) {
    setFeedback(null);
    setRemoving(null);
    start(async () => {
      setFeedback(await removeMemberAction(member.id));
    });
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setInviting(true)}
          className={`${PRIMARY_BUTTON} max-sm:h-11 max-sm:w-full`}
        >
          Invite user
        </button>
      </div>

      {feedback ? (
        <p
          role={feedback.ok ? 'status' : 'alert'}
          className={`rounded-control p-3 text-sm [overflow-wrap:anywhere] ${feedback.ok ? 'bg-success/15' : 'bg-error/10'}`}
        >
          {feedback.message}
        </p>
      ) : null}

      {members.length === 0 ? (
        <EmptyState message="No one is on your team yet. Invite a teammate to share access." />
      ) : (
        <ul className="divide-y divide-secondary">
          {members.map((member) => {
            const isSelf = member.email.toLowerCase() === myEmail.toLowerCase();
            return (
              <li
                key={member.id}
                data-testid="member"
                className="grid min-w-0 gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 text-sm font-medium break-all">{member.email}</span>
                    {isSelf ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        You
                      </span>
                    ) : null}
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {member.status === 'invited' ? 'Invited' : 'Active'}
                    </span>
                  </p>
                  {member.name ? (
                    <p className="text-sm text-on-surface/70 [overflow-wrap:anywhere]">{member.name}</p>
                  ) : null}
                </div>

                {isSelf ? (
                  <p className="text-sm text-on-surface/70">{ROLE_LABELS[member.role]}</p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label={`Role for ${member.email}`}
                      value={member.role}
                      disabled={pending}
                      onChange={(e) => changeRole(member, e.target.value)}
                      className={`${CONTROL} border-secondary max-sm:h-11 sm:w-40`}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      aria-label={`Remove ${member.email}`}
                      disabled={pending}
                      onClick={() => setRemoving(member)}
                      className={`${SECONDARY_BUTTON} max-sm:h-11 max-sm:w-full`}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {inviting ? (
        <InviteDialog
          onClose={() => setInviting(false)}
          onDone={(message) => setFeedback({ ok: true, message })}
        />
      ) : null}

      {removing ? (
        <Dialog title="Remove this teammate?" onClose={() => setRemoving(null)}>
          <p className="text-sm">
            <span className="font-medium break-all">{removing.email}</span> will lose access to this
            account straight away.
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setRemoving(null)}
              className={`${SECONDARY_BUTTON} max-sm:h-11`}
            >
              Keep member
            </button>
            <button
              type="button"
              onClick={() => confirmRemove(removing)}
              className={`${PRIMARY_BUTTON} max-sm:h-11`}
            >
              Remove member
            </button>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
