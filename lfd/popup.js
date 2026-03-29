const apiKeyInput=document.getElementById("apiKey"),saveKeyBtn=document.getElementById("saveKeyBtn"),keyStatus=document.getElementById("keyStatus"),analyzeBtn=document.getElementById("analyzeBtn"),clearBtn=document.getElementById("clearBtn"),statusEl=document.getElementById("status"),resultsContainer=document.getElementById("resultsContainer"),includeImagesToggle=document.getElementById("includeImages"),imgCountEl=document.getElementById("imgCount");
const MODELS=["gemini-3.1-flash-lite-preview","gemini-3-flash-preview","gemini-2.5-flash","gemini-2.5-flash-lite"];
const MAX_IMAGES=5,MAX_IMG_DIM=512;

function getPrompt(url,hasImages){
let p=`You are a world-class expert in critical thinking, informal logic, rhetoric, cognitive biases, and media literacy. Perform an EXHAUSTIVE and THOROUGH analysis of the following content for ALL forms of flawed reasoning, logical fallacies, cognitive biases, rhetorical manipulation, and misleading presentation.

BE AGGRESSIVE IN YOUR ANALYSIS. Most persuasive writing contains multiple fallacies. News articles, opinion pieces, advertisements, political content, and social media posts almost ALWAYS contain fallacies. Even seemingly neutral content often has implicit biases and reasoning errors.

IMPORTANT INSTRUCTIONS:
- Look for BOTH explicit AND implicit/subtle fallacies
- Consider what is IMPLIED but not stated directly
- Examine the FRAMING and what perspectives are excluded
- Look at what EVIDENCE is missing or selectively presented
- Consider the EMOTIONAL manipulation techniques used
- Analyze HEADLINES and how they may misrepresent the content
- Check for STATISTICAL misuse or misleading numbers
- Identify LOADED LANGUAGE designed to bias the reader

COMPREHENSIVE FALLACY TAXONOMY - Check for ALL of these:

=== FORMAL FALLACIES ===
- Affirming the Consequent: "If A then B; B is true; therefore A"
- Denying the Antecedent: "If A then B; not A; therefore not B"
- Undistributed Middle: Faulty syllogism
- False Syllogism: Any invalid deductive structure

=== FALLACIES OF RELEVANCE ===
- Ad Hominem (Personal Attack): Attacking the person not the argument
- Ad Hominem (Circumstantial): Dismissing due to circumstances
- Tu Quoque (Whataboutism): "You do it too" deflection
- Appeal to Emotion: Using fear, pity, anger, pride, or hope instead of logic
- Appeal to Pity (Ad Misericordiam): Using sympathy to win argument
- Appeal to Fear (Ad Metum): Using fear/threats to persuade
- Appeal to Flattery: Using compliments to persuade
- Appeal to Spite: Using anger/resentment to persuade
- Appeal to Ridicule: Mocking instead of addressing
- Appeal to Authority (Ad Verecundiam): Citing irrelevant authorities
- Appeal to False Authority: Citing someone outside their expertise
- Appeal to Popularity (Bandwagon): "Everyone believes it"
- Appeal to Tradition: "We have always done it this way"
- Appeal to Novelty: "It is new so it must be better"
- Appeal to Nature: "It is natural so it must be good"
- Appeal to Ignorance: "It has not been disproven so it is true"
- Genetic Fallacy: Judging by origin not merits
- Red Herring: Irrelevant distraction
- Straw Man: Misrepresenting an argument
- Poisoning the Well: Preemptively discrediting opponent

=== FALLACIES OF PRESUMPTION ===
- False Dilemma (Explicit): Presenting only two options when more exist
- False Dilemma (Implicit): Implying only two options without stating directly
- Slippery Slope: One event inevitably leads to extreme consequences
- Circular Reasoning: Using conclusion as premise
- Loaded Question: Presupposing something unproven
- Complex Question: Combining multiple questions
- False Cause (Post Hoc): Assuming causation from sequence
- Cum Hoc Ergo Propter Hoc: Assuming causation from correlation
- Single Cause Fallacy: Oversimplifying to one cause
- Hasty Generalization: Broad conclusions from limited examples
- Sweeping Generalization: Applying general rule inappropriately
- Anecdotal Evidence Fallacy: Using personal stories as general proof
- Composition Fallacy: Parts true therefore whole true
- Division Fallacy: Whole true therefore parts true
- No True Scotsman: Redefining to exclude counterexamples
- Moving the Goalposts: Changing criteria when met
- Special Pleading: Rules for others but not oneself

=== FALLACIES OF AMBIGUITY ===
- Equivocation: Same word different meanings
- Amphiboly: Ambiguous grammar misleads
- Weasel Words: Vague qualifiers like "some say" "many believe" "studies show" "experts agree"

=== STATISTICAL AND EVIDENTIAL FALLACIES ===
- Cherry Picking: Selecting only supporting evidence
- Selection Bias: Non-representative sampling
- Survivorship Bias: Focusing on successes ignoring failures
- Confirmation Bias in Presentation: Only showing confirming evidence
- Compositional Bias: Conclusions from biased samples
- Texas Sharpshooter: Finding patterns in random data after the fact
- Base Rate Neglect: Ignoring base rates
- Misleading Statistics: Real numbers used deceptively
- Misleading Averages: Selective use of mean/median/mode
- Incomplete Comparison: Comparing without full context
- Relative vs Absolute Risk: Percentages that exaggerate or minimize

=== CAUSAL FALLACIES ===
- False Cause: General misattribution
- Reverse Causation: Cause and effect backwards
- Correlation vs Causation: Correlation does not prove causation
- Ignoring Common Cause: Missing third factor
- Oversimplified Cause: Complex situations reduced to simple causes

=== RHETORICAL AND MEDIA MANIPULATION ===
- Loaded Language: Emotionally charged words to bias reader
- Framing Effect: Presentation influences interpretation
- Anchoring: Reference point biases judgment
- False Balance: Equal weight to unequal positions
- Omission: Leaving out crucial context or counterarguments
- Buried Lede: Hiding important information
- Headline vs Content Mismatch: Headline misrepresents article
- Implied Causation in Headlines: Suggesting causation from correlation
- Narrative Bias: Fitting facts into predetermined story
- Moral Equivalence: Equating minor and major wrongs
- Thought-Terminating Cliche: Phrase that ends critical thinking
- Scare Quotes: Quotation marks to cast doubt without evidence
- Dog Whistle: Coded language with hidden meaning

=== COGNITIVE BIAS EXPLOITATION ===
- Availability Heuristic Exploitation: Vivid examples distort frequency perception
- In-Group/Out-Group Bias: Us vs them framing
- Just-World Fallacy: Assuming people get what they deserve
- Hindsight Bias: Past events presented as predictable
- Sunk Cost Framing: Continue because of past investment
- Negativity Bias Exploitation: Overemphasizing negatives`;

if(hasImages){
p+=`

FOR IMAGES also check:
- Misleading charts (truncated axes, cherry-picked ranges, non-zero baselines, 3D distortion)
- Manipulated or out-of-context photos
- Emotionally manipulative imagery
- Infographics with flawed reasoning
- Misleading before/after comparisons
- Scale manipulation in visual comparisons
- Color choices designed to mislead`;}

p+=`

For EACH fallacy found provide:
1. NAME: Specific fallacy name from taxonomy above
2. SOURCE: "text" or "image" (or "image N")
3. QUOTE: Exact words from text or description of image element
4. EXPLANATION: Clear accessible explanation of WHY this is a fallacy. Be educational.

Respond ONLY with valid JSON (no markdown no code fences):
{"fallacies":[{"name":"Specific Fallacy Name","source":"text or image","quote":"exact quote or image description","explanation":"Clear explanation"}],"summary":"Overall assessment noting most concerning patterns"}

CRITICAL: Be thorough and aggressive. Most content has AT LEAST 2-5 fallacies. If you find zero re-examine for subtle fallacies, implicit assumptions, framing effects, omissions, and loaded language. Only return zero if content is genuinely dry factual well-sourced with no persuasive elements.`;
return p;}

document.addEventListener("DOMContentLoaded",()=>{chrome.storage.sync.get(["gemini_api_key","include_images"],r=>{if(!chrome.runtime.lastError){if(r.gemini_api_key){apiKeyInput.value=r.gemini_api_key;showKeyStatus("Key loaded.","#4ecca3")}if(r.include_images===false)includeImagesToggle.checked=false}})});

saveKeyBtn.addEventListener("click",()=>{const k=apiKeyInput.value.trim();if(!k){showKeyStatus("Enter a key first.","#e94560");return}chrome.storage.sync.set({gemini_api_key:k},()=>{if(chrome.runtime.lastError)showKeyStatus("Error: "+chrome.runtime.lastError.message,"#e94560");else{showKeyStatus("Key saved!","#4ecca3");saveKeyBtn.textContent="Saved!";saveKeyBtn.classList.add("saved");setTimeout(()=>{saveKeyBtn.textContent="Save Key";saveKeyBtn.classList.remove("saved")},2000)}})});
includeImagesToggle.addEventListener("change",()=>{chrome.storage.sync.set({include_images:includeImagesToggle.checked})});
function showKeyStatus(m,c){keyStatus.textContent=m;keyStatus.style.color=c;keyStatus.style.display="block";setTimeout(()=>{keyStatus.style.display="none"},4000)}

analyzeBtn.addEventListener("click",async()=>{
let apiKey=apiKeyInput.value.trim();
if(!apiKey){const s=await new Promise(r=>chrome.storage.sync.get(["gemini_api_key"],d=>r(d.gemini_api_key||"")));apiKey=s;if(apiKey)apiKeyInput.value=apiKey}
if(!apiKey){showStatus("Please enter and save your Gemini API key first.","error");return}
chrome.storage.sync.set({gemini_api_key:apiKey});
analyzeBtn.disabled=true;analyzeBtn.textContent="\u23F3 Deep Analyzing...";resultsContainer.innerHTML="";imgCountEl.textContent="";
const wantImages=includeImagesToggle.checked;
try{
showStatus("Step 1/4: Getting current tab...","working");
const tabs=await chrome.tabs.query({active:true,currentWindow:true});const tab=tabs[0];
if(!tab){showStatus("No active tab.","error");resetBtn();return}
const u=tab.url||"";
if(u.startsWith("chrome://")||u.startsWith("chrome-extension://")||u.startsWith("about:")||u.startsWith("edge://")||u===""||u.startsWith("devtools://")){showStatus("Cannot analyze browser pages.","error");resetBtn();return}

showStatus("Step 2/4: Extracting page text...","working");
let pageText="";
try{const res=await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>{try{const sels=["article","main",'[role="main"]',".post-content",".entry-content",".article-body",".story-body","#article-body",".post-body","#content",".content","#main-content"];let t="";for(const s of sels){const e=document.querySelector(s);if(e&&e.innerText&&e.innerText.trim().length>100){t=e.innerText;break}}if(!t||t.length<100)t=document.body.innerText||"";return t.replace(/\n{3,}/g,"\n\n").replace(/\t/g," ").trim()}catch(e){return"ERROR:"+e.message}}});if(res&&res[0]&&res[0].result)pageText=res[0].result}catch(e){showStatus("Cannot access this page.","error");resetBtn();return}
if(!pageText||pageText.startsWith("ERROR:")){showStatus("Could not extract text.","error");resetBtn();return}
if(pageText.trim().length<50){showStatus("Not enough text.","error");resetBtn();return}

let imageDataArray=[];
if(wantImages){
showStatus("Step 3/4: Capturing images...","working");
try{const imgRes=await chrome.scripting.executeScript({target:{tabId:tab.id},func:(mx,md)=>{try{const imgs=document.querySelectorAll("img");const cands=[];for(const img of imgs){if(img.naturalWidth<100||img.naturalHeight<100||img.width<80||img.height<80)continue;const st=window.getComputedStyle(img);if(st.display==="none"||st.visibility==="hidden"||st.opacity==="0")continue;const src=(img.src||"").toLowerCase();const cls=(img.className||"").toLowerCase();if(src.includes("logo")||src.includes("avatar")||src.includes("icon")||src.includes("sprite")||src.includes("tracking")||src.includes("pixel")||src.includes("badge")||src.includes("button")||src.includes("emoji")||cls.includes("logo")||cls.includes("avatar")||cls.includes("icon"))continue;cands.push({img,area:img.naturalWidth*img.naturalHeight,alt:img.alt||""})}cands.sort((a,b)=>b.area-a.area);const res=[];for(const c of cands.slice(0,mx)){try{const cv=document.createElement("canvas");let w=c.img.naturalWidth,h=c.img.naturalHeight;if(w>md||h>md){const sc=md/Math.max(w,h);w=Math.round(w*sc);h=Math.round(h*sc)}cv.width=w;cv.height=h;cv.getContext("2d").drawImage(c.img,0,0,w,h);const du=cv.toDataURL("image/jpeg",0.7);if(du&&du.length>100)res.push({base64:du.split(",")[1],mimeType:"image/jpeg",alt:c.alt,width:w,height:h})}catch(e){continue}}return res}catch(e){return[]}},args:[MAX_IMAGES,MAX_IMG_DIM]});if(imgRes&&imgRes[0]&&imgRes[0].result)imageDataArray=imgRes[0].result}catch(e){console.warn("Img fail:",e)}
imgCountEl.textContent=imageDataArray.length+" image"+(imageDataArray.length!==1?"s":"")+" captured"}else{imgCountEl.textContent="Images off"}

const truncated=pageText.substring(0,12000);
showStatus("Step 4/4: Deep analysis with Gemini AI...","working");
const result=await analyzeWithFallback(apiKey,truncated,u,imageDataArray);
displayResults(result.data,result.model,imageDataArray.length);
const count=result.data.fallacies?result.data.fallacies.length:0;
showStatus("Done! Found "+count+" issue"+(count===1?"":"s")+".","success");
}catch(err){console.error(err);let m=err.message||"Unknown";if(m.includes("ALL_MODELS_FAILED"))m="All models failed. Create a NEW key at aistudio.google.com/apikey (new project).";else if(m.includes("400")||m.includes("API_KEY_INVALID"))m="Invalid API key.";else if(m.includes("403"))m="Key lacks permission.";else if(m.includes("Failed to fetch"))m="Network error.";showStatus("Error: "+m,"error")}resetBtn()});

clearBtn.addEventListener("click",()=>{resultsContainer.innerHTML="";statusEl.textContent="";statusEl.className="status";imgCountEl.textContent=""});
function resetBtn(){analyzeBtn.disabled=false;analyzeBtn.textContent="\uD83D\uDD0D Deep Analyze This Page"}
function showStatus(m,t){statusEl.textContent=m;statusEl.className="status"+(t?" "+t:"")}

async function analyzeWithFallback(key,text,url,images){const errs=[];for(let i=0;i<MODELS.length;i++){const model=MODELS[i];showStatus("Deep analysis: "+model+" ("+(i+1)+"/"+MODELS.length+")...","working");try{const data=await callGemini(key,model,text,url,images);return{data,model}}catch(e){console.warn(model+" failed:",e.message);errs.push(model+": "+e.message);const msg=e.message.toLowerCase();if(msg.includes("429")||msg.includes("quota")||msg.includes("rate_limit")||msg.includes("resource_exhausted")||msg.includes("no longer available")||msg.includes("not found")||msg.includes("404"))continue;throw e}}throw new Error("ALL_MODELS_FAILED:\n"+errs.join("\n"))}

async function callGemini(key,model,text,url,images){
const hasImages=images&&images.length>0;
const promptText=getPrompt(url,hasImages);
const fullPrompt=promptText+"\n\n--- TEXT FROM "+url+" ---\n"+text+"\n--- END TEXT ---";
const parts=[{text:fullPrompt}];
if(hasImages){for(let i=0;i<images.length;i++){parts.push({text:"[Image "+(i+1)+(images[i].alt?": "+images[i].alt:"")+"]"});parts.push({inlineData:{mimeType:images[i].mimeType,data:images[i].base64}})}}
const apiUrl="https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(key);
const resp=await fetch(apiUrl,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:parts}],generationConfig:{temperature:0.5,maxOutputTokens:4096,responseMimeType:"application/json"}})});
if(!resp.ok){const et=await resp.text();let em="API error ("+resp.status+")";try{em=JSON.parse(et).error?.message||em}catch(e){em=et.substring(0,300)||em}throw new Error(em)}
const data=await resp.json();
if(data.candidates?.[0]?.finishReason==="SAFETY")return{fallacies:[],summary:"Content blocked by safety filters."};
const raw=data.candidates?.[0]?.content?.parts?.[0]?.text;
if(!raw)throw new Error("Empty response from "+model);
let cleaned=raw.trim();if(cleaned.startsWith("\`\`\`"))cleaned=cleaned.replace(/^\`\`\`(?:json)?\s*\n?/,"").replace(/\n?\`\`\`\s*$/,"");
try{return JSON.parse(cleaned)}catch(e){const m=cleaned.match(/\{[\s\S]*\}/);if(m)try{return JSON.parse(m[0])}catch(e2){}throw new Error("Invalid JSON from "+model)}}

function displayResults(data,model,imgCount){
resultsContainer.innerHTML="";
if(!data.fallacies||data.fallacies.length===0){resultsContainer.innerHTML='<div class="no-fallacies">\u2705 No issues detected!<br><small>'+esc(data.summary||"")+'</small></div><div class="model-info">By: '+esc(model)+(imgCount>0?" \u00B7 "+imgCount+" img"+(imgCount!==1?"s":""):"")+'</div>';return}
let tc=0,ic=0;for(const f of data.fallacies){if(f.source&&f.source.toLowerCase().includes("image"))ic++;else tc++}
let h='<div class="results-section"><h2>Found '+data.fallacies.length+' Issue'+(data.fallacies.length===1?"":"s")+'</h2>';
if(imgCount>0)h+='<div style="font-size:11px;color:#888;margin-bottom:8px">'+tc+' from text, '+ic+' from images</div>';
for(const f of data.fallacies){const isImg=f.source&&f.source.toLowerCase().includes("image");const sl=isImg?"\uD83D\uDDBC\uFE0F Image":"\uD83D\uDCDD Text";const sc=isImg?"#f0c040":"#4ecca3";
h+='<div class="fallacy-card"><div class="fn">\u26A0\uFE0F '+esc(f.name)+'</div><div class="src" style="color:'+sc+'">Source: '+sl+(f.source&&f.source!=="text"&&f.source!=="image"?" ("+esc(f.source)+")":"")+'</div><div class="fq">\u201C'+esc(f.quote)+'\u201D</div><div class="fe">'+esc(f.explanation)+'</div></div>'}
if(data.summary)h+='<div style="font-size:12px;color:#888;padding:8px 0;border-top:1px solid #2a2a4a;margin-top:4px"><b>Overall:</b> '+esc(data.summary)+'</div>';
h+='</div><div class="model-info">By: '+esc(model)+(imgCount>0?" \u00B7 "+imgCount+" img"+(imgCount!==1?"s":"")+" analyzed":"")+'</div>';
resultsContainer.innerHTML=h}

function esc(s){if(!s)return"";const d=document.createElement("div");d.textContent=s;return d.innerHTML}
