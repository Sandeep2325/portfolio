"use client";

import { HiOutlineDocumentText, HiOutlineMicrophone, HiOutlineArrowDownTray } from "react-icons/hi2";
import { formatBytes, formatDuration, type AttachmentKind } from "@/lib/attachments";

export type MessageAttachmentData = {
  url: string | null;
  kind: AttachmentKind;
  name: string;
  mime: string;
  size: number;
  durationMs: number | null;
};

export default function MessageAttachment({ attachment }: { attachment: MessageAttachmentData }) {
  const { url, kind, name, size, durationMs } = attachment;

  if (!url) {
    return <p className="dm-attachment-pending">Attachment unavailable</p>;
  }

  if (kind === "image") {
    return (
      <a href={url} target="_blank" rel="noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={name} className="dm-image" />
      </a>
    );
  }

  if (kind === "audio") {
    return (
      <div className="dm-audio">
        <span className="dm-audio-icon">
          <HiOutlineMicrophone className="h-4 w-4" />
        </span>
        <audio controls preload="metadata" src={url} className="dm-audio-player" />
        {durationMs ? <span className="dm-audio-time">{formatDuration(durationMs)}</span> : null}
      </div>
    );
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" download={name} className="dm-file">
      <span className="dm-file-icon">
        <HiOutlineDocumentText className="h-5 w-5" />
      </span>
      <span className="dm-file-meta">
        <strong>{name}</strong>
        <em>{formatBytes(size)}</em>
      </span>
      <HiOutlineArrowDownTray className="h-4 w-4 flex-shrink-0 opacity-70" />
    </a>
  );
}
