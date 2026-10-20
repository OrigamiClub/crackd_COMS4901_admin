"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { callGemini } from "@/lib/gemini";
import { checkImage, fetchOwnCrackImage, OWN_CRACK_IMAGE_PREFIX } from "@/lib/images";
import { STYLES, STYLE_KEYS, TOPIC_KEYS } from "@/lib/humor-vocab";
import type { CaptionOption } from "@/lib/data";

type Supabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"];
export type FormState = { error: string } | null;

const BUCKET = "cracks";

function getPhoto(formData: FormData) {
  const photo = formData.get("photo") as File | null;
  return photo && photo.size > 0 ? photo : null;
}

// Uploads into the admin's own folder, which the storage policies allow.
async function uploadImage(supabase: Supabase, userId: string, photo: File) {
  const checked = await checkImage(photo);
  if ("error" in checked) return checked;

  const path = `${userId}/${crypto.randomUUID()}.${checked.extension}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, photo, { contentType: checked.type });
  if (error) return { error: error.message };

  return { url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}

// Best-effort removal of an image in our bucket (admins may delete any).
async function removeImage(supabase: Supabase, url: string | null) {
  if (!url?.startsWith(OWN_CRACK_IMAGE_PREFIX)) return;
  const path = decodeURIComponent(url.slice(OWN_CRACK_IMAGE_PREFIX.length));
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.error("Couldn't remove old crack image", error);
}

const CAPTION_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      caption: { type: "STRING" },
      style: { type: "STRING", enum: STYLE_KEYS },
    },
    required: ["caption", "style"],
  },
};

const CAPTION_PROMPT =
  "You write captions for a Columbia University / New York City meme board " +
  "called \"Cracking Jokes in the City of New York\". Write three short, " +
  "funny meme captions for this image, each in a clearly different style of " +
  `humor, chosen from: ${STYLES.map((s) => `${s.key} (${s.label})`).join(", ")}. ` +
  "For each, give the caption and the style key it uses — no quotes " +
  "inside the captions, hashtags, or explanation. If no direction is given, " +
  "make it about Columbia student life.";

// Three Gemini captions for a newly chosen `photo`, or for the stored image
// of crack `id` when editing. `direction` optionally steers the joke.
export async function generateCaptions(
  formData: FormData
): Promise<{ captions: CaptionOption[] } | { error: string }> {
  const { supabase } = await requireAdmin();

  let image: { data: string; type: string };
  const photo = getPhoto(formData);
  if (photo) {
    const checked = await checkImage(photo);
    if ("error" in checked) return checked;
    image = {
      data: Buffer.from(await photo.arrayBuffer()).toString("base64"),
      type: checked.type,
    };
  } else {
    const id = Number(formData.get("id"));
    const { data: crack } = Number.isInteger(id)
      ? await supabase.from("cracks").select("img_url").eq("id", id).maybeSingle()
      : { data: null };
    if (!crack?.img_url) return { error: "Choose an image first." };
    const fetched = await fetchOwnCrackImage(crack.img_url);
    if ("error" in fetched) return fetched;
    image = fetched;
  }

  const direction = formData.get("direction")?.toString().trim().slice(0, 300);
  const result = await callGemini(
    [
      { inline_data: { mime_type: image.type, data: image.data } },
      {
        text: direction
          ? `${CAPTION_PROMPT}\n\nDirection for the joke: ${direction}`
          : CAPTION_PROMPT,
      },
    ],
    CAPTION_SCHEMA
  );
  if ("error" in result) return result;

  const captions = (Array.isArray(result.json) ? result.json : [])
    .map((item: { caption?: unknown; style?: unknown }) => ({
      caption: typeof item?.caption === "string" ? item.caption.trim() : "",
      style:
        typeof item?.style === "string" && STYLE_KEYS.includes(item.style)
          ? item.style
          : null,
    }))
    .filter((option) => option.caption)
    .slice(0, 3);

  return captions.length > 0
    ? { captions }
    : { error: "Gemini didn't return any captions. Try again." };
}

function readText(formData: FormData) {
  return formData.get("text")?.toString().trim().slice(0, 500) ?? "";
}

export async function createCrack(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireAdmin();

  const photo = getPhoto(formData);
  const text = readText(formData);
  if (!photo) return { error: "Choose an image." };
  if (!text) return { error: "Write or generate a caption." };

  const uploaded = await uploadImage(supabase, user.id, photo);
  if ("error" in uploaded) return uploaded;

  const { data: created, error } = await supabase
    .from("cracks")
    .insert({ text, img_url: uploaded.url, creator_id: user.id })
    .select("id")
    .single();
  if (error || !created) {
    await removeImage(supabase, uploaded.url);
    return { error: error?.message ?? "Couldn't save the crack." };
  }

  revalidatePath("/", "layout");
  redirect(`/cracks?notice=created`);
}

export async function updateCrack(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireAdmin();

  const id = Number(formData.get("id"));
  const text = readText(formData);
  if (!Number.isInteger(id)) return { error: "Missing crack id." };
  if (!text) return { error: "The caption can't be empty." };

  const { data: existing } = await supabase
    .from("cracks")
    .select("img_url")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { error: "That crack no longer exists." };

  const updates: { text: string; img_url?: string } = { text };
  const photo = getPhoto(formData);
  if (photo) {
    const uploaded = await uploadImage(supabase, user.id, photo);
    if ("error" in uploaded) return uploaded;
    updates.img_url = uploaded.url;
  }

  const { data, error } = await supabase
    .from("cracks")
    .update(updates)
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    if (updates.img_url) await removeImage(supabase, updates.img_url);
    return {
      error: error?.message ?? "Update was refused. Is the admin migration applied?",
    };
  }

  if (updates.img_url) await removeImage(supabase, existing.img_url);

  revalidatePath("/", "layout");
  redirect(`/cracks?notice=updated`);
}

export async function deleteCrack(formData: FormData) {
  const { supabase } = await requireAdmin();

  const id = Number(formData.get("id"));
  const { data, error } = await supabase
    .from("cracks")
    .delete()
    .eq("id", id)
    .select("img_url");
  if (error || !data?.length) {
    redirect(`/cracks/${id}?notice=delete-failed`);
  }

  await removeImage(supabase, data[0].img_url);

  revalidatePath("/", "layout");
  redirect(`/cracks?notice=deleted`);
}

// Replaces a crack's humor tags by hand. Only keys from the fixed
// vocabulary are kept. Rows marked edited_by are left alone by the meme
// board's Gemini tagger.
export async function saveTags(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const id = Number(formData.get("id"));
  const styles = [...new Set(formData.getAll("styles").map(String))].filter((key) =>
    STYLE_KEYS.includes(key)
  );
  const topics = [...new Set(formData.getAll("topics").map(String))].filter((key) =>
    TOPIC_KEYS.includes(key)
  );

  const { error } = await supabase.from("crack_traits").upsert({
    crack_id: id,
    styles,
    topics,
    edited_by: user.id,
    tagged_at: new Date().toISOString(),
  });
  if (error) {
    console.error("Couldn't save tags", error);
    redirect(`/cracks/${id}?notice=tags-failed`);
  }

  revalidatePath("/", "layout");
  redirect(`/cracks/${id}?notice=tags-saved`);
}

// Removes a crack's tags so the meme board has Gemini tag it again.
export async function clearTags(formData: FormData) {
  const { supabase } = await requireAdmin();

  const id = Number(formData.get("id"));
  const { error } = await supabase.from("crack_traits").delete().eq("crack_id", id);
  if (error) {
    console.error("Couldn't clear tags", error);
    redirect(`/cracks/${id}?notice=tags-failed`);
  }

  revalidatePath("/", "layout");
  redirect(`/cracks/${id}?notice=tags-cleared`);
}
