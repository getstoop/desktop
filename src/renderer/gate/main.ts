// One page for every reason a server cannot be shown: too old,
// unreachable, or no longer answering as Stoop. Main passes the reason
// in the query string.
import { followTheme } from "../theme";

followTheme();

const q = new URLSearchParams(location.search);
const id = q.get("id") ?? "";
const name = q.get("name") ?? "";
const url = q.get("url") ?? "";
const kind = q.get("kind") ?? "unreachable";
const detail = q.get("detail") ?? "";

const title = document.getElementById("title") as HTMLHeadingElement;
const lead = document.getElementById("lead") as HTMLParagraphElement;
const more = document.getElementById("more") as HTMLParagraphElement;

const host = (() => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
})();
const strong = document.createElement("strong");
strong.textContent = host;

if (kind === "too-old") {
  title.textContent = "This server needs updating";
  lead.append(strong, ` runs Stoop ${detail}. This app needs a newer version.`);
  more.textContent =
    "Ask whoever runs it to update. Trying again checks the server once more; the other servers are not affected.";
} else if (kind === "not-stoop") {
  title.textContent = `${name || host} is not answering as Stoop`;
  lead.append(strong, " answered, but not as a Stoop server.");
  more.textContent = detail;
} else {
  title.textContent = `Could not reach ${name || host}`;
  lead.append(strong, " did not answer.");
  more.textContent = detail;
}

(document.getElementById("retry") as HTMLButtonElement).addEventListener(
  "click",
  () => window.shell.retryServer(id),
);
(document.getElementById("browser") as HTMLButtonElement).addEventListener(
  "click",
  () => window.shell.openExternal(url),
);
(document.getElementById("remove") as HTMLButtonElement).addEventListener(
  "click",
  () => window.shell.removeServer(id),
);
