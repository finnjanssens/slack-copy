import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyPlan, copyWith, toSlack, toHtml } from "./scripts/index.ts";

// ------------------------------------------------------------ dispatch logic

const has = (cmd: string) => {
  try {
    execFileSync("which", [cmd], { stdio: ["pipe", "ignore", "ignore"] });
    return true;
  } catch {
    return false;
  }
};

type Call = { cmd: string; args: string[]; input: string };
const recorder: Call[] = [];
const fakeRun: (cmd: string, args: string[], input: string) => void = (cmd, args, input) =>
  recorder.push({ cmd, args, input });

// darwin: one strategy, AppleScript carrying both hex payloads
{
  const plan = copyPlan("darwin", "<b>hi</b>", "*hi*");
  assert.equal(plan.length, 1);
  assert.equal(plan[0]!.cmd, "osascript");
  const htmlHex = Buffer.from("<b>hi</b>", "utf8").toString("hex");
  const plainHex = Buffer.from("*hi*", "utf8").toString("hex");
  assert.ok(plan[0]!.args[1]!.includes(`data HTML${htmlHex}`), "html payload hex-encoded");
  assert.ok(plan[0]!.args[1]!.includes(`data utf8${plainHex}`), "plain payload hex-encoded");
}

// linux: wl-copy first, xclip fallback, both html-only
{
  const plan = copyPlan("linux", "<b>hi</b>", "*hi*");
  assert.deepEqual(
    plan.map((s) => s.cmd),
    ["wl-copy", "xclip"],
  );
  assert.deepEqual(plan[0]!.args, ["--type", "text/html"]);
  assert.deepEqual(plan[1]!.args, ["-selection", "clipboard", "-t", "text/html"]);
  assert.ok(plan.every((s) => s.input === "<b>hi</b>"), "both strategies carry the html flavour");
}

// win32: powershell, plain input
{
  const plan = copyPlan("win32", "<b>hi</b>", "*hi*");
  assert.equal(plan.length, 1);
  assert.equal(plan[0]!.cmd, "powershell");
  assert.equal(plan[0]!.input, "*hi*");
}

// unknown platform: nothing to run, copyWith must throw
{
  const plan = copyPlan("freebsd", "<b>hi</b>", "*hi*");
  assert.equal(plan.length, 0);
  assert.throws(() => copyWith(plan, fakeRun));
}

// copyWith stops at the first success and throws only when all fail
{
  recorder.length = 0;
  copyWith(
    [
      { cmd: "fail", args: [], input: "" },
      { cmd: "ok", args: [], input: "" },
      { cmd: "never", args: [], input: "" },
    ],
    (cmd) => {
      if (cmd === "fail") throw new Error("boom");
      fakeRun(cmd, [], "");
    },
  );
  assert.deepEqual(
    recorder.map((c) => c.cmd),
    ["ok"],
    "second strategy runs after a failure, third never does",
  );

  assert.throws(
    () => copyWith([{ cmd: "fail", args: [], input: "" }], () => { throw new Error("boom"); }),
    "all strategies failing is an error",
  );
}

// ------------------------------------------------- real round-trip, per OS
// The CLI copies, a native reader reads back; every flavour is compared to the
// converter output so the clipboard itself is the thing under test. Skips with
// a note where the OS cannot provide a clipboard (e.g. bare linux).

const md = "# hi\n\nsome **bold** and [a link](https://x.dev)";
const plain = toSlack(md);
const html = toHtml(md);
const runCli = () => execFileSync(process.execPath, ["scripts/index.ts"], { input: md });

if (process.platform === "darwin") {
  runCli();
  assert.equal(execFileSync("pbpaste", { encoding: "utf8" }), plain, "darwin plain flavour");
  // pbpaste -Prefer html cannot read the «class HTML» flavour, so ask
  // AppleScript for the raw data blob and decode it here.
  const data = execFileSync(
    "osascript",
    ["-e", "the clipboard as «class HTML»"],
    { encoding: "utf8" },
  ).trim();
  const hexHtml = Buffer.from(
    data.replace(/^«data HTML|»$/g, ""),
    "hex",
  ).toString("utf8");
  assert.equal(hexHtml, html, "darwin html flavour");
} else if (process.platform === "win32") {
  runCli();
  const got = execFileSync("powershell", ["-NoProfile", "-Command", "Get-Clipboard"], {
    encoding: "utf8",
  });
  // Get-Clipboard hands back CRLF on Windows; the flavour itself is unchanged.
  assert.equal(got.replace(/\r\n/g, "\n").trim(), plain.trim(), "win32 plain flavour");
} else if (process.platform === "linux") {
  const wayland = Boolean(process.env.WAYLAND_DISPLAY) && has("wl-paste");
  const x11 = Boolean(process.env.DISPLAY) && has("xclip");
  if (!wayland && !x11) {
    // No display server (e.g. a bare CI job): the dispatch tests above still
    // ran; the real-clipboard round-trip is covered by the x11/wayland matrix jobs.
    console.log("skip clipboard round-trip: no display server");
  } else {
    runCli();
    const got = wayland
      ? // wl-copy appends a trailing newline to payloads that lack one; undo it.
        execFileSync("wl-paste", ["--type", "text/html", "--no-newline"], { encoding: "utf8" })
      : execFileSync("xclip", ["-o", "-selection", "clipboard", "-t", "text/html"], { encoding: "utf8" });
    assert.equal(got, html, wayland ? "wayland html flavour" : "x11 html flavour");
  }
}

console.log("ok clipboard");
