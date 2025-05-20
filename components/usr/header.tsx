import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-5">
        <div className="flex items-center gap-2 grow">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl">HCL Schema Builder</span>
          </Link>
        </div>
	<ThemeToggle />
      </div>
    </header>
  )
}

