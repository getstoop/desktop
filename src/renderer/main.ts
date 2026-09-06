declare global {
  interface Window {
    shell: { openServer(url: string): void };
  }
}

const form = document.getElementById("open") as HTMLFormElement;
const input = document.getElementById("url") as HTMLInputElement;
input.focus();
form.addEventListener("submit", (event) => {
  event.preventDefault();
  window.shell.openServer(input.value.trim());
});

export {};
