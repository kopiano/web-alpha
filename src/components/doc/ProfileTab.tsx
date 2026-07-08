import logo from "@/assets/profile_logo.webp";

export const ProfileTab = () => {
  return (
    <div className="max-w-2xl mx-auto pt-4 space-y-6">
      {/* Profile Card */}
      <div className="glass glass-hover noise rounded-3xl p-8 flex flex-col items-center text-center">
        {/* Avatar */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-cyan-400 p-[3px] shadow-[0_0_40px_-8px_hsla(270,95%,60%,0.4)] mb-4">
          <div className="w-full h-full rounded-full bg-[#050505] flex items-center justify-center overflow-hidden">
            <img src={logo} alt="kopiano" className="w-full h-full object-cover" loading="lazy" decoding="async" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-white/90">kopiano</h2>
        <p className="text-[12px] text-white/40 mt-1">
          front-end developer · Open source enthusiast
        </p>

        {/* Social Icons */}
        <div className="flex items-center gap-4 mt-5">
          <a
            href="https://github.com/kopiano"
            target="_blank"
            rel="noopener noreferrer"
            className="w-11 h-11 rounded-[50%] bg-zinc-200/70 grid place-items-center border border-zinc-300/50 hover:bg-white/80 hover:backdrop-blur-md hover:border-white/60 hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] transition-all duration-300"
          >
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-zinc-700">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
          <a
            href="https://x.com/alphaomv"
            target="_blank"
            rel="noopener noreferrer"
            className="w-11 h-11 rounded-[50%] bg-zinc-200/70 grid place-items-center border border-zinc-300/50 hover:bg-white/80 hover:backdrop-blur-md hover:border-white/60 hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] transition-all duration-300"
          >
            <svg viewBox="0 0 24 24" className="w-[16px] h-[16px] fill-zinc-700">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a
            href="https://mail.google.com/mail/u/0/?fs=1&tf=cm&source=mailto&to=alphaomv@gmail.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-11 h-11 rounded-[50%] bg-zinc-200/70 grid place-items-center border border-zinc-300/50 hover:bg-white/80 hover:backdrop-blur-md hover:border-white/60 hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] transition-all duration-300"
          >
            <svg viewBox="0 0 24 24" className="w-[16px] h-[16px] fill-zinc-700">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
            </svg>
          </a>
        </div>
      </div>

      {/* GitHub Contributions Card */}
      <div className="glass glass-hover noise rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-[50%] bg-gradient-to-br from-emerald-400 to-green-600 grid place-items-center shadow-[0_0_15px_hsla(160,100%,50%,0.2)]">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] text-white/40 font-medium tracking-[0.2em] uppercase">
              GitHub
            </p>
            <h4 className="text-sm font-semibold">
              kopiano · Contributions
            </h4>
          </div>
        </div>

        <img
          src="https://ghchart.rshah.org/kopiano"
          alt="kopiano's GitHub contributions chart"
          className="w-full max-w-full rounded-xl"
          loading="lazy"
          decoding="async"
          style={{ filter: "invert(1) hue-rotate(180deg) saturate(1.5)" }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <p className="text-[10px] text-white/20 text-center mt-3">
          GitHub contributions in the last year
        </p>
      </div>
    </div>
  );
};
