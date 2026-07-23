import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App.tsx"
import "./index.css"
import { ProfileProvider } from "./contexts/ProfileContext.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ProfileProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ProfileProvider>
  </StrictMode>,
)
