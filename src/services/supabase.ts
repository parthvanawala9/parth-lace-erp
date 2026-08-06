import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  "https://ijfrfyafvaxhynnbzsvi.supabase.co";

const supabaseAnonKey =
  "sb_publishable_QusEJKFXKzlVMyK33rKMug_3ydI1TtI";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);