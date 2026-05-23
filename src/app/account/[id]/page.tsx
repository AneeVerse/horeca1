import { redirect } from 'next/navigation';

export default function AccountOverviewRedirectPage() {
  redirect('/profile?open=account-overview');
}
