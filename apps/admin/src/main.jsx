import React from "react";
import { createRoot } from "react-dom/client";
import TicketApp from "../../shared/TicketApp.jsx";
import { supabase } from "./supabase.js";
createRoot(document.getElementById("root")).render(
  <TicketApp db={supabase} mode="admin" />,
);
