'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <Link href="/dashboard" className="text-lg font-bold text-gray-900">
        PixelLens
      </Link>
      {session?.user && (
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{session.user.email}</span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}
