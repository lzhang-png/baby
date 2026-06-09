import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ThemeProvider } from "@/components/ui/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import "@/lib/i18n"
import "@/lib/text-size"
import "./index.css"
import App from "./App.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      storageKey="baby-theme"
    >
      <App />
      <Toaster richColors position="top-center" />
    </ThemeProvider>
  </StrictMode>,
)
