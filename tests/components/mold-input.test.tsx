// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MoldInput } from "@/components/admin/mold-input";

const FINGERS = ["Polegar", "Indicador", "Médio", "Anelar", "Mindinho"];

function setup(defaultValue?: string) {
  const { container } = render(
    <MoldInput name="handMold" label="Molde da mão" fingers={FINGERS} defaultValue={defaultValue} />,
  );
  const boxes = FINGERS.map((finger) => screen.getByRole("textbox", { name: finger }) as HTMLInputElement);
  const hidden = container.querySelector<HTMLInputElement>('input[name="handMold"]')!;
  return { boxes, hidden, values: () => boxes.map((b) => b.value) };
}

describe("MoldInput", () => {
  it("moves along as you type, waiting after a 1 or 2 in case it's a two-digit size", async () => {
    const user = userEvent.setup();
    const { boxes, hidden, values } = setup();
    await user.click(boxes[0]);
    await user.keyboard("310579");
    expect(values()).toEqual(["3", "10", "5", "7", "9"]);
    expect(hidden.value).toBe("3-10-5-7-9");
  });

  it("carries a digit that doesn't fit to the next box", async () => {
    const user = userEvent.setup();
    const { boxes, values } = setup();
    await user.click(boxes[0]);
    await user.keyboard("25");
    expect(values().slice(0, 2)).toEqual(["2", "5"]);
    expect(document.activeElement).toBe(boxes[2]);
  });

  it("fills every box from a paste and goes back with backspace", async () => {
    const user = userEvent.setup();
    const { boxes, hidden, values } = setup();
    await user.click(boxes[0]);
    await user.paste("2 4 18 3 1");
    expect(values()).toEqual(["2", "4", "18", "3", "1"]);

    await user.click(boxes[3]);
    await user.keyboard("{Backspace}{Backspace}");
    expect(values()).toEqual(["2", "4", "", "", "1"]);
    expect(document.activeElement).toBe(boxes[2]);
    expect(hidden.value).toBe("2-4---1");
  });

  it("starts from the saved mold", () => {
    expect(setup("4-6-20-0-3").values()).toEqual(["4", "6", "20", "0", "3"]);
  });
});
