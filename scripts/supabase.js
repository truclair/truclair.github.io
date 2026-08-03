import { createClient }
from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
const supabaseUrl = "https://lyygytdqbhpfeoxjwydo.supabase.co";
const supabaseKey = "sb_publishable_7BfpzSncDJR9EC7Jiqsx3A_TwCj_S8Q";

export const supabase = createClient(
    supabaseUrl,
    supabaseKey
);