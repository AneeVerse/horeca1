import { redirect } from 'next/navigation';

export default function AccountRolesRedirectPage() {
  redirect('/profile?open=roles');
}
