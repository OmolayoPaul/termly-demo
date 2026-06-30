import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/parent/")({
  component: () => <Navigate to="/parent/dashboard" replace />,
});