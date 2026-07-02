const tabs = await fetch("http://localhost:9223/json").then((response) =>
  response.json(),
);
const tab =
  tabs.find((candidate) => candidate.url.includes("localhost:3000")) ??
  tabs[0];

if (!tab?.webSocketDebuggerUrl) {
  throw new Error("No debuggable browser tab found.");
}

const socket = new WebSocket(tab.webSocketDebuggerUrl);
const pending = new Map();
let nextId = 1;

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  const request = pending.get(message.id);

  if (!request) {
    return;
  }

  pending.delete(message.id);

  if (message.error) {
    request.reject(new Error(message.error.message));
  } else {
    request.resolve(message.result);
  }
});

await new Promise((resolve) => socket.addEventListener("open", resolve));

function send(method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));

  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });
}

await send("Runtime.enable");
await send("Page.enable");

const verification = await send("Runtime.evaluate", {
  awaitPromise: true,
  returnByValue: true,
  expression: String.raw`
    (async () => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const waitFor = async (predicate, label) => {
        for (let attempt = 0; attempt < 80; attempt += 1) {
          const result = predicate();
          if (result) return result;
          await sleep(100);
        }
        throw new Error("Timed out waiting for " + label);
      };
      const clickByText = (text) => {
        const element = Array.from(document.querySelectorAll("a,button")).find(
          (candidate) => candidate.textContent.trim() === text,
        );
        if (!element) throw new Error("Missing clickable text: " + text);
        element.click();
      };

      localStorage.clear();
      localStorage.setItem(
        "auditready:onboarding",
        JSON.stringify({
          preparingFor: "Audit",
          accountingSoftware: "QuickBooks",
          fiscalYear: "2026",
        }),
      );

      location.href = "http://localhost:3000/";
      await waitFor(
        () => document.body.textContent.includes("Readiness dashboard"),
        "dashboard",
      );

      const documentsCard = Array.from(document.querySelectorAll("a")).find(
        (anchor) => anchor.getAttribute("href") === "/documents",
      );
      if (!documentsCard) throw new Error("Documents dashboard link missing");
      documentsCard.click();

      await waitFor(
        () =>
          location.pathname === "/documents" &&
          document.body.textContent.includes("No documents uploaded yet"),
        "documents empty state",
      );

      const input = document.querySelector("input[type='file']");
      if (!input) throw new Error("Upload input missing");

      const transfer = new DataTransfer();
      transfer.items.add(
        new File(["account,amount\nCash,100"], "sample.csv", {
          type: "text/csv",
        }),
      );
      transfer.items.add(
        new File([new Uint8Array([37, 80, 68, 70])], "audit.pdf", {
          type: "application/pdf",
        }),
      );
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));

      await waitFor(
        () =>
          document.querySelectorAll("tbody tr").length === 2 &&
          document.body.textContent.includes("sample.csv") &&
          document.body.textContent.includes("audit.pdf") &&
          document.body.textContent.includes("2 of 2 documents"),
        "uploaded documents table",
      );

      clickByText("Delete");
      await waitFor(
        () =>
          document.querySelectorAll("tbody tr").length === 1 &&
          document.body.textContent.includes("1 of 1 documents"),
        "delete document",
      );

      clickByText("Back to dashboard");
      await waitFor(
        () =>
          location.pathname === "/" &&
          document.body.textContent.includes("Readiness dashboard"),
        "back to dashboard",
      );

      return {
        path: location.pathname,
        dashboardVisible: document.body.textContent.includes(
          "Readiness dashboard",
        ),
        remainingRows: document.querySelectorAll("tbody tr").length,
      };
    })()
  `,
});

if (verification.exceptionDetails) {
  throw new Error(
    verification.exceptionDetails.exception?.description ||
      verification.exceptionDetails.text,
  );
}

console.log(JSON.stringify(verification.result.value, null, 2));
socket.close();
