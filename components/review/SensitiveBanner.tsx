export function SensitiveBanner() {
  return (
    <div role="alert" className="flex gap-3 rounded-3xl border-2 border-coral bg-coral-soft p-5">
      <span aria-hidden className="text-2xl">⚠️</span>
      <p className="text-lg">
        <strong>This recording may show private info</strong> like a password or a bank balance. Check each step, or
        delete this guide and record again.
      </p>
    </div>
  );
}
