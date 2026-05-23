import { redirect } from 'next/navigation';

export default function AccountOutletsRedirectPage() {
  redirect('/profile?open=outlets');
}
