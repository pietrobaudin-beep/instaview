"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, Bookmark, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Builds the self-contained bookmarklet, embedding this site's real origin. */
function buildBookmarklet(origin: string): string {
  const code = `(async()=>{try{
var S=${JSON.stringify(origin)},A="936619743392459";
var gc=function(n){var v="; "+document.cookie,p=v.split("; "+n+"=");return p.length===2?p.pop().split(";").shift():null};
if(!location.hostname.endsWith("instagram.com")){alert("Abra o instagram.com (logado) e clique no favorito ali.");return}
var vid=gc("ds_user_id");if(!vid){alert("Faca login no Instagram primeiro.");return}
var w=window.open(S+"/receive","iv_sync","width=460,height=640");
if(!w){alert("Permita pop-ups para o InstaView e tente de novo.");return}
var sl=function(ms){return new Promise(function(r){setTimeout(r,ms)})},H={"X-IG-App-ID":A};
var mp=function(u){return{username:u.username,displayName:u.full_name||null,avatarUrl:u.profile_pic_url||null,isVerified:!!u.is_verified}};
var all=async function(k,cap){var o=[],m,p=0,t=false;while(p<cap){var url="https://www.instagram.com/api/v1/friendships/"+vid+"/"+k+"/?count=50"+(m?"&max_id="+encodeURIComponent(m):"");var r=await fetch(url,{credentials:"same-origin",headers:H});if(!r.ok){if(p===0)throw new Error("Instagram HTTP "+r.status);break}var d=await r.json();(d.users||[]).forEach(function(u){o.push(mp(u))});m=d.next_max_id;p++;if(!m||d.has_more===false)break;if(p>=cap)t=true;await sl(p%5===0?4000:900)}return{list:o,truncated:t}};
var info={};try{var ri=await fetch("https://www.instagram.com/api/v1/users/"+vid+"/info/",{credentials:"same-origin",headers:H});info=(await ri.json()).user||{}}catch(e){}
var fo=await all("following",80),fr=await all("followers",300);
var payload={profile:{username:info.username||"",displayName:info.full_name||null,avatarUrl:info.profile_pic_url_hd||info.profile_pic_url||null,followersCount:info.follower_count||fr.list.length,followingCount:info.following_count||fo.list.length,postsCount:info.media_count||0,isVerified:!!info.is_verified,isPrivate:!!info.is_private},following:fo.list,followers:fr.list,truncated:fr.truncated};
var send=function(){try{if(w&&!w.closed)w.postMessage({type:"instaview:data",payload:payload},S)}catch(e){}};
window.addEventListener("message",function(e){if(e.source===w&&e.data==="instaview:ready")send()});
send();
}catch(err){alert("Erro: "+(err&&err.message||err))}})();`;
  return "javascript:" + code.replace(/\n/g, "");
}

export function ConnectClient() {
  const linkRef = React.useRef<HTMLAnchorElement>(null);
  const [code, setCode] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    const bm = buildBookmarklet(window.location.origin);
    setCode(bm);
    // Set the javascript: href via the DOM to bypass React URL sanitization,
    // so the link is draggable to the bookmarks bar.
    if (linkRef.current) linkRef.current.setAttribute("href", bm);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
          <Activity className="h-5 w-5 text-accent" /> InstaView
        </Link>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">Connect your Instagram</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Sync your own account so InstaView can show who unfollowed you. It uses your own logged-in
        session in your browser — no password, and nothing leaves your machine except your follower
        list, sent straight to your InstaView account.
      </p>

      <Card className="mt-6">
        <CardContent className="p-6">
          <p className="text-sm font-medium">1. Add the sync button to your bookmarks bar</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Drag this button to your bookmarks bar (⌘/Ctrl+Shift+B to show it):
          </p>
          <div className="mt-3">
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a
              ref={linkRef}
              href="#"
              onClick={(e) => e.preventDefault()}
              className="inline-flex cursor-grab items-center gap-2 rounded-lg border border-accent/50 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent"
              draggable
            >
              <Bookmark className="h-4 w-4" /> Sync InstaView
            </a>
          </div>
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={copy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Can't drag? Copy the code"}
            </Button>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Then create a new bookmark and paste this as its URL/address.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="p-6">
          <p className="text-sm font-medium">2. Go to Instagram and click it</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              Open{" "}
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                instagram.com
              </a>{" "}
              and make sure you&apos;re logged in.
            </li>
            <li>
              Click the <b>Sync InstaView</b> bookmark. A small window opens and it syncs (~1 min —
              keep both tabs open).
            </li>
            <li>Come back to your dashboard — your unfollowers will be there.</li>
          </ol>
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        Do this again anytime to refresh. The first sync is a baseline; the next ones reveal who
        unfollowed you since. On the Free plan the list is blurred — upgrade to reveal the names.
      </p>
    </main>
  );
}
