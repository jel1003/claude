import { useState } from 'react'
import { isValidCode, normalizeCode } from '../core/sync'
import type { SyncState } from '../hooks/useSync'

interface Props {
  code: string | null
  sync: SyncState
  onStart: () => void
  onConnect: (code: string) => void
  onDisconnect: () => void
  onSyncNow: () => void
}

const STATUS_TEXT: Record<SyncState['status'], string> = {
  off: '',
  idle: '동기화됨',
  syncing: '동기화 중…',
  error: '동기화 실패',
}

export default function SyncCard({ code, sync, onStart, onConnect, onDisconnect, onSyncNow }: Props) {
  const [input, setInput] = useState('')
  const [copied, setCopied] = useState(false)

  const typed = normalizeCode(input)
  const canConnect = isValidCode(typed)

  const copy = async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // 클립보드가 막힌 환경 — 코드는 화면에 그대로 보이니 직접 옮겨 적으면 된다
    }
  }

  if (!code) {
    return (
      <section className="card">
        <div className="card-head">
          <div>
            <h2>기기 간 동기화</h2>
            <div className="sub">폰과 PC에서 같은 냉장고를 보려면</div>
          </div>
        </div>

        <p className="settings hint" style={{ marginBottom: 12 }}>
          지금은 이 브라우저에만 저장됩니다. 동기화를 켜면 코드가 하나 생기고, 다른 기기에서 그
          코드를 넣으면 재료·식단이 같이 움직입니다.
        </p>

        <div className="sync-actions">
          <button className="btn btn-primary" onClick={onStart}>
            동기화 시작
          </button>
        </div>

        <div className="sync-join">
          <label htmlFor="sync-code-input">이미 코드가 있다면</label>
          <div className="search-row">
            <input
              id="sync-code-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ABCD-EFGH-2345"
              autoComplete="off"
              spellCheck={false}
            />
            <button className="btn" disabled={!canConnect} onClick={() => onConnect(typed)}>
              연결
            </button>
          </div>
          <p className="settings hint">연결하면 두 기기의 재료가 하나로 합쳐집니다.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>기기 간 동기화</h2>
          <div className="sub">
            <span className={`sync-dot ${sync.status}`} aria-hidden="true" />
            {STATUS_TEXT[sync.status]}
            {sync.syncedAt && sync.status !== 'error'
              ? ` · ${sync.syncedAt.getHours().toString().padStart(2, '0')}:${sync.syncedAt
                  .getMinutes()
                  .toString()
                  .padStart(2, '0')}`
              : ''}
          </div>
        </div>
        <button className="btn btn-ghost btn-tiny" onClick={onSyncNow}>
          지금 동기화
        </button>
      </div>

      <div className="sync-code">
        <code>{code}</code>
        <button className="btn btn-tiny" onClick={() => void copy()}>
          {copied ? '복사됨' : '복사'}
        </button>
      </div>

      <p className="settings hint">
        다른 기기에서 이 코드를 넣으면 같은 냉장고를 봅니다. 코드를 아는 사람은 누구나 볼 수 있으니
        아무에게나 알려주지 마세요.
      </p>

      {sync.error && <p className="notice">{sync.error}</p>}

      <div className="sync-actions">
        <button className="btn btn-ghost btn-tiny" onClick={onDisconnect}>
          이 기기에서 연결 끊기
        </button>
      </div>
    </section>
  )
}
