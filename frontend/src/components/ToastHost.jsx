import { useEffect, useState } from 'react';

let pushToastExternal;

export function pushToast(message) {
  if (pushToastExternal) pushToastExternal(message);
}

export default function ToastHost() {
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    pushToastExternal = (m) => {
      setMsg(m);
      setTimeout(() => setMsg(null), 2000);
    };
    return () => {
      pushToastExternal = undefined;
    };
  }, []);

  if (!msg) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto bg-black/80 text-white px-6 py-3 rounded-lg shadow-lg">
        {msg}
      </div>
    </div>
  );
}
