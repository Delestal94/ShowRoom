'use client'

import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth()

  if (!isLoaded) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-4xl font-bold mb-8">Welcome to ShowRoom</h1>
        <p className="text-xl text-gray-600">Loading...</p>
      </main>
    )
  }

  if (!isSignedIn) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center max-w-lg">
          <h1 className="text-4xl font-bold mb-4">Welcome to ShowRoom</h1>
          <p className="text-xl text-gray-600 mb-8">
            The 3D real estate platform for interactive property tours
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/sign-in"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Sign In
            </Link>
            <Link
              href="/sign-in"
              className="px-6 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-semibold"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to ShowRoom</h1>
        <p className="text-xl text-gray-600 mb-8">
          You&apos;re signed in! Create or manage your organizations.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="https://show-room-ten.vercel.app/user"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            Go to Dashboard
          </Link>
          <Link
            href="https://dashboard.clerk.com"
            className="px-6 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-semibold"
          >
            Manage Organizations
          </Link>
        </div>
      </div>
    </main>
  )
}
