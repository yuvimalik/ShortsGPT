console.log("ShortsGPT extension active.");

// Utility: extract JSON after SHORTS_DATA: from a span's textContent safely
function extractShortsDataFromSpan(span) {
  const textContent = span.textContent || "";
  const marker = "SHORTS_DATA:";
  const markerIndex = textContent.indexOf(marker);
  if (markerIndex === -1) return null;
  const jsonCandidate = textContent.slice(markerIndex + marker.length).trim();
  try {
    const lastBrace = jsonCandidate.lastIndexOf("}");
    if (lastBrace === -1) return null;
    const jsonString = jsonCandidate.slice(0, lastBrace + 1);
    const parsed = JSON.parse(jsonString);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (e) {
    console.error("ShortsGPT: Failed to parse SHORTS_DATA JSON", e);
    return null;
  }
}

// Utility: Normalize YouTube/Shorts URLs to embeddable URL with autoplay, mute, loop
function toYouTubeEmbed(url) {
  try {
    const u = new URL(url);
    let id = null;
    const host = u.hostname || "";
    if (host.includes("youtu.be")) {
      const parts = u.pathname.split("/").filter(Boolean);
      id = parts[0] || null;
    } else if (host.includes("youtube.com") || host.includes("youtube-nocookie.com")) {
      if (u.pathname.startsWith("/watch")) {
        id = u.searchParams.get("v");
      } else if (u.pathname.startsWith("/shorts/")) {
        const parts = u.pathname.split("/").filter(Boolean);
        id = parts[1] || null;
      } else if (u.pathname.startsWith("/embed/")) {
        const parts = u.pathname.split("/").filter(Boolean);
        id = parts[1] || null;
      }
    }
    if (!id) return null;
    const params = new URLSearchParams({
      autoplay: "1",
      mute: "1",
      loop: "1",
      playlist: id,
      controls: "0",
      modestbranding: "1",
      rel: "0",
      playsinline: "1"
    });
    return `https://www.youtube.com/embed/${id}?${params.toString()}`;
  } catch (e) {
    return null;
  }
}

// Create and manage the Shorts overlay
function showShortsOverlay(data) {
  const existing = document.getElementById("shorts-overlay");
  if (existing) existing.remove();

  const { videos = [], topic = "general" } = data || {};
  if (!Array.isArray(videos) || videos.length === 0) return;

  // Map to embed URLs and filter invalid
  const items = videos
    .map(toYouTubeEmbed)
    .filter(Boolean);

  if (items.length === 0) return;

  const overlay = document.createElement("div");
  overlay.id = "shorts-overlay";

  const header = document.createElement("div");
  header.id = "shorts-header";
  header.textContent = `${String(topic).toUpperCase()} Shorts`;

  const container = document.createElement("div");
  container.id = "shorts-container";

  const prevBtn = document.createElement("button");
  prevBtn.id = "shorts-prev";
  prevBtn.setAttribute("aria-label", "Previous video");
  prevBtn.textContent = "◀";

  const nextBtn = document.createElement("button");
  nextBtn.id = "shorts-next";
  nextBtn.setAttribute("aria-label", "Next video");
  nextBtn.textContent = "▶";

  const closeBtn = document.createElement("button");
  closeBtn.id = "shorts-close";
  closeBtn.setAttribute("aria-label", "Close Shorts overlay");
  closeBtn.textContent = "✖";

  // Slides (iframes) with lazy src
  const slides = items.map((embedUrl, index) => {
    const slide = document.createElement("div");
    slide.className = "shorts-slide";
    slide.style.display = index === 0 ? "block" : "none";

    const iframe = document.createElement("iframe");
    iframe.className = "shorts-iframe";
    iframe.setAttribute("title", `Shorts video ${index + 1}`);
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture");
    if (index === 0) {
      iframe.src = embedUrl;
    } else {
      iframe.setAttribute("data-src", embedUrl);
    }
    slide.appendChild(iframe);
    return slide;
  });

  container.appendChild(prevBtn);
  container.appendChild(nextBtn);
  container.appendChild(closeBtn);
  slides.forEach(slide => container.appendChild(slide));

  overlay.appendChild(header);
  overlay.appendChild(container);
  document.body.appendChild(overlay);

  let currentIndex = 0;

  function showIndex(nextIndex) {
    const total = slides.length;
    const newIndex = (nextIndex + total) % total;
    if (newIndex === currentIndex) return;

    const currentSlide = slides[currentIndex];
    const nextSlide = slides[newIndex];

    currentSlide.style.display = "none";

    const iframe = nextSlide.querySelector("iframe");
    if (iframe && !iframe.src) {
      const pending = iframe.getAttribute("data-src");
      if (pending) iframe.src = pending;
    }

    nextSlide.style.display = "block";
    currentIndex = newIndex;
  }

  prevBtn.addEventListener("click", () => showIndex(currentIndex - 1));
  nextBtn.addEventListener("click", () => showIndex(currentIndex + 1));
  closeBtn.addEventListener("click", () => overlay.remove());

  function onKey(e) {
    if (!document.body.contains(overlay)) {
      window.removeEventListener("keydown", onKey, true);
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      showIndex(currentIndex - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      showIndex(currentIndex + 1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      overlay.remove();
    }
  }
  window.addEventListener("keydown", onKey, true);
}

// Scan a container for hidden SHORTS_DATA spans and process them once
function scanForShorts(container) {
  if (!container) return;
  const messageNodes = container.querySelectorAll(".markdown, .prose, [data-message-author-role='assistant']");
  const allNodes = messageNodes.length ? messageNodes : [container];

  allNodes.forEach(node => {
    if (node.getAttribute && node.getAttribute("data-shortsgpt-processed") === "1") return;
    const spans = node.querySelectorAll("span");
    let foundData = null;
    spans.forEach(sp => {
      if (foundData) return; // only first occurrence per message
      const txt = sp.textContent || "";
      if (txt.includes("SHORTS_DATA:")) {
        const data = extractShortsDataFromSpan(sp);
        if (data) {
          foundData = data;
          // Remove only this span from DOM to avoid altering visible markdown
          sp.remove();
        }
      }
    });
    if (foundData) {
      node.setAttribute("data-shortsgpt-processed", "1");
      try {
        showShortsOverlay(foundData);
      } catch (e) {
        console.error("ShortsGPT: failed to render overlay", e);
      }
    }
  });
}

// Initial scan once DOM is ready
function ready(fn) {
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(fn, 0);
  } else {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  }
}

ready(() => {
  // First pass scan
  try { scanForShorts(document.body); } catch (e) { /* noop */ }

  // Observe mutations for new assistant messages
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes && m.addedNodes.forEach(node => {
        if (!(node instanceof Element)) return;
        try { scanForShorts(node); } catch (e) { /* noop */ }
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
});


