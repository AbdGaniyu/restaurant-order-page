/** Amala, gbegiri, ewedu: the three parts of an abula plate. */
export function AbulaStripe({ className = "h-2" }: { className?: string }) {
  return (
    <div aria-hidden className={`flex ${className}`}>
      <span className="flex-1 bg-amala" />
      <span className="flex-1 bg-gbegiri" />
      <span className="flex-1 bg-ewedu" />
    </div>
  );
}
