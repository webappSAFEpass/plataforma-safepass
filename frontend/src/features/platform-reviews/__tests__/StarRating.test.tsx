import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StarRating } from "@/features/platform-reviews/components/StarRating";

describe("StarRating", () => {
  it("chama onChange com a nota da estrela clicada", async () => {
    const onChange = vi.fn();
    render(<StarRating value={0} onChange={onChange} />);

    await userEvent.click(screen.getByRole("radio", { name: "4 estrelas" }));

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("marca como selecionada apenas a nota atual", () => {
    render(<StarRating value={2} onChange={() => undefined} />);

    expect(screen.getByRole("radio", { name: "2 estrelas" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "5 estrelas" })).not.toBeChecked();
  });

  it("usa singular para 1 estrela", () => {
    render(<StarRating value={0} onChange={() => undefined} />);
    expect(screen.getByRole("radio", { name: "1 estrela" })).toBeInTheDocument();
  });
});
