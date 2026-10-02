"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PlayButton } from "@/components/PlayButton";
import { stopSpeaking, speakLine } from "@/lib/tts/speak";
import { completeScene } from "@/app/actions";
import { DISCOVERIES, finishMission, freshSave, parseSave, SAVE_KEY, type AdventureContent, type AdventureSave, type Mission, type PlaceId } from "@/lib/adventure/model";
import type { Choice } from "@/lib/game";
const World = dynamic(() => import("./World"), { ssr: false, loading: () => <div className="adventure-world world-loading">Opening the neighbourhood…</div> });
const audio = { lang: "th" as const, region: "bangkok", pace: "learner" as const };

function Portrait({ mission, happy = false }: { mission: Mission; happy?: boolean }) {
  return <div className={`portrait portrait-${mission.id} ${happy ? "portrait-happy" : ""}`} style={{ backgroundColor: mission.color }} aria-hidden="true"><div className="portrait-hair" /><div className="portrait-face"><span className="eye left" /><span className="eye right" /><span className="smile" /></div><div className="portrait-shirt" />{mission.id === "noodles" && <div className="portrait-apron" />}</div>;
}
export function Adventure({ content }: { content: AdventureContent }) {
  const [save, setSave] = useState<AdventureSave>(freshSave);
  const [loaded, setLoaded] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const [activeId, setActiveId] = useState<PlaceId | null>(null);
  const [destination, setDestination] = useState<{ id: PlaceId; nonce: number } | null>(null);
  const [step, setStep] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [picked, setPicked] = useState<Choice | null>(null);
  const [attempted, setAttempted] = useState<string[]>([]);
  const [reward, setReward] = useState<Mission | null>(null);
  const [tab, setTab] = useState<"missions" | "journal">("missions");
  const [translation, setTranslation] = useState(true);
  const [toast, setToast] = useState("");
  const [discovery, setDiscovery] = useState<typeof DISCOVERIES[number] | null>(null);
  const [intro, setIntro] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [challenge, setChallenge] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizPicked, setQuizPicked] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const missions = content[save.gender];
  const active = missions.find(m => m.id === activeId);
  const nextMission = missions.find(m => !save.completed.includes(m.id));
  const readyForPicnic = save.completed.length === missions.length;
  const currentStep = active?.steps[step];
  const available = !active || save.completed.includes(active.id) || nextMission?.id === active.id;
  const quizLines = missions.flatMap(m => m.steps.map(s => ({ line: s.choices.find(c => c.correct)!.line, mission: m }))).filter((_, i) => [0, 2, 3, 5, 8, 10].includes(i)).slice(0, 6);
  const quiz = quizLines[quizIndex];
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
    if (cancelled) return;
    let raw: string | null = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch { setStorageFailed(true); }
    setSave(parseSave(raw));
    setLoaded(true);
    setIntro(!raw);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)"); setReduced(media.matches);
    });
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches); media.addEventListener("change", update);
    return () => { cancelled = true; media.removeEventListener("change", update); stopSpeaking(); if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { queueMicrotask(() => setStorageFailed(true)); }
  }, [save, loaded]);
  const notify = (text: string) => { setToast(text); if (toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(""), 4500); };
  const visit = (id: PlaceId) => {
    stopSpeaking(); setActiveId(id); setStep(0); setMistakes(0); setPicked(null); setAttempted([]); setReward(null); setDiscovery(null); setChallenge(false); setIntro(false);
  };
  const travel = (id: PlaceId) => { setDestination(d => ({ id, nonce: (d?.nonce ?? 0) + 1 })); visit(id); };
  const discover = (id: string) => {
    const item = DISCOVERIES.find(d => d.id === id); if (!item) return;
    setDiscovery(item); setActiveId(null); setReward(null); setChallenge(false); setIntro(false);
    setSave(s => s.discoveries.includes(id) ? s : { ...s, discoveries: [...s.discoveries, id], coins: s.coins + 5 });
  };
  const choose = (choice: Choice) => {
    if (picked?.correct || attempted.includes(choice.id)) return;
    speakLine(choice.line.text, save.gender, audio); setPicked(choice); setAttempted(a => [...a, choice.id]);
    if (!choice.correct) setMistakes(m => m + 1);
  };
  const advance = () => {
    if (!active || !picked?.correct) return;
    if (step + 1 < active.steps.length) { setStep(s => s + 1); setPicked(null); setAttempted([]); }
    else {
      setSave(s => finishMission(s, active, mistakes)); setReward(active); setActiveId(null);
      void completeScene(active.sceneId, mistakes).catch(() => undefined);
    }
  };
  const closePanel = () => { stopSpeaking(); setActiveId(null); setDiscovery(null); setReward(null); setChallenge(false); };
  const startChallenge = () => { closePanel(); setChallenge(true); setQuizIndex(0); setQuizScore(0); setQuizPicked(null); setIntro(false); };
  const quizOptions = quiz ? [quiz, quizLines[(quizIndex + 2) % quizLines.length], quizLines[(quizIndex + 4) % quizLines.length]].sort((a, b) => a.line.text.localeCompare(b.line.text)) : [];
  const quizNext = () => {
    if (quizIndex + 1 === quizLines.length) { setSave(s => ({ ...s, challengeBest: Math.max(s.challengeBest, quizScore) })); }
    setQuizIndex(i => i + 1); setQuizPicked(null);
  };
  if (!loaded) return <div className="adventure-shell adventure-loading">Packing your little adventure…</div>;
  return <div className="adventure-shell">
    <div className="adventure-topline"><Link href="/">← Lessons</Link><span>A BRIDGE THAI ADVENTURE</span><span className="save-indicator"><i />{storageFailed ? "Progress won’t save on this device" : "Saved on this device"}</span></div>
    <header className="adventure-heading"><div><p className="eyebrow">CHAPTER 01 / YOUR FIRST DAY</p><h1>Little Bangkok<span>สวัสดี!</span></h1><p>A tiny neighbourhood. A little courage. A whole new language.</p></div><div className="adventure-stats"><span className="coin-icon">✦</span><strong>{save.coins}</strong><span>keepsake coins</span><div className="stat-divider" /><strong>{save.completed.length}<small> / 3</small></strong><span>new connections</span></div></header>
    <div className="adventure-layout">
      <aside className="adventure-sidebar">
        <div className="sidebar-tabs"><button onClick={() => setTab("missions")} aria-pressed={tab === "missions"}>Your day</button><button onClick={() => setTab("journal")} aria-pressed={tab === "journal"}>Journal <span>{save.journal.length}</span></button></div>
        {tab === "missions" ? <>
          <div className="story-card"><span className="story-tag">THE LITTLE BIG PLAN</span><h2>A place at the picnic</h2><p>Make a friend. Find breakfast. Bring a gift. You belong here already.</p><div className="chapter-progress"><span style={{ width: `${save.completed.length / 3 * 100}%` }} /></div></div>
          <ol className="mission-list">{missions.map((m, i) => {
            const done = save.completed.includes(m.id), locked = !done && nextMission?.id !== m.id;
            return <li key={m.id}><button className={`mission-link ${done ? "done" : ""} ${locked ? "locked" : ""} ${nextMission?.id === m.id ? "current" : ""}`} onClick={() => travel(m.id)} aria-label={`${m.title}${locked ? ", meet the previous character first" : ""}`}><span className="mission-number">{done ? "✓" : `0${i + 1}`}</span><span><strong>{m.title}</strong><small>{done ? "★".repeat(save.best[m.id] ?? 1) + " · Visit again" : locked ? "A little later" : `Meet ${m.name} →`}</small></span></button></li>;
          })}</ol>
          <div className="discovery-card"><div><h3>Look a little closer</h3><span>{save.discoveries.length}/3</span></div><p>Find the sparkling details. Every little thing has a Thai name.</p><div className="discovery-buttons">{DISCOVERIES.map(d => <button key={d.id} onClick={() => discover(d.id)} title={d.clue} aria-label={`Discover ${d.meaning}`} className={save.discoveries.includes(d.id) ? "found" : ""}>{d.icon}{save.discoveries.includes(d.id) && <small>✓</small>}</button>)}</div></div>
          {readyForPicnic && <button className="picnic-link" onClick={startChallenge}>☀ Take it to the picnic <span>A memory challenge →</span></button>}
        </> : <div className="journal-panel"><h2>Your pocket journal</h2><p>Useful words, lovely little memories.</p><div className="inventory">{missions.filter(m => save.completed.includes(m.id)).map(m => <span key={m.id} title={m.reward}>{m.icon}<small>{m.reward}</small></span>)}</div>{save.journal.length === 0 && <p className="journal-empty">Your first conversation will put something here.</p>}{missions.filter(m => save.completed.includes(m.id)).map(m => <details key={m.id}><summary>{m.name} · {m.steps.length} phrases</summary>{m.steps.map((s, i) => { const line = s.choices.find(c => c.correct)!.line; return <div key={i} className="journal-phrase"><p lang="th">{line.text}</p><small>{line.gloss}</small><PlayButton text={line.text} gender={save.gender} audio={audio} label="Replay phrase" /></div>; })}</details>)}{save.discoveries.map(id => { const d = DISCOVERIES.find(d => d.id === id)!; return <div className="journal-word" key={id}>{d?.icon} <span lang="th">{d?.word}</span> · {d?.meaning}</div>; })}</div>}
        <div className="character-settings"><label htmlFor="adventure-voice">Your Thai speaking style</label><select id="adventure-voice" value={save.gender} disabled={!!activeId || challenge} onChange={e => { setSave(s => ({ ...s, gender: e.target.value as "male" | "female" })); notify("Speaking style updated. Your next conversation will use these pronouns and endings."); }}><option value="female">Feminine · ค่ะ / คะ</option><option value="male">Masculine · ครับ</option></select><small>Central Thai · gentle listening pace</small></div>
      </aside>
      <section className="world-section" aria-label="Explore Little Bangkok">
        <div className="world-hud"><span><i /> BANGKOK, THAILAND</span><span>{readyForPicnic ? "A good day, well spent ☀" : "A slow morning ☀"}</span></div>
        <World onVisit={id => { if (activeId !== id) visit(id); }} onDiscover={discover} completed={save.completed} destination={destination} reducedMotion={reduced} />
        <div className="world-caption"><span>✧ Tap a path to wander. Tap a person to talk.</span><button onClick={() => setIntro(true)}>How to play</button></div>
        {intro && <div className="game-panel intro-panel"><button className="panel-close" onClick={() => setIntro(false)} aria-label="Close welcome">×</button><span className="panel-kicker">WELCOME TO YOUR FIRST DAY</span><h2>Every friendship starts<br />with a hello.</h2><p>You’ve just arrived. Mali, your neighbour, has saved you a place at tonight’s picnic.</p><ul><li><span>01</span>Explore the map or use the mission buttons.</li><li><span>02</span>Listen, then choose what you would say.</li><li><span>03</span>Mistakes are welcome. Try again and learn why.</li></ul><button className="primary-game-button" onClick={() => travel("friend")}>Meet Mali <span>→</span></button><small>No sign-in needed. Your adventure saves here.</small></div>}
        {active && <div className="game-panel dialogue-panel" role="region" aria-label={`Conversation with ${active.name}`}><button className="panel-close" onClick={closePanel} aria-label="Leave conversation">×</button><div className="character-heading"><Portrait mission={active} happy={picked?.correct} /><div><span className="panel-kicker">{active.role}</span><h2>{active.name}</h2><small>{active.setup.relationship === "friend" ? "A friend · warm, casual Thai" : "A new acquaintance · polite Thai"}</small></div></div>
          {!available ? <div className="locked-dialogue"><h3>All in good time.</h3><p>{active.description}</p><p>First, {nextMission?.title.toLowerCase()}.</p><button className="primary-game-button" onClick={() => nextMission && travel(nextMission.id)}>Meet {nextMission?.name} →</button></div> : currentStep && <>
            <div className="dialogue-progress"><span>{active.title}</span><span>{step + 1}/{active.steps.length}</span></div><div className="dialogue-progress-track"><span style={{ width: `${(step + 1) / active.steps.length * 100}%` }} /></div>
            <div className="npc-speech"><div><p lang="th">{currentStep.npc.text}</p><span>{currentStep.npc.sub}</span>{translation && <small>{currentStep.npc.gloss}</small>}</div><PlayButton text={currentStep.npc.text} gender={active.setup.listenerGender} audio={audio} label={`Listen to ${active.name}`} /></div>
            <div className="response-heading"><p>{currentStep.prompt}</p><button onClick={() => setTranslation(v => !v)} aria-pressed={!translation}>{translation ? "Hide meanings" : "Show meanings"}</button></div>
            <div className="dialogue-choices">{currentStep.choices.map(c => <button key={c.id} onClick={() => choose(c)} disabled={!!picked?.correct || attempted.includes(c.id)} className={`${picked?.id === c.id ? c.correct ? "correct" : "incorrect" : ""}`}><span lang="th">{c.line.text}</span><small>{c.line.sub}</small>{translation && <em>{c.line.gloss}</em>}{picked?.id === c.id && <b>{c.correct ? "✓" : "↻"}</b>}</button>)}</div>
            {picked && <div className={`response-feedback ${picked.correct ? "positive" : ""}`} role="status">{picked.correct ? <><strong>{active.name} smiles.</strong><span>{step + 1 === active.steps.length ? "You did it. A little conversation goes a long way." : "That fits this moment. Keep the conversation going."}</span></> : <><strong>A little adjustment…</strong><span>{picked.feedback} Try another reply.</span></>}</div>}
            {picked?.correct && <button className="primary-game-button" onClick={advance}>{step + 1 === active.steps.length ? "Collect your keepsake" : "Keep talking"}<span>→</span></button>}
          </>}
        </div>}
        {reward && <div className="game-panel reward-panel" role="region" aria-label="Mission complete"><button className="panel-close" onClick={closePanel} aria-label="Close reward">×</button><div className="reward-art">{reward.icon}<span>✧</span><span>✦</span></div><span className="panel-kicker">A LITTLE MOMENT TO KEEP</span><h2>{reward.reward}</h2><p>{reward.id === "friend" ? "A stranger becomes a neighbour. Mali’s saved your spot at the picnic." : reward.id === "noodles" ? "Less spice, more confidence. Arun’s happy you stopped by." : "A fair price and a thoughtful gift. Dao wishes you a lovely evening."}</p><div className="reward-stars">{"★".repeat(mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1)}{"☆".repeat(mistakes === 0 ? 0 : mistakes === 1 ? 1 : 2)}</div><small>{mistakes === 0 ? "A natural conversation" : `${mistakes} learning moment${mistakes === 1 ? "" : "s"} · You found your way`}</small><div className="reward-receipt"><span>In your journal</span><strong>{reward.steps.length} useful phrases</strong></div><button className="primary-game-button" onClick={() => nextMission ? travel(nextMission.id) : startChallenge()}>{nextMission ? `Next: meet ${nextMission.name}` : "You’re invited. Let’s picnic!"}<span>→</span></button><button className="subtle-game-button" onClick={() => { closePanel(); setTab("journal"); }}>Open your journal</button></div>}
        {discovery && <div className="game-panel discovery-panel"><button className="panel-close" onClick={closePanel} aria-label="Close discovery">×</button><div className="discovery-art">{discovery.icon}</div><span className="panel-kicker">A WORD HIDING IN PLAIN SIGHT</span><h2 lang="th">{discovery.word}</h2><p className="discovery-roman">{discovery.roman}</p><p>{discovery.meaning}</p><small>Found! Saved to your journal.</small><button className="primary-game-button" onClick={closePanel}>Keep exploring →</button></div>}
        {challenge && <div className="game-panel challenge-panel"><button className="panel-close" onClick={closePanel} aria-label="Leave picnic challenge">×</button><span className="panel-kicker">AT THE NEIGHBOURHOOD PICNIC</span>{quiz ? <><h2>A little less help.<br />A little more you.</h2><p>You’ve used this phrase today. Can you remember it?</p><div className="challenge-counter">ROUND {quizIndex + 1} / {quizLines.length} <span>{quizScore} remembered</span></div><div className="quiz-prompt"><small>How would you say…</small><strong>{quiz.line.gloss}</strong><span>Speaking to {quiz.mission.name} · {quiz.mission.setup.relationship === "friend" ? "a friend" : "politely"}</span></div><div className="dialogue-choices">{quizOptions.map(q => <button key={q.line.text} disabled={quizPicked !== null} onClick={() => { setQuizPicked(q.line.text); if (q.line.text === quiz.line.text) setQuizScore(s => s + 1); speakLine(q.line.text, save.gender, audio); }} className={quizPicked && q.line.text === quiz.line.text ? "correct" : quizPicked === q.line.text ? "incorrect" : ""}><span lang="th">{q.line.text}</span></button>)}</div>{quizPicked && <><p className="quiz-feedback" role="status">{quizPicked === quiz.line.text ? "Yes! You remembered." : `Here’s the phrase: ${quiz.line.text}`}<small>{quiz.line.sub}</small></p><button className="primary-game-button" onClick={quizNext}>{quizIndex + 1 === quizLines.length ? "Watch the sun go down" : "Next memory"} →</button></>}</> : <><div className="picnic-art">☀</div><h2>You’ve found<br />your people.</h2><p>A friend, a meal, a thoughtful gift. You did all of that in Thai.</p><div className="final-score">{quizScore}<small> / {quizLines.length} phrases remembered</small></div><p>{quizScore === quizLines.length ? "Every little word stayed with you. Beautiful." : "Good memories grow with a second visit. Your journal is there whenever you need it."}</p><button className="primary-game-button" onClick={startChallenge}>Try the picnic challenge again →</button><button className="subtle-game-button" onClick={closePanel}>Take another walk</button></>}</div>}
      </section>
    </div>
    <footer className="adventure-footer"><span>✧ A small world worth coming back to.</span><span>Language content is a draft · Native-speaker review pending</span><Link href="/scenes">Explore all Thai & English lessons →</Link></footer>
    {toast && <div className="adventure-toast" role="status">{toast}</div>}
  </div>;
}
