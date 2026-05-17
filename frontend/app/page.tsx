"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Paperclip, Send, Plus, CircleUser, LogOut, Settings, Bot, Loader2 } from "lucide-react";

interface DetectionObject {
  id: number;
  label: string;
  score: number;
}

type Message =
  | { type: "user"; preview: string; filename: string }
  | { type: "result"; annotatedUrl: string; objects: DetectionObject[] }
  | { type: "error"; text: string }
  | { type: "loading" };

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
}

const INIT_ID = "init";

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([
    { id: INIT_ID, title: "New chat", messages: [] },
  ]);
  const [activeId, setActiveId] = useState(INIT_ID);
  const [profileOpen, setProfileOpen] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  const activeConv = conversations.find((c) => c.id === activeId)!;

  const scrollToBottom = () => {
    const el = feedRef.current;
    if (!el) return;
    // defer one frame so the DOM is fully painted before measuring
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  };

  useEffect(() => {
    scrollToBottom();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConv?.messages]);

  function newChat() {
    const id = Date.now().toString();
    setConversations((prev) => [{ id, title: "New chat", messages: [] }, ...prev]);
    setActiveId(id);
  }

  function updateConv(id: string, updater: (c: Conversation) => Conversation) {
    setConversations((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedFile(e.target.files?.[0] ?? null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile || sending) return;

    const file = selectedFile;
    const preview = URL.createObjectURL(file);
    const convId = activeId;

    updateConv(convId, (c) => ({
      ...c,
      title: c.title === "New chat" ? file.name.replace(/\.[^.]+$/, "") : c.title,
      messages: [...c.messages, { type: "user", preview, filename: file.name }, { type: "loading" }],
    }));

    setSelectedFile(null);
    if (fileRef.current) fileRef.current.value = "";
    setSending(true);

    try {
      const form = new FormData();
      form.append("file", file);

      const predictRes = await fetch("/yolo/predict", { method: "POST", body: form });
      if (!predictRes.ok) throw new Error(`Prediction failed (${predictRes.status})`);
      const { prediction_uid } = await predictRes.json();

      const detailRes = await fetch(`/yolo/prediction/${prediction_uid}`);
      if (!detailRes.ok) throw new Error(`Could not fetch result (${detailRes.status})`);
      const detail = await detailRes.json();

      updateConv(convId, (c) => ({
        ...c,
        messages: [
          ...c.messages.slice(0, -1),
          {
            type: "result",
            annotatedUrl: `/yolo/prediction/${prediction_uid}/image`,
            objects: detail.detection_objects,
          },
        ],
      }));
    } catch (err) {
      updateConv(convId, (c) => ({
        ...c,
        messages: [
          ...c.messages.slice(0, -1),
          { type: "error", text: err instanceof Error ? err.message : "Something went wrong" },
        ],
      }));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-dvh bg-background overflow-hidden" onClick={() => setProfileOpen(false)}>

      {/* ── Sidebar ── */}
      <aside className="w-64 shrink-0 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">

        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-sidebar-border">
          <Bot className="size-5 text-sidebar-primary" />
          <span className="font-semibold text-sm">YOLO Detection</span>
        </div>

        {/* New chat */}
        <div className="px-3 py-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 bg-transparent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={newChat}
          >
            <Plus className="size-4" />
            New chat
          </Button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2">
          <div className="flex flex-col gap-0.5 pb-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveId(conv.id)}
                className={cn(
                  "w-full text-left text-sm px-3 py-2 rounded-md truncate transition-colors",
                  "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  conv.id === activeId && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                )}
              >
                {conv.title}
              </button>
            ))}
          </div>
        </div>

        {/* Profile */}
        <div className="relative mt-auto px-3 py-3 border-t border-sidebar-border" onClick={(e) => e.stopPropagation()}>
          {profileOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-2 rounded-lg border border-sidebar-border bg-popover text-popover-foreground shadow-md overflow-hidden z-50">
              <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                <Settings className="size-4" /> Settings
              </button>
              <Separator />
              <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors">
                <LogOut className="size-4" /> Sign out
              </button>
            </div>
          )}
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground font-semibold text-xs shrink-0">
              A
            </span>
            Alon
            <CircleUser className="size-4 ml-auto opacity-50" />
          </button>
        </div>
      </aside>

      {/* ── Chat ── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="flex items-center gap-2 px-5 py-3.5 border-b bg-background/80 backdrop-blur shrink-0">
          <span className="size-2 rounded-full bg-emerald-500" />
          <span className="font-semibold text-sm">{activeConv.title}</span>
        </header>

        {/* Feed */}
        <div ref={feedRef} className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
            {activeConv.messages.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 mt-20 text-muted-foreground">
                <Bot className="size-10 opacity-30" />
                <p className="text-sm">Send an image to detect objects.</p>
              </div>
            )}

            {activeConv.messages.map((msg, i) => {
              if (msg.type === "user") {
                return (
                  <div key={i} className="flex justify-end">
                    <div className="flex flex-col items-end gap-1 max-w-[70%]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={msg.preview}
                        alt={msg.filename}
                        onLoad={scrollToBottom}
                        className="rounded-2xl rounded-br-sm max-w-[220px] border shadow-sm"
                      />
                      <span className="text-xs text-muted-foreground px-1">{msg.filename}</span>
                    </div>
                  </div>
                );
              }

              if (msg.type === "loading") {
                return (
                  <div key={i} className="flex justify-start">
                    <div className="flex items-center gap-2 px-4 py-3 rounded-2xl rounded-bl-sm bg-muted text-muted-foreground text-sm">
                      <Loader2 className="size-4 animate-spin" />
                      Detecting…
                    </div>
                  </div>
                );
              }

              if (msg.type === "error") {
                return (
                  <div key={i} className="flex justify-start">
                    <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-destructive/10 text-destructive text-sm max-w-[70%]">
                      {msg.text}
                    </div>
                  </div>
                );
              }

              // result
              return (
                <div key={i} className="flex justify-start">
                  <div className="flex flex-col gap-3 max-w-[80%] px-4 py-3 rounded-2xl rounded-bl-sm bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={msg.annotatedUrl}
                      alt="Detected"
                      onLoad={scrollToBottom}
                      className="rounded-xl border shadow-sm max-w-sm w-full"
                    />
                    {msg.objects.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No objects detected.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {msg.objects.map((obj) => (
                          <Badge key={obj.id} variant="secondary" className="capitalize">
                            {obj.label}
                            <span className="ml-1 opacity-60 font-normal">{(obj.score * 100).toFixed(0)}%</span>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

          </div>
        </div>

        {/* Input bar */}
        <div className="border-t bg-background/80 backdrop-blur">
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto flex items-center gap-2 px-4 py-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="sr-only"
            />
            <Tooltip>
              <TooltipTrigger
                type="button"
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "inline-flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-muted",
                  selectedFile ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Paperclip className="size-4" />
              </TooltipTrigger>
              <TooltipContent>Attach image</TooltipContent>
            </Tooltip>

            <div className="flex-1 flex items-center gap-2 rounded-xl border bg-muted/50 px-3 py-2 text-sm text-muted-foreground min-h-[40px]">
              {selectedFile ? (
                <>
                  <span className="truncate">{selectedFile.name}</span>
                  <button
                    type="button"
                    className="ml-auto shrink-0 opacity-50 hover:opacity-100 text-xs"
                    onClick={() => { setSelectedFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                  >
                    ✕
                  </button>
                </>
              ) : (
                <span>Attach an image to get started</span>
              )}
            </div>

            <Button type="submit" size="icon" disabled={!selectedFile || sending} className="shrink-0">
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

