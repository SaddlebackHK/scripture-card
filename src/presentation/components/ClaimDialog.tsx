import { type FormEvent, type MouseEvent, useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { useContainer } from '@presentation/hooks';
import { dispatchUseCase } from '@presentation/utils';

export interface ClaimDialogProps {
  readonly open: boolean;
  readonly month: number;
  readonly day: number;
  readonly dateLabel: string;
  readonly onClose: () => void;
}

// The outer component gates rendering on `open`. The inner mounts only while
// the dialog is open, which gives us reset-on-close for free (state is
// re-initialised on the next mount). Avoids the `set-state-in-effect`
// anti-pattern that resetting on close inside a useEffect would require.
export const ClaimDialog = (props: ClaimDialogProps) => {
  if (!props.open) return null;
  return <ClaimDialogContent {...props} />;
};

type FormState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; email: string }
  | { kind: 'error'; message: string };

const ClaimDialogContent = ({ month, day, dateLabel, onClose }: ClaimDialogProps) => {
  const container = useContainer();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState<FormState>({ kind: 'idle' });
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  // Body scroll-lock + ESC-to-close while the dialog is mounted.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    firstFieldRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state.kind === 'submitting') return;
    setState({ kind: 'submitting' });
    const trimmedPhone = phone.trim();
    dispatchUseCase(
      container.useCases.submitClaim.execute({
        name: name.trim(),
        email: email.trim(),
        ...(trimmedPhone ? { phone: trimmedPhone } : {}),
        month,
        day,
      }),
      (r) => {
        if (r.ok) setState({ kind: 'success', email: r.value.email });
        else setState({ kind: 'error', message: r.error });
      },
    );
  };

  const busy = state.kind === 'submitting';
  const errorMessage = state.kind === 'error' ? state.message : null;
  const canSubmit = name.trim().length > 0 && email.trim().length > 0 && !busy;

  const stopPropagation = (event: MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <div className="dialog-backdrop" onClick={onClose} role="presentation">
      <div
        className="dialog-card surface"
        onClick={stopPropagation}
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-dialog-title"
      >
        <button type="button" onClick={onClose} className="dialog-close" aria-label="關閉">
          <X size={18} strokeWidth={1.75} />
        </button>

        {state.kind === 'success' ? (
          <div className="dialog-success">
            <span className="dialog-success-mark" aria-hidden>
              <Check size={28} strokeWidth={2} />
            </span>
            <h2 id="claim-dialog-title" className="dialog-title">
              已收到
            </h2>
            <p className="dialog-success-text">
              我們會盡快將 <strong>{dateLabel}</strong> 的電子卡寄到
              <br />
              <span className="dialog-success-email">{state.email}</span>
            </p>
            <button type="button" onClick={onClose} className="btn-outline dialog-done">
              完成
            </button>
          </div>
        ) : (
          <>
            <header className="dialog-header">
              <p className="kicker">Claim a digital copy</p>
              <h2 id="claim-dialog-title" className="dialog-title">
                領取電子卡
              </h2>
              <p className="dialog-subtitle">
                我們將把 <strong>{dateLabel}</strong> 的卡片高清電子版
                <span className="dialog-subtitle-action">發送給你。</span>
              </p>
            </header>

            <form onSubmit={submit} className="dialog-form">
              <label className="field">
                <span className="field-label">姓名</span>
                <input
                  ref={firstFieldRef}
                  className="field-control"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={60}
                  disabled={busy}
                />
              </label>

              <label className="field">
                <span className="field-label">電郵地址</span>
                <input
                  className="field-control"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={254}
                  disabled={busy}
                />
              </label>

              <label className="field">
                <span className="field-label">
                  聯絡電話 <span className="field-label-soft">（可選）</span>
                </span>
                <input
                  className="field-control"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={20}
                  disabled={busy}
                />
              </label>

              {errorMessage && (
                <div className="banner banner-error" role="alert">
                  {errorMessage}
                </div>
              )}

              <button type="submit" className="btn-solid dialog-submit" disabled={!canSubmit}>
                {busy ? '處理中…' : '送出 →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
