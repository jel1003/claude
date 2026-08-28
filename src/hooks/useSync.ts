import { useCallback, useEffect, useRef, useState } from 'react'
import { docSignature, SyncError, syncWithServer } from '../core/sync'
import type { SyncDoc } from '../core/sync'

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'error'

export interface SyncState {
  status: SyncStatus
  /** 마지막으로 동기화에 성공한 시각 */
  syncedAt: Date | null
  /** 사용자에게 보여줄 오류 메시지 */
  error: string | null
}

interface Params {
  /** 동기화 코드. null 이면 동기화를 쓰지 않는다 */
  code: string | null
  /** 이 기기의 현재 문서 */
  doc: SyncDoc
  /** 서버가 합쳐 돌려준 문서를 화면 상태에 반영한다 */
  onMerged: (merged: SyncDoc) => void
}

/** 로컬에서 뭔가 바뀐 뒤 이만큼 잠잠하면 올린다 */
const PUSH_DELAY_MS = 1_200
/** 다른 기기의 변경을 받아오기 위한 주기 */
const POLL_MS = 60_000

const MESSAGES: Record<SyncError['code'], string> = {
  network: '연결이 안 돼요. 잠시 뒤 다시 시도합니다.',
  unavailable: '이 주소에서는 동기화를 쓸 수 없어요. Netlify에 올린 주소에서 써 주세요.',
  server: '동기화 서버에 문제가 있어요.',
  bad_response: '동기화 응답을 이해하지 못했어요.',
}

/**
 * 기기 간 동기화를 굴린다.
 *
 * 올리기와 내려받기가 한 번의 왕복이라, 로컬이 바뀌었을 때와 주기적으로
 * 같은 호출을 한다. 서버가 합쳐 돌려준 문서를 그대로 받아 적는다.
 */
export function useSync({ code, doc, onMerged }: Params): SyncState & { syncNow: () => void } {
  const [state, setState] = useState<SyncState>({ status: 'off', syncedAt: null, error: null })

  const docRef = useRef(doc)
  docRef.current = doc
  const onMergedRef = useRef(onMerged)
  onMergedRef.current = onMerged
  /** 마지막으로 서버에 반영된 문서의 지문 — 같으면 올릴 필요가 없다 */
  const syncedSignature = useRef<string | null>(null)
  const inFlight = useRef(false)

  const signature = docSignature(doc)

  const run = useCallback(async () => {
    if (!code || inFlight.current) return
    inFlight.current = true
    setState((prev) => ({ ...prev, status: 'syncing' }))
    try {
      const merged = await syncWithServer(code, docRef.current)
      syncedSignature.current = docSignature(merged)
      onMergedRef.current(merged)
      setState({ status: 'idle', syncedAt: new Date(), error: null })
    } catch (error) {
      const message =
        error instanceof SyncError ? MESSAGES[error.code] : '동기화 중 문제가 생겼어요.'
      setState((prev) => ({ ...prev, status: 'error', error: message }))
    } finally {
      inFlight.current = false
    }
  }, [code])

  // 코드를 끄면 상태도 되돌린다
  useEffect(() => {
    if (!code) {
      syncedSignature.current = null
      setState({ status: 'off', syncedAt: null, error: null })
    }
  }, [code])

  // 로컬이 바뀌면 잠깐 기다렸다가 올린다 (연속 클릭을 한 번으로 묶는다)
  useEffect(() => {
    if (!code) return
    if (syncedSignature.current === signature) return
    const timer = window.setTimeout(() => void run(), PUSH_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [code, signature, run])

  // 다른 기기의 변경을 받아온다
  useEffect(() => {
    if (!code) return
    const timer = window.setInterval(() => void run(), POLL_MS)
    const onWake = () => {
      if (document.visibilityState === 'visible') void run()
    }
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('focus', onWake)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('focus', onWake)
    }
  }, [code, run])

  return { ...state, syncNow: useCallback(() => void run(), [run]) }
}
