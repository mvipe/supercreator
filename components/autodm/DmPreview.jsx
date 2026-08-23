"use client";

/** A small Instagram-ish preview of what the fan actually receives. */
export default function DmPreview({ account, dmText, buttonLabel, buttonUrl, commentReply, showComment }) {
  const handle = account?.username ? `@${account.username}` : "@yourhandle";
  const text = (dmText || "").replace(/\{\{\s*(username|name|handle)\s*\}\}/gi, "@fan") || "Your message shows up here…";

  return (
    <div className="rounded-card border border-line bg-paper p-4">
      <div className="text-[11px] font-bold uppercase tracking-wide text-inkmuted">Preview</div>

      {showComment && commentReply && (
        <div className="mt-3 rounded-[10px] border border-line bg-white p-3">
          <div className="text-[11px] font-semibold text-inkmuted">Under the comment</div>
          <div className="mt-1.5 text-sm"><span className="font-semibold">@fan</span> <span className="text-inkmuted">send me the link</span></div>
          <div className="mt-1.5 pl-4 text-sm"><span className="font-semibold">{handle}</span> {commentReply}</div>
        </div>
      )}

      <div className="mt-3 rounded-[10px] border border-line bg-white p-3">
        <div className="text-[11px] font-semibold text-inkmuted">In their DMs</div>
        <div className="mt-2 flex items-start gap-2">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#F9CE34] via-[#EE2A7B] to-[#6228D7] text-[11px] font-bold text-white">
            {(account?.username || "y")[0].toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="inline-block max-w-full rounded-2xl rounded-tl-md bg-paper px-3.5 py-2.5 text-sm">
              <span className="whitespace-pre-wrap break-words">{text}</span>
            </div>
            {buttonUrl && (
              <div className="mt-1.5 max-w-[240px] overflow-hidden rounded-[14px] border border-line">
                <div className="truncate bg-white px-3 py-2 text-[11px] text-inkmuted">{buttonUrl}</div>
                <div className="border-t border-line bg-white px-3 py-2 text-center text-sm font-semibold text-brand">
                  {buttonLabel || "Open link"}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
