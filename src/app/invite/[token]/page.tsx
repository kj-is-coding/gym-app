import { notFound, redirect } from 'next/navigation';
import { getInvitedUserByToken } from '@/lib/invite-operations';
import { InviteAcceptForm } from './invite-accept-form';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const invitedUser = await getInvitedUserByToken(token);

  if (!invitedUser) {
    notFound();
  }

  // If already accepted, redirect to login with message
  if (invitedUser.acceptedAt) {
    redirect('/login?message=already_accepted');
  }

  // If already claimed (user entered their info), redirect to login
  if (invitedUser.claimedAt && invitedUser.email) {
    redirect('/login?message=invite_claimed');
  }

  // Generic invite - show form to collect name/email
  if (invitedUser.isGeneric) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-sm flex flex-col items-center">
          {/* Logo */}
          <div className="mb-6 w-18 h-18 flex items-center justify-center rounded-2xl bg-primary/10 border-2 border-primary" style={{ width: 72, height: 72 }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.5 6.5h11M6.5 17.5h11M4 12h16M3 8.5C3 7.12 4.12 6 5.5 6S8 7.12 8 8.5 6.88 11 5.5 11 3 9.88 3 8.5zM21 8.5C21 7.12 19.88 6 18.5 6S16 7.12 16 8.5s1.12 2.5 2.5 2.5S21 9.88 21 8.5zM3 15.5C3 14.12 4.12 13 5.5 13S8 14.12 8 15.5 6.88 18 5.5 18 3 16.88 3 15.5zM21 15.5C21 14.12 19.88 13 18.5 13S16 14.12 16 15.5s1.12 2.5 2.5 2.5S21 16.88 21 15.5z" />
            </svg>
          </div>

          <h1 className="text-2xl font-semibold text-foreground mb-2 text-center tracking-tight">
            You're Invited!
          </h1>
          <p className="text-muted-foreground mb-6 text-center">
            Enter your details to accept your invitation and start tracking your fitness journey.
          </p>

          <InviteAcceptForm token={token} mode="claim" />
        </div>
      </div>
    );
  }

  // Standard invite - email/name already known
  return (
    <div className="min-h-dvh bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Logo */}
        <div className="mb-6 w-18 h-18 flex items-center justify-center rounded-2xl bg-primary/10 border-2 border-primary" style={{ width: 72, height: 72 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.5 6.5h11M6.5 17.5h11M4 12h16M3 8.5C3 7.12 4.12 6 5.5 6S8 7.12 8 8.5 6.88 11 5.5 11 3 9.88 3 8.5zM21 8.5C21 7.12 19.88 6 18.5 6S16 7.12 16 8.5s1.12 2.5 2.5 2.5S21 9.88 21 8.5zM3 15.5C3 14.12 4.12 13 5.5 13S8 14.12 8 15.5 6.88 18 5.5 18 3 16.88 3 15.5zM21 15.5C21 14.12 19.88 13 18.5 13S16 14.12 16 15.5s1.12 2.5 2.5 2.5S21 16.88 21 15.5z" />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold text-foreground mb-2 text-center tracking-tight">
          You're Invited!
        </h1>
        <p className="text-muted-foreground mb-6 text-center">
          {invitedUser.name}, click below to accept your invitation and start tracking your fitness journey.
        </p>

        <InviteAcceptForm email={invitedUser.email!} name={invitedUser.name!} mode="accept" />
      </div>
    </div>
  );
}
