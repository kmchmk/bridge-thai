"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PicnicAfternoon, PicnicBasket } from "./PicnicAfternoon";
import { PICNIC_STEPS, SECRET_LESSONS } from "@/lib/atlas/picnic";
import { AtlasPractice, type RecallCard } from "./AtlasPractice";
import { rememberPractice, phraseChunks } from "@/lib/adventure/practice";
import { seeded } from "@/lib/game";
import { Errand } from "@/components/adventure/Errand";
import { BahtPayment } from "@/components/adventure/BahtPayment";
import {
  nextErrand,
  finishErrand,
  type Errand as ErrandSpec,
  type ItemId,
} from "@/lib/adventure/errands";
import {
  finishMission,
  DECORATIONS,
  parseSave,
  type PlaceId,
} from "@/lib/adventure/model";
import { AudioWarmup } from "@/components/AudioWarmup";
import { PlayButton } from "@/components/PlayButton";
import { completeScene } from "@/app/actions";
import { speakLine, stopSpeaking } from "@/lib/tts/speak";
import type { AudioCtx, Pace } from "@/lib/tts/ctx";
import type { Gender } from "@/lib/register/types";
import type { AccentId } from "@/lib/accents";
import type { Formality } from "@/lib/english";
import type { AtlasContent } from "@/lib/atlas/content";
import {
  DISTRICTS,
  LOCATIONS,
  QUESTS,
  SECRETS,
  type DistrictId,
} from "@/lib/atlas/catalog";
import {
  ATLAS_KEY,
  completeLocation,
  buyAtlasDecoration,
  discoverSecret,
  freshAtlas,
  nextStop,
  parseAtlas,
  type AtlasSave,
} from "@/lib/atlas/progress";
const World = dynamic(() => import("./AtlasWorld"), {
  ssr: false,
  loading: () => (
    <div className="atlas-map-frame atlas-loading">Opening your world…</div>
  ),
});
function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="atlas-sheet"
      onCancel={onClose}
      aria-label={title}
    >
      <div className="atlas-sheet-top">
        <span>{title}</span>
        <button onClick={onClose} aria-label={`Close ${title}`}>
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
const EMPTY_PROGRESS: { sceneId: string; bestStars: number }[] = [];
export function Atlas({
  content,
  initialScene,
  initialPlaces = false,
  initialLanguage = "en",
  saved = EMPTY_PROGRESS,
}: {
  content: AtlasContent;
  initialScene?: string;
  initialPlaces?: boolean;
  initialLanguage?: "en" | "th";
  saved?: { sceneId: string; bestStars: number }[];
}) {
  const [save, setSave] = useState<AtlasSave>(freshAtlas),
    [loaded, setLoaded] = useState(false),
    [course, setCourse] = useState<"th" | "en">(
      initialScene
        ? initialScene.startsWith("en-")
          ? "en"
          : "th"
        : initialLanguage === "th"
          ? "en"
          : "th",
    ),
    [interfaceLanguage, setInterfaceLanguage] = useState<"en" | "th">(
      initialLanguage,
    ),
    [gender, setGender] = useState<Gender>("female"),
    [accent, setAccent] = useState<AccentId>("us"),
    [formality, setFormality] = useState<Formality>("neutral"),
    [pace, setPace] = useState<Pace>("learner"),
    [district, setDistrict] = useState<DistrictId>(
      LOCATIONS.find((l) => l.id === initialScene)?.district ??
        (initialLanguage === "th" ? "bridge" : "town"),
    ),
    [destination, setDestination] = useState<{
      id: string;
      nonce: number;
    } | null>(null),
    [activeId, setActiveId] = useState<string | null>(null),
    [menu, setMenu] = useState<
      "places" | "passport" | "settings" | "quests" | "shop" | null
    >(initialPlaces ? "places" : null),
    [secret, setSecret] = useState<string | null>(null),
    [step, setStep] = useState(0),
    [picked, setPicked] = useState<string | null>(null),
    [attempted, setAttempted] = useState<string[]>([]),
    [mistakes, setMistakes] = useState(0),
    [hint, setHint] = useState(false),
    [supported, setSupported] = useState(false),
    [phase, setPhase] = useState<
      "talk" | "recall" | "reward" | "spice" | "pay"
    >("talk"),
    [memoryPicked, setMemoryPicked] = useState<string | null>(null),
    [memoryAttempts, setMemoryAttempts] = useState<string[]>([]),
    [memoryFeedback, setMemoryFeedback] = useState(""),
    [notice, setNotice] = useState(""),
    [syncNotice, setSyncNotice] = useState("");
  const [errand, setErrand] = useState<ErrandSpec | null>(null),
    [arrived, setArrived] = useState<PlaceId | null>(null),
    [bag, setBag] = useState<ItemId | null>(null),
    [spice, setSpice] = useState<number | null>(null),
    [meal, setMeal] = useState<"noodles" | "rice">("noodles");
  const [picnicOpen, setPicnicOpen] = useState(false);
  const [picnicArrived, setPicnicArrived] = useState<string | null>(null);
  const [practice, setPractice] = useState<RecallCard[] | null>(null);
  const missions = content.picnic[gender];
  const alias: Record<string, PlaceId> = {
    "first-hello": "friend",
    "noodle-stall": "noodles",
    "market-haggling": "market",
  };
  const sceneAlias: Record<PlaceId, string> = {
    friend: "first-hello",
    noodles: "noodle-stall",
    market: "market-haggling",
  };
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      let next = parseAtlas(localStorage.getItem(ATLAS_KEY));
      // Import older completion records without awarding coins or assuming independent recall.
      const old = (() => {
        try {
          return JSON.parse(localStorage.getItem("bt_adventure_v1") ?? "null");
        } catch {
          return null;
        }
      })();
      const aliases: Record<string, string> = {
        friend: "first-hello",
        noodles: "noodle-stall",
        market: "market-haggling",
      };
      const imported = [
        ...saved.map((s) => s.sceneId),
        ...(Array.isArray(old?.completed)
          ? old.completed.map((id: string) => aliases[id]).filter(Boolean)
          : []),
      ].filter((id) => LOCATIONS.some((l) => l.id === id));
      next = {
        ...next,
        completed: [...new Set([...next.completed, ...imported])],
        stars: {
          ...Object.fromEntries(imported.map((id) => [id, 1])),
          ...Object.fromEntries(saved.map((s) => [s.sceneId, s.bestStars])),
          ...next.stars,
        },
      };
      if (!localStorage.getItem(ATLAS_KEY) && old?.version === 1)
        next = {
          ...next,
          chapter: parseSave(JSON.stringify(old)),
          coins: parseSave(JSON.stringify(old)).coins,
          decorations: parseSave(JSON.stringify(old)).decorations,
        };
      const prefs = (() => {
        try {
          return JSON.parse(
            localStorage.getItem("bt_atlas_preferences") ?? "null",
          );
        } catch {
          return null;
        }
      })();
      if (["en", "th"].includes(prefs?.interfaceLanguage))
        setInterfaceLanguage(prefs.interfaceLanguage);
      if (prefs?.gender === "male") setGender("male");
      else if (old?.gender === "male") setGender("male");
      if (!initialScene && ["th", "en"].includes(prefs?.course)) {
        setCourse(prefs.course);
        setDistrict(prefs.course === "en" ? "bridge" : "town");
      }
      if (["us", "uk", "au"].includes(prefs?.accent)) setAccent(prefs.accent);
      if (["casual", "neutral", "formal"].includes(prefs?.formality))
        setFormality(prefs.formality);
      if (prefs?.pace === "natural") setPace("natural");
      setSave(next);
      setLoaded(true);
      if (initialScene && LOCATIONS.some((l) => l.id === initialScene))
        setDestination({ id: initialScene, nonce: Date.now() });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialScene, saved]);
  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(ATLAS_KEY, JSON.stringify(save));
        localStorage.setItem(
          "bt_atlas_preferences",
          JSON.stringify({
            course,
            gender,
            accent,
            formality,
            pace,
            interfaceLanguage,
          }),
        );
      } catch {
        /* The game remains playable if device storage is unavailable. */
      }
    }
  }, [
    save,
    loaded,
    course,
    gender,
    accent,
    formality,
    pace,
    interfaceLanguage,
  ]);
  useEffect(() => () => stopSpeaking(), []);
  const encounters =
    course === "th"
      ? content.thai[gender]
      : content.english[`${gender}:${accent}:${formality}`];
  const active = encounters.find((e) => e.id === activeId),
    location = LOCATIONS.find((l) => l.id === activeId),
    baseStep = active?.steps[step];
  const current =
    active?.id === "noodle-stall" && meal === "rice" && step === 3
      ? {
          ...baseStep!,
          npc: missions.find((m) => m.id === "noodles")!.riceNpc!,
        }
      : baseStep;
  const recommendation = nextStop(save, course, district),
    next = LOCATIONS.find((l) => l.id === recommendation);
  const quest = QUESTS.find((q) => q.stops.some((id) => id === recommendation));
  const courseCount = LOCATIONS.filter((l) => l.course === course).length,
    doneCount = save.completed.filter(
      (id) => LOCATIONS.find((l) => l.id === id)?.course === course,
    ).length;
  const audio: AudioCtx =
    course === "th"
      ? { lang: "th", region: location?.region ?? "bangkok", pace }
      : { lang: "en", accent, pace };
  useEffect(
    () => () => stopSpeaking(),
    [activeId, step, phase, gender, pace, accent],
  );
  const close = () => {
    stopSpeaking();
    setPicnicOpen(false);
    setPicnicArrived(null);
    setActiveId(null);
    setMenu(null);
    setSecret(null);
    setDestination(null);
    setNotice("");
    setPractice(null);
    setErrand(null);
    setBag(null);
  };
  const visit = (id: string) => {
    const l = LOCATIONS.find((l) => l.id === id);
    if (!l) return;
    close();
    setCourse(l.course);
    setDistrict(l.district);
    setDestination({ id, nonce: Date.now() });
    setSave((s) => ({ ...s, welcomeSeen: true }));
  };
  const arrive = (id: string) => {
    setMenu(null);
    setSecret(null);
    setPractice(null);
    const place = LOCATIONS.find((l) => l.id === id)!;
    setCourse(place.course);
    setDistrict(place.district);
    setDestination(null);
    setActiveId(id);
    setStep(0);
    setSpice(null);
    setMeal(save.chapter.meal);
    setPicked(null);
    setAttempted([]);
    setMistakes(0);
    setHint(false);
    setSupported(false);
    setPhase("talk");
    setMemoryPicked(null);
    setMemoryAttempts([]);
    setMemoryFeedback("");
  };
  const finish = () => {
    if (!active) return;
    setSave((s) => {
      const updated = completeLocation(s, active.id, mistakes, supported);
      const practiced = rememberPractice(
        s.chapter,
        `memory:${active.id}`,
        memoryAttempts.length === 1 && !hint,
        "listen",
      );
      const mission = missions.find((m) => m.id === alias[active.id]);
      return mission
        ? {
            ...updated,
            chapter: { ...finishMission(practiced, mission, mistakes), meal },
          }
        : { ...updated, chapter: practiced };
    });
    setPhase("reward");
    stopSpeaking();
    completeScene(active.id, mistakes)
      .then((r) =>
        setSyncNotice(
          r.saved ? "Scene saved to your account." : "Saved on this device.",
        ),
      )
      .catch(() =>
        setSyncNotice(
          "Saved on this device; account sync will retry on a future completion.",
        ),
      );
  };
  const reveal = () => {
    setHint(true);
    setSupported(true);
  };
  const memoryIndex = active
    ? (save.chapter.practice[`memory:${active.id}`]?.attempts ?? 0) %
      active.steps.length
    : 0;
  const memory = active?.steps[memoryIndex].choices.find(
    (c) => c.id === "ok",
  )?.line;
  const meanings = memory
    ? [
        ...new Set([
          memory.gloss,
          ...active!.steps
            .slice(1)
            .map((s) => s.choices.find((c) => c.correct)!.line.gloss),
          ...encounters
            .filter((e) => e.id !== activeId)
            .map((e) => e.steps[0].choices.find((c) => c.correct)!.line.gloss),
        ]),
      ]
        .slice(0, 3)
        .sort((a, b) => a.localeCompare(b))
    : [];
  const secretInfo = SECRETS.find((s) => s.id === secret);
  const newQuest = QUESTS.find(
    (q) =>
      q.stops.some((id) => id === activeId) &&
      q.stops.every((id) => save.completed.includes(id)),
  );
  const learnEnglish = course === "en";
  const en = interfaceLanguage === "th";
  const startPractice = (picnicOnly = false) => {
    close();
    const random = seeded(String(Date.now()));
    const meanings = encounters.flatMap((e) =>
      e.steps.map((s) => s.choices.find((c) => c.id === "ok")!.line.gloss),
    );
    const cards = encounters
      .filter((e) =>
        picnicOnly
          ? PICNIC_STEPS.some((p) => p.scene === e.id)
          : save.completed.includes(e.id),
      )
      .flatMap((e) =>
        e.steps.flatMap((step, i) => {
          if (
            picnicOnly &&
            !PICNIC_STEPS.some((p) => p.scene === e.id && p.index === i)
          )
            return [];
          const l = LOCATIONS.find((l) => l.id === e.id)!;
          const id = `atlas:${e.id}:${i}`;
          const history = save.chapter.practice[id];
          return {
            id,
            step,
            person: l.person,
            gender,
            npcGender: l.gender,
            audio:
              course === "th"
                ? { lang: "th" as const, region: l.region, pace }
                : { lang: "en" as const, accent, pace },
            meanings,
            weight:
              (history?.attempts ?? 0) -
              (history?.successes ?? 0) +
              (picnicOnly &&
              save.picnic.missed.some(
                (n) =>
                  PICNIC_STEPS[n].scene === e.id && PICNIC_STEPS[n].index === i,
              )
                ? 2
                : 0),
            random: random(),
          };
        }),
      )
      .sort((a, b) => b.weight - a.weight || a.random - b.random);
    const deck = cards.slice(0, 6);
    for (let i = 2; i < deck.length; i += 3) {
      if (
        phraseChunks(deck[i].step.choices.find((c) => c.id === "ok")!.line.text)
          .length < 2
      ) {
        const replacement = cards.find(
          (c) =>
            !deck.includes(c) &&
            phraseChunks(c.step.choices.find((c) => c.id === "ok")!.line.text)
              .length >= 2,
        );
        if (replacement) deck[i] = replacement;
      }
    }
    setPractice(deck);
  };
  return (
    <div className="atlas-app">
      <div className="atlas-title">
        <div>
          <small>YOUR LANGUAGE ADVENTURE</small>
          <h1>
            Little Bangkok<span> & beyond</span>
          </h1>
        </div>
        <button
          className="atlas-course"
          onClick={() => {
            close();
            setCourse(learnEnglish ? "th" : "en");
            setDistrict(learnEnglish ? "town" : "bridge");
          }}
        >
          {learnEnglish
            ? en
              ? "English · เปลี่ยน"
              : "English · change"
            : en
              ? "Thai · เปลี่ยน"
              : "Thai · change"}
        </button>
      </div>
      <nav className="atlas-districts" aria-label="World districts">
        {DISTRICTS.map((d) => (
          <button
            key={d.id}
            aria-pressed={district === d.id}
            onClick={() => {
              close();
              setDistrict(d.id);
              setCourse(d.id === "bridge" ? "en" : "th");
            }}
          >
            <span>{d.icon}</span>
            {d.name}
          </button>
        ))}
      </nav>
      <World
        district={district}
        interactive={
          !activeId && !menu && !secret && !errand && !practice && !picnicOpen
        }
        destination={destination}
        completed={save.completed}
        secrets={save.secrets}
        decorations={save.decorations}
        meal={save.chapter.meal}
        completedPicnic={
          save.picnic.finished || save.chapter.completed.length === 3
        }
        picnicCount={Math.floor(save.picnic.next / 2)}
        bag={bag}
        onVisit={(id) => {
          if (picnicOpen) {
            setDestination(null);
            setPicnicArrived(id);
          } else if (errand) {
            setDestination(null);
            setArrived(alias[id] ?? null);
          } else arrive(id);
        }}
        onSecret={(id) => {
          close();
          setSave((s) => discoverSecret(s, id));
          setSecret(id);
        }}
      />
      {course === "th" && district === "town" && !save.picnic.finished ? (
        <div className="atlas-task picnic-task">
          <div>
            <small>PICNIC AFTERNOON · THREE SHORT STOPS</small>
            <strong>
              {save.picnic.next === 0
                ? "Make a picnic with Mali"
                : "Your picnic is taking shape"}
            </strong>
            <PicnicBasket progress={save.picnic} />
          </div>
          <button
            className="atlas-primary"
            disabled={!loaded}
            onClick={() => {
              close();
              setPicnicOpen(true);
            }}
          >
            {" "}
            {save.picnic.next === 0 ? "Plan a picnic →" : "Continue picnic →"}
          </button>
        </div>
      ) : (
        <div className="atlas-task">
          <div>
            <small>
              {!save.welcomeSeen
                ? en
                  ? "เริ่มที่นี่"
                  : "START HERE"
                : (quest?.name ?? "FREE EXPLORATION")}
            </small>
            <strong>
              {next
                ? !save.welcomeSeen && next.id === "first-hello"
                  ? en
                    ? "ทักทายเพื่อนใหม่"
                    : "Say hello to Mali"
                  : next.name
                : en
                  ? "สำรวจได้ตามใจ"
                  : "Your world is open"}
            </strong>
            {!save.welcomeSeen && (
              <p>
                {en
                  ? "ฟัง แล้วเลือกคำตอบ ไม่ต้องเข้าสู่ระบบ"
                  : "Listen. Pick a reply. No sign-in needed."}
              </p>
            )}
          </div>
          {next ? (
            <button
              className="atlas-primary"
              onClick={() => visit(next.id)}
              disabled={!loaded}
            >
              {destination
                ? en
                  ? "กำลังไป…"
                  : "Walking…"
                : en
                  ? "ไปเลย →"
                  : "Let’s go →"}
            </button>
          ) : (
            <button
              className="atlas-primary"
              onClick={() => {
                close();
                setMenu("places");
              }}
            >
              Explore →
            </button>
          )}
        </div>
      )}
      {picnicOpen && (
        <Sheet
          title="Picnic afternoon"
          onClose={() => {
            close();
            setDistrict("town");
          }}
        >
          <PicnicAfternoon
            content={content}
            gender={gender}
            pace={pace}
            progress={save.picnic}
            update={(picnic) => setSave((s) => ({ ...s, picnic }))}
            arrived={picnicArrived}
            travel={(id) => {
              const l = LOCATIONS.find((l) => l.id === id)!;
              setDistrict(l.district);
              setDestination({ id, nonce: Date.now() });
            }}
            close={() => {
              close();
              setDistrict("town");
            }}
            challengePractice={() => startPractice(true)}
          />
        </Sheet>
      )}
      <nav className="atlas-bottom" aria-label="Game menu">
        <button
          onClick={() => {
            close();
            setMenu("places");
          }}
        >
          <span>⌖</span>
          {en ? "สถานที่" : "Places"}
        </button>
        <button
          onClick={() => {
            close();
            setMenu("quests");
          }}
        >
          <span>✉</span>
          {en ? "เรื่องราว" : "Stories"}
        </button>
        <button
          onClick={() => {
            close();
            setMenu("passport");
          }}
        >
          <span>▣</span>
          {en ? "สมุดสะสม" : "Passport"}
          <small>
            {doneCount}/{courseCount}
          </small>
        </button>
        <button
          onClick={() => {
            close();
            setMenu("settings");
          }}
        >
          <span>☷</span>
          {en ? "ตั้งค่า" : "More"}
        </button>
      </nav>
      {save.completed.includes("first-hello") && (
        <button
          className="atlas-favour"
          onClick={() => {
            close();
            setCourse("th");
            setErrand(nextErrand(content.picnic, save.chapter));
            setArrived(null);
          }}
        >
          ✉ A neighbour needs you <span>Listen · buy · deliver</span>
        </button>
      )}
      {errand && (
        <Sheet title="A neighbour’s favour" onClose={close}>
          <Errand
            key={errand.id}
            order={errand}
            missions={missions}
            arrived={arrived}
            onTravel={(id) => {
              const l = LOCATIONS.find((l) => l.id === sceneAlias[id])!;
              setDistrict(l.district);
              setDestination({ id: l.id, nonce: Date.now() });
            }}
            onClose={close}
            onBag={setBag}
            onComplete={(independent) =>
              setSave((s) => {
                const chapter = finishErrand(s.chapter, errand, independent);
                return {
                  ...s,
                  chapter,
                  coins: s.coins + chapter.coins - s.chapter.coins,
                };
              })
            }
          />
        </Sheet>
      )}
      {save.completed.some(
        (id) => LOCATIONS.find((l) => l.id === id)?.course === course,
      ) && (
        <button className="atlas-favour" onClick={() => startPractice()}>
          ↻ A little less help <span>Listen · reply · build</span>
        </button>
      )}
      {practice && (
        <Sheet title="Mixed memory practice" onClose={close}>
          <AtlasPractice
            deck={practice}
            onClose={close}
            onAnswer={(id, success, mode) =>
              setSave((s) => {
                const chapter = rememberPractice(s.chapter, id, success, mode);
                return {
                  ...s,
                  chapter,
                  coins: s.coins + chapter.coins - s.chapter.coins,
                };
              })
            }
          />
        </Sheet>
      )}
      {notice && (
        <p className="atlas-notice" role="status">
          {notice}
        </p>
      )}
      {active && location && (
        <Sheet
          title={
            phase === "reward"
              ? "A moment to keep"
              : phase === "recall"
                ? "One little memory"
                : `Conversation with ${location.person}`
          }
          onClose={close}
        >
          <AudioWarmup
            lines={active.steps
              .flatMap((st) => [
                { text: st.npc.text, gender: location.gender, audio },
                ...st.choices.map((c) => ({
                  text: c.line.text,
                  gender,
                  audio,
                })),
              ])
              .concat(
                current
                  ? [{ text: current.npc.text, gender: location.gender, audio }]
                  : [],
              )}
          />
          {phase === "talk" && current && (
            <>
              {step === 0 &&
                (save.completed.includes(active.id) ||
                  (active.id === "first-hello" && save.picnic.next >= 2)) && (
                  <p className="picnic-coach">
                    {location.person} remembers you.{" "}
                    {active.id === "first-hello" && save.picnic.finished
                      ? "There’s always a seat for you after your picnic together."
                      : active.id === "noodle-stall"
                        ? `Last time you chose ${save.chapter.meal === "rice" ? "rice" : "noodles"}. Try ordering again.`
                        : "Welcome back for another conversation."}
                  </p>
                )}
              <div className="atlas-person">
                <span>{location.icon}</span>
                <div>
                  <h2>{location.person}</h2>
                  <small>
                    {step + 1} / {active.steps.length} · {location.name}
                  </small>
                </div>
              </div>
              <div className="atlas-speech">
                <p lang={course}>{current.npc.text}</p>
                <PlayButton
                  text={current.npc.text}
                  gender={location.gender}
                  audio={audio}
                  label={`Listen to ${location.person}`}
                />
              </div>
              {hint && (
                <div className="atlas-clue">
                  <p>{current.npc.sub}</p>
                  <p>{current.npc.gloss}</p>
                  <small>{active.context}</small>
                </div>
              )}
              <p className="atlas-prompt">
                {course === "en" && !en
                  ? `Choose a ${formality === "neutral" ? "friendly, everyday" : formality} reply.`
                  : current.prompt}
              </p>
              <div className="atlas-options">
                {current.choices.map((c) => (
                  <div className="atlas-audio-choice" key={c.id}>
                    <button
                      disabled={
                        (picked !== null &&
                          current.choices.find((c) => c.id === picked)
                            ?.correct) ||
                        attempted.includes(c.id)
                      }
                      className={
                        picked === c.id
                          ? c.correct
                            ? "correct"
                            : "incorrect"
                          : ""
                      }
                      onClick={() => {
                        setPicked(c.id);
                        setAttempted((a) => [...a, c.id]);
                        if (c.id === "meal-rice") setMeal("rice");
                        if (!c.correct) setMistakes((m) => m + 1);
                        else speakLine(c.line.text, gender, audio);
                      }}
                    >
                      <span lang={course}>{c.line.text}</span>
                      {!hint && c.line.sub && <small>{c.line.sub}</small>}
                      {hint && (
                        <small>
                          {c.line.sub} · {c.line.gloss}
                        </small>
                      )}
                    </button>
                    <PlayButton
                      text={c.line.text}
                      gender={gender}
                      audio={audio}
                      label={`Preview reply: ${c.line.text}`}
                    />
                  </div>
                ))}
              </div>
              {!hint && (
                <button className="atlas-hint" onClick={reveal}>
                  {en ? "ดูคำแปล / ช่วยหน่อย" : "Need a clue? Show meanings"}
                </button>
              )}
              {picked && (
                <p className="atlas-feedback" role="status">
                  {current.choices.find((c) => c.id === picked)?.correct
                    ? (current.choices.find((c) => c.id === picked)?.feedback ??
                      (en ? "ใช่เลย!" : "That fits. Nice work!"))
                    : current.choices.find((c) => c.id === picked)?.feedback}
                </p>
              )}
              {picked &&
                current.choices.find((c) => c.id === picked)?.correct && (
                  <button
                    className="atlas-primary atlas-wide"
                    onClick={() => {
                      stopSpeaking();
                      if (step + 1 === active.steps.length) {
                        setPhase(
                          active.id === "noodle-stall"
                            ? "spice"
                            : active.id === "market-haggling"
                              ? "pay"
                              : "recall",
                        );
                        setHint(false);
                      } else {
                        setStep((s) => s + 1);
                        setPicked(null);
                        setAttempted([]);
                        setHint(false);
                      }
                    }}
                  >
                    {step + 1 === active.steps.length
                      ? en
                        ? "จำได้ไหม →"
                        : "One little memory →"
                      : en
                        ? "คุยต่อ →"
                        : "Keep talking →"}
                  </button>
                )}
            </>
          )}
          {phase === "spice" && (
            <>
              <h2>A little chilli?</h2>
              <div className="atlas-reward">
                {meal === "rice" ? "🍛" : "🍜"}
                {spice !== null ? "🌶".repeat(spice) : ""}
              </div>
              <PlayButton
                text={
                  missions
                    .find((m) => m.id === "noodles")!
                    .steps[1].choices.find((c) => c.id === "ok")!.line.text
                }
                gender={gender}
                audio={audio}
                label="Listen to your spice request"
              />
              <p>Choose the spice level you asked for.</p>
              <div className="atlas-options">
                {[0, 1, 3].map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      setSpice(n);
                      if (n !== 1) setMistakes((m) => m + 1);
                    }}
                  >
                    {n === 0
                      ? "ไม่เผ็ด 🥣"
                      : n === 1
                        ? "ไม่เผ็ดมาก 🌶"
                        : "เผ็ดมาก 🌶🌶🌶"}
                  </button>
                ))}
              </div>
              {spice !== null && (
                <p role="status" className="atlas-feedback">
                  {spice === 1
                    ? "Just a little. That matches your request."
                    : "Listen again: not too spicy."}
                </p>
              )}
              {spice === 1 && (
                <button
                  className="atlas-primary atlas-wide"
                  onClick={() => setPhase("pay")}
                >
                  Cook & pay →
                </button>
              )}
            </>
          )}
          {phase === "pay" && (
            <>
              <h2>
                {active.id === "noodle-stall"
                  ? "Breakfast is ready."
                  : "A gift to take home."}
              </h2>
              <div className="atlas-reward">
                {active.id === "noodle-stall"
                  ? meal === "rice"
                    ? "🍛"
                    : "🍜"
                  : "🧣"}
              </div>
              <PlayButton
                text={
                  active.id === "noodle-stall"
                    ? active.steps[4].npc.text
                    : active.steps[2].choices.find((c) => c.id === "ok")!.line
                        .text
                }
                gender={active.id === "noodle-stall" ? location.gender : gender}
                audio={audio}
                label="Listen to the agreed price"
              />
              <p>Listen for the price. Count back the unused money.</p>
              <BahtPayment
                key={active.id}
                price={active.id === "noodle-stall" ? 50 : 150}
                funds="฿200 to spend · return what’s left"
                onMistake={() => setMistakes((m) => m + 1)}
                onPaid={() => {
                  setPhase("recall");
                  setHint(false);
                }}
              />
            </>
          )}
          {phase === "recall" && memory && (
            <>
              <h2>{en ? "ฟังได้ความว่าอะไร?" : "What did you hear?"}</h2>
              <p className="atlas-muted">
                {en
                  ? "ฟังคำที่คุณเพิ่งใช้ แล้วเลือกความหมาย"
                  : "Listen to a phrase you just used. Choose its meaning."}
              </p>
              <div className="atlas-memory">
                <PlayButton
                  text={memory.text}
                  gender={gender}
                  audio={audio}
                  label="Listen to your memory"
                />
                {hint && (
                  <p lang={course}>
                    {memory.text}
                    <small>{memory.sub}</small>
                  </p>
                )}
              </div>
              <div className="atlas-options">
                {meanings.map((meaning) => (
                  <button
                    key={meaning}
                    disabled={
                      memoryPicked === memory.gloss ||
                      memoryAttempts.includes(meaning)
                    }
                    className={
                      memoryPicked === meaning
                        ? meaning === memory.gloss
                          ? "correct"
                          : "incorrect"
                        : ""
                    }
                    onClick={() => {
                      setMemoryPicked(meaning);
                      setMemoryAttempts((a) => [...a, meaning]);
                      if (meaning !== memory.gloss) {
                        setMistakes((m) => m + 1);
                        setMemoryFeedback(
                          en
                            ? "ลองฟังอีกครั้ง"
                            : "Listen once more. You can try again.",
                        );
                      } else
                        setMemoryFeedback(
                          en ? "จำได้แล้ว!" : "You remembered!",
                        );
                    }}
                  >
                    {meaning}
                  </button>
                ))}
              </div>
              <button className="atlas-hint" onClick={reveal}>
                {en ? "ขอดูประโยค" : "Reveal the phrase"}
              </button>
              {memoryFeedback && (
                <p role="status" className="atlas-feedback">
                  {memoryFeedback}
                </p>
              )}
              {memoryPicked === memory.gloss && (
                <button className="atlas-primary atlas-wide" onClick={finish}>
                  {en ? "รับตราประทับ →" : "Keep this memory →"}
                </button>
              )}
            </>
          )}
          {phase === "reward" && (
            <>
              <div className="atlas-reward">
                {newQuest?.icon ?? location.icon}
              </div>
              <h2>{newQuest?.reward ?? "A new passport stamp."}</h2>
              <p>
                {newQuest?.ending ??
                  `${location.person} is glad you stopped by. You’ve used ${active.steps.length} useful phrases.`}
              </p>
              <div className="atlas-stars">
                {"★".repeat(save.stars[active.id] ?? 1)}
              </div>
              <small>
                {!supported && mistakes === 0
                  ? "Conversation and recall, independently."
                  : "A little support, a real achievement."}
              </small>
              <p className="atlas-muted">
                {syncNotice || "Saved on this device."}
              </p>
              <button
                className="atlas-primary atlas-wide"
                onClick={() => (next ? visit(next.id) : close())}
              >
                {next ? `Next: ${next.name} →` : "Explore your world →"}
              </button>
              <button className="atlas-hint" onClick={close}>
                Take a break
              </button>
            </>
          )}
        </Sheet>
      )}
      {secretInfo && (
        <Sheet title="A hidden surprise" onClose={close}>
          <div className="atlas-reward">{secretInfo.icon}</div>
          <h2>{secretInfo.name}</h2>
          <p>{secretInfo.story}</p>
          <p className="atlas-muted">
            Saved in your passport · first discovery earns 3 coins.
          </p>
          {SECRET_LESSONS[secretInfo.id] && (
            <div className="atlas-clue">
              <p>{SECRET_LESSONS[secretInfo.id].invitation}</p>
              <button
                className="atlas-primary atlas-wide"
                onClick={() => visit(SECRET_LESSONS[secretInfo.id].scene)}
              >
                Try the discovery’s conversation →
              </button>
            </div>
          )}
          <button className="atlas-hint" onClick={close}>
            Keep exploring →
          </button>
        </Sheet>
      )}
      {menu && (
        <Sheet
          title={
            menu === "places"
              ? "Places"
              : menu === "quests"
                ? "Stories"
                : menu === "passport"
                  ? "Your passport"
                  : "More"
          }
          onClose={close}
        >
          {menu === "places" && (
            <>
              <h2>{DISTRICTS.find((d) => d.id === district)!.name}</h2>
              <p className="atlas-muted">Tap a place to walk there and talk.</p>
              <div className="atlas-place-list">
                {LOCATIONS.filter((l) => l.district === district).map((l) => (
                  <button key={l.id} onClick={() => visit(l.id)}>
                    <span>{l.icon}</span>
                    <div>
                      <strong>{l.name}</strong>
                      <small>{l.person}</small>
                    </div>
                    <b>{save.completed.includes(l.id) ? "✓" : "→"}</b>
                  </button>
                ))}
              </div>
              <p className="atlas-muted">
                Use the district tabs to find the other places.
              </p>
            </>
          )}
          {menu === "quests" && (
            <>
              <h2>A story in every district.</h2>
              <div className="atlas-story">
                <span>🧺</span>
                <div>
                  <h3>Picnic afternoon</h3>
                  <small>
                    {save.picnic.finished
                      ? "Mali saved you a seat. Your picnic is in the world."
                      : "Three short stops. One shared afternoon."}
                  </small>
                  <button
                    className="atlas-hint"
                    onClick={() => {
                      close();
                      setCourse("th");
                      setDistrict("town");
                      setPicnicOpen(true);
                    }}
                  >
                    {save.picnic.finished
                      ? "Visit your picnic"
                      : "Continue picnic"}{" "}
                    →
                  </button>
                </div>
              </div>
              {QUESTS.map((q) => {
                const progress = q.stops.filter((id) =>
                  save.completed.includes(id),
                ).length;
                const id =
                  q.stops.find((id) => !save.completed.includes(id)) ??
                  q.stops[0];
                return (
                  <div key={q.id} className="atlas-story">
                    <span>{q.icon}</span>
                    <div>
                      <h3>{q.name}</h3>
                      <small>
                        {progress}/{q.stops.length} stops ·{" "}
                        {progress === q.stops.length ? q.reward : q.story}
                      </small>
                      <button className="atlas-hint" onClick={() => visit(id)}>
                        {progress === q.stops.length
                          ? "Revisit"
                          : "Continue story"}{" "}
                        →
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
          {menu === "shop" && (
            <>
              <h2>A little more you.</h2>
              <p className="atlas-muted">
                ✦ {save.coins} coins · earned through stories and discoveries
              </p>
              {DECORATIONS.map((d) => (
                <div className="atlas-story" key={d.id}>
                  <span>{d.icon}</span>
                  <div>
                    <h3>{d.name}</h3>
                    <small>
                      {d.description.replace("three phrases", "three scenes")}
                    </small>
                    <button
                      className="atlas-hint"
                      disabled={
                        save.decorations.includes(d.id) ||
                        save.coins < d.cost ||
                        save.independent.length < d.mastery
                      }
                      onClick={() =>
                        setSave((s) => buyAtlasDecoration(s, d.id))
                      }
                    >
                      {save.decorations.includes(d.id)
                        ? "In your world ✓"
                        : save.independent.length < d.mastery
                          ? `Recall ${d.mastery - save.independent.length} more scenes first`
                          : `Add for ${d.cost} coins →`}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
          {menu === "passport" && (
            <>
              <h2>{save.completed.length} places. Your stories.</h2>
              <div className="atlas-passport-stats">
                <span>✦ {save.coins} coins</span>
                <span>
                  ✧ {save.secrets.length}/{SECRETS.length} surprises
                </span>
              </div>
              <button
                className="atlas-primary atlas-wide"
                onClick={() => setMenu("shop")}
              >
                Make your world yours →
              </button>
              <h3>Stamps</h3>
              <div className="atlas-stamps">
                {save.completed.map((id) => {
                  const l = LOCATIONS.find((l) => l.id === id)!;
                  return (
                    <button key={id} onClick={() => visit(id)}>
                      {l.icon}
                      <small>{l.name}</small>
                      <span>
                        {save.independent.includes(id)
                          ? "Recalled independently"
                          : "Learning with support"}
                      </span>
                    </button>
                  );
                })}
              </div>
              {save.completed.length === 0 && (
                <p>Your first hello earns the first stamp.</p>
              )}
              <h3>Hidden surprises</h3>
              {SECRETS.filter((s) => save.secrets.includes(s.id)).map((s) => (
                <button
                  key={s.id}
                  className="atlas-secret-entry"
                  onClick={() => {
                    setMenu(null);
                    setSecret(s.id);
                  }}
                >
                  {s.icon} {s.name}
                </button>
              ))}
              <details>
                <summary>Rumours from this district</summary>
                {SECRETS.filter(
                  (s) =>
                    s.district === district && !save.secrets.includes(s.id),
                ).map((s) => (
                  <p key={s.id}>{s.clue}</p>
                ))}
              </details>
              <p className="atlas-muted">
                Recognise a reply without clues, then recall it by ear. That
                earns independent credit.
              </p>
            </>
          )}
          {menu === "settings" && (
            <>
              <h2>Make it comfortable.</h2>
              <label>
                Menu language / ภาษาเมนู
                <select
                  value={interfaceLanguage}
                  onChange={(e) =>
                    setInterfaceLanguage(e.target.value as "en" | "th")
                  }
                >
                  <option value="en">English</option>
                  <option value="th">ไทย</option>
                </select>
              </label>
              <label>
                Speaking style
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </label>
              <label>
                Listening speed
                <select
                  value={pace}
                  onChange={(e) => setPace(e.target.value as Pace)}
                >
                  <option value="learner">Slower · learning</option>
                  <option value="natural">Natural · challenge</option>
                </select>
              </label>
              {learnEnglish && (
                <>
                  <label>
                    English accent
                    <select
                      value={accent}
                      onChange={(e) => setAccent(e.target.value as AccentId)}
                    >
                      <option value="us">US</option>
                      <option value="uk">UK</option>
                      <option value="au">Australia</option>
                    </select>
                  </label>
                  <label>
                    Conversation style
                    <select
                      value={formality}
                      onChange={(e) =>
                        setFormality(e.target.value as Formality)
                      }
                    >
                      <option value="neutral">Everyday</option>
                      <option value="casual">Casual</option>
                      <option value="formal">Formal</option>
                    </select>
                  </label>
                </>
              )}
              <details>
                <summary>How to play</summary>
                <p>
                  Tap Let’s go for a guided first task. Tap buildings or use
                  Places to meet anyone. Listen, choose a reply, then try a
                  short memory. Drag the map to explore. Look for small gold
                  glimmers.
                </p>
              </details>
              <details>
                <summary>About your adventure</summary>
                <p>
                  25 encounters, five storybook districts inspired by Thailand
                  and English-speaking towns, nine linked stories, ten hidden
                  surprises. Saves stay on this device; signed-in lesson
                  completions also sync. Language content is a draft awaiting
                  native-speaker review.
                </p>
                <p>
                  Emergency and pharmacy scenes practise language; they are not
                  medical advice.
                </p>
                <Link href="/sign-in">Sign in to save scene completions</Link>
              </details>
            </>
          )}
        </Sheet>
      )}
    </div>
  );
}
