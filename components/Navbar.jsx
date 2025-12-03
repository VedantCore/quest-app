"use client";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <nav className="flex items-center justify-between p-6 bg-white shadow-sm">
      <div className="flex items-center space-x-8">
        <Link href="/" className="text-2xl font-bold text-blue-600">
          Quest
        </Link>
        <div className="hidden md:flex space-x-6">
          <Link href="#features" className="text-gray-600 hover:text-blue-600">
            Features
          </Link>
          <Link href="#pricing" className="text-gray-600 hover:text-blue-600">
            Pricing
          </Link>
          <Link href="#about" className="text-gray-600 hover:text-blue-600">
            About
          </Link>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        {!loading && (
          <>
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">Hi, {user.email?.split('@')[0]}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Get started free
                </Link>
              </>
            )}
          </>
        )}
      </div>
    </nav>
  );
}
