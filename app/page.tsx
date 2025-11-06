"use client"

import { ARMoleculeViewer } from "@/components/ar-molecule-viewer"

export default function Home() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      <ARMoleculeViewer />
    </main>
  )
}
