import { useRef } from "react";
import { MessageCircle, Heart, Reply, Send, Smile } from "lucide-react";
import { EmojiPop } from "@/components/doc/EmojiPop";
import { MiniMd } from "@/components/doc/DocRenderer";
import { createComment, likesComment } from "@/api/comment";
import { useNotifications } from "@/components/dashboard/NotificationProvider";
import { toast } from "sonner";
import type { Comment } from "@/components/doc/docsData";

const getErrorMessage = (error: any, fallback: string) => {
  const data = error?.response?.data;
  return data?.message || data?.msg || data?.error || error?.message || fallback;
};

const formatCommentTime = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absOffset = Math.abs(offsetMinutes);
  const offsetHours = pad(Math.floor(absOffset / 60));
  const offsetRemainder = pad(absOffset % 60);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${offsetHours}:${offsetRemainder}`;
};

const getCommentId = (comment: Comment) =>
  Number(comment.id ?? (comment as any).comment_id ?? (comment as any).commentId ?? (comment as any).ID ?? 0);

/* ─── Comments Section ─── */
interface CommentsSectionProps {
  comments: Comment[];
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
  form: { name: string; email: string; website: string; content: string; };
  setForm: React.Dispatch<React.SetStateAction<{ name: string; email: string; website: string; content: string; }>>;
  refreshComments: () => Promise<void>;
  replyTo: number | null;
  setReplyTo: React.Dispatch<React.SetStateAction<number | null>>;
  replyText: { username: string; content: string; };
  setReplyText: React.Dispatch<React.SetStateAction<{ username: string; content: string; }>>;
  liked: Set<number>;
  setLiked: React.Dispatch<React.SetStateAction<Set<number>>>;
  showEmoji: boolean;
  setShowEmoji: React.Dispatch<React.SetStateAction<boolean>>;
  showReplyEmoji: number | null;
  setShowReplyEmoji: React.Dispatch<React.SetStateAction<number | null>>;
  commentEndRef: React.RefObject<HTMLDivElement | null>;
  loggedInUser: { username: string; email: string; avatarUrl: string | null } | null;
}

export const CommentsSection = ({
  comments, setComments, form, setForm, replyTo, setReplyTo, replyText, setReplyText,
  liked, setLiked, showEmoji, setShowEmoji, showReplyEmoji, setShowReplyEmoji, commentEndRef, refreshComments, loggedInUser,
}: CommentsSectionProps) => {
  const pendingLikesRef = useRef<Set<number>>(new Set());
  const { push: pushNotification } = useNotifications();

  const updateLikeCount = (list: Comment[], targetId: number, nextLikes: number): Comment[] =>
    list.map((c) => {
      if (getCommentId(c) === targetId) return { ...c, likes: Math.max(0, nextLikes) };
      if (c.replies?.length) return { ...c, replies: updateLikeCount(c.replies, targetId, nextLikes) };
      return c;
    });

  const toggleLike = (id: number) => {
    // Guard against duplicate requests while a like/unlike is in flight
    if (pendingLikesRef.current.has(id)) return;

    const isLiked = liked.has(id);
    const currentLikes =
      comments.find((c) => getCommentId(c) === id)?.likes ??
      comments.flatMap((c) => c.replies ?? []).find((r) => getCommentId(r) === id)?.likes ??
      0;
    const optimisticLikes = Math.max(0, currentLikes + (isLiked ? -1 : 1));
    const action = isLiked ? "unlikes" : "likes";

    // Optimistic UI
    setLiked(p => {
      const n = new Set(p);
      if (n.has(id)) { n.delete(id); } else { n.add(id); }
      return n;
    });
    setComments(prev => updateLikeCount(prev, id, optimisticLikes));

    // Track in-flight request
    pendingLikesRef.current = new Set([...pendingLikesRef.current, id]);

    likesComment(id, action)
      .then((res) => {
        const payload = res?.data?.data ?? res?.data ?? {};
        const serverLikes = payload.like_count ?? payload.likes ?? payload.likeCount ?? payload.count;
        if (typeof serverLikes === "number") {
          // Only accept server value if it moved in the expected direction,
          // otherwise keep the optimistic count (server may have a bug).
          const movedCorrectly = isLiked
            ? serverLikes < currentLikes   // unlike → count should decrease
            : serverLikes > currentLikes;   // like → count should increase
          if (movedCorrectly) {
            setComments(prev => updateLikeCount(prev, id, serverLikes));
          }
          // Notify on like (not unlike)
          if (!isLiked) {
            const author = comments.find((c) => getCommentId(c) === id)?.name
              ?? comments.flatMap((c) => c.replies ?? []).find((r) => getCommentId(r) === id)?.name
              ?? "comment";
            pushNotification({ kind: "like", actor: loggedInUser?.username || "Someone", object: author, title: "liked a comment", text: `Liked ${author}'s comment` });
          }
        }
      })
      .catch((error) => {
        // Rollback on failure
        setLiked(p => {
          const n = new Set(p);
          if (isLiked) n.add(id); else n.delete(id);
          return n;
        });
        setComments(prev => updateLikeCount(prev, id, currentLikes));
        toast.error(getErrorMessage(error, "Failed to update reaction"));
      })
      .finally(() => {
        const next = new Set(pendingLikesRef.current);
        next.delete(id);
        pendingLikesRef.current = next;
      });
  };

  const makeCommentPayload = (
    data: { username: string; content: string; email?: string; website?: string },
    parentId: number | null,
  ) => ({
    content: data.content.trim(),
    username: data.username.trim(),
    email: data.email?.trim() ?? "",
    website: data.website?.trim() ?? "",
    parent_id: parentId,
    comment_time: formatCommentTime(new Date()),
    like_count: 0,
  });

  const pubComment = async () => {
    if (!form.name.trim()) {
      toast.error("Username is required");
      return;
    }
    if (!form.content.trim()) {
      toast.error("Content is required");
      return;
    }

    const payload = makeCommentPayload({
      username: form.name,
      content: form.content,
      email: form.email,
      website: form.website,
    }, null);

    try {
      await createComment(payload);
      setForm({
        name: loggedInUser?.username ?? "",
        email: loggedInUser?.email ?? "",
        website: "",
        content: "",
      });
      setShowEmoji(false);
      refreshComments().catch(error => {
        console.error("Failed to refresh comments after post:", error);
        toast.error(getErrorMessage(error, "Failed to refresh comments"));
      });
      pushNotification({ kind: "comment", actor: form.name.trim(), title: "commented", text: `New comment by ${form.name.trim()}` });
      toast.success("Comment posted");
    } catch (error) {
      console.error("Failed to post comment:", error);
      toast.error(getErrorMessage(error, "Failed to post comment"));
    }
  };

  const pubReply = async (pid: number) => {
    const replyUsername = loggedInUser?.username || replyText.username;
    if (!replyUsername.trim()) {
      toast.error("Reply username is required");
      return;
    }
    if (!replyText.content.trim()) {
      toast.error("Reply content is required");
      return;
    }

    try {
      await createComment(makeCommentPayload({
        username: replyUsername,
        content: replyText.content,
        email: loggedInUser?.email ?? "",
      }, pid));
      setReplyText({ username: loggedInUser?.username ?? "", content: "" });
      setReplyTo(null);
      setShowReplyEmoji(null);
      refreshComments().catch(error => {
        console.error("Failed to refresh comments after reply:", error);
        toast.error(getErrorMessage(error, "Failed to refresh comments"));
      });
      pushNotification({ kind: "reply", actor: replyUsername.trim(), title: "replied your comment", text: `New reply by ${replyUsername.trim()}` });
      toast.success("Reply posted");
    } catch (error) {
      console.error("Failed to post reply:", error);
      toast.error(getErrorMessage(error, "Failed to post reply"));
    }
  };

  return (
    <div className="mt-10 pt-8 border-t border-white/[0.06]">
      <div className="flex items-center gap-2 mb-8">
        <MessageCircle size={15} className="text-blue-400/60" />
        <h3 className="text-sm font-semibold text-white/85">Comments</h3>
        <span className="text-[11px] text-white/25 ml-1">{comments.length}</span>
      </div>

      {/* Comment Form */}
      <div className="mb-8">
        <div className="space-y-4">
          <div className="flex gap-5">
            <div className="flex-1 border-b border-white/[0.06] focus-within:border-blue-400/30 transition-colors">
              <div className="flex items-center gap-2">
                <input placeholder="Username" value={form.name} onChange={e => setForm(p => ({ ...p,name: e.target.value }))}
                  readOnly={!!loggedInUser}
                  className="w-full bg-transparent px-0 py-2 text-[12px] outline-none text-white/80 placeholder:text-white/15 read-only:text-white/45" />
                <span className="text-[9px] text-white/20 font-light tracking-wide whitespace-nowrap">(Required)</span>
              </div>
            </div>
            <div className="flex-1 border-b border-white/[0.06] focus-within:border-blue-400/30 transition-colors">
              <input placeholder="Email" value={form.email} onChange={e => setForm(p => ({ ...p,email: e.target.value }))}
                readOnly={!!loggedInUser}
                className="w-full bg-transparent px-0 py-2 text-[12px] outline-none text-white/80 placeholder:text-white/15 read-only:text-white/45" />
            </div>
            <div className="flex-1 border-b border-white/[0.06] focus-within:border-blue-400/30 transition-colors">
              <input placeholder="Website" value={form.website} onChange={e => setForm(p => ({ ...p,website: e.target.value }))}
                className="w-full bg-transparent px-0 py-2 text-[12px] outline-none text-white/80 placeholder:text-white/15" />
            </div>
          </div>
          <div className="relative border-b border-white/[0.06] focus-within:border-blue-400/30 transition-colors">
            <textarea placeholder="Write your comment... (Markdown supported)" value={form.content}
              onChange={e => setForm(p => ({ ...p,content: e.target.value }))} rows={2}
              className="w-full bg-transparent px-0 py-2 text-[12px] outline-none text-white/70 placeholder:text-white/15 resize-none pr-8" />
            <button onClick={() => setShowEmoji(!showEmoji)}
              className="absolute right-0 bottom-2.5 w-6 h-6 grid place-items-center text-white/20 hover:text-white/50 transition-all"><Smile size={14} /></button>
            {showEmoji && <EmojiPop onSelect={e => setForm(p => ({ ...p,content: p.content + e }))} onClose={() => setShowEmoji(false)} />}
          </div>
          <div className="flex items-center justify-end pt-1">
            <button onClick={pubComment}
              className="px-5 py-2 rounded-xl text-[11px] font-medium text-white bg-gradient-to-r from-blue-500 to-violet-500 hover:shadow-[0_0_18px_rgba(76,201,240,0.25)] transition-all">Post Comment</button>
          </div>
        </div>
      </div>

      <div className="space-y-6 mb-8">
        {comments.map(c => (
          <div key={c.id}>
            <div className="group">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${c.avatarClassName || "from-violet-400 to-cyan-400"} grid place-items-center text-[9px] font-bold shrink-0 text-white overflow-hidden`}>
                  {c.avatarUrl ? <img src={c.avatarUrl} alt={c.name} className="w-full h-full object-cover" /> : c.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2.5 mb-1.5">
                    <p className="text-[13px] font-medium text-white/90">{c.name}</p>
                    {c.email && <span className="text-[10px] text-white/25">{c.email}</span>}
                    {c.website && <span className="text-[10px] text-blue-300/50">{c.website}</span>}
                    <span className="text-[10px] text-white/15">·</span>
                    <span className="text-[10px] text-white/25">{c.time}</span>
                  </div>
                  <div className="text-[12px] text-white/60 leading-relaxed">{MiniMd(c.content)}</div>
                  <div className=
                    "flex items-center gap-5 mt-2.5">
                    <button onClick={() => toggleLike(getCommentId(c))}
                      className={`group relative flex items-center gap-1.5 text-[11px] transition-all duration-200 border border-transparent px-2 py-1 rounded-full overflow-hidden ${
                        liked.has(getCommentId(c))
                          ? "bg-rose-400/18 text-rose-100 shadow-[0_0_18px_rgba(251,113,133,0.24)] border-rose-400/25"
                          : "bg-white/[0.03] text-white/40 hover:text-white/80 hover:bg-white/[0.06] hover:border-white/10"
                      }`}
                    >
                      <span className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${liked.has(getCommentId(c)) ? "bg-gradient-to-r from-rose-400/28 to-fuchsia-400/14" : "bg-gradient-to-r from-white/5 to-white/0"}`} />
                      <Heart size={12} fill={liked.has(getCommentId(c)) ? "#fb7185" : "none"} className={`relative z-10 transition-transform duration-200 ${liked.has(getCommentId(c)) ? "scale-110" : "group-hover:scale-105"}`} />
                      <span className="relative z-10 tabular-nums">{c.likes}</span>
                    </button>
                    <button onClick={() => setReplyTo(replyTo === getCommentId(c) ? null : getCommentId(c))}
                      className="flex items-center gap-1.5 text-white/30 hover:text-blue-400 transition-all text-[11px] border-b border-transparent hover:border-blue-400/30 pb-0.5"><Reply size={12} /> Reply</button>
                  </div>
                </div>
              </div>
            </div>
                  {replyTo === getCommentId(c) && (
              <div className="ml-11 mt-3 relative">
                <div className="flex gap-2 animate-slide-up">
                  {!loggedInUser && (
                    <input placeholder="Username" value={replyText.username} onChange={e => setReplyText(p => ({ ...p,username: e.target.value }))}
                      className="w-28 border-b border-white/[0.08] bg-transparent px-0 py-2 text-[12px] outline-none text-white/70 placeholder:text-white/15 focus:border-blue-400/30 transition-colors" />
                  )}
                  <input placeholder="Write a reply..." value={replyText.content} onChange={e => setReplyText(p => ({ ...p,content: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && pubReply(getCommentId(c))}
                    className="flex-1 border-b border-white/[0.08] bg-transparent px-0 py-2 text-[12px] outline-none text-white/70 placeholder:text-white/15 focus:border-blue-400/30 transition-colors" />
                  <button onClick={() => setShowReplyEmoji(showReplyEmoji === getCommentId(c) ? null : getCommentId(c))}
                    className="w-7 h-7 grid place-items-center text-white/25 hover:text-white/60 transition-all"><Smile size={14} /></button>
                    <button onClick={() => pubReply(getCommentId(c))}
                    className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 grid place-items-center shadow-lg hover:scale-105 transition-all"><Send size={12} /></button>
                </div>
                {showReplyEmoji === getCommentId(c) && (
                  <EmojiPop onSelect={e => setReplyText(p => ({ ...p,content: p.content + e }))} onClose={() => setShowReplyEmoji(null)} />
                )}
              </div>
            )}
            {c.replies && c.replies.length > 0 && (
              <div className="ml-11 mt-3 space-y-3">
                {c.replies.map(r => (
                  <div key={r.id}>
                    <div className="flex items-start gap-2.5">
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${r.avatarClassName || "from-pink-400 to-violet-400"} grid place-items-center text-[8px] font-bold shrink-0 text-white overflow-hidden`}>
                        {r.avatarUrl ? <img src={r.avatarUrl} alt={r.name} className="w-full h-full object-cover" /> : r.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <p className="text-[12px] font-medium text-white/85">{r.name}</p>
                          <span className="text-[9px] text-white/25">{r.email}</span>
                          <span className="text-[9px] text-white/20">{r.time}</span>
                        </div>
                        <p className="text-[11px] text-white/55 leading-relaxed">{r.content}</p>
                        <div className="flex items-center gap-3 mt-1">
                    <button onClick={() => toggleLike(getCommentId(r))}
                            className={`group relative flex items-center gap-1 text-[10px] transition-all duration-200 border border-transparent px-2 py-1 rounded-full overflow-hidden ${
                              liked.has(getCommentId(r))
                                ? "bg-rose-400/18 text-rose-100 shadow-[0_0_14px_rgba(251,113,133,0.24)] border-rose-400/25"
                                : "bg-white/[0.025] text-white/35 hover:text-white/75 hover:bg-white/[0.05] hover:border-white/10"
                            }`}>
                            <span className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${liked.has(getCommentId(r)) ? "bg-gradient-to-r from-rose-400/28 to-fuchsia-400/12" : "bg-gradient-to-r from-white/5 to-white/0"}`} />
                            <Heart size={10} fill={liked.has(getCommentId(r)) ? "#fb7185" : "none"} className={`relative z-10 transition-transform duration-200 ${liked.has(getCommentId(r)) ? "scale-110" : "group-hover:scale-105"}`} /> <span className="relative z-10 tabular-nums">{r.likes}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* subtle divider between comments */}
            <div className="mt-6 border-b border-white/[0.04]" />
          </div>
        ))}
      </div>
      <div ref={commentEndRef} />
    </div>
  );
};
