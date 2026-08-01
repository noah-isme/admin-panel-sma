// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { BarChart3 } from "lucide-react";

import { SummaryCard } from "../components/dashboard/summary-card";

type RenderOptions = {
  loading?: boolean;
};

const renderSummaryCard = ({ loading = false }: RenderOptions = {}) =>
  render(
    <ThemeProvider theme={createTheme()}>
      <CssBaseline />
      <SummaryCard
        title="Tes"
        value="123"
        subtitle="Subjudul"
        icon={<BarChart3 aria-label="Ikon tes" />}
        accentColor="#2f6fed"
        loading={loading}
      />
    </ThemeProvider>
  );

describe("SummaryCard", () => {
  it("exposes loading state via aria-busy", () => {
    renderSummaryCard({ loading: true });
    expect(screen.getByRole("group")).toHaveAttribute("aria-busy", "true");
  });

  it("renders value when not loading", () => {
    renderSummaryCard({ loading: false });
    expect(screen.getByText("123")).toBeInTheDocument();
  });
});
