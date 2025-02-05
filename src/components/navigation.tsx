import Link from "next/link"
import { Button } from "~/components/ui/button"

export function Navigation() {
  return (
    <nav className="bg-white dark:bg-gray-800 shadow">
      <div className="container mx-auto px-6 py-3">
        <div className="flex justify-between items-center">
          <div>
            <Link href="/" className="text-2xl font-bold text-gray-800 dark:text-white">
              Sagelytics
            </Link>
          </div>
          <div className="flex space-x-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Register</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}

