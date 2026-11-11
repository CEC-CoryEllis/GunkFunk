/** Minimal DOM builders for the sound test page. */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: { className?: string; text?: string; attrs?: Record<string, string> } = {},
  children: Node[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props.className) node.className = props.className;
  if (props.text) node.textContent = props.text;
  for (const [name, value] of Object.entries(props.attrs ?? {})) node.setAttribute(name, value);
  for (const child of children) node.append(child);
  return node;
}

export function button(label: string, testId: string, onClick: () => void): HTMLButtonElement {
  const node = el("button", { text: label, attrs: { type: "button", "data-testid": testId } });
  node.addEventListener("click", onClick);
  return node;
}

export function panel(title: string, children: Node[]): HTMLElement {
  return el("section", { className: "panel" }, [el("h2", { text: title }), ...children]);
}

export function buttonRow(buttons: HTMLElement[]): HTMLElement {
  return el("div", { className: "row" }, buttons);
}

export interface SliderOptions {
  label: string;
  testId: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onInput: (value: number) => void;
}

export function slider(o: SliderOptions): HTMLElement {
  const output = el("output", { text: o.value.toFixed(2) });
  const input = el("input", {
    attrs: {
      type: "range",
      min: String(o.min),
      max: String(o.max),
      step: String(o.step),
      value: String(o.value),
      "data-testid": o.testId,
    },
  });
  input.addEventListener("input", () => {
    const value = Number(input.value);
    output.textContent = value.toFixed(2);
    o.onInput(value);
  });
  return el("label", { className: "slider" }, [el("span", { text: o.label }), input, output]);
}

/** Marks one button of a group as active. */
export function setActive(buttons: readonly HTMLElement[], active: HTMLElement | null): void {
  for (const node of buttons) node.classList.toggle("active", node === active);
}
