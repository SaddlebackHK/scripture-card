import { X } from 'lucide-react';
import { useUpdateAvailable } from '@presentation/hooks';

// Soft, dismissible toast that appears bottom-right when a newer build of the
// app has been deployed. Mounted once at the App root; the hook owns all
// detection state so other layers don't need to know it exists.
export const UpdateToast = () => {
  const { hasUpdate, dismiss } = useUpdateAvailable();
  if (!hasUpdate) return null;

  const reload = () => {
    window.location.reload();
  };

  return (
    <aside
      className="update-toast surface"
      role="status"
      aria-live="polite"
      aria-labelledby="update-toast-title"
    >
      <button type="button" className="update-toast-close" onClick={dismiss} aria-label="關閉">
        <X size={16} strokeWidth={1.75} />
      </button>
      <p className="kicker update-toast-kicker">New version</p>
      <p id="update-toast-title" className="update-toast-body">
        已有新版本，重新載入以取得最新內容。
      </p>
      <div className="update-toast-actions">
        <button type="button" className="update-toast-dismiss" onClick={dismiss}>
          稍後
        </button>
        <button type="button" className="update-toast-reload" onClick={reload}>
          重新載入
        </button>
      </div>
    </aside>
  );
};
