import { mkdir, writeFile } from "node:fs/promises";

const BASE_URL = "http://127.0.0.1:3005";
const DEBUG_URL = "http://127.0.0.1:9222/json/list";
const OUTPUT_DIR = new URL("../docs/screenshots/", import.meta.url);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class CdpClient {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
  }

  async connect() {
    this.socket = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const waiter = this.pending.get(message.id);
      if (!waiter) return;
      this.pending.delete(message.id);
      if (message.error) waiter.reject(new Error(message.error.message));
      else waiter.resolve(message.result);
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

async function findPageTarget() {
  const targets = await fetch(DEBUG_URL).then((response) => response.json());
  const target = targets.find((item) => item.type === "page");
  if (!target) throw new Error("No debuggable page target found");
  return target.webSocketDebuggerUrl;
}

async function evaluate(client, expression) {
  return client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
}

async function navigate(client, path, waitMs = 3200) {
  await client.send("Page.navigate", { url: `${BASE_URL}${path}` });
  await delay(waitMs);
  await evaluate(
    client,
    `Promise.all([document.fonts?.ready, new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))])`
  );
  await evaluate(
    client,
    `document.querySelector('main')?.scrollTo(0, 0); document.scrollingElement?.scrollTo(0, 0); true`
  );
}

async function clickText(client, text, selector = "button") {
  const encodedText = JSON.stringify(text);
  const encodedSelector = JSON.stringify(selector);
  const result = await evaluate(
    client,
    `(() => {
      const text = ${encodedText};
      const selector = ${encodedSelector};
      const element = [...document.querySelectorAll(selector)].find((item) =>
        (item.textContent || '').replace(/\\s+/g, ' ').trim().includes(text)
      );
      if (!element) return false;
      element.click();
      return true;
    })()`
  );
  return result.result?.value === true;
}

async function capture(client, filename) {
  const result = await client.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(new URL(filename, OUTPUT_DIR), Buffer.from(result.data, "base64"));
  process.stdout.write(`${filename}\n`);
}

const groups = {
  core: [
    { path: "/home", file: "02-home.png" },
    { path: "/energy/overview", file: "03-energy-overview.png" },
    { path: "/energy/grid-monitor", file: "04-grid-monitor.png" },
    { path: "/energy/forecast/overview", file: "05-forecast-overview.png" },
    { path: "/energy/forecast/scenario", file: "06-forecast-scenario.png" },
    { path: "/energy/forecast/records", file: "07-forecast-records.png" },
  ],
  events: [
    { path: "/energy/yearbook/events", file: "08-yearbook-events.png" },
    {
      path: "/energy/yearbook/events",
      file: "09-event-manual-entry.png",
      action: async (client) => {
        await clickText(client, "人工补录");
        await delay(500);
      },
    },
    { path: "/energy/yearbook/reports", file: "10-yearbook-reports.png" },
    { path: "/alert/records", file: "11-alert-records.png" },
    { path: "/alert/records/YJ20260709001", file: "12-alert-detail.png" },
    { path: "/alert/management", file: "13-alert-management.png" },
    { path: "/alert/management/new", file: "14-alert-strategy-new.png" },
  ],
  qa: [
    {
      path: `/qa?query=${encodeURIComponent("各机台设备运行效率如何？")}`,
      file: "15-qa-smart-query.png",
      waitMs: 5200,
    },
    {
      path: `/qa?query=${encodeURIComponent("分析单箱耗烟叶量上升的原因")}`,
      file: "16-qa-attribution.png",
      waitMs: 5200,
    },
    {
      path: `/qa?query=${encodeURIComponent("预测下月包装产线产量趋势")}`,
      file: "17-qa-forecast.png",
      waitMs: 5200,
    },
    {
      path: `/qa?query=${encodeURIComponent("卷接工艺车速控制范围？")}`,
      file: "18-qa-knowledge.png",
      waitMs: 5200,
    },
    { path: "/metric-trace", file: "19-metric-trace-technical.png" },
    {
      path: "/metric-trace",
      file: "20-metric-trace-business.png",
      action: async (client) => {
        await clickText(client, "业务视角");
        await delay(400);
      },
    },
  ],
  settings: [
    { path: "/settings/data-source", file: "21-settings-data-source.png" },
    { path: "/settings/metadata", file: "22-settings-metadata.png" },
    { path: "/settings/metric-management", file: "23-settings-metric.png" },
    { path: "/settings/biz-term", file: "24-settings-biz-term.png" },
    { path: "/settings/biz-logic", file: "25-settings-biz-logic.png" },
    { path: "/settings/energy-coefficient", file: "26-settings-energy-coefficient.png" },
    { path: "/settings/standard-qa", file: "27-settings-standard-qa.png" },
    { path: "/settings/conversation", file: "28-settings-conversation.png" },
    { path: "/settings/attribution/energy", file: "29-settings-attribution.png" },
    { path: "/profile", file: "30-profile.png" },
  ],
};

async function main() {
  const groupName = process.argv[2] || "core";
  const entries = groups[groupName];
  if (!entries) throw new Error(`Unknown group: ${groupName}`);

  await mkdir(OUTPUT_DIR, { recursive: true });
  const client = new CdpClient(await findPageTarget());
  await client.connect();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await navigate(client, "/login", 2500);
  await evaluate(
    client,
    `(() => {
      const inputs = [...document.querySelectorAll('input')];
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setValue.call(inputs[0], 'admin');
      inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      setValue.call(inputs[1], 'admin123');
      inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
      [...document.querySelectorAll('button')].find((b) => b.textContent.includes('登'))?.click();
      return true;
    })()`
  );
  await delay(250);
  await clickText(client, "登 录");
  await delay(1200);
  await evaluate(
    client,
    `localStorage.setItem('app_user', JSON.stringify({
      id: 'u1', username: 'admin', password: '', phone: '13800000001',
      role: '管理员', nickname: '管理员', alias: '', email: 'admin@yongshan.com'
    })); true`
  );
  const loginState = await evaluate(
    client,
    `({ href: location.href, user: localStorage.getItem('app_user') })`
  );
  process.stdout.write(`login-state ${JSON.stringify(loginState.result?.value)}\n`);

  for (const entry of entries) {
    await navigate(client, entry.path, entry.waitMs || 3400);
    if (entry.action) await entry.action(client);
    await capture(client, entry.file);
  }

  client.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
