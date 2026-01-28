import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { UserRoleProvider } from "./contexts/UserRoleContext";

createRoot(document.getElementById("root")!).render(
  <UserRoleProvider>
    <App />
  </UserRoleProvider>
);
