import type { Settings } from '../core/storage'

interface Props {
  settings: Settings
  notifyPermission: NotificationPermission | 'unsupported'
  onChange: (patch: Partial<Settings>) => void
  onRequestNotify: () => void
}

export default function SettingsCard({
  settings,
  notifyPermission,
  onChange,
  onRequestNotify,
}: Props) {
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>설정</h2>
          <div className="sub">추천과 자동 식단이 도는 방식</div>
        </div>
      </div>

      <div className="settings">
        <label>
          <input
            type="checkbox"
            checked={settings.assumePantry}
            onChange={(e) => onChange({ assumePantry: e.target.checked })}
          />
          <span>소금·간장 등 상비 양념은 있다고 가정</span>
        </label>

        <label>
          <input
            type="checkbox"
            checked={settings.allowSubstitutes}
            onChange={(e) => onChange({ allowSubstitutes: e.target.checked })}
          />
          <span>비슷한 재료로 대체 허용 (예: 피망↔파프리카)</span>
        </label>

        <label>
          <span>최근</span>
          <input
            type="number"
            min={0}
            max={14}
            value={settings.avoidRepeatDays}
            onChange={(e) => onChange({ avoidRepeatDays: Number(e.target.value) })}
            style={{ width: 60 }}
          />
          <span>일 안에 먹은 메뉴는 피하기</span>
        </label>

        <label>
          <span>식단 자동 생성 시각</span>
          <input
            type="time"
            value={settings.planTime}
            onChange={(e) => onChange({ planTime: e.target.value })}
          />
        </label>

        <label>
          <input
            type="checkbox"
            checked={settings.notify}
            onChange={(e) => {
              onChange({ notify: e.target.checked })
              if (e.target.checked) onRequestNotify()
            }}
            disabled={notifyPermission === 'unsupported'}
          />
          <span>식단이 만들어지면 브라우저 알림</span>
        </label>

        <p className="hint">
          {notifyPermission === 'unsupported'
            ? '이 브라우저는 알림을 지원하지 않아요.'
            : notifyPermission === 'denied'
              ? '알림이 차단되어 있어요. 브라우저 사이트 설정에서 허용해 주세요.'
              : '식단은 설정한 시각이 지난 뒤 앱을 처음 열 때 자동으로 만들어집니다. 알림은 앱이 열려 있을 때만 떠요.'}
        </p>
      </div>
    </section>
  )
}
