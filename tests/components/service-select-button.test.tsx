// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { BookingProvider, useBooking } from "@/components/booking/booking-context";
import { ServiceSelectButton } from "@/components/booking/service-select-button";

function PromptProbe() {
  const { promptedId, dismissPrompt } = useBooking();
  return (
    <>
      <output aria-label="prompt">{promptedId ?? "none"}</output>
      <button type="button" onClick={dismissPrompt}>
        dismiss
      </button>
    </>
  );
}

describe("ServiceSelectButton", () => {
  it("asks to book only when a service is added, not when it is removed", async () => {
    const user = userEvent.setup();
    render(
      <BookingProvider services={[{ id: "pe", name: "Pedicure", priceCents: 1800 }]}>
        <ServiceSelectButton id="pe" name="Pedicure" />
        <PromptProbe />
      </BookingProvider>,
    );
    const prompt = screen.getByRole("status", { name: "prompt" });
    expect(prompt.textContent).toBe("none");

    await user.click(screen.getByRole("button", { name: "Escolher Pedicure" }));
    expect(prompt.textContent).toBe("pe");

    await user.click(screen.getByRole("button", { name: "dismiss" }));
    await user.click(screen.getByRole("button", { name: "Escolhido Pedicure" }));
    expect(prompt.textContent).toBe("none");
    expect(screen.getByRole("button", { name: "Escolher Pedicure" })).toBeTruthy();
  });
});
