"use client";

import { startTransition, useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createCrack, generateCaptions, updateCrack } from "./actions";
import { IMAGE_TOO_BIG, MAX_IMAGE_BYTES } from "@/lib/images";
import { styleInfo } from "@/lib/humor-vocab";
import type { CaptionOption } from "@/lib/data";

// Create and edit form for a crack: pick an image, optionally have Gemini
// suggest three captions, then edit the caption freely and save. With
// `crack` it edits that crack (the image is optional and Gemini can caption
// the stored image).
export default function CrackForm({
  crack,
}: {
  crack?: { id: number; text: string | null; img_url: string | null };
}) {
  const isEdit = crack !== undefined;
  const [state, formAction, saving] = useActionState(
    isEdit ? updateCrack : createCrack,
    null
  );

  const photoRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [text, setText] = useState(crack?.text ?? "");
  const [direction, setDirection] = useState("");
  const [options, setOptions] = useState<CaptionOption[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [generating, startGenerating] = useTransition();

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const shownImage = previewUrl ?? crack?.img_url ?? null;

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    let photo = e.target.files?.[0];
    if (photo && photo.size > MAX_IMAGE_BYTES) {
      e.target.value = "";
      photo = undefined;
      setPhotoError(IMAGE_TOO_BIG);
    } else {
      setPhotoError(null);
    }
    setPreviewUrl(photo ? URL.createObjectURL(photo) : null);
    setOptions([]);
  }

  function handleGenerate() {
    const formData = new FormData();
    const photo = photoRef.current?.files?.[0];
    if (photo) formData.set("photo", photo);
    else if (crack) formData.set("id", String(crack.id));
    formData.set("direction", direction);

    setAiError(null);
    startGenerating(async () => {
      const result = await generateCaptions(formData);
      if ("captions" in result) setOptions(result.captions);
      else setAiError(result.error);
    });
  }

  return (
    <form
      // Submitted by hand rather than with `action`, so React doesn't clear
      // the chosen file when the server sends back an error.
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => formAction(formData));
      }}
      className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]"
    >
      {crack && <input type="hidden" name="id" value={crack.id} />}

      <div className="card flex flex-col gap-3">
        <label htmlFor="photo" className="section-title">
          {isEdit ? "Image (leave alone to keep it)" : "Image"}
        </label>
        {shownImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shownImage} alt="Crack image" className="aspect-square w-full rounded-lg object-cover" />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-black/20 text-sm opacity-60 dark:border-white/20">
            No image yet
          </div>
        )}
        <input
          ref={photoRef}
          id="photo"
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/gif,image/webp"
          required={!isEdit}
          onChange={handlePhotoChange}
          className="block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-full file:border file:border-black/10 file:bg-foreground file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
        />
        <p className="text-xs opacity-75">JPG, PNG, GIF or WebP, up to 4MB.</p>
        {photoError && <p className="text-sm text-red-700">{photoError}</p>}
      </div>

      <div className="flex flex-col gap-6">
        <div className="card flex flex-col gap-3">
          <h2 className="section-title">AI captions</h2>
          <p className="-mt-2 text-xs opacity-75">
            Gemini suggests three captions in different humor styles. Pick one,
            then edit it below if you like.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              placeholder="Optional direction, e.g. “a joke about Lion Fund”"
              aria-label="Direction for the joke"
              maxLength={300}
              className="h-10 flex-1 rounded-full border border-black/15 bg-transparent px-4 text-sm dark:border-white/20"
            />
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !shownImage}
              className="btn-secondary disabled:opacity-50"
            >
              {generating ? "Asking Gemini…" : options.length ? "Try three more" : "Generate captions"}
            </button>
          </div>
          {!shownImage && <p className="text-xs opacity-75">Choose an image first.</p>}
          {aiError && <p className="text-sm text-red-700">{aiError}</p>}
          {options.length > 0 && (
            <ul className="flex flex-col gap-2" aria-label="Suggested captions">
              {options.map((option, i) => {
                const style = styleInfo(option.style);
                const picked = text === option.caption;
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => setText(option.caption)}
                      aria-pressed={picked}
                      className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors ${
                        picked
                          ? "border-foreground bg-foreground/10"
                          : "border-black/10 hover:bg-foreground/5 dark:border-white/15"
                      }`}
                    >
                      <span className="flex-1">{option.caption}</span>
                      {style && (
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-xs text-white"
                          style={{ backgroundColor: style.color }}
                        >
                          {style.label}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card flex flex-col gap-3">
          <label htmlFor="text" className="section-title">
            Caption
          </label>
          <textarea
            id="text"
            name="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={500}
            required
            className="rounded-lg border border-black/15 bg-transparent p-3 text-sm dark:border-white/20"
          />
          {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
          <button type="submit" disabled={saving} className="btn-primary self-start disabled:opacity-60">
            {saving ? "Saving…" : isEdit ? "Save changes" : "Post crack"}
          </button>
        </div>
      </div>
    </form>
  );
}
