[![OpenMotion](https://github.com/nexu-io/openmotion/raw/main/docs/readme/openmotion-logo.svg)](https://github.com/nexu-io/openmotion/blob/main/docs/readme/openmotion-logo.svg)

**The open-source Claude Motion & CapCut alternative**

  ![OpenMotion — the open-source Claude Motion and CapCut alternative. Dan Martell’s original and an OpenMotion remake with Riya appear beside each other above the editable Studio timeline.](https://camo.githubusercontent.com/df80452d9bccbba416bcb1e9e8dba990e99b781b07acd1940c5f76cc66347f53/68747470733a2f2f72656c65617365732e6f70656e2d64657369676e2e61692f6f70656e2d6d6f74696f6e2f6d656469612f7368613235362f373330653164363233353832306433396261386164646534323831306431313635333737393932313336613362323032393061643564353034616262353237622e6a7067)

[![GitHub Stars · 9.5k (2026-11-09)](https://github.com/nexu-io/openmotion/raw/main/docs/readme/badges/stars.svg)](https://github.com/nexu-io/openmotion) [![Node.js 22.18+](https://github.com/nexu-io/openmotion/raw/main/docs/readme/badges/node.svg)](https://github.com/nexu-io/openmotion/blob/main/package.json) [![Apache 2.0 license](https://github.com/nexu-io/openmotion/raw/main/docs/readme/badges/license.svg)](https://github.com/nexu-io/openmotion/blob/main/LICENSE) [![Built by OpenDesign](https://github.com/nexu-io/openmotion/raw/main/docs/readme/badges/built-by-opendesign.svg)](https://github.com/nexu-io/open-design)

[![OpenMotion website](https://github.com/nexu-io/openmotion/raw/main/docs/readme/badges/website.svg)](https://open-design.ai/motion/) [![OpenDesign Go model subscriptions](https://github.com/nexu-io/openmotion/raw/main/docs/readme/badges/opendesign-go.svg)](https://go.open-design.ai/?utm_source=github&utm_medium=referral&utm_campaign=openmotion&utm_content=readme_en) [![Join the OpenMotion Discord](https://github.com/nexu-io/openmotion/raw/main/docs/readme/badges/discord.svg)](https://discord.com/invite/M7NnHS9gNa) [![Join the OpenMotion Feishu group](https://github.com/nexu-io/openmotion/raw/main/docs/readme/badges/feishu.svg)](https://applink.feishu.cn/client/chat/chatter/add_by_link?link_token=b6cs46dc-acb2-48ed-941d-c45642ead841) [![OpenDesign on X (@OpenDesignHQ)](https://github.com/nexu-io/openmotion/raw/main/docs/readme/badges/x-opendesignhq.svg)](https://x.com/OpenDesignHQ) [![OpenDesign Developers on X (@OpenDesignDevs)](https://github.com/nexu-io/openmotion/raw/main/docs/readme/badges/x-opendesigndevs.svg)](https://x.com/OpenDesignDevs) [![OpenDesign on YouTube](https://github.com/nexu-io/openmotion/raw/main/docs/readme/badges/youtube.svg)](https://www.youtube.com/channel/UChtshixMhvtgBWzoD9R_Qfg)

[Install](#quick-start) · [Agents](#agent-wall) · [Use cases & remakes](#showcase) · [Why OpenMotion](#features) · [Setup & architecture](#technical-guide) · [Community](#community)

OpenMotion is a **full-stack agentic video** studio and an **open-source alternative to Claude Motion and CapCut**. Upload a reference video or paste a social video link to **recreate it with your own brand kit and copy**.

*   🎬 **Full-stack video recreation.** Code video with HTML. Your agent breaks down the reference, rebuilds its shots and transitions, and generates missing assets. Edit the timing in Studio and render an MP4 from the same project.
*   🔑 **BYOA — Bring Your Own Agent. BYOK — Bring Your Own Keys.** OpenMotion is free and open source. Recreate videos in [your local agent](#agent-wall) with your own API keys. Supported agents include Claude Code, Codex, and WorkBuddy.
*   🧩 OpenMotion introduces **Motion.md**, a Markdown format for shot order, timing and transitions. Use it to share how a brand film works, shot by shot.
*   🎛️ **Images, video, music and voice.** Create artwork with GPT Image 2.6, add a shot with Seedance 2.5, score it with Suno and narrate it with Eleven v4. [Explore the models and providers](#model-wall).

### Install from ChatGPT Marketplace

[](#install-from-chatgpt-marketplace)

**One-click installation. No manual configuration required.** Once installed, create motion videos from scratch, recreate reference videos, or start from a template—all in your conversation.

**[Install OpenMotion in ChatGPT →](https://chatgpt.com/plugins/plugins_6a742d13e88481919b42002864b1bb26)**

### Install in your agent

[](#install-in-your-agent)

Install the main Skill with the [Skills CLI](https://github.com/vercel-labs/skills):

npx skills add nexu-io/openmotion --skill openmotion

Then ask your agent: **Use OpenMotion to install and connect the local Studio and MCP, then help me make a video.** The Skill completes the source setup below when needed and reuses an existing workspace. Installing the Skill alone copies instructions; it does not yet install Studio or connect MCP.

Copy this instruction into your local agent to set up OpenMotion from source:

```
Read https://github.com/nexu-io/openmotion/blob/main/docs/install.md and follow the instructions to install and connect OpenMotion in the current agent.
```

After setup, the agent opens the local template library and shows the welcome followed by three project-preview cards in a self-contained HTML document. Each installation samples three distinct entries from the curated pool of four. The complete silent previews and posters are bundled, so this display does not wait for native MCP reload or fetch remote reference films. Native original-reference playback remains available separately and requires internet access. The library opens once using the opening tool's result, with no extra page or playback audit. An opening failure is reported with a usable link and does not invalidate installation. Automatic current-chat MCP activation is assessed independently. Preview a card, choose **Recreate template**, then send your brief to start creating. [Source installation guide](https://github.com/nexu-io/openmotion/blob/main/docs/install.md) · [Onboarding selection](https://github.com/nexu-io/openmotion/blob/main/docs/install.md#maintained-recommendation-selection)

### Install the published npm app (optional)

[](#install-the-published-npm-app-optional)

Source setup above remains the default for repository installation. To explicitly choose the published application with prebuilt Studio and its configured online catalog, copy this instruction into your local agent:

```
Read https://releases.open-design.ai/motion and follow the instructions to install and connect the published npm application in the current agent.
```

[Published application installation and channel selection](https://github.com/nexu-io/openmotion/blob/main/docs/install.md). Published versions can lag behind this checkout.

### Run the repository locally

[](#run-the-repository-locally)

Use Git, npm and Node.js 26.11.1:

git -c filter.lfs.process= -c filter.lfs.smudge= -c filter.lfs.required=false clone --depth 1 --single-branch --branch main https://github.com/nexu-io/openmotion.git
cd openmotion
npm ci
npm run build:studio
npm start

Open the actual `studioUrl` or `previewUrl` printed at startup, then choose **Template library**. Studio and MCP read the templates in this checkout. To connect your agent to this same copy, follow [source setup and MCP configuration](#agent-setup). [Clone size and optional media](https://github.com/nexu-io/openmotion/blob/main/docs/repository-storage.md)

### Start from an existing project

[](#start-from-an-existing-project)

Import a **HyperFrames project ZIP** into OpenMotion to continue editing its composition and local assets. Compress the project folder, open **All projects → Import projects**, then select the imported copy to edit in Studio or with your Agent. Import creates an independent copy and requires a supported native project structure.

[Step-by-step import guide, required files and compatibility](https://github.com/nexu-io/openmotion/blob/main/docs/project-archives.md#import-from-hyperframes)

**22 local agents** · [Choose your agent](#choose-agent)

[![WorkBuddy, Codex CLI, Claude Code, OpenCode, Hermes, Antigravity, Gemini CLI, Grok Build, Kimi CLI, Cursor Agent, Qwen Code, Qoder CLI, GitHub Copilot, Pi, Kiro CLI, Kilo, Mistral Vibe, DeepSeek TUI, Reasonix, Aider, Devin, Trae CLI](https://github.com/nexu-io/openmotion/raw/main/docs/readme/agents/local-agents.png)](#choose-agent)

## 🎞️ Use cases and remake examples

[](#️-use-cases-and-remake-examples)

Explore product demos, brand films, talking-head videos and more. The previews below show reference videos.

**[Browse the full template library →](https://open-design.ai/templates/)** — Find more templates, full videos, Motion.md and recreation instructions.

### AI recuts & revisions

[](#ai-recuts--revisions)

### Product launches & demos

[](#product-launches--demos)

### Brand films & motion

[](#brand-films--motion)

### Explainers & tutorials

[](#explainers--tutorials)

### Data stories & charts

[](#data-stories--charts)

### Music & art visuals

[](#music--art-visuals)

### AI talking-head edits

[](#ai-talking-head-edits)

Build a clear story around a speaker, with readable captions, screen inserts and animated keywords. Use these references to find a style for your own recording.

🎓 Teach & explain

![Presenter video reference: 6 essential skills to transform your career](https://camo.githubusercontent.com/a3b7e513a9168b7256f7e728f7badc6aba128e2312b3886f43458d318ccbb36b/68747470733a2f2f72656c65617365732e6f70656e2d64657369676e2e61692f6f70656e2d6d6f74696f6e2f6d656469612f7368613235362f373731366337313636626639663039386636373834356435353837326530386635373635656165623134333965623537363064623738356661366432643431652e676966)  
**6 essential skills to transform your career**  
Numbered points + kinetic keywords  
Reference · @careerwithriya

![Presenter video reference: What's the best AI tool right now?](https://camo.githubusercontent.com/255b75d4ab1f09614c1403a021e34d126b8964b734ae8172c872be8aa8c93f8c/68747470733a2f2f72656c65617365732e6f70656e2d64657369676e2e61692f6f70656e2d6d6f74696f6e2f6d656469612f7368613235362f306437653733313633323261323862366365393031336265616565343230386338346231326262623535363566303466636263313735633732653661656164632e676966)  
**What's the best AI tool right now?**  
Presenter + floating tool cards  
Reference · Dan Martell

![Presenter video reference: 10 Days of AI Basics, Day 1](https://camo.githubusercontent.com/d5a0eca42fde0c4f5a3c45ae836cf610c2399a64ea55e5309c2537b8d1e83fdd/68747470733a2f2f72656c65617365732e6f70656e2d64657369676e2e61692f6f70656e2d6d6f74696f6e2f6d656469612f7368613235362f396234613935376463303034656663346631646466646665643534366361336363633662316131393738633135643038383764303137356238346361613339662e676966)  
**10 Days of AI Basics, Day 1**  
A personal lesson + readable captions  
Reference · @harpercarrollai

🖥️ Show the workflow

![Presenter video reference: 5 tools I use every day](https://camo.githubusercontent.com/84684986e85631eda2c4a26e38b90359dc1b9e5d5b0be23e83928d4c205a58a0/68747470733a2f2f72656c65617365732e6f70656e2d64657369676e2e61692f6f70656e2d6d6f74696f6e2f6d656469612f7368613235362f303362393039366138393466303537323238396563333166393437363835346536363031313338353261393762343839386335623838313538303330623961382e676966)  
**5 tools I use every day**  
Desk-side story + workflow inserts  
Reference · Ali Abdaal

![Presenter video reference: Tool demo with callouts](https://camo.githubusercontent.com/14b1ae0062a1a732dba79fe8ab373c2761ae4adeb21bc3dcf32156f269cab990/68747470733a2f2f72656c65617365732e6f70656e2d64657369676e2e61692f6f70656e2d6d6f74696f6e2f6d656469612f7368613235362f613861303962306234383337313235633934386263646566663936346165376139666639373165613032373539323764303435626337326638313134316437322e676966)  
**Tool demo with callouts**  
Presenter + screens + callouts  
Reference · @john.tagudin

![Presenter video reference: Top 5 plugins to install in Claude](https://camo.githubusercontent.com/ac318392c1cbd3c86ecfc6724bdee0a136a74ca969e3016aa99c2952c877224d/68747470733a2f2f72656c65617365732e6f70656e2d64657369676e2e61692f6f70656e2d6d6f74696f6e2f6d656469612f7368613235362f653034663963326664666231626365326132663833626266323862646538373635616635386335383962623532623930343639346666383131336436316137652e676966)  
**Top 5 plugins to install in Claude**  
A spoken list + supporting screenshots  
Reference · @aiwithsachi

🎬 Tell a story, show a product

![Presenter video reference: The Founder Experiments, Ep. 1](https://camo.githubusercontent.com/8dd531af452618122a08151bebc07e128a85f5c40a36f3265798e55e63985314/68747470733a2f2f72656c65617365732e6f70656e2d64657369676e2e61692f6f70656e2d6d6f74696f6e2f6d656469612f7368613235362f303335396234383239346362393738646639373666396165326162366361343634343835346265653433386463613039616363633131343463333032353962632e676966)  
**The Founder Experiments, Ep. 1**  
Founder diary + everyday B-roll  
Reference · @khris.sheer

![Presenter video reference: AI creator with product](https://camo.githubusercontent.com/47ceab079cc7c826da00a2d4edabd927db942e3cae83d0ca09190cc05e05cf4d/68747470733a2f2f72656c65617365732e6f70656e2d64657369676e2e61692f6f70656e2d6d6f74696f6e2f6d656469612f7368613235362f306237373930353232383165383961336566633434653561346234343932653234356131326131346330633531313838313365353938373634313961643563352e676966)  
**AI creator with product**  
Product story + proof + picture-in-picture  
Reference · @ugc.rachelll

![Presenter video reference: Stop Paying for 5 AI Tools](https://camo.githubusercontent.com/c00b75d1b85650d719b4a58d37d193545a81826a037c73ad7e4297ccff9627e6/68747470733a2f2f72656c65617365732e6f70656e2d64657369676e2e61692f6f70656e2d6d6f74696f6e2f6d656469612f7368613235362f333136353530303464663535363161383335656163643039336664643765326132343762336335666563306139303734636535396336643963396335363239312e676966)  
**Stop Paying for 5 AI Tools**  
Product tutorial + live demonstration  
Reference · Kevin Stratvert

## ✨ Why OpenMotion

[](#-why-openmotion)

### 1\. A full-stack agentic video studio

[](#1-a-full-stack-agentic-video-studio)

**Code video with HTML.** OpenMotion uses HTML, CSS and JavaScript to describe scenes, typography, layout, transitions and timing. Recorded footage, generated clips, images, music and voice-over become media inside the composition. The same project opens in Studio and renders to MP4.

[![Your local agent, optional media-model accounts and creative resources feed a workflow of understanding the reference, coding scenes, generating missing media, editing and rendering MP4 with reusable source.](https://github.com/nexu-io/openmotion/raw/main/docs/readme/diagrams/creation-stack.svg)](https://github.com/nexu-io/openmotion/blob/main/docs/readme/diagrams/creation-stack.svg)

**Write it. Watch it. Change it. Render it.** Ask your agent to replace the product, tighten the hook, add a presenter, change the captions or try another ending. It edits the project source; you review the result in the visual editor. Local MCP clients use the project tools, while agents with shell access can follow the Skills and pinned CLI workflow. [Agent setup](#agent-setup) · [Native composition guide](https://github.com/nexu-io/openmotion/blob/main/skills/openmotion-production/references/native.md) · [Example HTML project](https://github.com/nexu-io/openmotion/blob/main/template-library/product-promo/index.html)

If historical media are unavailable, an Agent restore is refused before changing the project. The editor shows a dismissible error with the affected file paths and confirms that the current project is unchanged.

[![The sample project in Studio with its compositions, video preview, scene timeline and audio waveform.](https://github.com/nexu-io/openmotion/raw/main/docs/readme/live-product/editor.en.jpg)](https://github.com/nexu-io/openmotion/blob/main/docs/readme/live-product/editor.en.jpg)

Review your video, arrange clips and export from the same Studio workspace.

#### What you can change in Studio

[](#what-you-can-change-in-studio)

In the Studio

What you can do today

**Story and timeline**

Import and arrange media; have the agent trim, reorder and revise against a script or confirmed timecodes

**Motion and captions**

Author animated type, transitions, callouts, charts and captions around your content

**Media and sound**

Import your material and generate images, video, music and TTS voice-over through the built-in model integrations

**Image revision**

Generate candidates with a reference-capable image model and adopt a replacement while preserving timing and animation

**Preview and versions**

Review in Studio, edit by hand or with your agent, and return to the project for the next revision

**Export and source**

Render a fixed version to MP4 and retain the HTML, CSS, JavaScript and media

> “Keep the reveal we approved. Replace the middle scene with this screen recording, tighten the opening using these timecodes, and hold our final CTA for two more seconds.”

[Projects and versions](https://github.com/nexu-io/openmotion/blob/main/docs/project-workspace.md)

#### From a reference clip to an editable remake

[](#from-a-reference-clip-to-an-editable-remake)

1.  **Break down the reference.** Pick a sequence. Record its shot order, transitions and sound cues in Motion.md, and mark what you want to replace.
2.  **Rebuild the shots.** Your agent rebuilds the HTML scenes using your brand kit, copy and visuals, then arranges them on an editable timeline in Studio.
3.  **Compare the cuts.** Watch the same moment in the original and the remake. Adjust the timing, movement and sound, then play the sequence through.
4.  **Export and share.** Render the MP4 and keep the HTML source and media. To share a project others can adapt, include its Motion.md, a preview and assets you can redistribute. [Project contribution checklist](https://github.com/nexu-io/openmotion/blob/main/library/ENTRY_TEMPLATE.md)

### 2\. Free and open source. Use your local agent and bring your own keys.

[](#2-free-and-open-source-use-your-local-agent-and-bring-your-own-keys)

**Choose your agent.** WorkBuddy, Codex, Claude Code and DeepSeek Harness have installation instructions. Other buttons open the shared MCP and CLI setup.

[![WorkBuddy](https://github.com/nexu-io/openmotion/raw/main/docs/readme/agents/workbuddy-badge.svg)](#workbuddy-setup) [![Codex CLI](https://github.com/nexu-io/openmotion/raw/main/docs/readme/agents/codex-badge.svg)](#agent-setup) [![Claude Code](https://github.com/nexu-io/openmotion/raw/main/docs/readme/agents/claude-code-badge.svg)](#claude-setup) [![OpenCode](https://github.com/nexu-io/openmotion/raw/main/docs/readme/agents/opencode-badge.svg)](#local-agent-connection) [![Hermes](https://github.com/nexu-io/openmotion/raw/main/docs/readme/agents/hermes-badge.svg)](#local-agent-connection) [![Antigravity](https://github.com/nexu-io/openmotion/raw/main/docs/readme/agents/antigravity-badge.svg)](#local-agent-connection) [![Gemini CLI](https://github.com/nexu-io/openmotion/raw/main/docs/readme/agents/gemini-badge.svg)](#local-agent-connection) [![Grok Build](https://github.com/nexu-io/openmotion/raw/main/docs/readme/agents/grok-build-badge.svg)](#local-agent-connection) [![Kimi CLI](https://github.com/nexu-io/openmotion/raw/main/docs/readme/agents/kimi-badge.svg)](#local-agent-connection) [![Cursor Agent](https://github.com/nexu-io/openmotion/raw/main/docs/readme/agents/cursor-badge.svg)](#local-agent-connection) [![Qwen Code](https://github.com/nexu-io/openmotion/raw/main/docs/readme/agents/qwen-badge.svg)](#local-agent-connection) [![Qoder CLI](https://github.com/nexu-io/openmotion/raw/main/docs/readme/agents/qoder-badge.svg)](#local-agent-connection) [![GitHub Copilot](https://github.com/nexu-io/openmotion/raw/main/docs/readme/agents/copilot-badge.svg)](#local-agent-connection) [![Pi](https://github.com/nexu-io/openmotion/raw/main/docs/readme/agents/pi-badge.svg)](#local-agent-connection) [![Kiro CLI](https://github.com/nexu-io/openmotion/raw/main/docs/readme/agents/kiro-badge.svg)](#local-agent-connection) [![Kilo](https://github.com/nexu-io/openmotion/raw/main/docs/readme/agents/kilo-badge.svg)](#local-agent-connection) [![Mistral Vibe](https://github.com/nexu-io/openmotion/raw/main/docs/readme/agents/vibe-badge.svg)](#local-agent-connection) [![DeepSeek TUI / Harness](https://github.com/nexu-io/openmotion/raw/main/docs/readme/agents/deepseek-badge.svg)](#deepseek-setup) [![Reasonix](https://github.com/nexu-io/openmotion/raw/main/docs/readme/agents/reasonix-badge.svg)](#local-agent-connection) [![Aider](https://github.com/nexu-io/openmotion/raw/main/docs/readme/agents/aider-badge.svg)](#local-agent-connection) [![Devin](https://github.com/nexu-io/openmotion/raw/main/docs/readme/agents/devin-badge.svg)](#local-agent-connection) [![Trae CLI](https://github.com/nexu-io/openmotion/raw/main/docs/readme/agents/trae-badge.svg)](#local-agent-connection)

Bring your own…

Make it work for your video

**🤖 Agent — BYOA**

Connect your existing local agent through Skills and MCP, with CLI access where supported. Keep your preferred client, account and working context.

**🔑 Keys — BYOK**

Connect supported media-provider API keys in Model Settings. Choose models for images, video, music and TTS; supported local media integrations can use your existing agent login.

**🎨 Brand and material**

Add your logo, fonts, screenshots, camera footage, script and music. Keep identity and approved assets in the Brand Kit section of Motion.md.

**🧩 Starting resources**

Browse references, motion components, templates and community Skills. Pick a direction, give the source or reference to your agent, and make it yours.

**The OpenMotion creation pipeline is open source: Skills, project tools, model integrations, Studio and rendering.** Run it locally, inspect the implementation and extend the parts you need. OpenMotion charges no software subscription or per-render fee for this local workflow. You can also work with your own footage, images and audio without invoking media-generation APIs.

Provider credentials stay in your workspace, separate from the video project. Your agent and media providers bill any subscriptions or usage to your own accounts. [Agent setup and compatibility](https://github.com/nexu-io/openmotion/blob/main/docs/agent-adapters.md)

### 3\. 300+ Motion.md guides for video recreation

[](#3-300-motionmd-guides-for-video-recreation)

OpenMotion introduces **Motion.md**: a Markdown format for shot order, timing, transitions and the assets you can replace. The online library brings reference videos and their motion guides into the same detail page.

The Brand Kit section records your identity, voice and approved product facts; the Design section can reference an independent `DESIGN.md` for visual rules. Keep the reference’s motion and pacing while making the result recognizably yours.

To share an industry or brand system, use the [Motion Package v0.2 draft](https://github.com/nexu-io/openmotion/blob/main/docs/motion-package-spec.md) and [authoring toolkit](https://github.com/nexu-io/openmotion/blob/main/packages/motion-package/README.md). A package combines the design and motion documents with materials, declared dependencies and optional `SKILL.md`. The included recipe demonstrates two content presets; automatic Studio import and rendered fidelity remain separate from package validation.

[![Motion.md and brand context](https://github.com/nexu-io/openmotion/raw/main/docs/readme/diagrams/creative-context.svg)](https://github.com/nexu-io/openmotion/blob/main/docs/readme/diagrams/creative-context.svg)

#### Find a template, then make it yours

[](#find-a-template-then-make-it-yours)

Browse by **reference brand, use case and video type**, or search for a specific idea. A template detail page brings together the preview, visual style, production notes and Motion.md download. Choose **Recreate template** in Studio to copy a prompt for your agent.

Reference-only entries start a reconstruction workflow. When editable source is available, your agent can adapt the project directly.

[![Find a template, then make it yours](https://github.com/nexu-io/openmotion/raw/main/docs/readme/live-product/library.en.jpg)](https://github.com/nexu-io/openmotion/blob/main/docs/readme/live-product/library.en.jpg)

[Browse the template library](https://open-design.ai/templates/)

### 4\. Multimodal generation: images, video, music and speech

[](#4-multimodal-generation-images-video-music-and-speech)

**BYOK makes your multimodal accounts part of the video workflow.** Add your supported provider keys in **Model Settings**, choose your models, and generate images, video, music and speech through the Studio's **Model Gateway**. Preview candidates and adopt the results into the same project your agent and Studio edit. The supported local image path can reuse your existing agent login.

Connect fal.ai in **Model Settings** and refresh its catalog to find GPT Image 2.6, Nano Banana 2.1, FLUX.3, Seedance 2.5, Kling 4.0, Wan 3.0 and Eleven v4. The presets below also appear before you refresh.

[![Codex Image](https://github.com/nexu-io/openmotion/raw/main/docs/readme/models/codex.svg)](https://github.com/nexu-io/openmotion/blob/main/docs/readme/models/codex.svg) [![Nano Banana 2](https://github.com/nexu-io/openmotion/raw/main/docs/readme/models/nano-banana.svg)](https://github.com/nexu-io/openmotion/blob/main/docs/readme/models/nano-banana.svg) [![FLUX Schnell](https://github.com/nexu-io/openmotion/raw/main/docs/readme/models/flux.svg)](https://github.com/nexu-io/openmotion/blob/main/docs/readme/models/flux.svg) [![Seedance 2.0](https://github.com/nexu-io/openmotion/raw/main/docs/readme/models/seedance.svg)](https://github.com/nexu-io/openmotion/blob/main/docs/readme/models/seedance.svg) [![Wan 2.2](https://github.com/nexu-io/openmotion/raw/main/docs/readme/models/wan.svg)](https://github.com/nexu-io/openmotion/blob/main/docs/readme/models/wan.svg) [![Suno v4](https://github.com/nexu-io/openmotion/raw/main/docs/readme/models/suno.svg)](https://github.com/nexu-io/openmotion/blob/main/docs/readme/models/suno.svg) [![Kokoro](https://github.com/nexu-io/openmotion/raw/main/docs/readme/models/kokoro.svg)](https://github.com/nexu-io/openmotion/blob/main/docs/readme/models/kokoro.svg)

Make what the video needs

Built-in model catalog examples

Bring it into your film

**🖼️ Images**

Codex Image; Nano Banana 2 via Atlas Cloud; FLUX Schnell via fal.ai

Brand visuals, scene artwork and supporting images; reference-based editing with Codex Image or an OpenDesign account image model that supports edits

**🎬 Video**

Seedance 2.0 via Atlas Cloud; Wan 2.2 via fal.ai

Generated shots and B-roll to combine with your footage and motion

**🎵 Music**

Suno v4 via Atlas Cloud

A soundtrack built around your mood and creative brief

**🎙️ TTS / voice-over**

Kokoro via fal.ai

Narration from your approved script, placed alongside the visuals and music

> “Use the Brand Kit section of our Motion.md and our approved script. Generate artwork for the opening, a video insert, background music and TTS narration. Add the selected results to the recreated project, align the sound and visuals, then show me the full cut.”

[Model catalog](https://github.com/nexu-io/openmotion/blob/main/gateway/catalog.ts) · [Provider setup and endpoints](https://github.com/nexu-io/openmotion/blob/main/docs/model-gateway.md)

## 🛠️ Setup and technical documentation

[](#️-setup-and-technical-documentation)

When choosing or replacing media, creation workflows share a [material sourcing policy](https://github.com/nexu-io/openmotion/blob/main/skills/openmotion-production/references/materials.md): reuse suitable supplied assets, prefer original sources for established subjects, and create original/supporting visuals as needed. Explicit user constraints and each workflow’s supported scope still apply.

### Install from source

[](#install-from-source)

For agent-led installation, use the [installation instruction above](#quick-start). To run from source, follow the steps below.

After a successful Agent-led installation, open the editor's template library in the current conversation, without creating a project. Browse and preview first; choose **Open and edit** to create an independent editable copy. Setup provides a direct library link even before the chat reloads MCP. See the [installation reply rules](https://github.com/nexu-io/openmotion/blob/main/docs/install.md#installation-success-reply).

During video creation and editing, the chat stays free of preview areas. OpenMotion presents the editable Studio when the final video is ready to preview, then shows [one final-video preview](https://github.com/nexu-io/openmotion/blob/main/docs/inline-video.md) after MP4 export and verification. Host-native playback takes priority; Codex embeds the video in the final reply. The optional MCP App player is used only when the host cannot preview the video, never alongside another preview of the same export. Native-host acceptance of an installed build remains separate.

If MCP tools are missing or fail to connect, use the installed [connection diagnosis and recovery guide](https://github.com/nexu-io/openmotion/blob/main/docs/npm-installation.md#missing-mcp-tools-or-a-failed-connection) to inspect the actual host configuration and verify the original workspace before continuing.

Use Git, npm and **Node.js 26.11.1**. Source-based preview and export also need Chrome/Chromium and FFmpeg/FFprobe. [Runtime setup](https://github.com/nexu-io/openmotion/blob/main/docs/usage.md)

git -c filter.lfs.process= -c filter.lfs.smudge= -c filter.lfs.required=false clone --depth 1 --single-branch --branch main https://github.com/nexu-io/openmotion.git
cd openmotion
npm ci
npm run build:studio
npm start

Full reference videos and optional template archives download through Git LFS only when requested. README images/GIFs and built-in templates remain available directly. See [clone size and optional media downloads](https://github.com/nexu-io/openmotion/blob/main/docs/repository-storage.md).

Open the `studioUrl` or `previewUrl` printed by `npm start`, then open **Template library**. Startup reuses a compatible service for the same workspace or selects an available local port. The service keeps running in the background after the launcher exits.

Select a template and choose **Recreate template** to copy the instruction for your agent. Keep projects and credentials outside the checkout; `MOTION_DATA_DIR` selects the workspace.

Source checkouts load templates from `library/templates/catalog/`. The local Studio and MCP use the same files; `openmotion_list_templates` returns a searchable local index, and `openmotion_get_template` returns local guide content and absolute source paths. Imported large images and videos retain existing CMS links; new contribution media can use Git LFS. Local edits appear on the next catalog read.

The plugin root is this checkout: `.codex-plugin/plugin.json` loads its `skills/` and `.mcp.json`, which launches the root `mcp.ts`. Start stdio with `npm run mcp` or use an absolute path in [manual MCP configuration](#manual-mcp). [Local template workflow](https://github.com/nexu-io/openmotion/blob/main/docs/template-repository.md#run-from-a-local-clone).

#### Bring it into your agent

[](#bring-it-into-your-agent)

For Codex with plugin support, run from the checkout:

bash scripts/install-motion.command

**WorkBuddy** · Import the OpenMotion connector in WorkBuddy or add its `mcp.json` as a custom MCP server. Ask WorkBuddy to list the available video templates. [WorkBuddy setup](https://github.com/nexu-io/openmotion/blob/main/docs/agent-adapters.md#workbuddy)

**Claude Code** · Connect this source checkout through the [manual MCP configuration](#manual-mcp), then run `/mcp` to check the connection.

**DeepSeek** · Work with the editable HTML project from the terminal in DeepSeek TUI. For DeepSeek Harness, connect the OpenMotion MCP tools with the Cordis configuration. [DeepSeek Harness setup](https://github.com/nexu-io/openmotion/blob/main/docs/agent-adapters.md#deepseek-harness)

The installer uses locally built packages. [Windows test packages](https://github.com/nexu-io/openmotion/blob/main/docs/test-packages.md)

Try an online template:

> Use OpenMotion to recreate the template at this detail-page URL with my brand kit and copy. Keep the motion and pacing, then open the editable result in Studio for review.

To start from a video instead, supply your reference and use the [recreation brief](#reverse-engineer-a-video). If your host cannot open Studio beside the conversation, use the returned local project link.

##### Skills, MCP and CLI

[](#skills-mcp-and-cli)

The main Skill, plugin and MCP server are named `openmotion`; Tools, specialist Skills and resources use `openmotion_*`, `openmotion-*` and `openmotion://`. Old Tool/resource names remain compatibility aliases; retired Skill entries are removed. Use `openmotion` or `openmotion-*` Skill names and refresh host discovery after upgrading. See [naming and installation compatibility](https://github.com/nexu-io/openmotion/blob/main/docs/npm-installation.md#public-names-and-compatibility).

Discover the main Skill and optional specialist workflows from GitHub with the [Skills CLI](https://github.com/vercel-labs/skills):

npx skills add nexu-io/openmotion --list
npx skills add nexu-io/openmotion --skill openmotion-director openmotion-production openmotion-template-to-video openmotion-recreate openmotion-video-to-template

This copies instructions; it does not install the runtime or register MCP. Keep the shared documentation available and connect the app separately, or use the integrated local installer above.

Skill

Use it for

[openmotion](https://github.com/nexu-io/openmotion/blob/main/skills/openmotion/SKILL.md)

Setup, first use and selecting the right video workflow

[openmotion-recreate](https://github.com/nexu-io/openmotion/blob/main/skills/openmotion-recreate/SKILL.md)

Reconstructing a reference video and comparing the result

[openmotion-template-to-video](https://github.com/nexu-io/openmotion/blob/main/skills/openmotion-template-to-video/SKILL.md)

Adapting an existing editable template

[openmotion-director](https://github.com/nexu-io/openmotion/blob/main/skills/openmotion-director/SKILL.md)

Original films, narrative, movement, sound and creative review

[openmotion-video-to-template](https://github.com/nexu-io/openmotion/blob/main/skills/openmotion-video-to-template/SKILL.md)

Producing a portable reusable template

[openmotion-production](https://github.com/nexu-io/openmotion/blob/main/skills/openmotion-production/SKILL.md)

Scoped edits, preview, checks, troubleshooting and export

**Connect a local agent** · Follow the installation guide for your client. Use the configuration below in clients with local stdio MCP support. In a shell-based agent, open the project directory and use the [local engine CLI](https://github.com/nexu-io/openmotion/blob/main/skills/openmotion-production/references/native.md) to preview and render the HTML scenes. For the published npm application, run `openmotion setup --host <agent-name>` (for example `opencode`); setup installs the app and Skills and returns the exact launcher entry to add. [Other local Agents](https://github.com/nexu-io/openmotion/blob/main/docs/npm-installation.md#other-local-agents)

{
  "mcpServers": {
    "openmotion": {
      "command": "/absolute/path/to/node",
      "args": \["\--experimental-strip-types", "/absolute/openmotion/mcp.ts"\],
      "env": { "MOTION\_DATA\_DIR": "/absolute/openmotion-data" }
    }
  }
}

The **eighteen public MCP names (including one asset compatibility alias)** cover template discovery and details, Skill discovery and reading, project creation and reading, editing, preview, media import and BYOK generation, reusable asset versions, project management and ZIP sharing, export, version restoration and cancellation. Shared workflow and engine guides are available through MCP resources. [Tool contract](https://github.com/nexu-io/openmotion/blob/main/docs/mcp-phase1-tools.md)

Find a template with `openmotion_list_templates`, inspect it with `openmotion_get_template`, then create an editable copy with `openmotion_create_project`. [Template catalog](https://github.com/nexu-io/openmotion/blob/main/docs/template-catalog.md)

Use `npm start` for the app and `npm run mcp` for stdio. Shell-capable agents can inspect and render with the pinned engine CLI returned by the runtime; managed edits retain project revision checks. [Native authoring](https://github.com/nexu-io/openmotion/blob/main/skills/openmotion-production/references/native.md)

### From a reference to an editable project

[](#from-a-reference-to-an-editable-project)

Study the reference

Rebuild for your story

**Hook and narrative** — what appears first, what follows, what earns the reveal

Your promise, product facts and call to action

**Shot structure** — framing, camera movement, layers and visual hierarchy

Your UI, footage, logo and supporting images

**Motion and pacing** — entrances, transitions, easing and reading holds

The same motion intent, adjusted to your content

**Typography and identity** — type hierarchy, color and composition

Your fonts, palette and words, recorded in Motion.md’s Brand Kit section

**Sound and rhythm** — speech timing, music cues and emphasis

Your voice, supplied music and sound direction

Supply the clip and timecodes if your agent cannot open the social link. Start from the reference with the [recreation workflow](https://github.com/nexu-io/openmotion/blob/main/skills/openmotion-recreate/SKILL.md), or use the [template workflow](https://github.com/nexu-io/openmotion/blob/main/skills/openmotion-template-to-video/SKILL.md) when you already have editable source.

```
Use OpenMotion to reverse-engineer the attached reference for our brand.

Study: the opening hook, shot order, typography, transitions and sound cues.
Keep: the product reveal and camera rhythm in the selected segment.
Replace: the logo, UI, claims, copy and end card with our supplied materials.
Generate: missing images, video, background music and TTS narration using
our configured models, following our brand and approved script.

Build an editable project. Open it in Studio and compare matching moments
with the reference. Explain any remaining differences. After review,
export an MP4 and retain the source for the next edit.
```

#### Send the template to your agent

[](#send-the-template-to-your-agent)

1.  Watch the reference video. Expand **Visual style** or **Production notes** for details, or choose **Download motion.md** to save the guide.
2.  Choose **Show instruction** to read the prompt, then **Recreate template** to copy it. Paste it into your agent with your brand kit and creative brief.
3.  Open the project your agent creates in Studio to edit and export.

[![Template preview beside the expanded instruction and Recreate template button, with a confirmation that the instruction was copied.](https://github.com/nexu-io/openmotion/raw/main/docs/readme/live-product/remix.en.jpg)](https://github.com/nexu-io/openmotion/blob/main/docs/readme/live-product/remix.en.jpg)

### System architecture

[](#system-architecture)

Editing the timeline in Studio and asking your agent to change a shot both update the same HTML project. The local TypeScript service manages media and revisions. A browser-based rendering engine exports the selected version to MP4.

#### How the modules work together

[](#how-the-modules-work-together)

[![The local agent connects through nine MCP project tools and Studio through local HTTP. The application manages revisions, assets and export jobs; the Model Gateway supplies media to the editable project, and the renderer exports and checks the selected project version.](https://camo.githubusercontent.com/28e0be6e75c07f89b11d864fad836ce0d4cfbc301d35ab1286b80b5611e31be0/68747470733a2f2f72656c65617365732e6f70656e2d64657369676e2e61692f6f70656e2d6d6f74696f6e2f6d656469612f7368613235362f336539336539383936633364626239333061623534393263313266646361343864623232366564646638383136303162373534303063613430313165303166302e706e67)](https://camo.githubusercontent.com/28e0be6e75c07f89b11d864fad836ce0d4cfbc301d35ab1286b80b5611e31be0/68747470733a2f2f72656c65617365732e6f70656e2d64657369676e2e61692f6f70656e2d6d6f74696f6e2f6d656469612f7368613235362f336539336539383936633364626239333061623534393263313266646361343864623232366564646638383136303162373534303063613430313165303166302e706e67)

Edits made through the project tools include a revision check so an outdated request cannot overwrite newer work. Generated media enters the project when you select it. Each export uses the version saved when the job starts. The exporter checks the file specifications, and you can play the cut to review the picture, sound and timing.

Read the full architecture and roadmap as text

```
CREATIVE INPUT
Reference video + brand kit + script + media
                            |
                            v
COMMUNITY KNOWLEDGE
Motion.md + BRANDKIT.md + Skills + templates + components
                            |
              +-------------+------------------+
              v                                v
BYOA: YOUR LOCAL AGENT                OPENMOTION STUDIO
DeepSeek Harness / Codex /            React 19 + TypeScript + Vite
Claude Code / other local hosts       Tailwind CSS + Zustand
Skills + host analysis tools         CodeMirror + Dockview
              |                      media / preview / timeline
              | stdio MCP                      | local HTTP
              | 9 public project tools         |
              +------------------+-------------+
                                 v
LOCAL APPLICATION                 Node.js + TypeScript + node:http
Sessions / project files / assets / revisions / export jobs
              |                                  |
              v                                  v
BYOK: MODEL GATEWAY                   VIDEO AS CODE
Your keys / accounts / model routing  HTML scenes + media + Studio data
Discovery / generation jobs           HTML + CSS + JavaScript + GSAP
              |                                  ^
              v                                  |
MODEL ADAPTERS                                   |
Codex Image / Atlas Cloud / fal.ai               |
Images / Video / Music / TTS                     |
              |                                  |
              v                                  |
Generated candidates -> preview / select -> adopt into the project
                                                 |
                                                 v
RENDER AND VERIFY
Selected project version -> HTML render engine + Chromium -> FFmpeg / FFprobe
                                                 |
                                                 v
DELIVERY TODAY
MP4 + editable source + media + version and export evidence
                                                 |
                          .----------------------'
                          v
COMING: PUBLISH TO EVERY PLATFORM
Platform connectors -> release review -> scheduling -> performance feedback
                          |
                          v
COMING: KNOWLEDGE FEEDBACK
Version-linked outcomes -> team memory / RAG -> evaluated Skill improvements
```

BYOA connects your existing Agent client; the Assets workspace supports direct model generation and reusable media. BYOK connects your supported model accounts. Studio and the local service manage the editable work, while provider credentials remain outside project files. The public phase-one MCP surface contains **eighteen names: nine project tools, two template catalog tools, two Skill library tools, a project archive tool, a project management tool, one BYOK media-use tool and two names for the same workspace asset capability**. Configure provider keys in Studio, then use `openmotion_media_use` for model discovery and media generation through the local Gateway service. Use `openmotion_assets_use` (`openmotion_assets` remains compatible) to upload, inspect or generate reusable assets, retain versions and import a chosen version into a film. [Asset library guide](https://github.com/nexu-io/openmotion/blob/main/docs/assets.md). Keys remain in the service; the public MCP contract does not include publishing.

#### Stack and source map

[](#stack-and-source-map)

Layer

Technology

Start reading

**Studio and editor UI**

React 19, TypeScript 5.9, Vite 6, Tailwind CSS 4, Zustand, CodeMirror and Dockview

[Studio source](https://github.com/nexu-io/openmotion/blob/main/studio/src) · [Motion app](https://github.com/nexu-io/openmotion/blob/main/studio/src/motion/MotionApp.tsx) · [Editor development](https://github.com/nexu-io/openmotion/blob/main/docs/editor-fork.md)

**Application runtime**

Node.js 26.11.1 in CI, native HTTP, TypeScript execution and local files/JSON

[server.ts](https://github.com/nexu-io/openmotion/blob/main/server.ts) · [workspace.ts](https://github.com/nexu-io/openmotion/blob/main/workspace.ts) · [Session architecture](https://github.com/nexu-io/openmotion/blob/main/docs/session-architecture.md)

**Agent integration**

Local stdio MCP, five core Skills and generated host adapters

[mcp.ts](https://github.com/nexu-io/openmotion/blob/main/mcp.ts) · [phase1.ts](https://github.com/nexu-io/openmotion/blob/main/phase1.ts) · [Adapter generation](https://github.com/nexu-io/openmotion/blob/main/scripts/export-adapters.ts)

**Multimodal generation**

Codex media adapter, Atlas Cloud predictions, fal.ai queue integration and persisted generation jobs

[Gateway service](https://github.com/nexu-io/openmotion/blob/main/gateway/service.ts) · [Provider adapters](https://github.com/nexu-io/openmotion/blob/main/gateway/providers.ts) · [Model catalog](https://github.com/nexu-io/openmotion/blob/main/gateway/catalog.ts)

**Composition and motion**

HTML/CSS/JS, GSAP, a pinned composition engine and native timeline/history

[Engine integration](https://github.com/nexu-io/openmotion/blob/main/hyperframes.ts) · [Template source](https://github.com/nexu-io/openmotion/blob/main/template-library) · [Version adapter](https://github.com/nexu-io/openmotion/blob/main/phase1-versions.ts)

**Rendering and media**

Chromium, Puppeteer Core, FFmpeg and FFprobe

[Render service](https://github.com/nexu-io/openmotion/blob/main/server.ts) · [Export verifier](https://github.com/nexu-io/openmotion/blob/main/scripts/verify-export.ts) · [Native runtime lock](https://github.com/nexu-io/openmotion/blob/main/scripts/runtime-lock.json)

**Creative knowledge**

Markdown, source packages, presets and comparison evidence

[Motion.md](https://github.com/nexu-io/openmotion/blob/main/docs/motion-md.md) · [Core Skills](https://github.com/nexu-io/openmotion/blob/main/skills) · [Community Library](https://github.com/nexu-io/openmotion/blob/main/library/README.md)

**Release history**

Stable version descriptions and published release records

[Changelog](https://github.com/nexu-io/openmotion/blob/main/CHANGELOG.md) · [GitHub Releases](https://github.com/nexu-io/openmotion/releases)

**Validation and packaging**

Node test runner, Vitest, Studio checks, npm lockfiles and explicit distribution lists

[Tests](https://github.com/nexu-io/openmotion/blob/main/tests) · [Studio tests](https://github.com/nexu-io/openmotion/blob/main/studio/tests) · [CI](https://github.com/nexu-io/openmotion/blob/main/.github/workflows/ci.yml) · [Distribution](https://github.com/nexu-io/openmotion/blob/main/scripts/distribution.ts)

**Publishing and learning — Coming**

Platform adapters, scheduling, version-linked feedback and retrieval; implementation still to be designed

[Studio vision](https://github.com/nexu-io/openmotion/blob/main/docs/product/studio-vision.md)

Dependency pins live in [package.json](https://github.com/nexu-io/openmotion/blob/main/package.json), [package-lock.json](https://github.com/nexu-io/openmotion/blob/main/package-lock.json) and the [runtime lock](https://github.com/nexu-io/openmotion/blob/main/scripts/runtime-lock.json). Models and third-party libraries retain their own terms; the application is Apache-2.0.

#### Choose a layer and build with us

[](#choose-a-layer-and-build-with-us)

If you work on…

A useful contribution

Entry point

**Frontend and interaction**

Improve timeline editing, media generation controls, accessibility or preview behavior

[Studio](https://github.com/nexu-io/openmotion/blob/main/studio/src) · [Media generator](https://github.com/nexu-io/openmotion/blob/main/studio/src/motion/MediaGenerator.tsx)

**AI and model infrastructure**

Add a provider adapter or model preset using the shared job and media flow

[Gateway design](https://github.com/nexu-io/openmotion/blob/main/docs/product/media-generation-design.md) · [Provider adapters](https://github.com/nexu-io/openmotion/blob/main/gateway/providers.ts)

**Agents and developer tools**

Improve a host adapter, Skill, resource guide or project-tool workflow

[Agent adapters](https://github.com/nexu-io/openmotion/blob/main/docs/agent-adapters.md) · [MCP contract](https://github.com/nexu-io/openmotion/blob/main/docs/mcp-phase1-tools.md)

**Motion and creative coding**

Share a component, native template or Motion.md package with an actual remix

[Components](https://github.com/nexu-io/openmotion/blob/main/library/components/README.md) · [Entry checklist](https://github.com/nexu-io/openmotion/blob/main/library/ENTRY_TEMPLATE.md)

**Video and rendering**

Improve export reliability, media handling or reproducible validation

[Engine notes](https://github.com/nexu-io/openmotion/blob/main/docs/hyperframes.md) · [Export verifier](https://github.com/nexu-io/openmotion/blob/main/scripts/verify-export.ts)

**Social publishing**

Help design the Coming connector layer: account access, release review, scheduling and version mapping

[Publishing direction](https://github.com/nexu-io/openmotion/blob/main/docs/product/studio-vision.md) · [Discuss a proposal](https://github.com/nexu-io/openmotion/issues)

Start with the [local setup](#quick-start), choose one layer, and follow [CONTRIBUTING.md](https://github.com/nexu-io/openmotion/blob/main/CONTRIBUTING.md) and [AGENTS.md](https://github.com/nexu-io/openmotion/blob/main/AGENTS.md). Keep user projects and credentials outside the checkout and preserve dependency pins and upstream licenses.

[Product architecture](https://github.com/nexu-io/openmotion/blob/main/docs/product/architecture.md) · [Studio development](https://github.com/nexu-io/openmotion/blob/main/studio/README.md) · [Model Gateway](https://github.com/nexu-io/openmotion/blob/main/docs/model-gateway.md) · [Contribution guide](https://github.com/nexu-io/openmotion/blob/main/CONTRIBUTING.md)

### Platform versions and publishing

[](#platform-versions-and-publishing)

Make a separate composition for each aspect ratio, review the cut in Studio and export an MP4 for manual upload.

Version to request

What to adapt

**Portrait short** — for destinations such as Reels, Shorts, TikTok or Xiaohongshu

Hook, large readable type, framing and the placement of captions

**Landscape film** — for a product page, launch or YouTube video

UI detail, wider compositions and time to explain

**Square feed cut** — for a social campaign

A compact composition, headline and clear closing message

Channel connections, scheduled publishing and performance feedback are planned.

#### Studio roadmap and collaboration concept

[](#studio-roadmap-and-collaboration-concept)

Area

Available today

Direction

**Recreate and edit**

Agent-led reference reconstruction, template adaptation, editable projects and MP4 export

More evaluated recreation cases and repeatable comparisons

**Brand and knowledge**

Motion.md with its Brand Kit section, Skills and source packages

Personal/team memory, RAG and evaluated Skill improvements

**People and agents**

Handoffs on the same local project

Timeline comments, shared review and collaborative editing

**Multimodal creation**

Built-in image, video, music and TTS integrations; generation, candidate selection and timeline adoption

Integrated search across footage, images, voices, music and Avatar services

**Publish to every platform — Coming**

Authored aspect-ratio variants and MP4 handoff

Platform connectors, release review, scheduling, automatic reframing and social presets

**Feedback**

Human review and saved project versions

Version-linked performance data and recurring production tasks

[![Generated concept for people and agents reviewing a shared timeline; the collaboration experience is planned.](https://camo.githubusercontent.com/4c080ce7d0ad0ec95c4a031f16f58a14f1959abf4af0e846bd370a45f5fe6654/68747470733a2f2f72656c65617365732e6f70656e2d64657369676e2e61692f6f70656e2d6d6f74696f6e2f6d656469612f7368613235362f613565666135626535313933366633336563633765663432343163653236303265626634653765666363386365333065306461633561386264326233343935372e706e67)](https://camo.githubusercontent.com/4c080ce7d0ad0ec95c4a031f16f58a14f1959abf4af0e846bd370a45f5fe6654/68747470733a2f2f72656c65617365732e6f70656e2d64657369676e2e61692f6f70656e2d6d6f74696f6e2f6d656469612f7368613235362f613565666135626535313933366633336563633765663432343163653236303265626634653765666363386365333065306461633561386264326233343935372e706e67)

_Concept preview of planned collaboration. No release date announced._ [Studio vision](https://github.com/nexu-io/openmotion/blob/main/docs/product/studio-vision.md) · [Knowledge and feedback](https://github.com/nexu-io/openmotion/blob/main/docs/product/studio-vision.md#knowledge-and-feedback)

## 🤝 Share the video. Share how you made it.

Share a remake, a reusable template or a Motion.md that captures the rhythm of a film. Include the reference and your editable project so another creator can try the same cut with their own footage.

Contribution

What to include

**A recreation**

Reference and creator, your brief, editable project, preview, comparison and remaining differences

**A template or component**

Working source, editable choices, assets, preview and attribution

**A Skill or design system**

The method, keep/change rules and an example of what you actually ran

**Brand Kit content for Motion.md**

Identity, accurate product facts and approved assets within the creative specification

**Agent support or editor improvements**

A focused change with reproducible validation

[Library entry checklist](https://github.com/nexu-io/openmotion/blob/main/library/ENTRY_TEMPLATE.md) · [Contribute](https://github.com/nexu-io/openmotion/blob/main/CONTRIBUTING.md) · [Report an issue](https://github.com/nexu-io/openmotion/issues) · [Contributors](https://github.com/nexu-io/openmotion/graphs/contributors) · [Media kit](https://github.com/nexu-io/openmotion/blob/main/docs/media-kit.md)

This repository was renamed from `nexu-io/html-anything` to [`nexu-io/openmotion`](https://github.com/nexu-io/openmotion).

[OpenMotion website](https://open-design.ai/motion/) · [OpenDesign Go](https://go.open-design.ai/?utm_source=github&utm_medium=referral&utm_campaign=openmotion&utm_content=readme_en) · [Discord](https://discord.com/invite/M7NnHS9gNa) · [Feishu](https://applink.feishu.cn/client/chat/chatter/add_by_link?link_token=b6cs46dc-acb2-48ed-941d-c45642ead841) · [X @OpenDesignDevs](https://x.com/OpenDesignDevs) · [X @OpenDesignHQ](https://x.com/OpenDesignHQ) · [YouTube](https://www.youtube.com/channel/UChtshixMhvtgBWzoD9R_Qfg)

[**Star OpenMotion on GitHub**](https://github.com/nexu-io/openmotion)

[![Stay tuned with us · Star OpenMotion](https://camo.githubusercontent.com/de2e2f9ca2ef6cf9b2cd96bea4da8af1666cc5067cee21a0a19eaa42836492c0/68747470733a2f2f72656c65617365732e6f70656e2d64657369676e2e61692f6f70656e2d6d6f74696f6e2f6d656469612f7368613235362f656233326236636434373336636262663432613533376166323465643161623837343531393265666364376633663639666664356632643536396665313630372e676966)](https://github.com/nexu-io/openmotion)

### Acknowledgements

[](#acknowledgements)

The template previews come from the current online catalog. Detail pages identify the reference brand; [preview sources and hashes](https://github.com/nexu-io/openmotion/blob/main/docs/readme/live-templates/manifest.json) record the assets used here. [Agent and model marks](https://github.com/nexu-io/openmotion/blob/main/docs/readme/models/README.md)

OpenMotion is licensed under [Apache-2.0](https://github.com/nexu-io/openmotion/blob/main/LICENSE). Third-party code, templates, media and fonts retain their own licenses and attribution.

Source

Connection

[OpenDesign](https://github.com/nexu-io/open-design)

Develops OpenMotion and provides its UI foundations, resource structure and brand direction. [Design system](https://github.com/nexu-io/openmotion/blob/main/docs/design-system.md) and [Motion showcase](https://open-design.ai/motion/)

[Hyperframes](https://github.com/heygen-com/hyperframes)

HTML-to-video composition, Studio and rendering foundations, pinned to 0.9.7; creator references, external adaptation demonstrations and component source; [engine notes](https://github.com/nexu-io/openmotion/blob/main/docs/hyperframes.md), [template notices](https://github.com/nexu-io/openmotion/blob/main/template-library/NOTICE.md) and [catalog provenance](https://github.com/nexu-io/openmotion/blob/main/docs/template-catalog.md)

[MotionGit](https://motiongit.com/) / adunext

Kinetic Tech source packaged as Presenter Tech; [license and attribution](https://github.com/nexu-io/openmotion/blob/main/library/templates/presenter-tech/NOTICE.md)

[Hypit](https://github.com/hypit-ai/hypit)

Inspiration for agent-led viral-video cloning and editable variants; no runtime imported here

[rea-video](https://github.com/JuneYaooo/rea-video)

Reference analysis and case studies for [live-action unboxing](https://github.com/JuneYaooo/rea-video/blob/main/docs/cases/unboxing/report_en.md) and [characters, code and screen footage](https://github.com/JuneYaooo/rea-video/blob/main/docs/cases/dual_role/report_en.md); [showcase attribution](https://github.com/nexu-io/openmotion/blob/main/docs/readme/brand-showcase/README.md), no runtime imported here

[OpenAI · Codex Originals](https://openai.com/codex-originals/)

External brand-film inspiration; official campaign still and outbound viewing link

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) / [Super-agent prototype](https://github.com/deepseek-ai/dsh-superagent-prototype)

Agent extensibility and continuing-task inspiration; the prototype is separate from OpenMotion's current runtime

Claude Motion / CapCut / [ChatCut](https://chatcut.io/docs/what-is-chatcut) / [OpenChatCut](https://github.com/0xsline/OpenChatCut)

Product references for agent-led creation, approachable AI editing and continued revision

[OpusClip](https://www.opus.pro/calendar)

Product reference for distribution and [external scheduling](https://www.opus.pro/tools/instagram-reels-scheduler); no built-in connector

[GSAP](https://github.com/greensock/GSAP) / [FFmpeg](https://ffmpeg.org/)

Animation and media dependencies with versions retained in [package.json](https://github.com/nexu-io/openmotion/blob/main/package.json) and the [runtime lock](https://github.com/nexu-io/openmotion/blob/main/scripts/runtime-lock.json)

[Asset sources](https://github.com/nexu-io/openmotion/blob/main/docs/readme/ASSETS.md) · [Skills page covers](https://github.com/nexu-io/openmotion/blob/main/docs/readme/ASSETS.md#skills-page-covers) · [Additional showcase sources](https://github.com/nexu-io/openmotion/blob/main/docs/readme/brand-showcase/README.md) · [Font notices](https://github.com/nexu-io/openmotion/blob/main/web/design-system/fonts/NOTICES.txt) · [Studio license](https://github.com/nexu-io/openmotion/blob/main/studio/LICENSE)

The former HTML Anything application is preserved on the [`legacy` branch](https://github.com/nexu-io/openmotion/tree/legacy). See the [repository migration guide](https://github.com/nexu-io/openmotion/blob/main/docs/repository-migration.md) for the active branch and distribution boundaries.

## Star History

[](#star-history)

 [![OpenMotion’s GitHub star history, updated daily](https://github.com/nexu-io/openmotion/raw/main/docs/readme/star-history.svg)](https://www.star-history.com/?repos=nexu-io%2Fopenmotion&type=date)

[Offline snapshot](https://github.com/nexu-io/openmotion/blob/main/docs/readme/star-history.svg)