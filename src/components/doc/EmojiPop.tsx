import { EMOJI_LIST } from "@/components/doc/docsData";

/* ─── Emoji Picker ─── */
export const EmojiPop = ({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) => (
  <div className="absolute bottom-full left-0 mb-2 w-[340px] rounded-xl p-2 z-50 animate-dropdown-in"
    style={{ background: "rgba(16,14,24,0.97)", backdropFilter: "blur(40px)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 20px 50px -10px rgba(0,0,0,0.7)" }}>
    <div className="grid grid-cols-10 gap-1">
      {EMOJI_LIST.map(e => (
        <button key={e} onClick={() => { onSelect(e); onClose(); }}
          className="w-7 h-7 rounded-md grid place-items-center text-base leading-none hover:bg-white/10 transition-all hover:scale-110">{e}</button>
      ))}
    </div>
  </div>
);
