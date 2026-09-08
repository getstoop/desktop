import { followTheme } from "../theme";

followTheme();

const form = document.getElementById("open") as HTMLFormElement;
const input = document.getElementById("url") as HTMLInputElement;
const error = document.getElementById("error") as HTMLParagraphElement;
const detail = document.getElementById("detail") as HTMLParagraphElement;
const submit = document.getElementById("submit") as HTMLButtonElement;
input.focus();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submit.disabled = true;
  submit.textContent = "Checking…";
  const probe = await window.shell.addServer(input.value);
  submit.disabled = false;
  submit.textContent = "Open";
  if (probe.ok) return; // the main process has switched to it
  input.setAttribute("aria-invalid", "true");
  error.textContent =
    probe.kind === "unreachable"
      ? "Could not reach that address."
      : "That address answered, but not as a Stoop server.";
  detail.textContent = probe.detail;
  error.hidden = false;
  detail.hidden = false;
});
input.addEventListener("input", () => {
  input.removeAttribute("aria-invalid");
  error.hidden = true;
  detail.hidden = true;
});
