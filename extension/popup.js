/* InstaView Unfollowers — popup logic.
 * Read-only: reads your own following/followers via your logged-in session and
 * diffs against the last local snapshot. No unfollow actions, no servers. */

const SNAPSHOT_KEY = "iv_snapshot";
const els = {};
let view = { notback: [], unfollowers: [], newfollowers: [] };
let currentTab = "notback";

document.addEventListener("DOMContentLoaded", init);

async function init() {
  for (const id of [
    "scanBtn", "progress", "error", "summary", "tabs", "list", "lastScan",
    "notInstagram", "openIg", "statNotBack", "statUnfollowers", "statNewFollowers",
  ]) els[id] = document.getElementById(id);

  els.scanBtn.addEventListener("click", runScan);
  els.openIg.addEventListener("click", () => chrome.tabs.create({ url: "https://www.instagram.com/" }));
  document.querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => selectTab(t.dataset.tab)),
  );

  const onIg = await isOnInstagram();
  els.notInstagram.hidden = onIg;

  const prev = await getSnapshot();
  if (prev) {
    els.lastScan.textContent = "last scan " + timeAgo(prev.at);
    // Show the "don't follow back" from the last scan immediately.
    const followerIds = new Set(prev.followers.map((u) => u.id));
    view.notback = prev.following.filter((u) => !followerIds.has(u.id));
    renderSummary(view.notback.length, prev.lastUnfollowers?.length || 0, prev.lastNewFollowers?.length || 0);
    view.unfollowers = prev.lastUnfollowers || [];
    view.newfollowers = prev.lastNewFollowers || [];
    els.summary.hidden = false;
    els.tabs.hidden = false;
    selectTab("notback");
  }
}

async function isOnInstagram() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return !!tab?.url && /https:\/\/(www\.)?instagram\.com\//.test(tab.url);
}

async function runScan() {
  els.error.hidden = true;
  if (!(await isOnInstagram())) {
    els.notInstagram.hidden = false;
    return;
  }
  els.scanBtn.disabled = true;
  els.progress.hidden = false;
  els.progress.textContent = "Scanning… keep this popup open (can take a minute).";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scanFriendships,
    });

    if (!result || result.error) {
      throw new Error(
        result?.error === "NOT_LOGGED_IN"
          ? "You're not logged in to Instagram in this tab."
          : result?.error || "Scan failed.",
      );
    }

    const { following, followers } = result;
    const followerIds = new Set(followers.map((u) => u.id));
    const notback = following.filter((u) => !followerIds.has(u.id));

    const prev = await getSnapshot();
    let unfollowers = [];
    let newfollowers = [];
    if (prev) {
      const prevFollowerIds = new Set(prev.followers.map((u) => u.id));
      unfollowers = prev.followers.filter((u) => !followerIds.has(u.id));
      newfollowers = followers.filter((u) => !prevFollowerIds.has(u.id));
    }

    await setSnapshot({
      at: Date.now(),
      followers,
      following,
      lastUnfollowers: unfollowers,
      lastNewFollowers: newfollowers,
    });

    view = { notback, unfollowers, newfollowers };
    els.lastScan.textContent = "scanned just now";
    renderSummary(notback.length, unfollowers.length, newfollowers.length);
    els.summary.hidden = false;
    els.tabs.hidden = false;
    selectTab("notback");
    if (!prev) {
      els.progress.hidden = false;
      els.progress.textContent = "Baseline saved. Scan again later to see new unfollowers.";
    } else {
      els.progress.hidden = true;
    }
  } catch (e) {
    els.error.hidden = false;
    els.error.textContent = e.message || String(e);
    els.progress.hidden = true;
  } finally {
    els.scanBtn.disabled = false;
  }
}

function renderSummary(nb, uf, nf) {
  els.statNotBack.textContent = nb;
  els.statUnfollowers.textContent = uf;
  els.statNewFollowers.textContent = nf;
}

function selectTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
  renderList(view[tab] || []);
}

function renderList(users) {
  els.list.innerHTML = "";
  if (!users.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent =
      currentTab === "notback"
        ? "Everyone you follow follows you back 🎉"
        : "Nothing here yet — scan again later to compare.";
    els.list.appendChild(li);
    return;
  }
  for (const u of users) {
    const li = document.createElement("li");

    const img = document.createElement("img");
    img.src = u.profile_pic_url || "";
    img.alt = u.username;
    img.referrerPolicy = "no-referrer";
    img.onerror = () => {
      const span = document.createElement("span");
      span.className = "ava";
      span.style.display = "flex";
      span.style.alignItems = "center";
      span.style.justifyContent = "center";
      span.style.fontSize = "12px";
      span.textContent = (u.username || "?").slice(0, 2).toUpperCase();
      img.replaceWith(span);
    };

    const meta = document.createElement("div");
    meta.className = "meta";
    const a = document.createElement("a");
    a.className = "u";
    a.href = `https://www.instagram.com/${u.username}/`;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = "@" + u.username;
    const n = document.createElement("div");
    n.className = "n";
    n.textContent = u.full_name || "";
    meta.append(a, n);

    li.append(img, meta);
    if (u.is_verified) {
      const b = document.createElement("span");
      b.className = "badge";
      b.textContent = "✓";
      li.appendChild(b);
    }
    els.list.appendChild(li);
  }
}

function getSnapshot() {
  return new Promise((res) => chrome.storage.local.get(SNAPSHOT_KEY, (o) => res(o[SNAPSHOT_KEY] || null)));
}
function setSnapshot(snap) {
  return new Promise((res) => chrome.storage.local.set({ [SNAPSHOT_KEY]: snap }, res));
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  return Math.floor(h / 24) + "d ago";
}

/* ---- Injected into the instagram.com page (runs in page origin) ---- */
async function scanFriendships() {
  const APP_ID = "936619743392459";
  const getCookie = (name) => {
    const v = `; ${document.cookie}`;
    const parts = v.split(`; ${name}=`);
    return parts.length === 2 ? parts.pop().split(";").shift() : null;
  };
  const viewerId = getCookie("ds_user_id");
  if (!viewerId) return { error: "NOT_LOGGED_IN" };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function fetchAll(kind, cap) {
    const out = [];
    let maxId;
    let page = 0;
    while (page < cap) {
      const url =
        `https://www.instagram.com/api/v1/friendships/${viewerId}/${kind}/?count=50` +
        (maxId ? `&max_id=${encodeURIComponent(maxId)}` : "");
      let res;
      try {
        res = await fetch(url, { credentials: "same-origin", headers: { "X-IG-App-ID": APP_ID } });
      } catch (e) {
        if (page === 0) return { error: "Network error contacting Instagram" };
        break;
      }
      if (!res.ok) {
        if (page === 0) return { error: `Instagram returned HTTP ${res.status}` };
        break;
      }
      const data = await res.json();
      for (const u of data.users || []) {
        out.push({
          id: String(u.pk_id ?? u.pk),
          username: u.username,
          full_name: u.full_name || "",
          profile_pic_url: u.profile_pic_url || "",
          is_private: !!u.is_private,
          is_verified: !!u.is_verified,
        });
      }
      maxId = data.next_max_id;
      page++;
      if (!maxId || data.has_more === false) break;
      // Be gentle: pause between pages, longer pause every 5 pages.
      await sleep(page % 5 === 0 ? 4000 : 900);
    }
    return { users: out };
  }

  const following = await fetchAll("following", 80);
  if (following.error) return { error: following.error };
  const followers = await fetchAll("followers", 300);
  if (followers.error) return { error: followers.error };
  return { following: following.users, followers: followers.users };
}
