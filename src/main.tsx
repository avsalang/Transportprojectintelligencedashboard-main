
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "maplibre-gl/dist/maplibre-gl.css";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(<App />);
  
