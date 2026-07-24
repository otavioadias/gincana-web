import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "@/components/status-badge";

describe("StatusBadge", () => {
  it("traduz o status da API em linguagem clara", () => {
    render(<StatusBadge status="NEEDS_CHANGES" />);
    expect(screen.getByText("Complemento solicitado")).toBeInTheDocument();
  });
});
