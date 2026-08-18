import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to ShowRoom</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>
        <SignIn />
      </div>
    </div>
  )
}
