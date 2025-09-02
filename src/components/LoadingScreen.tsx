// Loading Screen Component
const LoadingScreen = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--loom-bg))]">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full loom-gradient-hero flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white/20 animate-pulse" />
        </div>
        <h1 className="text-2xl font-semibold text-[hsl(var(--loom-primary))] mb-2">
          Loom
        </h1>
        <p className="text-[hsl(var(--loom-text-muted))] text-sm">
          weave your days together
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;