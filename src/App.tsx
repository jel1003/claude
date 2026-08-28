import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import FridgePanel from './components/FridgePanel'
import PlanPanel from './components/PlanPanel'
import RecipeDetail from './components/RecipeDetail'
import RecommendList from './components/RecommendList'
import SettingsCard from './components/SettingsCard'
import SyncCard from './components/SyncCard'
import { useAutoPlan, useToday } from './hooks/useDaily'
import { useSync } from './hooks/useSync'
import { addDays, formatKorean, todayKey } from './core/date'
import { recommend } from './core/match'
import { generateDayPlan } from './core/planner'
import { makeSyncCode } from './core/sync'
import type { SyncDoc, Tombstone } from './core/sync'
import {
  DEFAULT_SETTINGS,
  loadFridge,
  loadPlans,
  loadSettings,
  loadSettingsUpdatedAt,
  loadSyncCode,
  loadTombstones,
  prunePlans,
  saveFridge,
  savePlans,
  saveSettings,
  saveSettingsUpdatedAt,
  saveSyncCode,
  saveTombstones,
} from './core/storage'
import type { PlanArchive, Settings } from './core/storage'
import { INGREDIENTS } from './data/ingredients'
import { RECIPES } from './data/recipes'
import type { FridgeItem, Ingredient, MatchResult } from './core/types'

const EXPIRING_WITHIN_DAYS = 3

export default function App() {
  const today = useToday()
  const [fridge, setFridge] = useState<FridgeItem[]>(loadFridge)
  const [tombstones, setTombstones] = useState<Tombstone[]>(loadTombstones)
  const [plans, setPlans] = useState<PlanArchive>(loadPlans)
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [settingsUpdatedAt, setSettingsUpdatedAt] = useState<string | null>(loadSettingsUpdatedAt)
  const [syncCode, setSyncCode] = useState<string | null>(loadSyncCode)
  const [detail, setDetail] = useState<MatchResult | null>(null)
  /** 마지막으로 냉장고를 저장한 시각. null 이면 아직 저장한 적이 없다 */
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  /** 브라우저가 저장을 막고 있으면 true — 사용자에게 알려줘야 한다 */
  const [storageBlocked, setStorageBlocked] = useState(false)
  const [notifyPermission, setNotifyPermission] = useState<NotificationPermission | 'unsupported'>(
    () => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission),
  )

  useEffect(() => {
    const ok = saveFridge(fridge)
    setStorageBlocked(!ok)
    if (ok) setSavedAt(new Date())
  }, [fridge])
  useEffect(() => {
    saveTombstones(tombstones)
  }, [tombstones])
  useEffect(() => {
    savePlans(plans)
  }, [plans])
  useEffect(() => {
    saveSettings(settings)
  }, [settings])
  useEffect(() => {
    if (settingsUpdatedAt) saveSettingsUpdatedAt(settingsUpdatedAt)
  }, [settingsUpdatedAt])
  useEffect(() => {
    saveSyncCode(syncCode)
  }, [syncCode])

  const matchOptions = useMemo(
    () => ({
      assumePantry: settings.assumePantry,
      allowSubstitutes: settings.allowSubstitutes,
      expiringWithinDays: EXPIRING_WITHIN_DAYS,
      today,
    }),
    [settings.assumePantry, settings.allowSubstitutes, today],
  )

  const matches = useMemo(() => recommend(RECIPES, fridge, matchOptions), [fridge, matchOptions])

  const matchById = useMemo(() => new Map(matches.map((m) => [m.recipe.id, m])), [matches])

  const todayPlan = plans[today]

  const buildPlan = useCallback(
    (nonce: number, announce: boolean) => {
      const plan = generateDayPlan(today, RECIPES, fridge, {
        ...matchOptions,
        avoidRepeatDays: settings.avoidRepeatDays,
        history: Object.values(plans),
        nonce,
      })
      setPlans((prev) => prunePlans({ ...prev, [today]: plan }))

      if (announce && settings.notify && typeof Notification !== 'undefined') {
        if (Notification.permission === 'granted') {
          const names = plan.meals
            .map((meal) => RECIPES.find((r) => r.id === meal.recipeId)?.name)
            .filter(Boolean)
            .join(' · ')
          new Notification('오늘의 식단이 준비됐어요', { body: names })
        }
      }
    },
    [today, fridge, matchOptions, plans, settings.avoidRepeatDays, settings.notify],
  )

  useAutoPlan({
    today,
    hasPlan: Boolean(todayPlan),
    planTime: settings.planTime,
    generate: useCallback(() => buildPlan(0, true), [buildPlan]),
  })

  // ── 기기 간 동기화 ────────────────────────────────────
  const syncDoc: SyncDoc = useMemo(
    () => ({ version: 1, fridge, tombstones, plans, settings, settingsUpdatedAt }),
    [fridge, tombstones, plans, settings, settingsUpdatedAt],
  )

  const applyMerged = useCallback((merged: SyncDoc) => {
    setFridge(merged.fridge)
    setTombstones(merged.tombstones)
    setPlans(merged.plans)
    if (merged.settings) {
      setSettings({ ...DEFAULT_SETTINGS, ...merged.settings })
      setSettingsUpdatedAt(merged.settingsUpdatedAt)
    }
  }, [])

  const sync = useSync({ code: syncCode, doc: syncDoc, onMerged: applyMerged })
  const syncNowRef = useRef(sync.syncNow)
  syncNowRef.current = sync.syncNow

  // 이벤트 처리 중 "지금 냉장고에 무엇이 있는지" 를 보기 위한 최신값
  const fridgeRef = useRef(fridge)
  fridgeRef.current = fridge

  const toggleIngredient = useCallback((ing: Ingredient) => {
    const now = new Date().toISOString()
    const wasInFridge = fridgeRef.current.some((item) => item.id === ing.id)

    if (wasInFridge) {
      setFridge((prev) => prev.filter((item) => item.id !== ing.id))
      // 뺀 재료는 삭제 기록을 남긴다. 그래야 다른 기기의 오래된 목록에서 되살아나지 않는다
      setTombstones((prev) => [
        ...prev.filter((stone) => stone.id !== ing.id),
        { id: ing.id, removedAt: now },
      ])
      return
    }

    const addedAt = todayKey()
    const item: FridgeItem = {
      id: ing.id,
      addedAt,
      updatedAt: now,
      ...(ing.freshDays ? { expiresAt: addDays(addedAt, ing.freshDays) } : {}),
    }
    setFridge((prev) => [...prev, item])
    // 다시 담았으니 예전 삭제 기록은 치운다
    setTombstones((prev) => prev.filter((stone) => stone.id !== ing.id))
  }, [])

  const setExpiry = useCallback((id: string, expiresAt: string | undefined) => {
    const now = new Date().toISOString()
    setFridge((prev) =>
      prev.map((item) => (item.id === id ? { ...item, expiresAt, updatedAt: now } : item)),
    )
  }, [])

  const clearFridge = useCallback(() => {
    const now = new Date().toISOString()
    setTombstones((prev) => {
      const cleared = fridgeRef.current.map((item) => ({ id: item.id, removedAt: now }))
      const clearedIds = new Set(cleared.map((stone) => stone.id))
      return [...prev.filter((stone) => !clearedIds.has(stone.id)), ...cleared]
    })
    setFridge([])
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...DEFAULT_SETTINGS, ...prev, ...patch }))
    setSettingsUpdatedAt(new Date().toISOString())
  }, [])

  const requestNotify = useCallback(() => {
    if (typeof Notification === 'undefined') return
    // 임베드 환경에서는 권한 요청 자체가 거절될 수 있다 — 화면은 그대로 두고 상태만 반영한다
    void Notification.requestPermission()
      .then(setNotifyPermission)
      .catch(() => setNotifyPermission('denied'))
  }, [])

  const checkAllPantry = useCallback(() => {
    const now = new Date().toISOString()
    setFridge((prev) => {
      const have = new Set(prev.map((item) => item.id))
      const added = INGREDIENTS.filter((ing) => ing.pantry && !have.has(ing.id)).map((ing) => ({
        id: ing.id,
        addedAt: todayKey(),
        updatedAt: now,
      }))
      return [...prev, ...added]
    })
  }, [])

  return (
    <div className="app">
      <header className="site-header">
        <div>
          <h1>냉장고 셰프</h1>
          <p className="date">
            {formatKorean(today)} · 재료를 체크하면 만들 수 있는 메뉴를 골라드려요
          </p>
        </div>
        <div className="header-actions">
          <button className="btn" onClick={checkAllPantry}>
            상비 양념 한번에 체크
          </button>
        </div>
      </header>

      <div className="layout">
        <div>
          <FridgePanel
            fridge={fridge}
            today={today}
            onToggle={toggleIngredient}
            onSetExpiry={setExpiry}
            onClear={clearFridge}
            expiringWithinDays={EXPIRING_WITHIN_DAYS}
            savedAt={savedAt}
            storageBlocked={storageBlocked}
          />
          <SyncCard
            code={syncCode}
            sync={sync}
            onStart={() => setSyncCode(makeSyncCode())}
            onConnect={setSyncCode}
            onDisconnect={() => setSyncCode(null)}
            onSyncNow={() => syncNowRef.current()}
          />
          <SettingsCard
            settings={settings}
            notifyPermission={notifyPermission}
            onChange={updateSettings}
            onRequestNotify={requestNotify}
          />
        </div>

        <div>
          <PlanPanel
            plan={todayPlan}
            planTime={settings.planTime}
            matchById={matchById}
            onGenerate={() => buildPlan(0, false)}
            onRegenerate={() => buildPlan((todayPlan?.nonce ?? 0) + 1, false)}
            onOpen={setDetail}
          />
          <RecommendList matches={matches} fridgeSize={fridge.length} onOpen={setDetail} />
        </div>
      </div>

      {detail && <RecipeDetail match={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
