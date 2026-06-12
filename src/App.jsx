import { useState, useEffect } from "react";
import mammoth from "mammoth";
import {
  BookOpen, Users, ScrollText, GitBranch, Sparkles, FileText,
  Library, Plus, Trash2, Loader2, AlertTriangle, Feather, ChevronRight,
  Upload, FolderPlus, ChevronDown, Gem, Download,
} from "lucide-react";

// —— 宣纸 / 墨 / 青竹,朱红只作警示 ——
const C = {
  paper: "#F2EEE6", panel: "#FBF9F4", ink: "#21201C", faint: "#6B665C",
  bamboo: "#5E7A6B", bambooLt: "#DCE5DE", cinnabar: "#B5524A", rule: "#E0DACE",
};
const KEY = "wzj_v0_studio";
const OLD = "wzj_v0_project";
const GENRES = ["仙侠", "玄幻", "武侠", "古言", "现言", "悬疑", "历史", "科幻", "都市异能", "耽美"];
const uid = () => Math.random().toString(36).slice(2, 9);

function makeProject(name, genre) {
  return {
    id: uid(), name: name || "新项目", genre: genre || "", register: "网文",
    characters: [], lore: [], artifacts: [], worldRules: [], timeline: [],
    outline: "", beats: [], chapters: [], foreshadow: [], corpus: [],
  };
}

async function callClaude(system, userText) {
  const res = await fetch("/api/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 2000, system, messages: [{ role: "user", content: userText }] }),
  });
  const data = await res.json();
  if (!data.content) throw new Error(data?.error?.message || "接口未返回内容");
  return data.content.map((b) => (b.type === "text" ? b.text : "")).filter(Boolean).join("\n");
}
async function callJSON(system, userText) {
  const out = await callClaude(system, userText);
  return JSON.parse(out.replace(/```json|```/g, "").trim());
}
async function readFile(file) {
  const n = file.name.toLowerCase();
  if (n.endsWith(".docx")) {
    const buf = await file.arrayBuffer();
    const r = await mammoth.extractRawText({ arrayBuffer: buf });
    return r.value;
  }
  return await file.text();
}

function bibleDigest(d) {
  const chars = d.characters.map((c) => `· ${c.name}|状态:${c.status || "—"}|秘密:${c.secrets || "—"}|关系:${c.relations || "—"}`).join("\n") || "—";
  const lore = d.lore.map((l) => `· ${l.title}:${l.body}`).join("\n") || "—";
  const arts = d.artifacts.map((a) => `· ${a.name}:${a.desc}（${a.rule}）`).join("\n") || "—";
  const rules = d.worldRules.map((r) => `· ${r.rule}`).join("\n") || "—";
  const open = d.foreshadow.filter((f) => f.status !== "已回收").map((f) => `· (埋第${f.plantedCh || "?"}章) ${f.content}`).join("\n") || "—";
  const tl = d.timeline.map((t) => `· ${t.when}:${t.event}`).join("\n") || "—";
  return `【类型】${d.genre || "未定"}\n【人物】\n${chars}\n【世界观】\n${lore}\n【法器】\n${arts}\n【硬规则】\n${rules}\n【未回收伏笔】\n${open}\n【时间线】\n${tl}`;
}

export default function App() {
  const [store, setStore] = useState(null);
  const [tab, setTab] = useState("bible");
  const [picking, setPicking] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(KEY);
        if (r && r.value) { setStore(JSON.parse(r.value)); return; }
      } catch (e) {}
      // 迁移旧的单项目存档
      try {
        const o = await window.storage.get(OLD);
        if (o && o.value) {
          const old = JSON.parse(o.value);
          const p = { ...makeProject(old.meta?.projectName || "《拂竹君子》", "仙侠·耽美"),
            register: old.meta?.register || "网文", characters: old.characters || [], worldRules: old.worldRules || [],
            timeline: old.timeline || [], outline: old.outline || "", beats: old.beats || [], chapters: old.chapters || [],
            foreshadow: old.foreshadow || [], corpus: old.corpus || [] };
          const s = { projects: [p], activeId: p.id };
          setStore(s); window.storage.set(KEY, JSON.stringify(s)).catch(() => {});
          return;
        }
      } catch (e) {}
      const starter = { ...makeProject("《拂竹君子》", "仙侠·耽美"),
        characters: [{ id: uid(), name: "拂竹", status: "", abilities: "", relations: "", secrets: "" },
          { id: uid(), name: "萧无道", status: "", abilities: "", relations: "", secrets: "" }] };
      const s = { projects: [starter], activeId: starter.id };
      setStore(s); window.storage.set(KEY, JSON.stringify(s)).catch(() => {});
    })();
  }, []);

  const persist = (s) => window.storage.set(KEY, JSON.stringify(s)).catch(() => {});
  const setStorePersist = (fn) => setStore((prev) => { const next = typeof fn === "function" ? fn(prev) : fn; persist(next); return next; });
  const data = store ? store.projects.find((p) => p.id === store.activeId) : null;
  const update = (fn) => setStorePersist((s) => ({ ...s, projects: s.projects.map((p) => p.id === s.activeId ? (typeof fn === "function" ? fn(p) : fn) : p) }));

  const createProject = (name, genre) => {
    const p = makeProject(name, genre);
    setStorePersist((s) => ({ projects: [...s.projects, p], activeId: p.id }));
    setNewOpen(false); setTab("bible");
  };
  const deleteProject = (id) => setStorePersist((s) => {
    const projects = s.projects.filter((p) => p.id !== id);
    const safe = projects.length ? projects : [makeProject("新项目", "")];
    return { projects: safe, activeId: safe.some((p) => p.id === s.activeId) ? s.activeId : safe[0].id };
  });

  const exportAll = () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "连载工坊备份_" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + ".json";
    a.click();
    URL.revokeObjectURL(url);
  };
  const importAll = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const obj = JSON.parse(await f.text());
      if (!obj.projects || !obj.activeId) throw new Error("格式不符");
      setStorePersist(obj);
    } catch (err) { alert("导入失败:文件不是有效的备份。"); }
    e.target.value = "";
  };

  if (!store || !data) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: C.paper, color: C.faint }}>
      <Loader2 className="animate-spin" size={20} /><span className="ml-2 text-sm">展卷中…</span>
    </div>
  );

  const nav = [
    { id: "bible", label: "设定库", icon: Users }, { id: "outline", label: "大纲", icon: BookOpen },
    { id: "beats", label: "节拍表", icon: ScrollText }, { id: "chapters", label: "章节 · 过稿", icon: FileText },
    { id: "foreshadow", label: "伏笔", icon: GitBranch }, { id: "corpus", label: "语料库", icon: Library },
  ];

  return (
    <div className="min-h-screen w-full flex" style={{ background: C.paper, color: C.ink, fontFamily: "ui-sans-serif, system-ui" }}>
      <aside className="w-52 shrink-0 flex flex-col border-r" style={{ borderColor: C.rule, background: C.panel }}>
        <div className="px-4 py-4 border-b" style={{ borderColor: C.rule }}>
          <div className="flex items-center gap-2 mb-3" style={{ color: C.bamboo }}>
            <Feather size={16} /><span className="text-xs tracking-widest">连载工坊 v0</span>
          </div>
          {/* 项目切换 */}
          <div className="relative">
            <button onClick={() => setPicking((v) => !v)} className="w-full flex items-center justify-between rounded-md px-3 py-2"
              style={{ border: `1px solid ${C.rule}`, background: "#fff" }}>
              <span className="truncate text-sm" style={{ fontFamily: "ui-serif, Georgia, serif" }}>{data.name}</span>
              <ChevronDown size={14} style={{ color: C.faint }} />
            </button>
            {picking && (
              <div className="absolute z-10 mt-1 w-full rounded-md shadow-lg overflow-hidden" style={{ background: "#fff", border: `1px solid ${C.rule}` }}>
                {store.projects.map((p) => (
                  <div key={p.id} className="flex items-center group">
                    <button onClick={() => { setStorePersist((s) => ({ ...s, activeId: p.id })); setPicking(false); setTab("bible"); }}
                      className="flex-1 text-left px-3 py-2 text-sm truncate" style={{ color: p.id === data.id ? C.bamboo : C.ink, background: p.id === data.id ? C.bambooLt : "transparent" }}>
                      {p.name}<span className="ml-1 text-xs" style={{ color: C.faint }}>{p.genre}</span>
                    </button>
                    {store.projects.length > 1 && (
                      <button onClick={() => deleteProject(p.id)} className="px-2" style={{ color: C.faint }}><Trash2 size={13} /></button>
                    )}
                  </div>
                ))}
                <button onClick={() => { setNewOpen(true); setPicking(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm border-t" style={{ color: C.bamboo, borderColor: C.rule }}>
                  <FolderPlus size={14} />新建项目
                </button>
              </div>
            )}
          </div>
          {data.genre && <div className="mt-2 text-xs" style={{ color: C.faint }}>类型 · {data.genre}</div>}
        </div>

        <nav className="flex-1 py-3">
          {nav.map((n) => {
            const on = tab === n.id;
            return (
              <button key={n.id} onClick={() => setTab(n.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm"
                style={{ color: on ? C.bamboo : C.faint, background: on ? C.bambooLt : "transparent", fontWeight: on ? 600 : 400 }}>
                <n.icon size={16} /> {n.label}
              </button>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t" style={{ borderColor: C.rule }}>
          <div className="text-xs mb-2" style={{ color: C.faint }}>语域</div>
          <div className="flex rounded-md overflow-hidden border" style={{ borderColor: C.rule }}>
            {["网文", "文学"].map((r) => (
              <button key={r} onClick={() => update((p) => ({ ...p, register: r }))} className="flex-1 py-1.5 text-xs"
                style={{ background: data.register === r ? C.bamboo : "transparent", color: data.register === r ? "#fff" : C.faint }}>{r}</button>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3 text-xs">
            <button onClick={exportAll} className="inline-flex items-center gap-1" style={{ color: C.bamboo }}><Download size={13} />导出备份</button>
            <label className="inline-flex items-center gap-1 cursor-pointer" style={{ color: C.bamboo }}>
              <Upload size={13} />导入备份<input type="file" accept=".json" onChange={importAll} className="hidden" />
            </label>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto" style={{ maxHeight: "100vh" }}>
        <div className="max-w-3xl mx-auto px-8 py-8">
          {tab === "bible" && <Bible data={data} update={update} />}
          {tab === "outline" && <Outline data={data} update={update} />}
          {tab === "beats" && <Beats data={data} update={update} />}
          {tab === "chapters" && <Chapters data={data} update={update} />}
          {tab === "foreshadow" && <Foreshadow data={data} update={update} />}
          {tab === "corpus" && <Corpus data={data} update={update} />}
        </div>
      </main>

      {newOpen && <NewProject onCreate={createProject} onClose={() => setNewOpen(false)} />}
    </div>
  );
}

/* —— 通用件 —— */
function H({ title, sub }) {
  return <div className="mb-6"><h2 className="text-2xl" style={{ fontFamily: "ui-serif, Georgia, serif", color: C.ink }}>{title}</h2>{sub && <p className="text-sm mt-1" style={{ color: C.faint }}>{sub}</p>}</div>;
}
function Card({ children }) { return <div className="rounded-lg border p-4 mb-3" style={{ borderColor: C.rule, background: C.panel }}>{children}</div>; }
function Btn({ children, onClick, busy, primary, danger }) {
  return <button onClick={onClick} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm disabled:opacity-50"
    style={{ background: primary ? C.bamboo : "transparent", color: primary ? "#fff" : danger ? C.cinnabar : C.bamboo, border: primary ? "none" : `1px solid ${danger ? C.cinnabar : C.rule}` }}>
    {busy ? <Loader2 size={14} className="animate-spin" /> : null}{children}</button>;
}
function Lab({ children }) { return <label className="block text-xs mb-1" style={{ color: C.faint }}>{children}</label>; }
const inputStyle = { background: "#fff", border: `1px solid ${C.rule}`, color: C.ink };
function TA({ value, onChange, rows = 2, placeholder }) {
  return <textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder} className="w-full rounded-md px-3 py-2 text-sm outline-none resize-y" style={inputStyle} />;
}
function Empty({ text }) { return <div className="text-sm rounded-lg border border-dashed p-6 text-center" style={{ borderColor: C.rule, color: C.faint }}>{text}</div>; }
function Stage({ title, items, children, onAddAll, onClear }) {
  if (!items.length) return null;
  return (<Card><div className="flex items-center justify-between mb-3"><div className="text-xs" style={{ color: C.bamboo }}>{title} · 自行取舍</div>
    <div className="flex gap-2"><Btn primary onClick={onAddAll}>全部入库</Btn><Btn onClick={onClear}>放弃</Btn></div></div>
    <div className="space-y-2">{children}</div></Card>);
}

/* —— 素材导入(文件/粘贴) —— */
function Importer({ label, onStructured, onRaw, busy }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [fname, setFname] = useState("");
  const [err, setErr] = useState("");
  const pick = async (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    setFname(f.name); setErr("");
    try { const t = await readFile(f); setText((p) => (p ? p + "\n\n" : "") + t); }
    catch { setErr("这个文件没读出来,直接把内容粘进下面的框。"); }
  };
  if (!open) return <Btn onClick={() => setOpen(true)}><Upload size={14} />{label}</Btn>;
  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs" style={{ color: C.bamboo }}>导入素材(支持 .txt / .md / .docx,或直接粘贴)</div>
        <button onClick={() => setOpen(false)} className="text-xs" style={{ color: C.faint }}>收起</button>
      </div>
      <label className="inline-flex items-center gap-1.5 text-sm cursor-pointer mb-2" style={{ color: C.bamboo }}>
        <Upload size={14} />选择文件<input type="file" accept=".txt,.md,.docx" onChange={pick} className="hidden" />
      </label>
      {fname && <span className="ml-2 text-xs" style={{ color: C.faint }}>{fname}</span>}
      <TA value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="把素材粘到这里…" />
      {err && <p className="mt-2 text-sm" style={{ color: C.cinnabar }}>{err}</p>}
      <div className="mt-2 flex gap-2">
        <Btn primary busy={busy} onClick={() => onStructured(text, () => { setText(""); setFname(""); })}><Sparkles size={14} />AI 整理入库</Btn>
        {onRaw && <Btn onClick={() => onRaw(text, () => { setText(""); setFname(""); })}>原样存入</Btn>}
      </div>
    </Card>
  );
}

/* —— 新建项目 —— */
function NewProject({ onCreate, onClose }) {
  const [name, setName] = useState("");
  const [genre, setGenre] = useState("");
  return (
    <div className="fixed inset-0 flex items-center justify-center z-20" style={{ background: "rgba(33,32,28,0.35)" }} onClick={onClose}>
      <div className="rounded-xl p-6 w-96" style={{ background: C.panel }} onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl mb-4" style={{ fontFamily: "ui-serif, Georgia, serif" }}>新建项目</h3>
        <Lab>项目名</Lab>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="如:《某某传》" className="w-full rounded-md px-3 py-2 text-sm outline-none mb-4" style={inputStyle} />
        <Lab>书籍类型(决定设定库 / 语料库的起草口径)</Lab>
        <div className="flex flex-wrap gap-2 mb-2">
          {GENRES.map((g) => (
            <button key={g} onClick={() => setGenre((cur) => cur.includes(g) ? cur : (cur ? cur + "·" + g : g))} className="text-xs px-2.5 py-1 rounded-full"
              style={{ background: genre.includes(g) ? C.bamboo : "transparent", color: genre.includes(g) ? "#fff" : C.faint, border: `1px solid ${C.rule}` }}>{g}</button>
          ))}
        </div>
        <input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="可叠加或自定义,如 仙侠·耽美" className="w-full rounded-md px-3 py-2 text-sm outline-none mb-5" style={inputStyle} />
        <div className="flex justify-end gap-2">
          <Btn onClick={onClose}>取消</Btn>
          <Btn primary onClick={() => onCreate(name || "新项目", genre)}>创建</Btn>
        </div>
      </div>
    </div>
  );
}

/* —— 设定库 —— */
function Bible({ data, update }) {
  const [sec, setSec] = useState("人物");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [draft, setDraft] = useState({ characters: [], lore: [], artifacts: [], worldRules: [] });
  const secs = ["人物", "世界观", "法器", "硬规则", "时间线"];
  const g = data.genre || "通用";

  const draftSec = async (kind) => {
    setBusy(kind); setErr("");
    try {
      let sys, key;
      if (kind === "人物") { key = "characters"; sys = `据【${g}】类型起草几个人物性格原型(不绑定具体剧情)。JSON 数组,每项 {"name":"代称","status":"定位","abilities":"能力/特长","relations":"关系位置","secrets":"可埋的秘密"}。给 3-4 个。只返回 JSON。`; }
      else if (kind === "世界观") { key = "lore"; sys = `据【${g}】类型起草世界观背景骨架。JSON 数组,每项 {"title":"小标题","body":"2-3 句"}。给 4-6 条:地理/势力/力量体系/历史基调等。只返回 JSON。`; }
      else if (kind === "法器") { key = "artifacts"; sys = `据【${g}】类型起草几件法器/重要器物。JSON 数组,每项 {"name":"名","desc":"一句","rule":"使用代价或限制一句"}。给 4-6 件。只返回 JSON。`; }
      else { key = "worldRules"; sys = `据【${g}】类型起草几条不能违反的硬规则(力量体系/世界律法)。JSON 数组,每项 {"rule":"一句"}。给 5-7 条。只返回 JSON。`; }
      const arr = await callJSON(sys, `类型:${g}。已有设定参考:\n${bibleDigest(data)}`);
      setDraft((d) => ({ ...d, [key]: arr.map((x) => ({ ...x, id: uid() })) }));
    } catch (e) { setErr("起草没成功,再试一次。"); }
    setBusy("");
  };

  const importStructured = async (text, clear) => {
    if (!text.trim()) return;
    setBusy("import"); setErr("");
    try {
      const obj = await callJSON(
        '下面是作者上传的设定素材。抽取整理,返回 JSON 对象 {"characters":[{name,status,abilities,relations,secrets}],"worldRules":[{rule}],"artifacts":[{name,desc,rule}],"lore":[{title,body}]}。没有的类给空数组,每类最多 6 项。只返回 JSON。',
        text.slice(0, 6000)
      );
      setDraft({
        characters: (obj.characters || []).map((x) => ({ ...x, id: uid() })),
        lore: (obj.lore || []).map((x) => ({ ...x, id: uid() })),
        artifacts: (obj.artifacts || []).map((x) => ({ ...x, id: uid() })),
        worldRules: (obj.worldRules || []).map((x) => ({ ...x, id: uid() })),
      });
      clear();
    } catch (e) { setErr("素材没整理成功(模型未返回规整 JSON),再试一次,或减少一次导入量。"); }
    setBusy("");
  };
  const addAll = (key) => { update((p) => ({ ...p, [key]: [...p[key], ...draft[key]] })); setDraft((d) => ({ ...d, [key]: [] })); };

  return (
    <div>
      <H title="设定库" sub={`类型:${g} · 按类型起草,或导入你的素材;过稿时作对账底座`} />
      <div className="flex flex-wrap gap-2 mb-4">
        {secs.map((s) => (<button key={s} onClick={() => setSec(s)} className="text-sm px-3 py-1 rounded-md"
          style={{ background: sec === s ? C.bambooLt : "transparent", color: sec === s ? C.bamboo : C.faint }}>{s}</button>))}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {sec !== "时间线" && <Btn primary busy={busy === sec} onClick={() => draftSec(sec)}><Sparkles size={14} />据「{g}」起草{sec}</Btn>}
        <Importer label="导入素材" busy={busy === "import"} onStructured={importStructured} />
      </div>
      {err && <p className="mb-3 text-sm" style={{ color: C.cinnabar }}>{err}</p>}

      {/* 起草暂存区 */}
      <Stage title={`起草的人物`} items={draft.characters} onAddAll={() => addAll("characters")} onClear={() => setDraft((d) => ({ ...d, characters: [] }))}>
        {draft.characters.map((c) => <div key={c.id} className="text-sm" style={{ color: C.ink }}><b style={{ fontFamily: "ui-serif,serif" }}>{c.name}</b> · {c.status}｜{c.abilities}｜秘密:{c.secrets}</div>)}
      </Stage>
      <Stage title="起草的世界观" items={draft.lore} onAddAll={() => addAll("lore")} onClear={() => setDraft((d) => ({ ...d, lore: [] }))}>
        {draft.lore.map((l) => <div key={l.id} className="text-sm"><b>{l.title}</b>:{l.body}</div>)}
      </Stage>
      <Stage title="起草的法器" items={draft.artifacts} onAddAll={() => addAll("artifacts")} onClear={() => setDraft((d) => ({ ...d, artifacts: [] }))}>
        {draft.artifacts.map((a) => <div key={a.id} className="text-sm"><b>{a.name}</b>:{a.desc}（{a.rule}）</div>)}
      </Stage>
      <Stage title="起草的硬规则" items={draft.worldRules} onAddAll={() => addAll("worldRules")} onClear={() => setDraft((d) => ({ ...d, worldRules: [] }))}>
        {draft.worldRules.map((r) => <div key={r.id} className="text-sm">· {r.rule}</div>)}
      </Stage>

      {sec === "人物" && <CharList data={data} update={update} />}
      {sec === "世界观" && <LoreList data={data} update={update} />}
      {sec === "法器" && <ArtList data={data} update={update} />}
      {sec === "硬规则" && <RuleList data={data} update={update} />}
      {sec === "时间线" && <TimeList data={data} update={update} />}
    </div>
  );
}
function CharList({ data, update }) {
  return (<>
    {data.characters.map((c) => (
      <Card key={c.id}>
        <div className="flex items-center justify-between mb-2">
          <input value={c.name} placeholder="角色名" onChange={(e) => update((p) => ({ ...p, characters: p.characters.map((x) => x.id === c.id ? { ...x, name: e.target.value } : x) }))}
            className="text-lg bg-transparent outline-none" style={{ fontFamily: "ui-serif, Georgia, serif", color: C.ink }} />
          <button onClick={() => update((p) => ({ ...p, characters: p.characters.filter((x) => x.id !== c.id) }))} style={{ color: C.faint }}><Trash2 size={15} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[["status", "定位/状态"], ["abilities", "能力/特长"], ["relations", "关系"], ["secrets", "秘密"]].map(([k, lab]) => (
            <div key={k}><Lab>{lab}</Lab><TA value={c[k] || ""} onChange={(e) => update((p) => ({ ...p, characters: p.characters.map((x) => x.id === c.id ? { ...x, [k]: e.target.value } : x) }))} /></div>
          ))}
        </div>
      </Card>
    ))}
    <Btn onClick={() => update((p) => ({ ...p, characters: [...p.characters, { id: uid(), name: "", status: "", abilities: "", relations: "", secrets: "" }] }))}><Plus size={14} />新增人物</Btn>
  </>);
}
function LoreList({ data, update }) {
  return (<>
    {data.lore.length === 0 && <Empty text="世界观还空着。点上面据类型起草,或导入素材。" />}
    {data.lore.map((l) => (
      <Card key={l.id}>
        <div className="flex gap-2">
          <input value={l.title} placeholder="小标题" onChange={(e) => update((p) => ({ ...p, lore: p.lore.map((x) => x.id === l.id ? { ...x, title: e.target.value } : x) }))}
            className="w-40 bg-transparent outline-none text-sm" style={{ color: C.bamboo, fontWeight: 600 }} />
          <button onClick={() => update((p) => ({ ...p, lore: p.lore.filter((x) => x.id !== l.id) }))} className="ml-auto" style={{ color: C.faint }}><Trash2 size={15} /></button>
        </div>
        <TA value={l.body} onChange={(e) => update((p) => ({ ...p, lore: p.lore.map((x) => x.id === l.id ? { ...x, body: e.target.value } : x) }))} />
      </Card>
    ))}
    <Btn onClick={() => update((p) => ({ ...p, lore: [...p.lore, { id: uid(), title: "", body: "" }] }))}><Plus size={14} />新增条目</Btn>
  </>);
}
function ArtList({ data, update }) {
  const set = (id, k, v) => update((p) => ({ ...p, artifacts: p.artifacts.map((x) => x.id === id ? { ...x, [k]: v } : x) }));
  return (<>
    {data.artifacts.length === 0 && <Empty text="还没有法器/器物。据类型起草,或自己加。" />}
    {data.artifacts.map((a) => (
      <Card key={a.id}>
        <div className="flex items-center gap-2 mb-2">
          <Gem size={15} style={{ color: C.bamboo }} />
          <input value={a.name} placeholder="名称" onChange={(e) => set(a.id, "name", e.target.value)} className="bg-transparent outline-none" style={{ fontFamily: "ui-serif,serif", color: C.ink }} />
          <button onClick={() => update((p) => ({ ...p, artifacts: p.artifacts.filter((x) => x.id !== a.id) }))} className="ml-auto" style={{ color: C.faint }}><Trash2 size={15} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Lab>描述</Lab><TA value={a.desc} onChange={(e) => set(a.id, "desc", e.target.value)} /></div>
          <div><Lab>代价 / 限制</Lab><TA value={a.rule} onChange={(e) => set(a.id, "rule", e.target.value)} /></div>
        </div>
      </Card>
    ))}
    <Btn onClick={() => update((p) => ({ ...p, artifacts: [...p.artifacts, { id: uid(), name: "", desc: "", rule: "" }] }))}><Plus size={14} />新增法器</Btn>
  </>);
}
function RuleList({ data, update }) {
  return (<>
    {data.worldRules.length === 0 && <Empty text="把不能违反的硬规则写进来,过稿时会逐条对账。" />}
    {data.worldRules.map((r) => (
      <div key={r.id} className="flex gap-2 mb-2">
        <TA value={r.rule} onChange={(e) => update((p) => ({ ...p, worldRules: p.worldRules.map((x) => x.id === r.id ? { ...x, rule: e.target.value } : x) }))} placeholder="一条硬规则" />
        <button onClick={() => update((p) => ({ ...p, worldRules: p.worldRules.filter((x) => x.id !== r.id) }))} style={{ color: C.faint }}><Trash2 size={15} /></button>
      </div>
    ))}
    <Btn onClick={() => update((p) => ({ ...p, worldRules: [...p.worldRules, { id: uid(), rule: "" }] }))}><Plus size={14} />新增规则</Btn>
  </>);
}
function TimeList({ data, update }) {
  return (<>
    {data.timeline.length === 0 && <Empty text="按时序记关键事件,尤其跨弧的。" />}
    {data.timeline.map((t) => (
      <div key={t.id} className="flex gap-2 mb-2 items-start">
        <input value={t.when} placeholder="时点" onChange={(e) => update((p) => ({ ...p, timeline: p.timeline.map((x) => x.id === t.id ? { ...x, when: e.target.value } : x) }))} className="w-24 rounded-md px-2 py-2 text-sm outline-none" style={inputStyle} />
        <TA value={t.event} onChange={(e) => update((p) => ({ ...p, timeline: p.timeline.map((x) => x.id === t.id ? { ...x, event: e.target.value } : x) }))} placeholder="事件" />
        <button onClick={() => update((p) => ({ ...p, timeline: p.timeline.filter((x) => x.id !== t.id) }))} style={{ color: C.faint }}><Trash2 size={15} /></button>
      </div>
    ))}
    <Btn onClick={() => update((p) => ({ ...p, timeline: [...p.timeline, { id: uid(), when: "", event: "" }] }))}><Plus size={14} />新增事件</Btn>
  </>);
}

/* —— 大纲 —— */
function Outline({ data, update }) {
  const [busy, setBusy] = useState(false); const [sug, setSug] = useState(""); const [err, setErr] = useState("");
  const run = async () => {
    setBusy(true); setErr(""); setSug("");
    try {
      const out = await callClaude(
        `你是【${data.genre || "通用"}】连载小说的大纲编辑。基于设定与现有大纲,提出接下来的走向:3-5 个节点,每个一句话,标注它服务的主线或伏笔。不写客套话。`,
        `${bibleDigest(data)}\n\n【现有大纲】\n${data.outline || "（暂无,请据设定起一个开篇走向）"}`);
      setSug(out);
    } catch (e) { setErr("接口没接通:" + e.message); }
    setBusy(false);
  };
  return (
    <div>
      <H title="大纲" sub="宏观走向。卡住时让它据设定续几个节点。" />
      <TA value={data.outline} onChange={(e) => update((p) => ({ ...p, outline: e.target.value }))} rows={12} placeholder="在这里写宏观大纲…" />
      <div className="mt-3"><Btn primary onClick={run} busy={busy}><Sparkles size={14} />续写大纲</Btn></div>
      {err && <p className="mt-3 text-sm" style={{ color: C.cinnabar }}>{err}</p>}
      {sug && <Card><div className="text-xs mb-2" style={{ color: C.bamboo }}>建议走向(可粘进上方)</div><pre className="whitespace-pre-wrap text-sm leading-relaxed" style={{ fontFamily: "inherit", color: C.ink }}>{sug}</pre></Card>}
    </div>
  );
}

/* —— 节拍表 —— */
function Beats({ data, update }) {
  const [arc, setArc] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const run = async () => {
    if (!arc.trim()) return; setBusy(true); setErr("");
    try {
      const out = await callClaude(
        `你是【${data.genre || "通用"}】连载小说的节拍编辑。把给定的这一弧拆成节拍:6-10 个,每个一句话,点明情绪转折或信息释放。简洁,不客套。`,
        `${bibleDigest(data)}\n\n【本弧】${arc}`);
      const items = out.split("\n").map((s) => s.replace(/^[\d\.\-、·\s]+/, "").trim()).filter(Boolean);
      update((p) => ({ ...p, beats: [...p.beats, ...items.map((b) => ({ id: uid(), arc, beat: b }))] }));
      setArc("");
    } catch (e) { setErr("接口没接通:" + e.message); }
    setBusy(false);
  };
  const arcs = [...new Set(data.beats.map((b) => b.arc))];
  return (
    <div>
      <H title="节拍表" sub="把一条弧拆成可写的节拍。" />
      <div className="flex gap-2 mb-5">
        <input value={arc} onChange={(e) => setArc(e.target.value)} placeholder="这一弧讲什么" className="flex-1 rounded-md px-3 py-2 text-sm outline-none" style={inputStyle} />
        <Btn primary onClick={run} busy={busy}><Sparkles size={14} />生成节拍</Btn>
      </div>
      {err && <p className="mb-3 text-sm" style={{ color: C.cinnabar }}>{err}</p>}
      {arcs.length === 0 && <Empty text="输入一条弧,生成的节拍会按弧归档。" />}
      {arcs.map((a) => (
        <div key={a} className="mb-5">
          <div className="text-sm mb-2" style={{ color: C.bamboo, fontWeight: 600 }}>{a}</div>
          {data.beats.filter((b) => b.arc === a).map((b, i) => (
            <div key={b.id} className="flex gap-3 items-start py-1.5 border-b" style={{ borderColor: C.rule }}>
              <span className="text-xs mt-0.5" style={{ color: C.faint }}>{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1 text-sm">{b.beat}</span>
              <button onClick={() => update((p) => ({ ...p, beats: p.beats.filter((x) => x.id !== b.id) }))} style={{ color: C.faint }}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* —— 章节 · 过稿 —— */
function Chapters({ data, update }) {
  const [sel, setSel] = useState(null);
  const ch = data.chapters.find((c) => c.id === sel);
  const add = () => { const id = uid(); update((p) => ({ ...p, chapters: [...p.chapters, { id, no: String(p.chapters.length + 1), title: "", outline: "", text: "", review: "" }] })); setSel(id); };
  if (ch) return <ChapterEditor ch={ch} data={data} update={update} back={() => setSel(null)} />;
  return (
    <div>
      <H title="章节 · 过稿" sub="每章存细纲/节拍与正文,据设定库过稿。" />
      {data.chapters.length === 0 && <Empty text="新建一章,把正文贴进去过稿。" />}
      {data.chapters.map((c) => (
        <button key={c.id} onClick={() => setSel(c.id)} className="w-full text-left">
          <Card><div className="flex items-center justify-between">
            <div><span className="text-sm" style={{ color: C.bamboo }}>第 {c.no} 章</span><span className="ml-2" style={{ fontFamily: "ui-serif, Georgia, serif" }}>{c.title || "未命名"}</span></div>
            <div className="flex items-center gap-3 text-xs" style={{ color: C.faint }}>{c.review && <span style={{ color: C.bamboo }}>已过稿</span>}<span>{(c.text || "").length} 字</span><ChevronRight size={16} /></div>
          </div></Card>
        </button>
      ))}
      <Btn onClick={add}><Plus size={14} />新建章节</Btn>
    </div>
  );
}
function ChapterEditor({ ch, data, update, back }) {
  const [busy, setBusy] = useState(""); const [err, setErr] = useState("");
  const set = (k, v) => update((p) => ({ ...p, chapters: p.chapters.map((x) => x.id === ch.id ? { ...x, [k]: v } : x) }));
  const review = async () => {
    if (!ch.text.trim()) { setErr("先把正文贴进来再过稿。"); return; }
    setBusy("review"); setErr("");
    try {
      const sys = data.register === "网文"
        ? `你是【${data.genre || "通用"}】连载网文的章节级编辑。看重节奏、钩子、爽点落点、对话张力,允许直给。只挑真问题,不夸、不客套。严格三段:【节奏与语域】【连续性对账】(对照设定逐项查人物状态/世界硬规则/法器代价/未回收伏笔/时间线的冲突,无则写"无冲突")【字句】(2-4 处最值得改的,给位置与改法)。简洁。`
        : `你是【${data.genre || "通用"}】文学向连载小说的章节级编辑。看重呼吸感、留白、意象、不答之答,警惕过度解释。只挑真问题,不夸、不客套。严格三段:【呼吸感与语域】【连续性对账】(对照设定查冲突,无则写"无冲突")【字句】(2-4 处,给位置与改法)。简洁。`;
      const out = await callClaude(sys, `${bibleDigest(data)}\n\n【第${ch.no}章 正文】\n${ch.text}`);
      set("review", out);
    } catch (e) { setErr("接口没接通:" + e.message); }
    setBusy("");
  };
  const extract = async () => {
    if (!ch.text.trim()) { setErr("先贴正文。"); return; }
    setBusy("extract"); setErr("");
    try {
      const arr = await callJSON('从这一章抽取作者埋下的伏笔/未回收线索。只返回 JSON 数组,每项 {"content":"一句话概括"}。没有就 []。', `第${ch.no}章:\n${ch.text}`);
      update((p) => ({ ...p, foreshadow: [...p.foreshadow, ...arr.map((a) => ({ id: uid(), content: a.content, plantedCh: ch.no, status: "未回收", payoffCh: "" }))] }));
      setErr(arr.length ? "" : "这一章没抽到明显伏笔。");
    } catch (e) { setErr("抽取没成功,再试一次。"); }
    setBusy("");
  };
  return (
    <div>
      <button onClick={back} className="text-sm mb-4 inline-flex items-center" style={{ color: C.bamboo }}>← 返回章节列</button>
      <div className="flex gap-3 mb-4">
        <input value={ch.no} onChange={(e) => set("no", e.target.value)} className="w-20 rounded-md px-3 py-2 text-sm outline-none" style={inputStyle} />
        <input value={ch.title} onChange={(e) => set("title", e.target.value)} placeholder="本章标题" className="flex-1 rounded-md px-3 py-2 outline-none" style={{ ...inputStyle, fontFamily: "ui-serif, Georgia, serif" }} />
      </div>
      <Lab>细纲 / 节拍设置</Lab>
      <TA value={ch.outline} onChange={(e) => set("outline", e.target.value)} rows={3} placeholder="本章要落的节拍、信息释放、情绪转折…" />
      <div className="mt-4"><Lab>正文</Lab><TA value={ch.text} onChange={(e) => set("text", e.target.value)} rows={14} placeholder="把这一章贴进来…" /></div>
      <div className="mt-3 flex gap-2">
        <Btn primary onClick={review} busy={busy === "review"}><Sparkles size={14} />过稿(语域:{data.register})</Btn>
        <Btn onClick={extract} busy={busy === "extract"}><GitBranch size={14} />提取伏笔入库</Btn>
      </div>
      {err && <p className="mt-3 text-sm" style={{ color: C.cinnabar }}>{err}</p>}
      {ch.review && <Card><div className="text-xs mb-2" style={{ color: C.bamboo }}>过稿意见 · {data.register}</div><pre className="whitespace-pre-wrap text-sm leading-relaxed" style={{ fontFamily: "inherit", color: C.ink }}>{ch.review}</pre></Card>}
    </div>
  );
}

/* —— 伏笔 —— */
function Foreshadow({ data, update }) {
  const set = (id, k, v) => update((p) => ({ ...p, foreshadow: p.foreshadow.map((x) => x.id === id ? { ...x, [k]: v } : x) }));
  const open = data.foreshadow.filter((f) => f.status !== "已回收");
  return (
    <div>
      <H title="伏笔" sub="埋设与回收台账。未回收标朱。" />
      {open.length > 0 && <div className="flex items-center gap-2 mb-4 text-sm rounded-md px-3 py-2" style={{ background: "#F6E9E7", color: C.cinnabar }}><AlertTriangle size={15} /> 还有 {open.length} 条伏笔未回收</div>}
      {data.foreshadow.length === 0 && <Empty text="手动新增,或在某一章点「提取伏笔入库」。" />}
      {data.foreshadow.map((f) => (
        <Card key={f.id}>
          <div className="flex gap-2 items-start">
            <span className="text-xs mt-2 shrink-0" style={{ color: f.status === "已回收" ? C.bamboo : C.cinnabar }}>{f.status === "已回收" ? "已回收" : "未回收"}</span>
            <TA value={f.content} onChange={(e) => set(f.id, "content", e.target.value)} placeholder="伏笔内容" />
            <button onClick={() => update((p) => ({ ...p, foreshadow: p.foreshadow.filter((x) => x.id !== f.id) }))} style={{ color: C.faint }}><Trash2 size={15} /></button>
          </div>
          <div className="flex gap-3 mt-2 items-center text-xs" style={{ color: C.faint }}>
            <span>埋设</span><input value={f.plantedCh} onChange={(e) => set(f.id, "plantedCh", e.target.value)} className="w-14 rounded px-2 py-1 outline-none" style={inputStyle} />
            <span>回收</span><input value={f.payoffCh} onChange={(e) => set(f.id, "payoffCh", e.target.value)} placeholder="章" className="w-14 rounded px-2 py-1 outline-none" style={inputStyle} />
            <button onClick={() => set(f.id, "status", f.status === "已回收" ? "未回收" : "已回收")} className="ml-auto rounded px-2 py-1" style={{ border: `1px solid ${C.rule}`, color: C.bamboo }}>{f.status === "已回收" ? "标为未回收" : "标为已回收"}</button>
          </div>
        </Card>
      ))}
      <Btn onClick={() => update((p) => ({ ...p, foreshadow: [...p.foreshadow, { id: uid(), content: "", plantedCh: "", status: "未回收", payoffCh: "" }] }))}><Plus size={14} />新增伏笔</Btn>
    </div>
  );
}

/* —— 语料库 —— */
function Corpus({ data, update }) {
  const [reg, setReg] = useState("全部");
  const [kind, setKind] = useState("人物");
  const [kw, setKw] = useState("");
  const [busy, setBusy] = useState(""); const [err, setErr] = useState("");
  const [draft, setDraft] = useState([]);
  const set = (id, k, v) => update((p) => ({ ...p, corpus: p.corpus.map((x) => x.id === id ? { ...x, [k]: v } : x) }));
  const list = data.corpus.filter((c) => reg === "全部" || c.register === reg);
  const g = data.genre || "通用";

  const gen = async () => {
    setBusy("gen"); setErr("");
    try {
      const arr = await callJSON(
        `据【${g}】生成${kind}描写语料${kw ? ",围绕「" + kw + "」" : ""}。JSON 数组,每项 {"tag":"短标签","snippet":"一段可直接借用的描写,2-4 句"}。给 4-6 条,文学性强、避免套话。只返回 JSON。`,
        `类型:${g};类别:${kind};关键词:${kw || "无"}`);
      setDraft(arr.map((x) => ({ ...x, id: uid(), register: data.register })));
    } catch (e) { setErr("生成没成功,再试一次。"); }
    setBusy("");
  };
  const importStructured = async (text, clear) => {
    if (!text.trim()) return; setBusy("import"); setErr("");
    try {
      const arr = await callJSON('下面是作者上传的描写素材。切成可复用片段,返回 JSON 数组,每项 {"tag":"短标签","snippet":"片段"}。最多 8 条。只返回 JSON。', text.slice(0, 6000));
      setDraft(arr.map((x) => ({ ...x, id: uid(), register: data.register }))); clear();
    } catch (e) { setErr("素材没整理成功,再试一次。"); }
    setBusy("");
  };
  const importRaw = (text, clear) => {
    if (!text.trim()) return;
    update((p) => ({ ...p, corpus: [...p.corpus, { id: uid(), register: data.register, tag: "导入", snippet: text.trim() }] })); clear();
  };
  const addAll = () => { update((p) => ({ ...p, corpus: [...p.corpus, ...draft] })); setDraft([]); };

  return (
    <div>
      <H title="语料库" sub={`类型:${g} · 生成人物/环境描写,或导入你的素材`} />
      <div className="flex flex-wrap gap-2 items-center mb-3">
        <div className="flex rounded-md overflow-hidden border" style={{ borderColor: C.rule }}>
          {["人物", "环境"].map((k) => (<button key={k} onClick={() => setKind(k)} className="px-3 py-1.5 text-sm" style={{ background: kind === k ? C.bamboo : "transparent", color: kind === k ? "#fff" : C.faint }}>{k}描写</button>))}
        </div>
        <input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="关键词/情境(可选,如:雪夜竹林)" className="flex-1 min-w-40 rounded-md px-3 py-2 text-sm outline-none" style={inputStyle} />
        <Btn primary busy={busy === "gen"} onClick={gen}><Sparkles size={14} />生成描写</Btn>
      </div>
      <div className="mb-4"><Importer label="导入素材" busy={busy === "import"} onStructured={importStructured} onRaw={importRaw} /></div>
      {err && <p className="mb-3 text-sm" style={{ color: C.cinnabar }}>{err}</p>}

      <Stage title="生成的描写" items={draft} onAddAll={addAll} onClear={() => setDraft([])}>
        {draft.map((d) => (<div key={d.id} className="text-sm"><span className="text-xs px-2 py-0.5 rounded-full mr-2" style={{ background: C.bambooLt, color: C.bamboo }}>{d.tag}</span>{d.snippet}</div>))}
      </Stage>

      <div className="flex gap-2 my-4">
        {["全部", "网文", "文学"].map((r) => (<button key={r} onClick={() => setReg(r)} className="text-sm px-3 py-1 rounded-md" style={{ background: reg === r ? C.bambooLt : "transparent", color: reg === r ? C.bamboo : C.faint }}>{r}</button>))}
      </div>
      {list.length === 0 && <Empty text="还没有语料。生成或导入,会按语域收在这里。" />}
      {list.map((c) => (
        <Card key={c.id}>
          <div className="flex gap-2 items-start">
            <select value={c.register} onChange={(e) => set(c.id, "register", e.target.value)} className="text-xs rounded px-2 py-2 outline-none shrink-0" style={inputStyle}><option>网文</option><option>文学</option></select>
            <input value={c.tag} onChange={(e) => set(c.id, "tag", e.target.value)} placeholder="标签" className="w-32 rounded px-2 py-2 text-sm outline-none shrink-0" style={inputStyle} />
            <TA value={c.snippet} onChange={(e) => set(c.id, "snippet", e.target.value)} placeholder="意象 / 句式 / 描写" />
            <button onClick={() => update((p) => ({ ...p, corpus: p.corpus.filter((x) => x.id !== c.id) }))} style={{ color: C.faint }}><Trash2 size={15} /></button>
          </div>
        </Card>
      ))}
      <Btn onClick={() => update((p) => ({ ...p, corpus: [...p.corpus, { id: uid(), register: data.register, tag: "", snippet: "" }] }))}><Plus size={14} />新增语料</Btn>
    </div>
  );
}
