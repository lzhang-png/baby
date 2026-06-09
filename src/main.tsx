import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ErrorBoundary } from "@/components/error-boundary"
import { ThemeProvider } from "@/components/ui/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import "@/lib/i18n"
import "@/lib/text-size"
import "./index.css"
import App from "./App.tsx"

const rootElement = document.getElementById("root")
if (!rootElement) {
  throw new Error("Missing #root element")
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        themes={["light", "medium", "dark", "system"]}
        enableSystem
        storageKey="baby-theme"
      >
        <App />
        <Toaster richColors position="top-center" />
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
