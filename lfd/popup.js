const apiKeyInput = document.getElementById("apiKey");
const saveKeyBtn = document.getElementById("saveKeyBtn");
const keyStatus = document.getElementById("keyStatus");
const analyzeBtn = document.getElementById("analyzeBtn");
const clearBtn = document.getElementById("clearBtn");
const statusEl = document.getElementById("status");
const resultsContainer = document.getElementById("resultsContainer");
const includeImagesToggle = document.getElementById("includeImages");
const imgCountEl = document.getElementById("imgCount");

const MODELS = [
  "gemini-3.1-flash-lite-preview",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite"
];

const MAX_IMAGES = 5;
const MAX_IMG_DIMENSION = 512;

// Load saved settings
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.sync.get(["gemini_api_key", "include_images"], (r) => {
    if (!chrome.runtime.lastError) {
      if (r.gemini_api_key) {
        apiKeyInput.value = r.gemini_api_key;
        showKeyStatus("Key loaded.", "#4ecca3");
      }
      if (r.include_images === false) {
        includeImagesToggle.checked = false;
      }
    }
  });
});

// Save key
saveKeyBtn.addEventListener("click", () => {
  const k = apiKeyInput.value.trim();
  if (!k) { showKeyStatus("Enter a key first.", "#e94560"); return; }
  chrome.storage.sync.set({ gemini_api_key: k }, () => {
    if (chrome.runtime.lastError) {
      showKeyStatus("Error: " + chrome.runtime.lastError.message, "#e94560");
    } else {
      showKeyStatus("Key saved!", "#4ecca3");
      saveKeyBtn.textContent = "Saved!";
      saveKeyBtn.classList.add("saved");
      setTimeout(() => { saveKeyBtn.textContent = "Save Key"; saveKeyBtn.classList.remove("saved"); }, 2000);
    }
  });
});

// Save image toggle preference
includeImagesToggle.addEventListener("change", () => {
  chrome.storage.sync.set({ include_images: includeImagesToggle.checked });
});

function showKeyStatus(m, c) {
  keyStatus.textContent = m; keyStatus.style.color = c; keyStatus.style.display = "block";
  setTimeout(() => { keyStatus.style.display = "none"; }, 4000);
}

// ============================================================
// ANALYZE
// ============================================================
analyzeBtn.addEventListener("click", async () => {
  let apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    const s = await new Promise(r => chrome.storage.sync.get(["gemini_api_key"], d => r(d.gemini_api_key || "")));
    apiKey = s;
    if (apiKey) apiKeyInput.value = apiKey;
  }
  if (!apiKey) { showStatus("Please enter and save your Gemini API key first.", "error"); return; }
  chrome.storage.sync.set({ gemini_api_key: apiKey });

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "\u23F3 Analyzing...";
  resultsContainer.innerHTML = "";
  imgCountEl.textContent = "";

  const wantImages = includeImagesToggle.checked;

  try {
    // Step 1: Get tab
    showStatus("Step 1/4: Getting current tab...", "working");
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab) { showStatus("No active tab found.", "error"); resetBtn(); return; }

    const u = tab.url || "";
    if (u.startsWith("chrome://") || u.startsWith("chrome-extension://") || u.startsWith("about:") ||
        u.startsWith("edge://") || u === "" || u.startsWith("devtools://")) {
      showStatus("Cannot analyze browser pages. Go to a website.", "error"); resetBtn(); return;
    }

    // Step 2: Extract text
    showStatus("Step 2/4: Extracting page text...", "working");
    let pageText = "";
    try {
      const res = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          try {
            const sels = ["article", "main", '[role="main"]', ".post-content", ".entry-content",
              ".article-body", ".story-body", "#article-body", ".post-body", "#content", ".content", "#main-content"];
            let t = "";
            for (const s of sels) {
              const e = document.querySelector(s);
              if (e && e.innerText && e.innerText.trim().length > 100) { t = e.innerText; break; }
            }
            if (!t || t.length < 100) t = document.body.innerText || "";
            return t.replace(/\n{3,}/g, "\n\n").replace(/\t/g, " ").trim();
          } catch (e) { return "ERROR:" + e.message; }
        }
      });
      if (res && res[0] && res[0].result) pageText = res[0].result;
    } catch (e) {
      showStatus("Cannot access this page. Try a regular website.", "error"); resetBtn(); return;
    }

    if (!pageText || pageText.startsWith("ERROR:")) {
      showStatus("Could not extract text.", "error"); resetBtn(); return;
    }
    if (pageText.trim().length < 50) {
      showStatus("Not enough text on this page.", "error"); resetBtn(); return;
    }

    // Step 3: Extract images (if enabled)
    let imageDataArray = [];
    if (wantImages) {
      showStatus("Step 3/4: Capturing page images...", "working");
      try {
        const imgRes = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (maxImages, maxDim) => {
            try {
              const imgs = document.querySelectorAll("img");
              const candidates = [];

              for (const img of imgs) {
                // Skip tiny images (icons, spacers, tracking pixels)
                if (img.naturalWidth < 100 || img.naturalHeight < 100) continue;
                if (img.width < 80 || img.height < 80) continue;

                // Skip hidden images
                const style = window.getComputedStyle(img);
                if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;

                // Skip common non-content images
                const src = (img.src || "").toLowerCase();
                const alt = (img.alt || "").toLowerCase();
                const cls = (img.className || "").toLowerCase();
                if (src.includes("logo") || src.includes("avatar") || src.includes("icon") ||
                    src.includes("sprite") || src.includes("tracking") || src.includes("pixel") ||
                    src.includes("badge") || src.includes("button") || src.includes("emoji") ||
                    cls.includes("logo") || cls.includes("avatar") || cls.includes("icon")) continue;

                // Score by size (bigger = more likely content)
                const area = img.naturalWidth * img.naturalHeight;
                candidates.push({ img, area, alt: img.alt || "" });
              }

              // Sort by area descending, take top N
              candidates.sort((a, b) => b.area - a.area);
              const selected = candidates.slice(0, maxImages);

              // Convert to base64 using canvas
              const results = [];
              for (const c of selected) {
                try {
                  const canvas = document.createElement("canvas");
                  let w = c.img.naturalWidth;
                  let h = c.img.naturalHeight;

                  // Resize if too large
                  if (w > maxDim || h > maxDim) {
                    const scale = maxDim / Math.max(w, h);
                    w = Math.round(w * scale);
                    h = Math.round(h * scale);
                  }

                  canvas.width = w;
                  canvas.height = h;
                  const ctx = canvas.getContext("2d");
                  ctx.drawImage(c.img, 0, 0, w, h);

                  const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                  // Only include if we got valid data (CORS may block some)
                  if (dataUrl && dataUrl.length > 100 && !dataUrl.startsWith("data:image/png;base64,iVBOR")) {
                    results.push({
                      base64: dataUrl.split(",")[1],
                      mimeType: "image/jpeg",
                      alt: c.alt,
                      width: w,
                      height: h
                    });
                  }
                } catch (e) {
                  // CORS or tainted canvas — skip this image
                  continue;
                }
              }
              return results;
            } catch (e) {
              return [];
            }
          },
          args: [MAX_IMAGES, MAX_IMG_DIMENSION]
        });

        if (imgRes && imgRes[0] && imgRes[0].result) {
          imageDataArray = imgRes[0].result;
        }
      } catch (e) {
        console.warn("Image extraction failed:", e);
        // Continue without images
      }

      imgCountEl.textContent = imageDataArray.length + " image" + (imageDataArray.length !== 1 ? "s" : "") + " captured";
    } else {
      imgCountEl.textContent = "Images off";
    }

    // Step 4: Send to Gemini
    const truncated = pageText.substring(0, 10000);
    const totalSteps = wantImages && imageDataArray.length > 0 ? "4" : "3";
    showStatus("Step " + totalSteps + "/" + totalSteps + ": Analyzing with Gemini AI...", "working");

    const result = await analyzeWithFallback(apiKey, truncated, u, imageDataArray);
    displayResults(result.data, result.model, imageDataArray.length);

    const count = result.data.fallacies ? result.data.fallacies.length : 0;
    showStatus("Done! Found " + count + " fallac" + (count === 1 ? "y" : "ies") + ".", "success");

  } catch (err) {
    console.error(err);
    let m = err.message || "Unknown error";
    if (m.includes("ALL_MODELS_FAILED")) m = "All models failed. Create a NEW API key at aistudio.google.com/apikey using 'Create API key in new project'.";
    else if (m.includes("400") || m.includes("API_KEY_INVALID")) m = "Invalid API key.";
    else if (m.includes("403")) m = "Key lacks permission. Create a new key in a new project.";
    else if (m.includes("Failed to fetch")) m = "Network error. Check your connection.";
    showStatus("Error: " + m, "error");
  }
  resetBtn();
});

clearBtn.addEventListener("click", () => {
  resultsContainer.innerHTML = ""; statusEl.textContent = ""; statusEl.className = "status"; imgCountEl.textContent = "";
});

function resetBtn() {
  analyzeBtn.disabled = false;
  analyzeBtn.textContent = "\uD83D\uDD0D Analyze This Page";
}

function showStatus(m, t) {
  statusEl.textContent = m;
  statusEl.className = "status" + (t ? " " + t : "");
}

// ============================================================
// Gemini API — Multimodal with fallback
// ============================================================
async function analyzeWithFallback(key, text, url, images) {
  const errs = [];
  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];
    showStatus("Trying " + model + " (" + (i + 1) + "/" + MODELS.length + ")...", "working");
    try {
      const data = await callGemini(key, model, text, url, images);
      return { data, model };
    } catch (e) {
      console.warn(model + " failed:", e.message);
      errs.push(model + ": " + e.message);
      const msg = e.message.toLowerCase();
      if (msg.includes("429") || msg.includes("quota") || msg.includes("rate_limit") ||
          msg.includes("resource_exhausted") || msg.includes("no longer available") ||
          msg.includes("not found") || msg.includes("404")) continue;
      throw e;
    }
  }
  throw new Error("ALL_MODELS_FAILED:\n" + errs.join("\n"));
}

async function callGemini(key, model, text, url, images) {
  const hasImages = images && images.length > 0;

  let promptText = `You are an expert in critical thinking and logical fallacies. Analyze the following content from a webpage for logical fallacies.`;

  if (hasImages) {
    promptText += `

I am providing both the TEXT content and KEY IMAGES from the page. Please analyze BOTH for fallacies.

For images, look for:
- Misleading charts or graphs (truncated axes, cherry-picked ranges, misleading scales)
- Images used out of context to manipulate emotions
- Infographics with flawed reasoning or misleading statistics
- Memes or visual content containing logical fallacies
- Before/after images that are misleading
- Any visual manipulation designed to deceive`;
  }

  promptText += `

For each fallacy found, provide:
1. NAME of the fallacy
2. SOURCE: either "text" or "image" (or "image N" if from a specific image)
3. A short QUOTE or DESCRIPTION (exact words for text, description for images)
4. A clear EXPLANATION of why this is a fallacy

Common fallacies: Ad Hominem, Straw Man, Appeal to Authority, False Dilemma, Slippery Slope, Red Herring, Appeal to Emotion, Bandwagon, Hasty Generalization, Circular Reasoning, Tu Quoque, Appeal to Nature, False Cause/Post Hoc, Equivocation, Appeal to Ignorance, No True Scotsman, Cherry Picking, Whataboutism, Misleading Visuals/Charts.

Be thorough but avoid false positives. Only flag clear logical fallacies.

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "fallacies": [
    {
      "name": "Fallacy Name",
      "source": "text or image",
      "quote": "exact quote or image description",
      "explanation": "Why this is a fallacy"
    }
  ],
  "summary": "Brief overall assessment"
}

If none found: {"fallacies":[],"summary":"No significant logical fallacies detected."}

--- TEXT FROM ${url} ---
${text}
--- END TEXT ---`;

  // Build the parts array (text + images for multimodal)
  const parts = [{ text: promptText }];

  if (hasImages) {
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      // Add a label for the image
      parts.push({ text: `[Image ${i + 1}${img.alt ? ": " + img.alt : ""}]` });
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.base64
        }
      });
    }
  }

  const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(key);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: parts }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 3000,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const et = await response.text();
    let em = "API error (" + response.status + ")";
    try { em = JSON.parse(et).error?.message || em; } catch (e) { em = et.substring(0, 300) || em; }
    throw new Error(em);
  }

  const data = await response.json();
  if (data.candidates?.[0]?.finishReason === "SAFETY")
    return { fallacies: [], summary: "Content blocked by safety filters." };

  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("Empty response from " + model);

  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");

  try { return JSON.parse(cleaned); }
  catch (e) {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) try { return JSON.parse(m[0]); } catch (e2) {}
    throw new Error("Invalid JSON from " + model);
  }
}

// ============================================================
// Display Results
// ============================================================
function displayResults(data, model, imgCount) {
  resultsContainer.innerHTML = "";

  if (!data.fallacies || data.fallacies.length === 0) {
    resultsContainer.innerHTML =
      '<div class="no-fallacies">\u2705 No logical fallacies detected!<br>' +
      '<small>' + esc(data.summary || "") + '</small></div>' +
      '<div class="model-info">Analyzed by: ' + esc(model) +
      (imgCount > 0 ? " \u00B7 " + imgCount + " image" + (imgCount !== 1 ? "s" : "") + " checked" : "") + '</div>';
    return;
  }

  // Count text vs image fallacies
  let textCount = 0, imageCount = 0;
  for (const f of data.fallacies) {
    if (f.source && f.source.toLowerCase().includes("image")) imageCount++;
    else textCount++;
  }

  let html = '<div class="results-section"><h2>Found ' +
    data.fallacies.length + ' Logical Fallac' + (data.fallacies.length === 1 ? 'y' : 'ies') + '</h2>';

  if (imgCount > 0) {
    html += '<div style="font-size:11px;color:#888;margin-bottom:8px;">' +
      textCount + ' from text, ' + imageCount + ' from images</div>';
  }

  for (const f of data.fallacies) {
    const isImage = f.source && f.source.toLowerCase().includes("image");
    const sourceLabel = isImage ? "\uD83D\uDDBC\uFE0F Image" : "\uD83D\uDCDD Text";
    const sourceColor = isImage ? "#f0c040" : "#4ecca3";

    html += '<div class="fallacy-card">' +
      '<div class="fn">\u26A0\uFE0F ' + esc(f.name) + '</div>' +
      '<div class="src" style="color:' + sourceColor + '">Source: ' + sourceLabel +
      (f.source && f.source !== "text" && f.source !== "image" ? " (" + esc(f.source) + ")" : "") + '</div>' +
      '<div class="fq">\u201C' + esc(f.quote) + '\u201D</div>' +
      '<div class="fe">' + esc(f.explanation) + '</div>' +
      '</div>';
  }

  if (data.summary) {
    html += '<div style="font-size:12px;color:#888;padding:8px 0;border-top:1px solid #2a2a4a;margin-top:4px">' +
      '<b>Overall:</b> ' + esc(data.summary) + '</div>';
  }

  html += '</div><div class="model-info">Analyzed by: ' + esc(model) +
    (imgCount > 0 ? " \u00B7 " + imgCount + " image" + (imgCount !== 1 ? "s" : "") + " analyzed" : "") + '</div>';
  resultsContainer.innerHTML = html;
}

function esc(s) {
  if (!s) return "";
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}
