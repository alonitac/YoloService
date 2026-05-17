"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./page.module.css";

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

export default function Home() {
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedFile(e.target.files?.[0] ?? null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile || sending) return;

    const file = selectedFile;
    const preview = URL.createObjectURL(file);

    setMessages((prev) => [
      ...prev,
      { type: "user", preview, filename: file.name },
      { type: "loading" },
    ]);
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

      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          type: "result",
          annotatedUrl: `/yolo/prediction/${prediction_uid}/image`,
          objects: detail.detection_objects,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { type: "error", text: err instanceof Error ? err.message : "Something went wrong" },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.dot} />
        YOLO Detection
      </header>

      <div className={styles.feed}>
        {messages.length === 0 && (
          <p className={styles.empty}>Send an image to detect objects.</p>
        )}

        {messages.map((msg, i) => {
          if (msg.type === "user") {
            return (
              <div key={i} className={`${styles.bubble} ${styles.bubbleUser}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={msg.preview} alt={msg.filename} className={styles.thumbUser} />
                <span className={styles.filename}>{msg.filename}</span>
              </div>
            );
          }
          if (msg.type === "loading") {
            return (
              <div key={i} className={`${styles.bubble} ${styles.bubbleBot}`}>
                <span className={styles.dots}>
                  <span /><span /><span />
                </span>
              </div>
            );
          }
          if (msg.type === "error") {
            return (
              <div key={i} className={`${styles.bubble} ${styles.bubbleBot} ${styles.bubbleError}`}>
                {msg.text}
              </div>
            );
          }
          return (
            <div key={i} className={`${styles.bubble} ${styles.bubbleBot}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={msg.annotatedUrl} alt="Detected" className={styles.thumbBot} />
              {msg.objects.length === 0 ? (
                <p className={styles.noObjects}>No objects detected.</p>
              ) : (
                <ul className={styles.tags}>
                  {msg.objects.map((obj) => (
                    <li key={obj.id} className={styles.tag}>
                      {obj.label}
                      <span className={styles.tagScore}>{(obj.score * 100).toFixed(0)}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className={styles.bar}>
        <label className={styles.attachBtn} title="Attach image">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          📎
          {selectedFile && <span className={styles.attachName}>{selectedFile.name}</span>}
        </label>

        <input
          ref={textRef}
          className={styles.textInput}
          type="text"
          placeholder={selectedFile ? `Send "${selectedFile.name}"…` : "Attach an image to get started"}
          readOnly
        />

        <button className={styles.sendBtn} type="submit" disabled={!selectedFile || sending}>
          ➤
        </button>
      </form>
    </div>
  );
}
