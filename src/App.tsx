import { useCallback, useEffect, useMemo, useState } from 'react'
import FridgePanel from './components/FridgePanel'
import PlanPanel from './components/PlanPanel'
import RecipeDetail from './components/RecipeDetail'
import RecommendList from './components/RecommendList'
import SettingsCard from './components/SettingsCard'
import { useAutoPlan, useToday } from './hooks/useDaily'
import { addDays, formatKorean, todayKey } from './core/date'
import { recommend } from './core/match'
import { generateDayPlan } from './core/planner'
import {
  DEFAULT_SETTINGS,
  loadFridge,
  loadPlans,
  loadSettings,
  prunePlans,
  saveFridge,
  savePlans,
  saveSettings,
} from './core/storage'
import type { PlanArchive, Settings } from './core/storage'
import { INGREDIENTS } from './data/ingredients'
import { RECIPES } from './data/recipes'
import type { FridgeItem, Ingredient, MatchResult } from './core/types'

const EXPIRING_WITHIN_DAYS = 3

export default function App() {
  const today = useToday()
  const [fridge, setFridge] = useState<FridgeItem[]>(loadFridge)
  const [plans, setPlans] = useState<PlanArchive>(loadPlans)
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [detail, setDetail] = useState<MatchResult | null>(null)
  const [notifyPermission, setNotifyPermission] = useState<NotificationPermission | 'unsupported'>(
    () => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission),
  )

  useEffect(() => saveFridge(fridge), [fridge])
  useEffect(() => savePlans(plans), [plans])
  useEffect(() => saveSettings(settings), [settings])

  const matchOptions = useMemo(
    () => ({
      assumePantry: settings.assumePantry,
      allowSubstitutes: settings.allowSubstitutes,
      expiringWithinDays: EXPIRING_WITHIN_DAYS,
      today,
    }),
    [settings.assumePantry, settings.allowSubstitutes, today],
  )

  const matches = useMemo(
    () => recommend(RECIPES, fridge, matchOptions),
    [fridge, matchOptions],
  )

  const matchById = useMemo(
    () => new Map(matches.map((m) => [m.recipe.id, m])),
    [matches],
  )

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

  const toggleIngredient = useCallback((ing: Ingredient) => {
    setFridge((prev) => {
      if (prev.some((item) => item.id === ing.id)) {
        return prev.filter((item) => item.id !== ing.id)
      }
      const addedAt = todayKey()
      const item: FridgeItem = {
        id: ing.id,
        addedAt,
        ...(ing.freshDays ? { expiresAt: addDays(addedAt, ing.freshDays) } : {}),
      }
      return [...prev, item]
    })
  }, [])

  const setExpiry = useCallback((id: string, expiresAt: string | undefined) => {
    setFridge((prev) =>
      prev.map((item) => (item.id === id ? { ...item, expiresAt } : item)),
    )
  }, [])

  const requestNotify = useCallback(() => {
    if (typeof Notification === 'undefined') return
    // 임베드 환경에서는 권한 요청 자체가 거절될 수 있다 — 화면은 그대로 두고 상태만 반영한다
    void Notification.requestPermission()
      .then(setNotifyPermission)
      .catch(() => setNotifyPermission('denied'))
  }, [])

  const checkAllPantry = useCallback(() => {
    setFridge((prev) => {
      const have = new Set(prev.map((item) => item.id))
      const added = INGREDIENTS.filter((ing) => ing.pantry && !have.has(ing.id)).map((ing) => ({
        id: ing.id,
        addedAt: todayKey(),
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
            onClear={() => setFridge([])}
            expiringWithinDays={EXPIRING_WITHIN_DAYS}
          />
          <SettingsCard
            settings={settings}
            notifyPermission={notifyPermission}
            onChange={(patch) =>
              setSettings((prev) => ({ ...DEFAULT_SETTINGS, ...prev, ...patch }))
            }
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
