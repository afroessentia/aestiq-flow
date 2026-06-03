import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const cache: Record<string, string> = {};

export async function resolveAssetUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  if (cache[path]) return cache[path];
  const { data } = await supabase.storage.from("clinic-assets").createSignedUrl(path, 60 * 60);
  if (data?.signedUrl) {
    cache[path] = data.signedUrl;
    return data.signedUrl;
  }
  return null;
}

export function useLogoUrl() {
  const { user } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!user) { setUrl(null); return; }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("clinic_settings" as never)
        .select("logo_url")
        .eq("user_id", user.id)
        .maybeSingle();
      const path = (data as { logo_url?: string | null } | null)?.logo_url ?? null;
      const resolved = await resolveAssetUrl(path);
      if (alive) setUrl(resolved);
    })();
    return () => { alive = false; };
  }, [user?.id]);
  return url;
}

export function useClinicName() {
  const { user } = useAuth();
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    if (!user) { setName(null); return; }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("clinic_settings" as never)
        .select("clinic_name")
        .eq("user_id", user.id)
        .maybeSingle();
      const n = (data as { clinic_name?: string | null } | null)?.clinic_name ?? null;
      if (alive) setName(n);
    })();
    return () => { alive = false; };
  }, [user?.id]);
  return name;
}
